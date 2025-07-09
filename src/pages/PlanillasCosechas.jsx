// src/pages/PlanillasCosechas.jsx
import React, { useState, useEffect, useRef } from "react";
import Tesseract from "tesseract.js";
import { supabase } from "@/lib/supabase";

export default function PlanillasCosechas() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ref para el input file
  const fileInputRef = useRef();
  const [previewUrl, setPreviewUrl] = useState(null);

  // Para manejar la planilla extraída
  const [planillaData, setPlanillaData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => setUser(user))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando…</p>;
  if (!user || user.email !== "manudifrancesco1@gmail.com") {
    return <p>No tienes permiso para ver esta página.</p>;
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setPlanillaData(null);  // Limpiar datos previos
      processOCR(file);
    }
  };

  const processOCR = (file) => {
    setLoadingData(true);
    Tesseract.recognize(
      file,
      "eng",
      {
        logger: (m) => console.log(m), // Opcional, para ver el progreso de OCR
      }
    ).then(({ data: { text } }) => {
      const extractedData = extractDataFromOCR(text);
      setPlanillaData(extractedData);
      setLoadingData(false);
    });
  };

  const extractDataFromOCR = (ocrText) => {
    const lines = ocrText.split("\n");
    const cosechaData = {
      lote: "",
      cultivo: "",
      productor: "",
      camiones: [],
    };
    
    lines.forEach((line) => {
      if (line.includes("Lote")) {
        cosechaData.lote = line.split("Lote")[1]?.trim();
      }
      if (line.includes("Maíz")) {
        cosechaData.cultivo = "Maíz";
      } else if (line.includes("Soja")) {
        cosechaData.cultivo = "Soja";
      } else if (line.includes("Trigo")) {
        cosechaData.cultivo = "Trigo";
      }
      if (line.includes("Cecilia")) {
        cosechaData.productor = "Cecilia";
      } else if (line.includes("Horacio")) {
        cosechaData.productor = "Horacio";
      }

      // Extraer camiones
      if (line.match(/\d{1,2}\/\d{1,2}/)) {
        const camion = {
          fecha: line.match(/\d{1,2}\/\d{1,2}/)[0],
          ctg: line.split("CP")[1]?.trim(),
          camionPara: line.includes("Cecilia") ? "Cecilia" : "Horacio",
          destino: line.includes("Teumaco") ? "Teumaco" : "Bunge", // Ejemplo
          chofer: line.split("Chofer")[1]?.trim(),
          chasis: line.split("Chasis")[1]?.trim(),
          kgCampo: line.split("T")[1]?.trim() || "0",
        };
        cosechaData.camiones.push(camion);
      }
    });

    return cosechaData;
  };

  const handleSaveData = async () => {
    if (!planillaData) return;
    
    // Guardar cosecha
    const { error } = await supabase.from("cosechas").insert([{
      lote: planillaData.lote,
      cultivo: planillaData.cultivo,
      productor: planillaData.productor,
      campania: "2025", // Cambiar según campaña
    }]);
    if (error) {
      alert("Error al guardar cosecha: " + error.message);
      return;
    }

    // Guardar camiones
    for (let camion of planillaData.camiones) {
      const { error } = await supabase.from("camiones").insert([{
        fecha: camion.fecha,
        ctg: camion.ctg,
        camion_para: camion.camionPara,
        destino: camion.destino,
        chofer: camion.chofer,
        chasis: camion.chasis,
        kg_campo: parseFloat(camion.kgCampo),
      }]);
      if (error) {
        alert("Error al guardar camión: " + error.message);
      }
    }
    alert("Datos guardados correctamente.");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Planillas Cosechas</h1>

      {/* Botón para subir planilla */}
      <button
        onClick={() => fileInputRef.current.click()}
        className="mb-6 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        Seleccionar Planilla
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />

      {/* Vista previa de la planilla */}
      {previewUrl && (
        <div className="mb-6">
          <img
            src={previewUrl}
            alt="Vista previa de la planilla"
            className="max-w-full border"
          />
        </div>
      )}

      {/* Mostrar los datos extraídos */}
      {loadingData && <p>Cargando datos de la planilla...</p>}
      {planillaData && !loadingData && (
        <>
          <h3 className="text-lg font-semibold">Datos Extraídos:</h3>
          <div className="mb-6">
            <pre>{JSON.stringify(planillaData, null, 2)}</pre>
          </div>

          {/* Botón para guardar en la base de datos */}
          <button
            onClick={handleSaveData}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Guardar Datos
          </button>
        </>
      )}
    </div>
  );
}

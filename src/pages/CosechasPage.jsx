import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUIStore } from "@/store/uiStore";
import { useCampaniaStore } from "@/store/campaniaStore";

const formatNumber = (n) => n?.toLocaleString("es-AR");

export default function CosechasPage() {
  const { mode } = useUIStore();
  const { campaniaSeleccionada } = useCampaniaStore();

  const [cosechas, setCosechas] = useState([]);
  const [siembras, setSiembras] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [cultivoSeleccionado, setCultivoSeleccionado] = useState("");
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [cData, sData, cmData] = await Promise.all([
        supabase.from("cosechas").select("*"),
        supabase.from("siembras").select("*"),
        supabase.from("camiones").select("*"),
      ]);
      setCosechas(cData.data || []);
      setSiembras(sData.data || []);
      setCamiones(cmData.data || []);
    };
    fetchAll();
  }, []);

  // … aquí van los cálculos/agregaciones idénticos a tu versión actual …

  return (
    <div className="w-full min-h-screen pb-12 px-2">
      {/* Selector de cultivo */}
      <div className="flex gap-4 pb-4">
        {campaniaSeleccionada && (
          <select
            value={cultivoSeleccionado}
            onChange={(e) => {
              setCultivoSeleccionado(e.target.value);
              setLoteSeleccionado(null);
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Seleccionar cultivo</option>
            {/* Opciones de cultivo basadas en cosechasAgrupadas */}
          </select>
        )}
      </div>

      {/* Aquí renders de tablas “Entregas por destino”, “Balance Lotes Horacio”,
          “Resultado Lotes” y “Camiones” (idénticos a tu código actual)… */}
    </div>
  );
}

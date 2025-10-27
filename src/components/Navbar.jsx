import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function CamionesPage() {
  const [camionesPorDestino, setCamionesPorDestino] = useState({});
  const [destinoSeleccionado, setDestinoSeleccionado] = useState(null);
  const [usuarioEmail, setUsuarioEmail] = useState("");

  // === Global search (Navbar) ===
  const [query, setQuery] = useState(typeof window !== "undefined" ? (window.__GLOBAL_SEARCH_QUERY__ || "") : "");
  useEffect(() => {
    const onGlobalSearch = (e) => setQuery(e?.detail?.q ?? "");
    window.addEventListener("global-search", onGlobalSearch);
    return () => window.removeEventListener("global-search", onGlobalSearch);
  }, []);
  const qNorm = (query || "").trim().toLowerCase();

  // Aplica filtro global por destino, camion_para, chofer, chasis, CTG y fecha
  const camionesFiltradosPorDestino = useMemo(() => {
    if (!qNorm) return camionesPorDestino;
    const out = {};
    for (const [dest, arr] of Object.entries(camionesPorDestino)) {
      const arrFiltrada = arr.filter((c) => {
        const destino = (c.destino || dest || "").toLowerCase();
        const para = (c.camion_para || "").toLowerCase();
        const chofer = (c.chofer || "").toLowerCase();
        const chasis = (c.chasis || "").toLowerCase();
        const ctg = (c.ctg || "").toString().toLowerCase();
        const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString("es-AR").toLowerCase() : "";
        const kgCampo = (c.kg_campo ?? "").toString().toLowerCase();
        const kgDestino = (c.kg_destino ?? "").toString().toLowerCase();
        return (
          destino.includes(qNorm) ||
          para.includes(qNorm) ||
          chofer.includes(qNorm) ||
          chasis.includes(qNorm) ||
          ctg.includes(qNorm) ||
          fecha.includes(qNorm) ||
          kgCampo.includes(qNorm) ||
          kgDestino.includes(qNorm)
        );
      });
      if (arrFiltrada.length) out[dest] = arrFiltrada;
    }
    return out;
  }, [camionesPorDestino, qNorm]);

  const destinos = Object.keys(camionesFiltradosPorDestino).sort();

  const listaAMostrar =
    destinoSeleccionado && camionesFiltradosPorDestino[destinoSeleccionado]
      ? camionesFiltradosPorDestino[destinoSeleccionado]
      : Object.values(camionesFiltradosPorDestino).flat();

  // ...rest of the component code...

  return (
    <div>
      {/* ...other UI elements... */}
      {listaAMostrar.length === 0 ? (
        <div className="text-center flex-1 p-6 text-gray-500">
          {qNorm ? "No hay camiones que coincidan con la búsqueda." : "No hay camiones."}
        </div>
      ) : (
        // ...render list of camiones...
        null
      )}
    </div>
  );
}
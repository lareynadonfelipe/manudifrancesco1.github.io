import React, { useEffect, useRef, useState } from "react";
import { Save, X, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

const camposIniciales = {
  id: null, // IMPORTANTE para poder actualizar
  categoria: "",
  nombre: "",
  tipo_persona: "física",
  documento: "",
  direccion: "",
  localidad: "",
  provincia: "",
  pais: "",
  cp: "",
  telefono: "",
  celular: "",
  email: "",
  email_facturacion: "",
  contacto: "",
  cargo_contacto: "",
  observaciones: "",
  banco: "",
  cbu: "",
  alias: "",
  tipo_cuenta: "",
  nro_cuenta: "",
  titular_cuenta: "",
  cuit_titular: "",
  factura_tipo: "",
  factura_ocr_ejemplo: "",
  subcategoria_id: null,
  activo: true,
};

export default function ModalNuevoContacto({
  open,
  onClose,
  onSubmit,
  initialData,
  errores = {},
  cargando = false,
  categoriasCat = [],
  subcategoriasCat = [],
  catLoading = false,
}) {
  const [form, setForm] = useState(camposIniciales);
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...camposIniciales, ...initialData }); // así nunca se pierde el id
    setArchivo(null);
  }, [open, initialData]);

  const refNombre = useRef(null);
  useEffect(() => {
    if (open && refNombre.current) setTimeout(() => refNombre.current.focus(), 120);
  }, [open]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: type === "checkbox" ? checked : value };
      if (name === "categoria") {
        next.subcategoria_id = null;
      }
      return next;
    });
  }

  function handleArchivo(e) {
    const file = e.target.files?.[0];
    if (file) setArchivo(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    console.log("SUBMIT disparado");

    let facturaUrl = form.factura_ocr_ejemplo;

    if (archivo) {
      setSubiendo(true);
      const ext = archivo.name.split(".").pop();
      const filePath = `cliente_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("facturas-tipo-clientes")
        .upload(filePath, archivo, { upsert: true });

      if (error) {
        alert("Error subiendo el archivo: " + error.message);
        setSubiendo(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("facturas-tipo-clientes")
        .getPublicUrl(filePath);
      facturaUrl = publicUrlData.publicUrl;
      setSubiendo(false);
    }

    // el form incluye id para editar, o null para crear
    onSubmit({ ...form, factura_ocr_ejemplo: facturaUrl });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-3xl mx-auto overflow-y-auto p-0 animate-in fade-in slide-in-from-right duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b bg-white rounded-t-2xl sticky top-0 z-10">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <User size={22} className="text-green-700 flex-shrink-0" />
              <span className="text-xl font-black text-gray-900 truncate">
                {form.id ? "Editar contacto" : "Nuevo contacto"}
              </span>
            </div>
            <div className="ml-8 mt-0.5">
              <span className="text-sm text-gray-500 font-medium">
                {form.categoria || "-"}
                {form.subcategoria_id && (() => {
                  const selectedCat = categoriasCat.find((c) => c.nombre === form.categoria);
                  const catId = selectedCat?.id || null;
                  const sub = subcategoriasCat.find((s) => s.id === form.subcategoria_id && (!catId || s.categoria_id === catId));
                  return sub ? ` • ${sub.nombre}` : "";
                })()}
              </span>
            </div>
          </div>
          <button className="btn-icon hover:bg-gray-100" onClick={onClose} type="button" title="Cerrar">
            <X size={22} />
          </button>
        </div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {/* CATEGORÍA */}
            <div className="md:col-span-2">
              <label className="font-medium flex items-center gap-1 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                name="categoria"
                className={`input${errores.categoria ? " border-red-500" : ""}`}
                value={form.categoria || ""}
                onChange={handleChange}
                required
                disabled={catLoading}
              >
                <option value="">{catLoading ? "Cargando categorías..." : "Seleccioná una categoría"}</option>
                {categoriasCat.map((c) => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
              {errores.categoria && <div className="text-red-500 text-xs">{errores.categoria}</div>}
            </div>
            {/* SUBCATEGORÍA */}
            <div className="md:col-span-2">
              <label className="font-medium flex items-center gap-1 mb-1">
                Subcategoría
              </label>
              <select
                name="subcategoria_id"
                className="input"
                value={form.subcategoria_id ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setForm((f) => ({ ...f, subcategoria_id: val }));
                }}
                disabled={!form.categoria || catLoading}
              >
                <option value="">
                  {!form.categoria ? "Seleccioná una categoría primero" : (catLoading ? "Cargando subcategorías..." : "Seleccioná una subcategoría (opcional)")}
                </option>
                {(() => {
                  const selectedCat = categoriasCat.find((c) => c.nombre === form.categoria);
                  const catId = selectedCat?.id || null;
                  return subcategoriasCat
                    .filter((s) => (catId ? s.categoria_id === catId : false))
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ));
                })()}
              </select>
            </div>
            {/* DATOS GENERALES */}
            <div>
              <label className="font-medium mb-1">Nombre o razón social <span className="text-red-500">*</span></label>
              <input name="nombre" ref={refNombre} className={`input${errores.nombre ? " border-red-500" : ""}`} value={form.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez SRL" required />
              {errores.nombre && <div className="text-red-500 text-xs">{errores.nombre}</div>}
            </div>
            <div>
              <label className="font-medium mb-1">Tipo de persona <span className="text-red-500">*</span></label>
              <select name="tipo_persona" className={`input${errores.tipo_persona ? " border-red-500" : ""}`} value={form.tipo_persona} onChange={handleChange} required>
                <option value="física">Física</option>
                <option value="jurídica">Jurídica</option>
              </select>
              {errores.tipo_persona && <div className="text-red-500 text-xs">{errores.tipo_persona}</div>}
            </div>
            <div>
              <label className="font-medium mb-1">Documento (CUIT/CUIL/DNI) <span className="text-red-500">*</span></label>
              <input name="documento" className={`input${errores.documento ? " border-red-500" : ""}`} value={form.documento} onChange={handleChange} placeholder="Ej: 20-00000000-1" required />
              {errores.documento && <div className="text-red-500 text-xs">{errores.documento}</div>}
            </div>
            <div>
              <label className="font-medium mb-1">Observaciones</label>
              <textarea name="observaciones" className="input" value={form.observaciones} onChange={handleChange} rows={2} placeholder="Notas adicionales..." />
            </div>
            {/* DIRECCIÓN */}
            <div>
              <label className="font-medium mb-1">Dirección</label>
              <input name="direccion" className="input" value={form.direccion} onChange={handleChange} placeholder="Dirección" />
            </div>
            <div>
              <label className="font-medium mb-1">Localidad</label>
              <input name="localidad" className="input" value={form.localidad} onChange={handleChange} placeholder="Localidad" />
            </div>
            <div>
              <label className="font-medium mb-1">Provincia</label>
              <input name="provincia" className="input" value={form.provincia} onChange={handleChange} placeholder="Provincia" />
            </div>
            <div>
              <label className="font-medium mb-1">País</label>
              <input name="pais" className="input" value={form.pais} onChange={handleChange} placeholder="País" />
            </div>
            <div>
              <label className="font-medium mb-1">Código postal</label>
              <input name="cp" className="input" value={form.cp} onChange={handleChange} placeholder="Código postal" />
            </div>
            {/* CONTACTO */}
            <div>
              <label className="font-medium mb-1">Teléfono fijo</label>
              <input name="telefono" className="input" value={form.telefono} onChange={handleChange} placeholder="Teléfono fijo" />
            </div>
            <div>
              <label className="font-medium mb-1">Celular</label>
              <input name="celular" className="input" value={form.celular} onChange={handleChange} placeholder="Celular" />
            </div>
            <div>
              <label className="font-medium mb-1">Email principal</label>
              <input name="email" className="input" value={form.email} onChange={handleChange} placeholder="Email principal" />
            </div>
            <div>
              <label className="font-medium mb-1">Email para facturación</label>
              <input name="email_facturacion" className="input" value={form.email_facturacion} onChange={handleChange} placeholder="Email para facturación" />
            </div>
            <div>
              <label className="font-medium mb-1">Contacto principal</label>
              <input name="contacto" className="input" value={form.contacto} onChange={handleChange} placeholder="Contacto principal" />
            </div>
            <div>
              <label className="font-medium mb-1">Cargo contacto</label>
              <input name="cargo_contacto" className="input" value={form.cargo_contacto} onChange={handleChange} placeholder="Cargo contacto" />
            </div>
            {/* BANCARIOS */}
            <div>
              <label className="font-medium mb-1">Banco</label>
              <input name="banco" className="input" value={form.banco} onChange={handleChange} placeholder="Banco" />
            </div>
            <div>
              <label className="font-medium mb-1">CBU</label>
              <input name="cbu" className="input" value={form.cbu} onChange={handleChange} placeholder="CBU" />
            </div>
            <div>
              <label className="font-medium mb-1">Alias CBU</label>
              <input name="alias" className="input" value={form.alias} onChange={handleChange} placeholder="Alias CBU" />
            </div>
            <div>
              <label className="font-medium mb-1">Tipo de cuenta</label>
              <input name="tipo_cuenta" className="input" value={form.tipo_cuenta} onChange={handleChange} placeholder="Tipo de cuenta" />
            </div>
            <div>
              <label className="font-medium mb-1">Nro. de cuenta</label>
              <input name="nro_cuenta" className="input" value={form.nro_cuenta} onChange={handleChange} placeholder="Nro. de cuenta" />
            </div>
            <div>
              <label className="font-medium mb-1">Titular cuenta</label>
              <input name="titular_cuenta" className="input" value={form.titular_cuenta} onChange={handleChange} placeholder="Titular cuenta" />
            </div>
            <div>
              <label className="font-medium mb-1">CUIT titular</label>
              <input name="cuit_titular" className="input" value={form.cuit_titular} onChange={handleChange} placeholder="CUIT titular" />
            </div>
            {/* FACTURACIÓN / OCR */}
            <div>
              <label className="font-medium mb-1">Tipo de factura</label>
              <input name="factura_tipo" className="input" value={form.factura_tipo} onChange={handleChange} placeholder="Tipo de factura" />
            </div>
            <div>
              <label className="font-medium mb-1">Factura tipo (archivo)</label>
              <input type="file" accept="application/pdf,image/*" onChange={handleArchivo} className="input" />
              {archivo && (<span className="text-xs text-green-700">{archivo.name}</span>)}
              {form.factura_ocr_ejemplo && !archivo && (
                <a href={form.factura_ocr_ejemplo} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Ver archivo actual</a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 md:col-span-2">
              <label className="font-medium">Activo</label>
              <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} />
            </div>
          </div>
          <div className="flex gap-2 px-8 py-4 border-t justify-end sticky bottom-0 bg-white rounded-b-2xl">
            <button type="submit" className="btn-primary" disabled={cargando || subiendo}>
              <Save size={18} className="inline mr-1" />
              {form.id ? "Actualizar" : "Crear"}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={cargando || subiendo}>
              <X size={18} className="inline mr-1" /> Cancelar
            </button>
            {subiendo && <span className="text-sm text-gray-500">Subiendo archivo...</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

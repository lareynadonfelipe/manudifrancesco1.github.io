import React, { useState } from "react";
import { User, Edit, Trash2, X, FileText } from "lucide-react";

export default function ModalVerContacto({
  open,
  onClose,
  contacto,
  onEditar,
  onEliminar,
}) {
  if (!open || !contacto) return null;

  const [copiado, setCopiado] = useState(null);

  const handleCopy = (key, value) => {
    navigator.clipboard.writeText(value);
    setCopiado(key);
    setTimeout(() => setCopiado(null), 1200);
  };

  const groups = [
    {
      label: "Datos generales",
      icon: <User size={18} className="text-emerald-700 mr-1" />,
      fields: [
        { key: "tipo_persona", label: "Tipo", copy: true },
        { key: "documento", label: "Documento", copy: true, strong: true },
        { key: "observaciones", label: "Observaciones", copy: true },
      ],
    },
    {
      label: "Dirección",
      icon: (
        <svg width="18" height="18" fill="none" className="text-emerald-700 mr-1" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10c0 7.5 9 11 9 11s9-3.5 9-11A9 9 0 1 0 3 10Zm9 3a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/>
        </svg>
      ),
      fields: [
        { key: "direccion", label: "Dirección", copy: true, strong: true },
        { key: "localidad", label: "Localidad", copy: true },
        { key: "provincia", label: "Provincia", copy: true },
        { key: "pais", label: "País", copy: true },
        { key: "cp", label: "Código postal", copy: true },
      ],
    },
    {
      label: "Contacto",
      icon: <FileText size={18} className="text-emerald-700 mr-1" />,
      fields: [
        { key: "telefono", label: "Teléfono", copy: true },
        { key: "celular", label: "Celular", copy: true },
        { key: "email", label: "Email", copy: true },
        { key: "email_facturacion", label: "Email facturación", copy: true },
        { key: "contacto", label: "Contacto principal", copy: true },
        { key: "cargo_contacto", label: "Cargo contacto", copy: true },
      ],
    },
    {
      label: "Bancarios",
      icon: (
        <svg width="18" height="18" fill="none" className="text-emerald-700 mr-1" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeWidth="2" d="M3 7V5.6A1.6 1.6 0 0 1 4.6 4h14.8A1.6 1.6 0 0 1 21 5.6V7M12 15v-4"/>
          <rect width="16" height="10" x="4" y="8" stroke="currentColor" strokeWidth="2" rx="2"/>
          <path stroke="currentColor" strokeWidth="2" d="M8 19v1.6A1.6 1.6 0 0 0 9.6 22h4.8A1.6 1.6 0 0 0 16 20.6V19"/>
        </svg>
      ),
      fields: [
        { key: "banco", label: "Banco", copy: true },
        { key: "cbu", label: "CBU", copy: true },
        { key: "alias", label: "Alias", copy: true },
        { key: "tipo_cuenta", label: "Tipo de cuenta", copy: true },
        { key: "nro_cuenta", label: "Nro. cuenta", copy: true },
        { key: "titular_cuenta", label: "Titular", copy: true },
        { key: "cuit_titular", label: "CUIT titular", copy: true },
      ],
    },
    {
      label: "Facturación / OCR",
      icon: <FileText size={18} className="text-green-700 mr-1" />,
      fields: [
        { key: "factura_tipo", label: "Tipo de factura", copy: true, strong: true },
        {
          key: "factura_ocr_ejemplo",
          label: "Factura tipo",
          render: (v) =>
            v ? (
              <a href={v} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">
                Ver archivo
              </a>
            ) : (
              <span className="text-gray-300">-</span>
            ),
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div
        className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-3xl mx-auto overflow-y-auto p-0 animate-in fade-in duration-200 flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b bg-white rounded-t-2xl sticky top-0 z-10">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <User size={22} className="text-emerald-700 flex-shrink-0" />
              <span className="text-xl font-black text-gray-900 truncate">{contacto.nombre}</span>
            </div>
            <div className="ml-8 mt-0.5">
              <span className="inline-flex items-center gap-1">
                {contacto.categoria ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-700 text-white border border-emerald-700">
                    {contacto.categoria}
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">-</span>
                )}
                {contacto?.subcategoria?.nombre && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {contacto.subcategoria.nombre}
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-icon hover:bg-emerald-50" title="Editar" onClick={() => onEditar && onEditar(contacto)}>
              <Edit size={18} />
            </button>
            <button className="btn-icon hover:bg-emerald-50" title="Eliminar" onClick={() => onEliminar && onEliminar(contacto)}>
              <Trash2 size={18} />
            </button>
            <button className="btn-icon hover:bg-gray-100" title="Cerrar" onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>
        {/* Datos en secciones */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {groups.map((group, idx) => (
            <section
              key={group.label}
              className={`flex flex-col gap-1 ${idx > 1 ? "pt-2 mt-2 border-t border-gray-200" : ""}`}
            >
              <div className="flex items-center gap-1">
                {group.icon}
                <span className="text-[1rem] font-semibold text-gray-700">{group.label}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {group.fields.map((field) => {
                  const value = contacto[field.key];
                  return (
                    <div
                      key={field.key}
                      className="flex items-center group relative min-h-[22px]"
                      onMouseLeave={() => setCopiado(null)}
                    >
                      <span className="w-32 text-gray-500 text-[0.98rem]">{field.label}:</span>
                      <span
                        className={`font-medium text-[0.98rem] select-text transition-colors ${
                          value ? (field.strong ? "text-gray-900 font-bold" : "text-gray-900") : "text-gray-300"
                        } ${field.copy && value && "group-hover:text-emerald-700 cursor-pointer"}`}
                        onClick={field.copy && value ? () => handleCopy(field.key, value) : undefined}
                      >
                        {field.render ? field.render(value) : value || "-"}
                      </span>
                      {field.copy && value && (
                        <span
                          className={`absolute left-32 px-2 py-[1px] rounded border border-emerald-300 bg-white text-emerald-700 text-xs font-medium shadow-sm transition-all duration-150
                            ${copiado === field.key
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100 pointer-events-none"
                            }`}
                          style={{ borderWidth: "1px", top: "-20px" }}
                        >
                          {copiado === field.key ? "¡Copiado!" : "Copiar"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

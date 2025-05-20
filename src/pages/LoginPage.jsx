// src/pages/LoginPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, AlertTriangle, UserPlus } from "lucide-react";
import { ROLES, ALL_ROLES } from "../constants/roles.js";

// Usuarios iniciales y sus roles
const defaultUsuarios = [
  { email: "ceciliaguirao@gmail.com",     password: "TU_PASS_CECILIA", role: ROLES.VISUALIZADOR },
  { email: "luciadifrancesco1@gmail.com", password: "TU_PASS_LUCIA",   role: ROLES.VISUALIZADOR },
  { email: "jmdifrancesco@gmail.com",     password: "TU_PASS_JM",       role: ROLES.VISUALIZADOR },
  { email: "manudifrancesco1@gmail.com",  password: "larra4156",         role: ROLES.ADMIN },
];

function loadUsuarios() {
  const stored = localStorage.getItem("usuarios");
  return stored ? JSON.parse(stored) : defaultUsuarios;
}

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [usuarios, setUsuarios] = useState(loadUsuarios);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirm, setConfirm] = useState("");
  const [roleNew, setRoleNew] = useState(ROLES.VISUALIZADOR);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
  }, [usuarios]);

  const handleLogin = e => {
    e.preventDefault();
    const u = usuarios.find(u => u.email === correo.trim() && u.password === contrasena);
    if (!u) {
      setError("Correo o contraseña incorrectos");
    } else {
      sessionStorage.setItem(
        "usuario",
        JSON.stringify({ email: u.email, role: u.role })
      );
      // → redirige a '/inicio'
      navigate("/inicio");
    }
  };

  const handleRegister = e => {
    e.preventDefault();
    if (!correo.trim() || !contrasena || !confirm) {
      return setError("Completa todos los campos");
    }
    if (usuarios.some(u => u.email === correo.trim())) {
      return setError("El correo ya existe");
    }
    if (contrasena !== confirm) {
      return setError("Las contraseñas no coinciden");
    }
    setUsuarios([
      ...usuarios,
      { email: correo.trim(), password: contrasena, role: roleNew }
    ]);
    setMode("login");
    setCorreo(""); setContrasena(""); setConfirm(""); setError("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white/75 backdrop-blur-sm border border-gray-200
                      rounded-3xl shadow-xl overflow-hidden">
        <div className="flex flex-col items-center p-8 bg-gradient-to-r from-[#2E8B57] to-[#238249]">
          <Leaf size={40} className="text-white mb-2" />
          <h1 className="text-white text-3xl font-light tracking-wide">
            La Reina – Don Felipe
          </h1>
          <button
            onClick={() => {
              setMode(m => (m === "login" ? "register" : "login"));
              setError(""); setCorreo(""); setContrasena(""); setConfirm("");
            }}
            className="mt-4 inline-flex items-center text-sm text-white/75 hover:text-white transition"
          >
            <UserPlus size={16} className="mr-1" />
            {mode === "login" ? "Crear cuenta" : "Volver a Login"}
          </button>
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          className="p-8 space-y-6"
        >
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200
                            text-red-700 px-4 py-2 rounded-lg">
              <AlertTriangle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="tucorreo@dominio.com"
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-green-400 transition-shadow"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={contrasena}
              onChange={e => setContrasena(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-green-400 transition-shadow"
            />
          </div>

          {mode === "register" && (
            <>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-green-400 transition-shadow"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Rol
                </label>
                <select
                  value={roleNew}
                  onChange={e => setRoleNew(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-green-400 transition-shadow"
                >
                  {ALL_ROLES.map(r => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center py-3 bg-green-600 text-white text-base font-medium rounded-lg
                       shadow-md hover:bg-green-700 hover:shadow-lg transition duration-150"
          >
            {mode === "login" ? "Ingresar" : "Registrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

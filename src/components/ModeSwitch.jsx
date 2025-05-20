import { useUIStore } from "@/store/uiStore";

const ModeSwitch = () => {
  const { mode, toggleMode } = useUIStore();

  return (
    <button
      onClick={toggleMode}
      className="bg-white text-primary font-medium py-1 px-3 rounded-xl shadow hover:bg-gray-100 transition"
    >
      {mode === "lector" ? "Modo Editor" : "Modo Lector"}
    </button>
  );
};

export default ModeSwitch;

import { create } from 'zustand';

export const useUIStore = create((set) => ({
  mode: "lector", // Estado inicial
  setMode: (mode) => set({ mode }), // Cambiar a un modo específico
  toggleMode: () =>
    set((state) => ({
      mode: state.mode === "lector" ? "editor" : "lector",
    })),
}));

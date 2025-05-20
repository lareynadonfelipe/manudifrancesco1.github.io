import { create } from "zustand";

export const useCampaniaStore = create((set) => ({
  campaniaSeleccionada: "",
  setCampaniaSeleccionada: (campania) => set({ campaniaSeleccionada: campania }),
}));

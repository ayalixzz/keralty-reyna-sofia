import { create } from 'zustand'

interface UIState {
  sidebarAbierto: boolean
  toggleSidebar: () => void
  setSidebar: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarAbierto: true,
  toggleSidebar: () => set((s) => ({ sidebarAbierto: !s.sidebarAbierto })),
  setSidebar: (v) => set({ sidebarAbierto: v }),
}))

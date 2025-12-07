import { create } from 'zustand'
import * as THREE from 'three'

interface AppState {
  // 0.0 = CHAOS (Unleashed), 1.0 = FORMED (Tree)
  formationProgress: number 
  setFormationProgress: (progress: number) => void

  // Camera control via hand movement
  handPosition: { x: number, y: number }
  setHandPosition: (x: number, y: number) => void
  
  // Debug/Status
  isHandDetected: boolean
  setHandDetected: (detected: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  formationProgress: 1.0, // Start formed
  setFormationProgress: (progress) => set({ formationProgress: progress }),
  
  handPosition: { x: 0, y: 0 },
  setHandPosition: (x, y) => set({ handPosition: { x, y } }),

  isHandDetected: false,
  setHandDetected: (detected) => set({ isHandDetected: detected }),
}))




import * as THREE from 'three'

export const TREE_HEIGHT = 12
export const TREE_RADIUS = 5

// Helper to generate a random point on a cone surface (The Tree)
export const getTreePosition = (ratio: number, yOffset: number = -4) => {
  // ratio is 0 to 1 (bottom to top)
  // Actually, let's distribute them randomly but constrained to the cone shape
  const y = (Math.random() * TREE_HEIGHT) + yOffset
  const normalizedY = (y - yOffset) / TREE_HEIGHT // 0 at bottom, 1 at top
  const currentRadius = TREE_RADIUS * (1 - normalizedY)
  
  const theta = Math.random() * Math.PI * 2
  const x = currentRadius * Math.cos(theta)
  const z = currentRadius * Math.sin(theta)
  
  return new THREE.Vector3(x, y, z)
}

// Helper to generate a random point inside a sphere (Chaos)
export const getChaosPosition = (radius: number = 15) => {
  const u = Math.random()
  const v = Math.random()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  const r = Math.cbrt(Math.random()) * radius
  
  const x = r * Math.sin(phi) * Math.cos(theta)
  const y = r * Math.sin(phi) * Math.sin(theta)
  const z = r * Math.cos(phi)
  
  return new THREE.Vector3(x, y, z)
}




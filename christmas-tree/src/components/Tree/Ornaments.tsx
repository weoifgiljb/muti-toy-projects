import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getChaosPosition, getTreePosition } from '../../utils/math'
import { useStore } from '../../store'

interface InstancedProps {
  count: number
  geometry: THREE.BufferGeometry
  material: THREE.Material
  scaleRange: [number, number]
  lerpSpeed: number
  yOffset?: number
  colorSet?: string[]
}

const InstancedItems = ({ count, geometry, material, scaleRange, lerpSpeed, yOffset = -4, colorSet }: InstancedProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const formationProgress = useStore(state => state.formationProgress)
  const currentProgress = useRef(formationProgress) // Internal smoothed progress

  // Pre-calculate positions
  const { chaosPositions, targetPositions, scales, colors, rotationSpeeds } = useMemo(() => {
    const chaosPositions = new Float32Array(count * 3)
    const targetPositions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const rotationSpeeds = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const tempColor = new THREE.Color()

    for (let i = 0; i < count; i++) {
      // Chaos
      const c = getChaosPosition(18)
      chaosPositions[i * 3] = c.x
      chaosPositions[i * 3 + 1] = c.y
      chaosPositions[i * 3 + 2] = c.z

      // Target (Tree)
      // Ornaments usually sit on the outer edge, so we push radius slightly
      const t = getTreePosition(Math.random(), yOffset)
      // Push out slightly to sit on leaves
      const dist = Math.sqrt(t.x*t.x + t.z*t.z)
      const factor = 1.1 // slightly outside
      targetPositions[i * 3] = t.x * factor
      targetPositions[i * 3 + 1] = t.y
      targetPositions[i * 3 + 2] = t.z * factor

      // Scale
      scales[i] = Math.random() * (scaleRange[1] - scaleRange[0]) + scaleRange[0]

      // Rotation Speed
      rotationSpeeds[i*3] = (Math.random() - 0.5) * 2
      rotationSpeeds[i*3+1] = (Math.random() - 0.5) * 2
      rotationSpeeds[i*3+2] = (Math.random() - 0.5) * 2

      // Color
      if (colorSet) {
        tempColor.set(colorSet[Math.floor(Math.random() * colorSet.length)])
        colors[i * 3] = tempColor.r
        colors[i * 3 + 1] = tempColor.g
        colors[i * 3 + 2] = tempColor.b
      } else {
        colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      }
    }
    return { chaosPositions, targetPositions, scales, rotationSpeeds, colors }
  }, [count, scaleRange, yOffset, colorSet])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    if (meshRef.current && colorSet) {
        for (let i = 0; i < count; i++) {
            meshRef.current.setColorAt(i, new THREE.Color(colors[i*3], colors[i*3+1], colors[i*3+2]))
        }
        meshRef.current.instanceColor!.needsUpdate = true
    }
  }, [colors, count, colorSet])

  useFrame((state, delta) => {
    if (!meshRef.current) return

    // Smooth step the global progress locally based on weight (lerpSpeed)
    // Heavier objects (lower lerpSpeed) react slower
    currentProgress.current = THREE.MathUtils.lerp(currentProgress.current, formationProgress, delta * lerpSpeed)
    
    const t = currentProgress.current
    // Cubic ease
    const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    for (let i = 0; i < count; i++) {
      const cx = chaosPositions[i * 3]
      const cy = chaosPositions[i * 3 + 1]
      const cz = chaosPositions[i * 3 + 2]

      const tx = targetPositions[i * 3]
      const ty = targetPositions[i * 3 + 1]
      const tz = targetPositions[i * 3 + 2]

      // Position Lerp
      dummy.position.set(
        THREE.MathUtils.lerp(cx, tx, easeT),
        THREE.MathUtils.lerp(cy, ty, easeT),
        THREE.MathUtils.lerp(cz, tz, easeT)
      )

      // Rotation (Spin in chaos, stabilize in tree)
      if (t < 0.9) {
          dummy.rotation.x += rotationSpeeds[i*3] * delta
          dummy.rotation.y += rotationSpeeds[i*3+1] * delta
          dummy.rotation.z += rotationSpeeds[i*3+2] * delta
      } else {
          // Align to up vector or just stabilize
          dummy.rotation.set(0,0,0) // Simplify for now
      }

      dummy.scale.setScalar(scales[i])
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} />
  )
}

export const Ornaments = () => {
  // Materials
  const goldMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#FFD700',
    metalness: 1,
    roughness: 0.05, // Sharper reflections
    clearcoat: 1,
    emissive: '#FFAA00',
    emissiveIntensity: 0.5 // Increased glow
  }), [])

  const giftMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    roughness: 0.2,
    metalness: 0.6,
    emissive: '#333333', // Slight ambient glow for gifts
    emissiveIntensity: 0.2
  }), [])

  const lightMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    toneMapped: false
  }), [])

  // Geometries
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 16), [])
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  
  return (
    <group>
      {/* Heavy Gifts - Slow Lerp */}
      <InstancedItems 
        count={50} 
        geometry={boxGeo} 
        material={giftMaterial} 
        scaleRange={[0.4, 0.8]} 
        lerpSpeed={0.8}
        colorSet={['#D4AF37', '#C41E3A', '#000000', '#FFFFFF']} // Gold, Red, Black, White
        yOffset={-5}
      />

      {/* Gold Balls - Medium Lerp */}
      <InstancedItems 
        count={150} 
        geometry={sphereGeo} 
        material={goldMaterial} 
        scaleRange={[0.2, 0.5]} 
        lerpSpeed={1.5}
        yOffset={-4}
      />

      {/* Lights - Fast Lerp, High Emissive */}
      <InstancedItems 
        count={400} 
        geometry={sphereGeo} 
        material={lightMaterial} 
        scaleRange={[0.05, 0.1]} 
        lerpSpeed={3.0} 
        colorSet={['#FFD700', '#FFFFFF', '#FF0000']} // Warm lights
        yOffset={-4}
      />
    </group>
  )
}




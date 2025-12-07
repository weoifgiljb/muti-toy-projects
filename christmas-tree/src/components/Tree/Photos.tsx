import { useMemo } from 'react'
import * as THREE from 'three'
import { InstancedItems } from './Ornaments' // Reuse the logic

// Creating a custom component for Photos to reuse the InstancedItems logic 
// but we need to export InstancedItems first or copy it. 
// Since I didn't export it in the previous step (it was internal), 
// I will just redefine a simplified version here for Photos specifically
// or better yet, I'll update Ornaments.tsx to export it? 
// No, I'll just copy/paste the logic for speed and add the specific Photo texture logic.

import { useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { getChaosPosition, getTreePosition } from '../../utils/math'
import { useStore } from '../../store'

export const Photos = () => {
  const count = 60
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const formationProgress = useStore(state => state.formationProgress)
  const currentProgress = useRef(formationProgress)

  // Use a canvas to draw a polaroid texture dynamically
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 300
    const ctx = canvas.getContext('2d')!
    
    // Background White
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 256, 300)
    
    // Black square for photo
    ctx.fillStyle = '#111111'
    ctx.fillRect(16, 16, 224, 224)
    
    // Add some "Trump" text or generic luxury text
    ctx.font = '20px Times New Roman'
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.fillText('Grand Holiday', 128, 275)

    return new THREE.CanvasTexture(canvas)
  }, [])

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
    roughness: 0.8
  }), [texture])
  
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1.2), [])

  const { chaosPositions, targetPositions, scales, rotationSpeeds } = useMemo(() => {
    const chaosPositions = new Float32Array(count * 3)
    const targetPositions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const rotationSpeeds = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
        // Chaos
        const c = getChaosPosition(16)
        chaosPositions[i*3] = c.x; chaosPositions[i*3+1] = c.y; chaosPositions[i*3+2] = c.z;
        
        // Tree
        const t = getTreePosition(Math.random(), -4)
        const factor = 1.15 // Sit further out than ornaments
        targetPositions[i*3] = t.x * factor; targetPositions[i*3+1] = t.y; targetPositions[i*3+2] = t.z * factor;
        
        scales[i] = 1.5 + Math.random() // Big photos
        
        rotationSpeeds[i*3] = (Math.random() - 0.5) * 5
        rotationSpeeds[i*3+1] = (Math.random() - 0.5) * 5
        rotationSpeeds[i*3+2] = (Math.random() - 0.5) * 5
    }
    return { chaosPositions, targetPositions, scales, rotationSpeeds }
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((state, delta) => {
    if (!meshRef.current) return
    
    // Medium lerp speed
    currentProgress.current = THREE.MathUtils.lerp(currentProgress.current, formationProgress, delta * 1.0)
    const t = currentProgress.current
    const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    for (let i = 0; i < count; i++) {
        const cx = chaosPositions[i*3]; const cy = chaosPositions[i*3+1]; const cz = chaosPositions[i*3+2];
        const tx = targetPositions[i*3]; const ty = targetPositions[i*3+1]; const tz = targetPositions[i*3+2];

        dummy.position.set(
            THREE.MathUtils.lerp(cx, tx, easeT),
            THREE.MathUtils.lerp(cy, ty, easeT),
            THREE.MathUtils.lerp(cz, tz, easeT)
        )

        // Always face slightly out or tumble
        if (t < 0.8) {
            dummy.rotation.x += rotationSpeeds[i*3] * delta
            dummy.rotation.y += rotationSpeeds[i*3+1] * delta
        } else {
            // Make them face center(ish) but messy
            dummy.lookAt(0, dummy.position.y, 0)
            dummy.rotation.y += Math.PI // Flip to face out
            // Add some "hanging" tilt
            dummy.rotation.z = Math.sin(state.clock.elapsedTime + i) * 0.1
        }

        dummy.scale.setScalar(scales[i])
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />
}




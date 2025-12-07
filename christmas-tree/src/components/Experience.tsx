import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, ContactShadows, Stars, MeshReflectorMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useStore } from '../store'
import { Foliage } from './Tree/Foliage'
import { Ornaments } from './Tree/Ornaments'
import { Photos } from './Tree/Photos'

const CameraRig = () => {
  const { camera, gl } = useThree()
  const handPosition = useStore(state => state.handPosition)
  
  // Smoothing vector
  const targetPos = useRef(new THREE.Vector3(0, 4, 20))
  // User interaction offsets
  const azimuthOffset = useRef(0)
  const heightOffset = useRef(0)
  const radius = useRef(20)
  const dragState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startAzimuth: 0,
    startHeight: 0,
  })

  // Pointer drag + wheel zoom
  useEffect(() => {
    const element = gl.domElement
    const onPointerDown = (e: PointerEvent) => {
      dragState.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startAzimuth: azimuthOffset.current,
        startHeight: heightOffset.current,
      }
      element.style.cursor = 'grabbing'
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragState.current.active) return
      const dx = (e.clientX - dragState.current.startX) / window.innerWidth
      const dy = (e.clientY - dragState.current.startY) / window.innerHeight
      azimuthOffset.current = dragState.current.startAzimuth + dx * Math.PI * 2 // 360deg orbit
      heightOffset.current = THREE.MathUtils.clamp(
        dragState.current.startHeight + dy * 8,
        -6,
        6
      )
    }

    const endDrag = () => {
      dragState.current.active = false
      element.style.cursor = 'grab'
    }

    const onWheel = (e: WheelEvent) => {
      radius.current = THREE.MathUtils.clamp(
        radius.current + e.deltaY * 0.02,
        8,
        40
      )
      e.preventDefault()
    }

    element.style.cursor = 'grab'
    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    element.addEventListener('pointerleave', endDrag)
    element.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      element.removeEventListener('pointerleave', endDrag)
      element.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  useFrame((state, delta) => {
    // Map hand position to camera orbit
    // hand X (-1 to 1) -> azimuth angle
    // hand Y (-1 to 1) -> polar angle offset
    
    // Base radius
    const baseRadius = radius.current
    const azimuth = handPosition.x * 1.5 + azimuthOffset.current // +/- 1.5 radians + user orbit
    const height = 4 + (handPosition.y * 5) + heightOffset.current // 4 base, +/- 5 + user drag
    
    const x = Math.sin(azimuth) * baseRadius
    const z = Math.cos(azimuth) * baseRadius
    const y = height

    // Smooth transition
    targetPos.current.lerp(new THREE.Vector3(x, y, z), delta * 2)
    
    camera.position.copy(targetPos.current)
    camera.lookAt(0, 4, 0)
  })

  return null
}

export const Experience = () => {
  return (
    <>
      <color attach="background" args={['#011a02']} />
      
      <CameraRig />

      {/* Lighting */}
      <ambientLight intensity={0.5} color="#046307" />
      <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
      <spotLight 
        position={[0, 20, 0]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        color="#FFD700" 
        castShadow 
      />
      
      {/* Environment */}
      <Environment preset="lobby" environmentIntensity={0.8} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color="#050505"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* The Tree System */}
      <group position={[0, 0, 0]}>
        <Foliage />
        <Ornaments />
        <Photos />
      </group>

      {/* Post Processing REMOVED for Stability */}
      {/* Enhanced lighting and materials are used instead of Bloom */}
    </>
  )
}



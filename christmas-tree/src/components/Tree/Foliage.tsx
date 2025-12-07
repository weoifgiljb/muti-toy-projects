import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getChaosPosition, getTreePosition } from '../../utils/math'
import { useStore } from '../../store'

const COUNT = 15000 // Number of needles

const vertexShader = `
  uniform float uTime;
  uniform float uProgress;
  
  attribute vec3 aTargetPos;
  attribute float aRandom;
  
  varying float vAlpha;

  // Ease function for smooth transitions
  float cubicInOut(float t) {
    return t < 0.5
      ? 4.0 * t * t * t
      : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    // Current position (from buffer) is the CHAOS position
    vec3 chaosPos = position;
    vec3 targetPos = aTargetPos;
    
    // Add some noise/movement based on time and randomness
    float noise = sin(uTime * 2.0 + aRandom * 10.0) * 0.2;
    
    // Lerp based on progress
    float t = cubicInOut(uProgress);
    vec3 finalPos = mix(chaosPos, targetPos, t);
    
    // Add a breathing effect when formed
    if (t > 0.9) {
        finalPos.x += cos(uTime + finalPos.y) * 0.05;
        finalPos.z += sin(uTime + finalPos.y) * 0.05;
    }

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    
    // Size attenuation
    gl_PointSize = (4.0 * aRandom + 2.0) * (20.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
    
    // Pass alpha to fragment
    vAlpha = 0.6 + 0.4 * sin(uTime * 3.0 + aRandom * 10.0);
  }
`

const fragmentShader = `
  varying float vAlpha;

  void main() {
    // Circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;
    
    // Emerald Green with a hint of gold
    vec3 color = vec3(0.02, 0.4, 0.05); // Base Emerald
    
    // Sparkle center
    if (dist < 0.1) {
        color = vec3(1.0, 0.9, 0.5); // Gold core
    }

    gl_FragColor = vec4(color, vAlpha);
  }
`

export const Foliage = () => {
  const meshRef = useRef<THREE.Points>(null)
  const formationProgress = useStore(state => state.formationProgress)
  const lerpedProgress = useRef(formationProgress)

  const { positions, targetPositions, randoms } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3) // Chaos
    const targetPositions = new Float32Array(COUNT * 3) // Tree
    const randoms = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      // Chaos Pos
      const chaos = getChaosPosition(20)
      positions[i * 3] = chaos.x
      positions[i * 3 + 1] = chaos.y
      positions[i * 3 + 2] = chaos.z

      // Tree Pos
      const tree = getTreePosition(Math.random())
      targetPositions[i * 3] = tree.x
      targetPositions[i * 3 + 1] = tree.y
      targetPositions[i * 3 + 2] = tree.z

      randoms[i] = Math.random()
    }

    return { positions, targetPositions, randoms }
  }, [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 1 }
  }), [])

  useFrame((state, delta) => {
    if (meshRef.current) {
        // Smooth lerp for the uniform
        lerpedProgress.current = THREE.MathUtils.lerp(lerpedProgress.current, formationProgress, delta * 2)
        
        // Update uniforms
        const material = meshRef.current.material as THREE.ShaderMaterial
        material.uniforms.uTime.value = state.clock.elapsedTime
        material.uniforms.uProgress.value = lerpedProgress.current
    }
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={COUNT}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={COUNT}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}




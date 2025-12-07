import React, { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader } from '@react-three/drei'
import { useControls, Leva } from 'leva'
import { Experience } from './components/Experience'
import HandTracker from './components/HandTracker'
import { useStore } from './store'

const DebugControls = () => {
  const setFormationProgress = useStore(state => state.setFormationProgress)
  const setHandPosition = useStore(state => state.setHandPosition)
  const isHandDetected = useStore(state => state.isHandDetected)

  // Only show controls if no hand is detected (Fallback Mode)
  const { progress, handX, handY } = useControls('Manual Override (No Camera)', {
    progress: { value: 1, min: 0, max: 1, step: 0.01, label: 'Tree Formation' },
    handX: { value: 0, min: -1, max: 1, step: 0.1, label: 'Rotate X' },
    handY: { value: 0, min: -1, max: 1, step: 0.1, label: 'Rotate Y' },
  }, { collapsed: false })

  useEffect(() => {
    if (!isHandDetected) {
      setFormationProgress(progress)
      setHandPosition(handX, handY)
    }
  }, [progress, handX, handY, isHandDetected, setFormationProgress, setHandPosition])

  return null
}

const UI = () => {
  const isHandDetected = useStore(state => state.isHandDetected)
  const progress = useStore(state => state.formationProgress)
  
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
      <div className="flex justify-between items-start">
        <div>
           <h1 className="text-4xl md:text-6xl text-trump-gold font-bold drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] tracking-wider">
            GRAND HOLIDAY
          </h1>
          <h2 className="text-xl md:text-2xl text-trump-emerald font-semibold mt-2 tracking-widest uppercase">
            Interactive Experience
          </h2>
        </div>
        
        <div className="text-right">
          <div className={`transition-colors duration-500 ${isHandDetected ? 'text-green-500' : 'text-red-500'} font-mono text-sm`}>
            SENSOR STATUS: {isHandDetected ? 'ACTIVE' : 'MANUAL OVERRIDE'}
          </div>
          <div className="text-white/50 text-xs mt-1">
            Integrity: {((progress) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="text-center space-y-2 mb-8">
        {!isHandDetected && (
            <div className="text-white/60 text-sm bg-black/50 inline-block px-4 py-2 rounded border border-white/10">
                Camera not active. Use controls in top-right to simulate interaction.
            </div>
        )}
        {isHandDetected && (
            <div className="flex justify-center gap-8 text-trump-gold/80 font-serif italic text-lg">
                <span>Open Hand: <strong className="text-white not-italic">UNLEASH</strong></span>
                <span>Closed Hand: <strong className="text-white not-italic">FORM</strong></span>
                <span>Move Hand: <strong className="text-white not-italic">ROTATE</strong></span>
            </div>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden selection:bg-trump-gold selection:text-black">
      <HandTracker />
      
      {/* Configure Leva to be visible */}
      <Leva theme={{ colors: { accent: '#FFD700', highlight3: '#046307' } }} />
      <DebugControls />

      <Canvas
        className="absolute inset-0"
        style={{ width: '100vw', height: '100vh' }}
        shadows
        camera={{ position: [0, 0, 20], fov: 45 }}
        gl={{ antialias: false, stencil: false, alpha: false }}
        dpr={[1, 1.5]} // Optimization
      >
        <Suspense fallback={null}>
            <Experience />
        </Suspense>
      </Canvas>
      
      <UI />
      <Loader 
        containerStyles={{ background: '#011a02' }}
        innerStyles={{ background: '#333', width: '200px' }}
        barStyles={{ background: '#FFD700', height: '5px' }}
        dataStyles={{ color: '#FFD700', fontFamily: 'serif' }}
      />
    </div>
  )
}

export default App

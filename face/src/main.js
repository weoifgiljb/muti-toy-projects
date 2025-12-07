import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

// --- Scene Setup ---
const scene = new THREE.Scene()
// Fog to blend edges into background
scene.fog = new THREE.FogExp2(0xf7f7f5, 0.05)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
document.querySelector('#app').innerHTML = ''
document.querySelector('#app').appendChild(renderer.domElement)

// --- Post Processing (Bloom) ---
const renderScene = new RenderPass(scene, camera)

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
bloomPass.threshold = 0.5 // Higher threshold to only glow very bright things
bloomPass.strength = 0.4 // Much lower strength
bloomPass.radius = 0.5

const outputPass = new OutputPass()

const composer = new EffectComposer(renderer)
composer.addPass(renderScene)
composer.addPass(bloomPass)
composer.addPass(outputPass)

// --- Aurora Sphere Shader ---
// (Refined for softer, flowier look)
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  
  // High quality noise
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n = p.x + p.y * 57.0 + 113.0 * p.z;
    return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                   mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
               mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                   mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
  }

  // FBM
  float fbm(vec3 p) {
    float f = 0.0;
    mat3 m = mat3( 0.00,  0.80,  0.60,
                  -0.80,  0.36, -0.48,
                  -0.60, -0.48,  0.64 );
    f += 0.5000 * noise(p); p = m * p * 2.02;
    f += 0.2500 * noise(p); p = m * p * 2.03;
    f += 0.1250 * noise(p); p = m * p * 2.01;
    return f;
  }

  void main() {
    vec3 viewDir = normalize(vViewPosition); // Camera to point
    vec3 normal = normalize(vNormal);

    // Fresnel
    float fresnel = dot(viewDir, normal);
    fresnel = clamp(fresnel, 0.0, 1.0);
    float edge = 1.0 - fresnel;
    
    // Aurora Noise
    float t = uTime * 0.2; // Slower motion
    vec3 p = vPosition * 0.8;
    float n = fbm(p + vec3(0.0, t, 0.0)); // Rising motion
    
    // Warping
    float n2 = fbm(p + n * 2.5 + vec3(t * 0.3, 0.0, 0.0));

    // Colors - Usings uniforms
    vec3 col = mix(uColor1, uColor2, n2);
    col = mix(col, uColor3, smoothstep(0.4, 0.9, n));
    
    // Soft misty edges - Alpha
    // Reduce center opacity to let it feel diaphanous
    float alpha = 0.6 + 0.3 * n2;
    
    // Make edges glow brighter but fade out transparency
    // Less white add, more color glow
    col += vec3(0.2, 0.5, 0.9) * pow(edge, 3.0);
    
    // Soft blend to background at very edge
    float opacity = smoothstep(0.0, 0.5, fresnel);
    
    gl_FragColor = vec4(col, alpha * opacity);
  }
`

const sphereGeometry = new THREE.SphereGeometry(1.2, 128, 128)
const sphereMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color(0.1, 0.2, 0.6) }, // Deep Blue
    uColor2: { value: new THREE.Color(0.4, 0.1, 0.7) }, // Violet
    uColor3: { value: new THREE.Color(0.0, 0.6, 0.8) }  // Cyan
  },
  transparent: true,
  side: THREE.FrontSide,
})

const characterGroup = new THREE.Group()
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
characterGroup.add(sphere)

// --- Facial Features (Thick Glowing Tubes) ---
const faceGroup = new THREE.Group()
faceGroup.scale.set(1.3, 1.3, 1.3)

const tubeMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
})
// We rely on Bloom to make 0xffffff glow heavily.

// --- Eyebrows System ---
let leftEyebrowMesh, rightEyebrowMesh
let eyebrowState = {
  tilt: 0, // 0 = Neutral, 1 = Angry (inward tilt)
  lift: 0  // 0 = Normal, 1 = Surprised (Higher)
}

function createEyebrowGeometry(isLeft, tilt, lift) {
  const width = 0.3
  const liftOffset = lift * 0.15
  const tiltOffset = tilt * 0.15 // Inner point goes down

  // Base Positions
  const xStart = isLeft ? -0.5 : 0.2
  const xEnd = isLeft ? -0.2 : 0.5

  // Angry: inner points (xEnd for Left, xStart for Right) go down
  // Wait, inner points are: Right side of Left brow, Left side of Right brow.

  let yStart = 0.3 + liftOffset
  let yMid = 0.55 + liftOffset
  let yEnd = 0.35 + liftOffset

  if (isLeft) {
    // Left Brow: Start(-0.5) -> End(-0.2 is inner)
    yEnd -= tiltOffset // Inner drops
    yStart += tiltOffset * 0.5 // Outer raises slightly
  } else {
    // Right Brow: Start(0.2 is inner) -> End(0.5)
    yStart -= tiltOffset
    yEnd += tiltOffset * 0.5
  }

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(xStart, yStart, 1.0),
    new THREE.Vector3(xStart + (xEnd - xStart) / 2, yMid, 1.05),
    new THREE.Vector3(xEnd, yEnd, 1.05)
  )

  return new THREE.TubeGeometry(curve, 20, 0.015, 8, false)
}

// Initial Eyebrows
leftEyebrowMesh = new THREE.Mesh(createEyebrowGeometry(true, 0, 0), tubeMaterial)
rightEyebrowMesh = new THREE.Mesh(createEyebrowGeometry(false, 0, 0), tubeMaterial)
faceGroup.add(leftEyebrowMesh)
faceGroup.add(rightEyebrowMesh)

// 2. Eyes
const eyeGeo = new THREE.SphereGeometry(0.035, 16, 16)
const leftEye = new THREE.Mesh(eyeGeo, tubeMaterial)
leftEye.position.set(-0.25, 0.15, 0.95)
faceGroup.add(leftEye)

const rightEye = new THREE.Mesh(eyeGeo, tubeMaterial)
rightEye.position.set(0.25, 0.15, 0.95)
faceGroup.add(rightEye)

// Helper for nose
function createThickLine(curve) {
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.015, 8, false), tubeMaterial)
}

// 3. Nose "L" Shaped
const noseCurve = new THREE.CurvePath()
const vLine = new THREE.LineCurve3(new THREE.Vector3(-0.02, 0.15, 1.0), new THREE.Vector3(-0.02, -0.10, 1.05))
const hLine = new THREE.LineCurve3(new THREE.Vector3(-0.02, -0.10, 1.05), new THREE.Vector3(0.08, -0.10, 1.04))
faceGroup.add(createThickLine(vLine))
faceGroup.add(createThickLine(hLine))

// 4. Dynamic Mouth
let mouthMesh
let mouthState = {
  open: 0,
  smile: 1
}

// Function to generate mouth curve based on parameters
function createMouthGeometry(openness, smileFactor) {
  const width = 0.2
  const yPos = -0.3
  const zPos = 1.05

  if (openness > 0.5) {
    const radius = 0.05 + openness * 0.05
    const curve = new THREE.EllipseCurve(0, yPos, radius, radius * 1.2, 0, 2 * Math.PI, false, 0)
    const points = curve.getPoints(32).map(p => new THREE.Vector3(p.x, p.y, zPos))
    return new THREE.CatmullRomCurve3(points, true)
  } else {
    // Smile Shape
    // smileFactor: 1 = Smile, 0 = Flat, -1 = Frown
    const smileDepth = 0.05 * smileFactor + 0.05
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-width / 2, yPos + 0.05, zPos),
      new THREE.Vector3(0, yPos - smileDepth, zPos + 0.05),
      new THREE.Vector3(width / 2, yPos + 0.05, zPos)
    )
    return curve
  }
}

// Initial Mouth
mouthMesh = new THREE.Mesh(new THREE.TubeGeometry(createMouthGeometry(0, 1), 32, 0.015, 8, false), tubeMaterial)
faceGroup.add(mouthMesh)

characterGroup.add(faceGroup)
scene.add(characterGroup)

// --- Ambient Particles / Dust (for ambiance) ---
const particlesGeo = new THREE.BufferGeometry()
const particleCount = 200
const posArray = new Float32Array(particleCount * 3)
for (let i = 0; i < particleCount * 3; i++) {
  posArray[i] = (Math.random() - 0.5) * 10
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
const particleMat = new THREE.PointsMaterial({
  size: 0.03,
  color: 0xaaccff,
  transparent: true,
  opacity: 0.4,
  blending: THREE.AdditiveBlending
})
const particles = new THREE.Points(particlesGeo, particleMat)
scene.add(particles)


// --- Animation & Interaction ---
const clock = new THREE.Clock()

// Interaction State
const mouse = new THREE.Vector2()
const targetRotation = new THREE.Vector2()
let isMouseDown = false

document.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
})

document.addEventListener('mousedown', () => { isMouseDown = true })
document.addEventListener('mouseup', () => { isMouseDown = false })

// Form Control Interaction
// Form Control Interaction
const emotionSelect = document.querySelector('#emotion-select')
const colorSelect = document.querySelector('#color-select')
const intensityRange = document.querySelector('#intensity-range')
const speedRange = document.querySelector('#speed-range')

let currentEmotion = 'happy'
let currentColor = 'aurora'
let currentIntensity = 1.0
let currentSpeed = 1.0

// Color Palettes
const Palettes = {
  aurora: [new THREE.Color(0.1, 0.2, 0.6), new THREE.Color(0.4, 0.1, 0.7), new THREE.Color(0.0, 0.6, 0.8)],
  fire: [new THREE.Color(0.8, 0.1, 0.1), new THREE.Color(0.9, 0.4, 0.0), new THREE.Color(1.0, 0.8, 0.2)],
  ocean: [new THREE.Color(0.0, 0.1, 0.3), new THREE.Color(0.0, 0.4, 0.6), new THREE.Color(0.0, 0.9, 0.7)],
  nature: [new THREE.Color(0.1, 0.3, 0.1), new THREE.Color(0.3, 0.6, 0.2), new THREE.Color(0.8, 0.9, 0.3)],
  mystic: [new THREE.Color(0.2, 0.0, 0.3), new THREE.Color(0.8, 0.0, 0.6), new THREE.Color(1.0, 0.6, 0.9)],
}

function updateColor() {
  if (Palettes[currentColor]) {
    const [c1, c2, c3] = Palettes[currentColor]
    sphereMaterial.uniforms.uColor1.value.copy(c1)
    sphereMaterial.uniforms.uColor2.value.copy(c2)
    sphereMaterial.uniforms.uColor3.value.copy(c3)
  }
}

// Event Listeners - Realtime
emotionSelect.addEventListener('input', (e) => { currentEmotion = e.target.value })
colorSelect.addEventListener('input', (e) => {
  currentColor = e.target.value
  updateColor()
})
intensityRange.addEventListener('input', (e) => { currentIntensity = parseFloat(e.target.value) })
speedRange.addEventListener('input', (e) => { currentSpeed = parseFloat(e.target.value) })

// Constants for emotions { smile, open, browTilt, browLift, squint }
const EmotionConfig = {
  neutral: { smile: 0, open: 0, tilt: 0, lift: 0, squint: 0 },
  happy: { smile: 1, open: 0, tilt: 0, lift: 0.2, squint: 0 },
  surprised: { smile: 0, open: 0.8, tilt: 0, lift: 1.0, squint: 0 },
  angry: { smile: -0.8, open: 0, tilt: 0.5, lift: -0.1, squint: 0.5 },
  suspicious: { smile: -0.2, open: 0, tilt: 0.5, lift: 0, squint: 0.8 },
  sad: { smile: -1, open: 0, tilt: -0.5, lift: 0.2, squint: 0.2 },
  cry: { smile: -1.5, open: 0.2, tilt: -0.8, lift: 0.3, squint: 0.7 }
}

// Tear System
const tearGeo = new THREE.SphereGeometry(0.02, 8, 8)
const tearMat = new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.8 })
const leftTear = new THREE.Mesh(tearGeo, tearMat)
const rightTear = new THREE.Mesh(tearGeo, tearMat)
leftTear.visible = false
rightTear.visible = false
faceGroup.add(leftTear)
faceGroup.add(rightTear)

let tearY = 0

// Blinking logic
let blinkTimer = 0
let isBlinking = false

// Smooth transitions
let currentOpenness = 0
let currentSmile = 1
let currentBrowTilt = 0
let currentBrowLift = 0
let currentSquint = 0

function animate() {
  requestAnimationFrame(animate)

  // Speed control affects time passed
  const time = clock.getElapsedTime() * currentSpeed

  sphereMaterial.uniforms.uTime.value = time

  // 1. Floating - Speed scales frequency
  characterGroup.position.y = Math.sin(time * 1.0) * 0.15

  // 2. Head Tracking
  const maxRotX = 0.3
  const maxRotY = 0.5

  const idleSway = Math.sin(time * 0.5) * 0.1

  // FIX: Invert mouse.y for natural looking direction (Up = Look Up = Negative Rot X)
  targetRotation.x = -mouse.y * maxRotX
  targetRotation.y = (mouse.x * maxRotY) + idleSway

  characterGroup.rotation.x += (targetRotation.x - characterGroup.rotation.x) * 0.1
  characterGroup.rotation.y += (targetRotation.y - characterGroup.rotation.y) * 0.1

  // 3. Expression Logic override

  const config = EmotionConfig[currentEmotion] || EmotionConfig.neutral

  // Interactive Modifiers
  // Mouse Y slightly modifies smile/brow lift for liveliness
  const mouseSmileMod = mouse.y * 0.2

  // Target Values
  // Apply Intensity
  let targetOpen = config.open
  let targetSmile = (config.smile * currentIntensity) + mouseSmileMod
  let targetTilt = config.tilt * currentIntensity
  let targetLift = (config.lift * currentIntensity) + mouse.y * 0.1
  let targetSquint = config.squint * currentIntensity

  // Custom Interaction based on Emotion
  if (isMouseDown) {
    switch (currentEmotion) {
      case 'happy':
        // Big Grin
        targetSmile = 1.8 * currentIntensity
        targetOpen = 0.0
        targetLift += 0.2 * currentIntensity// Brows up
        break
      case 'angry':
        // Snarl
        targetSmile = -1.5 * currentIntensity
        targetOpen = 0.0
        targetSquint = 0.9 * currentIntensity
        break
      case 'sad':
      case 'cry':
        // Wail / Quivering lip
        targetSmile = -1.8 * currentIntensity
        targetOpen = 0.4
        targetSquint = 0.9 * currentIntensity// Eyes squeezed shut
        break
      case 'suspicious':
        // Flat line, unimpressed
        targetSmile = 0
        targetOpen = 0
        targetSquint = 1.0 * currentIntensity
        break
      default:
        // Neutral/Surprised -> Pop to "O" shape
        targetOpen = 1.0
        targetSmile = 0.0
        targetLift += 0.5
        break
    }
  }

  // Lerp
  currentOpenness += (targetOpen - currentOpenness) * 0.1
  currentSmile += (targetSmile - currentSmile) * 0.1
  currentBrowTilt += (targetTilt - currentBrowTilt) * 0.1
  currentBrowLift += (targetLift - currentBrowLift) * 0.1
  currentSquint += (targetSquint - currentSquint) * 0.1

  // Tear Animation Check
  if (currentEmotion === 'cry') {
    leftTear.visible = true
    rightTear.visible = true

    // Animate falling
    tearY -= 0.008
    if (tearY < -0.4) tearY = -0.02 // Reset to bottom of eye (natural start)

    // Position relative to eyes
    leftTear.position.set(-0.25, 0.15 + tearY, 0.98)
    rightTear.position.set(0.25, 0.15 + tearY, 0.98)

    // Fade out as it drops
    tearMat.opacity = 1.0 + (tearY * 2.5) // tearY goes negative, so opacity drops
  } else {
    leftTear.visible = false
    rightTear.visible = false
    tearY = 0
  }

  // Update Mouth
  // Dispose old
  if (mouthMesh) {
    mouthMesh.geometry.dispose()
    const newCurve = createMouthGeometry(currentOpenness, currentSmile)
    const isClosed = currentOpenness > 0.5
    mouthMesh.geometry = new THREE.TubeGeometry(newCurve, 32, 0.015, 8, isClosed)
  }

  // Update Eyebrows
  if (leftEyebrowMesh) {
    leftEyebrowMesh.geometry.dispose()
    leftEyebrowMesh.geometry = createEyebrowGeometry(true, currentBrowTilt, currentBrowLift)
  }
  if (rightEyebrowMesh) {
    rightEyebrowMesh.geometry.dispose()
    rightEyebrowMesh.geometry = createEyebrowGeometry(false, currentBrowTilt, currentBrowLift)
  }

  // 4. Eyes (Blink + Squint)
  if (!isBlinking && Math.random() < 0.005) {
    isBlinking = true
    blinkTimer = 0
  }

  // Base Squint
  let eyeScaleY = 1.0 - currentSquint * 0.7

  // Look directions
  if (Math.abs(mouse.x) > 0.7) eyeScaleY *= 0.5 // Look side squint

  if (isBlinking) {
    blinkTimer += 0.25
    const blinkClose = Math.abs(Math.cos(blinkTimer))
    eyeScaleY *= blinkClose
    if (blinkTimer >= Math.PI) isBlinking = false
  }

  if (!leftEye.userData.currentScale) leftEye.userData.currentScale = 1
  // Add jitter if crying
  let jitter = 0
  if (currentEmotion === 'cry' || currentEmotion === 'angry') {
    jitter = (Math.random() - 0.5) * 0.05
  }

  leftEye.userData.currentScale += (eyeScaleY - leftEye.userData.currentScale) * 0.2

  leftEye.scale.y = Math.max(0.1, leftEye.userData.currentScale + jitter)
  rightEye.scale.y = Math.max(0.1, leftEye.userData.currentScale + jitter)

  particles.rotation.y = time * 0.05
  composer.render()
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

import { edgeLength } from './constants'

const canvas = document.getElementById('c') as HTMLCanvasElement
const engine = new BABYLON.Engine(canvas, true)

export const scene = new BABYLON.Scene(engine)
scene.clearColor = BABYLON.Color4.FromHexString('#201d33ff')

const lowerRadiusLimit = (edgeLength / 2 + 1) * Math.sqrt(3)
const camera = new BABYLON.ArcRotateCamera(
  'camera1', Math.PI / -4, Math.PI / 3, lowerRadiusLimit * 3, new BABYLON.Vector3(0, edgeLength / 2, 0), scene,
)
camera.panningSensibility = 0
camera.upperBetaLimit = Math.PI / 2
camera.lowerRadiusLimit = lowerRadiusLimit
camera.upperRadiusLimit = lowerRadiusLimit * 5
camera.attachControl(canvas, true)

const defaultPipeline = new BABYLON.DefaultRenderingPipeline('default', true, scene, [camera])
defaultPipeline.imageProcessingEnabled = false
defaultPipeline.fxaaEnabled = true
defaultPipeline.bloomEnabled = true
defaultPipeline.bloomThreshold = 0.25
defaultPipeline.bloomWeight = 0.7

engine.runRenderLoop(() => {
  scene.render()
})

window.addEventListener('resize', () => {
  engine.resize()
})

if (process.env.NODE_ENV !== 'production') {
  scene.debugLayer.show()
}

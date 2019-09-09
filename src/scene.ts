import { edgeLength, groundEdgeHeight } from './constants'

const canvas = document.getElementById('c') as HTMLCanvasElement
const engine = new BABYLON.Engine(canvas, true)

export const scene = new BABYLON.Scene(engine)
scene.clearColor = BABYLON.Color4.FromHexString('#201d33ff')

const lowerRadiusLimit = (edgeLength / 2 + 2) * Math.sqrt(3)
const camera = new BABYLON.ArcRotateCamera(
  'camera', Math.PI / -4, Math.PI / 3, lowerRadiusLimit * 3, new BABYLON.Vector3(0, edgeLength / 2, 0), scene,
)
camera.panningSensibility = 0
camera.lowerBetaLimit = Math.PI / 9
camera.upperBetaLimit = Math.PI / 2
camera.lowerRadiusLimit = lowerRadiusLimit
camera.upperRadiusLimit = lowerRadiusLimit * 5
camera.attachControl(canvas, true, false)

export const vrHelper = scene.createDefaultVRExperience({
  createDeviceOrientationCamera: false,
})
vrHelper.webVRCamera.deviceScaleFactor = 2
vrHelper.onAfterEnteringVRObservable.add(() => {
  vrHelper.teleportCamera(new BABYLON.Vector3(0, 0, edgeLength / -2 - 3))
})

const defaultPipeline = new BABYLON.DefaultRenderingPipeline('default', true, scene, [
  camera, vrHelper.webVRCamera, vrHelper.vrDeviceOrientationCamera!,
])
defaultPipeline.imageProcessingEnabled = false
defaultPipeline.fxaaEnabled = true
defaultPipeline.bloomEnabled = true
defaultPipeline.bloomThreshold = 0.25
defaultPipeline.bloomWeight = 0.7

const groundPlane = (() => {
  const name = 'groundPlane'
  const size = 256
  const opacityTexture = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene, false)
  const ctx = opacityTexture.getContext()
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, '#fff')
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  opacityTexture.update()

  const material = new BABYLON.StandardMaterial(name, scene)
  material.emissiveColor = BABYLON.Color3.White()
  material.opacityTexture = opacityTexture

  const plane = BABYLON.Mesh.CreatePlane(name, 60, scene)
  plane.rotate(BABYLON.Axis.X, Math.PI / 2)
  plane.position.y -= groundEdgeHeight
  plane.material = material
  plane.visibility = 0.05
  plane.isPickable = false
  plane.setEnabled(false)
  return plane
})()

const onIsInVrChange = (isInVRMode: boolean) => {
  groundPlane.setEnabled(isInVRMode)
}
vrHelper.onEnteringVRObservable.add(() => onIsInVrChange(true))
vrHelper.onExitingVRObservable.add(() => onIsInVrChange(false))

engine.runRenderLoop(() => {
  scene.render()
})

window.addEventListener('resize', () => {
  engine.resize()
})

if (process.env.NODE_ENV !== 'production') {
  document.getElementById('babylonVRiconbtn')!.style.zIndex = '1'
  scene.debugLayer.show()
}

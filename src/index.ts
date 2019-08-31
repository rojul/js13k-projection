const canvas = document.getElementById('c') as HTMLCanvasElement
const engine = new BABYLON.Engine(canvas, true)

const scene = new BABYLON.Scene(engine)
scene.debugLayer.show()

const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), scene)
camera.setTarget(BABYLON.Vector3.Zero())
camera.attachControl(canvas, true)

const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene)
light.intensity = 0.7

const sphere = BABYLON.Mesh.CreateSphere('sphere1', 16, 2, scene)
sphere.position.y = 1

BABYLON.Mesh.CreateGround('ground1', 6, 6, 2, scene)

engine.runRenderLoop(() => {
  scene.render()
})

window.addEventListener('resize', () => {
  engine.resize()
})

const canvas = document.getElementById('c') as HTMLCanvasElement
const engine = new BABYLON.Engine(canvas, true)

engine.runRenderLoop(() => {
  scene.render()
})

window.addEventListener('resize', () => {
  engine.resize()
})

const scene = new BABYLON.Scene(engine)
scene.debugLayer.show()
scene.clearColor = BABYLON.Color4.FromHexString('#90a4aeff')

const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), scene)
camera.setTarget(BABYLON.Vector3.Zero())
camera.attachControl(canvas, true)

const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene)
light.intensity = 0.7

function createMaterial(hexColor: string) {
  const material = new BABYLON.StandardMaterial(hexColor, scene)
  material.diffuseColor = BABYLON.Color3.FromHexString(hexColor)
  return material
}

const cubeMaterial = createMaterial('#b0bec5')
const sideMaterial = createMaterial('#88ffff')
const sideMaterialDark = createMaterial('#009faf')

const edgeLength = 3
const gap = 0.05
let cubesState = shuffle(indexedArray(edgeLength ** 3, i => i < 4))

function indexedArray<T>(length: number, mapfn: (i: number) => T) {
  return Array.from({ length }, (_, i) => mapfn(i))
}

function iToVector3(i: number) {
  return new BABYLON.Vector3(
    i / (edgeLength * edgeLength) | 0,
    (i / edgeLength | 0) % edgeLength,
    i % edgeLength,
  )
}

function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

function project(v3: BABYLON.Vector3, side: number) {
  return new BABYLON.Vector3(0, v3.y, [v3.z, v3.x, (edgeLength - 1) - v3.z, (edgeLength - 1) - v3.x][side])
}

const translateCenter = new BABYLON.Vector3(0.5 - edgeLength / 2, 0.5, 0.5 - edgeLength / 2)

const cubesGroup = new BABYLON.TransformNode('cubes')
cubesState.forEach((cubeState, i) => {
  const cube = BABYLON.Mesh.CreateBox(`${i}`, 1, scene)
  cube.position = iToVector3(i).add(translateCenter)
  cube.material = cubeMaterial
  cube.scaling = new BABYLON.Vector3().setAll(cubeState ? 1 - gap : gap)
  cube.parent = cubesGroup
})

indexedArray(4, side => {
  const sideGroup = new BABYLON.TransformNode(`side${side}`)
  sideGroup.rotate(BABYLON.Axis.Y, Math.PI / 2 * side)
  const projection = cubesState.map((cubeState, i) => cubeState ? project(iToVector3(i), side) : undefined)
    .filter(v3 => v3) as BABYLON.Vector3[]
  indexedArray(edgeLength * edgeLength, i => {
    const plane = BABYLON.Mesh.CreatePlane(`${i}`, 1, scene)
    plane.position = iToVector3(i).add(translateCenter).add(new BABYLON.Vector3(-1.5))
    plane.rotate(BABYLON.Axis.Y, Math.PI / -2)
    plane.material = projection.some(p => iToVector3(i).equals(p)) ? sideMaterialDark : sideMaterial
    plane.scaling = new BABYLON.Vector3().setAll(1 - gap)
    plane.parent = sideGroup
  })
})

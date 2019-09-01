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

const edgeLength = 3
const lowerRadiusLimit = (edgeLength / 2 + 1) * Math.sqrt(3)
const camera = new BABYLON.ArcRotateCamera(
  'camera1', Math.PI / -4, Math.PI / 3, lowerRadiusLimit * 3, new BABYLON.Vector3(0, edgeLength / 2, 0), scene,
)
camera.panningSensibility = 0
camera.upperBetaLimit = Math.PI / 2
camera.lowerRadiusLimit = lowerRadiusLimit
camera.upperRadiusLimit = lowerRadiusLimit * 5
camera.attachControl(canvas, true)

const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene)
light.intensity = 0.7

function createMaterial(hexColor: string) {
  const material = new BABYLON.StandardMaterial(hexColor, scene)
  material.diffuseColor = BABYLON.Color3.FromHexString(hexColor)
  return material
}

const cubeMaterial = createMaterial('#b0bec5')
const cubeMaterialHover = createMaterial('#ffd54f')
const sideMaterial = createMaterial('#88ffff')
const sideMaterialDark = createMaterial('#009faf')

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

function vector3ToI(v3: BABYLON.Vector3) {
  return v3.x * edgeLength * edgeLength + v3.y * edgeLength + v3.z
}

function isVector3InCube(v3: BABYLON.Vector3) {
  return [v3.x, v3.y, v3.z].every(value => value >= 0 && value < edgeLength)
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

const cubeBottomGroup = new BABYLON.TransformNode('cubeBottom')
indexedArray(edgeLength * edgeLength, i => {
  const iV3 = iToVector3(i)
  const position = new BABYLON.Vector3(iV3.y, -1, iV3.z)
  const plane = BABYLON.Mesh.CreatePlane(`${i}`, 1 - gap, scene)
  plane.position = position.add(new BABYLON.Vector3(0, 0.5, 0)).add(translateCenter)
  plane.rotate(BABYLON.Axis.X, Math.PI / 2)
  plane.material = cubeMaterial
  plane.parent = cubeBottomGroup
  addCubePlaneActions(plane, position, new BABYLON.Vector3(0, 1, 0))
})

const cubesGroup = new BABYLON.TransformNode('cubes')
cubesState.forEach((cubeState, i) => {
  const cubeGroup = new BABYLON.TransformNode(`${i}`)
  cubeGroup.position = iToVector3(i).add(translateCenter)
  cubeGroup.scaling = new BABYLON.Vector3().setAll(1 - gap)
  cubeGroup.parent = cubesGroup
  cubeGroup.setEnabled(cubeState)

  const boxPlanes: Array<[BABYLON.Vector3, BABYLON.Vector3, number]> = [
    [new BABYLON.Vector3(0, 1, 0), BABYLON.Axis.X, Math.PI / 2],
    [new BABYLON.Vector3(0, 0, 1), BABYLON.Axis.Y, Math.PI],
    [new BABYLON.Vector3(1, 0, 0), BABYLON.Axis.Y, Math.PI / -2],
    [new BABYLON.Vector3(0, 0, -1), BABYLON.Axis.Y, 0],
    [new BABYLON.Vector3(-1, 0, 0), BABYLON.Axis.Y, Math.PI / 2],
    [new BABYLON.Vector3(0, -1, 0), BABYLON.Axis.X, Math.PI / -2],
  ]
  boxPlanes.forEach((boxPlane, planeI) => {
    const plane = BABYLON.Mesh.CreatePlane(`${planeI}`, 1, scene)
    plane.position = boxPlane[0].scale(0.5)
    plane.rotate(boxPlane[1], boxPlane[2])
    plane.material = cubeMaterial
    plane.parent = cubeGroup
    addCubePlaneActions(plane, iToVector3(i), boxPlane[0])
  })
})

function addCubePlaneActions(plane: BABYLON.Mesh, position: BABYLON.Vector3, side: BABYLON.Vector3) {
  const actionManager = new BABYLON.ActionManager(scene)
  actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
      plane.material = cubeMaterialHover
    }),
  )
  actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
      plane.material = cubeMaterial
    }),
  )
  actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnLeftPickTrigger, () => {
      const newPosition = position.add(side)
      if (!isVector3InCube(newPosition)) {
        return
      }
      cubesGroup.getChildren()[vector3ToI(newPosition)].setEnabled(true)
    }),
  )
  actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnRightPickTrigger, () => {
      if (!isVector3InCube(position)) {
        return
      }
      cubesGroup.getChildren()[vector3ToI(position)].setEnabled(false)
    }),
  )
  plane.actionManager = actionManager
}

indexedArray(4, side => {
  const sideGroup = new BABYLON.TransformNode(`side${side}`)
  sideGroup.rotate(BABYLON.Axis.Y, Math.PI / 2 * side)
  const projection = cubesState.map((cubeState, i) => cubeState ? project(iToVector3(i), side) : undefined)
    .filter(v3 => v3) as BABYLON.Vector3[]
  indexedArray(edgeLength * edgeLength, i => {
    const plane = BABYLON.Mesh.CreatePlane(`${i}`, 1 - gap, scene)
    plane.position = iToVector3(i).add(translateCenter).add(new BABYLON.Vector3(-1.5))
    plane.rotate(BABYLON.Axis.Y, Math.PI / -2)
    plane.material = projection.some(p => iToVector3(i).equals(p)) ? sideMaterialDark : sideMaterial
    plane.isPickable = false
    plane.parent = sideGroup
  })
})

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

function createBlurTexture(inside: string, outside: string) {
  const size = 64
  const textureGap = 6
  const texture = new BABYLON.DynamicTexture(`blur ${inside} ${outside}`, { width: size, height: size }, scene, false)
  const ctx = texture.getContext()
  ctx.fillStyle = outside
  ctx.fillRect(0, 0, size, size)
  ctx.filter = `blur(${textureGap / 2}px)`
  ctx.fillStyle = inside
  ctx.fillRect(textureGap, textureGap, size - textureGap * 2, size - textureGap * 2)
  texture.update()
  return texture
}

const blurTexture = createBlurTexture('#fff', '#666')

function createMaterial(hexColor: string) {
  const material = new BABYLON.StandardMaterial(hexColor, scene)
  material.diffuseColor = BABYLON.Color3.FromHexString(hexColor)
  return material
}

const cubeMaterial = createMaterial('#b0bec5')
const cubeMaterialHover = createMaterial('#ffd54f')
const sideMaterials = [
  createMaterial('#88ffff'),
  createMaterial('#009faf'),
].map(material => {
  const materialWithBlur = material.clone(`${material.name} blur`)
  materialWithBlur.diffuseTexture = blurTexture
  return [material, materialWithBlur]
})

const gap = 0.05
let sideState = shuffle(indexedArray(edgeLength ** 3, i => i < 4))
let cubesState = sideState.map(() => false)

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
cubesState.forEach((_, i) => {
  const cubeGroup = new BABYLON.TransformNode(`${i}`)
  cubeGroup.position = iToVector3(i).add(translateCenter)
  cubeGroup.scaling = new BABYLON.Vector3().setAll(1 - gap)
  cubeGroup.parent = cubesGroup

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
      cubesState[vector3ToI(newPosition)] = true
      updateScene()
    }),
  )
  actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnRightPickTrigger, () => {
      if (!isVector3InCube(position)) {
        return
      }
      cubesState[vector3ToI(position)] = false
      updateScene()
    }),
  )
  plane.actionManager = actionManager
}

const sidePlanes = indexedArray(4, side => {
  const sideGroup = new BABYLON.TransformNode(`side${side}`)
  sideGroup.rotate(BABYLON.Axis.Y, Math.PI / 2 * side)
  return indexedArray(edgeLength * edgeLength, i => {
    const plane = BABYLON.Mesh.CreatePlane(`${i}`, 1 - gap, scene)
    plane.position = iToVector3(i).add(translateCenter).add(new BABYLON.Vector3(-1.5))
    plane.rotate(BABYLON.Axis.Y, Math.PI / -2)
    plane.isPickable = false
    plane.parent = sideGroup
    return plane
  })
})

updateScene()

function updateScene() {
  let isSolved = true

  cubesGroup.getChildren().forEach((cubeGroup, i) => {
    cubeGroup.setEnabled(cubesState[i])
  })

  sidePlanes.forEach((planes, side) => {
    const cubesProjection = getProjection(cubesState, side)
    const sideProjection = getProjection(sideState, side)
    planes.forEach((plane, i) => {
      const isCubeProjected = cubesProjection.includes(i)
      const isSideProjected = sideProjection.includes(i)
      if (isSolved) {
        isSolved = isCubeProjected === isSideProjected
      }
      plane.material = sideMaterials[isCubeProjected ? 1 : 0][isSideProjected ? 1 : 0]
    })
  })

  if (isSolved) {
    console.log('solved')
  }
}

function getProjection(cubes: boolean[], side: number) {
  return cubes.map((cube, i) => cube ? vector3ToI(project(iToVector3(i), side)) : -1).filter(i => i !== -1)
}

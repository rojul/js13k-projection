import { edgeLength } from './constants'
import { levels } from './levels'
import { scene } from './scene'
import { getProjection, indexedArray, isVector3InCube, iToVector3, shuffle, tweenNumber, tweenVector3, vector3ToI } from './utils'

function createSquareTexture(inside: string, outside: string) {
  const size = 10
  const textureGap = 1
  const texture = new BABYLON.DynamicTexture(
    `square ${inside} ${outside}`, { width: size, height: size }, scene, false, BABYLON.Texture.NEAREST_SAMPLINGMODE,
  )
  const ctx = texture.getContext()
  ctx.fillStyle = outside
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = inside
  ctx.clearRect(textureGap, textureGap, size - textureGap * 2, size - textureGap * 2)
  ctx.fillRect(textureGap, textureGap, size - textureGap * 2, size - textureGap * 2)
  texture.update()
  return texture
}

const colorInside = '#2f2666'
const colorOutside = '#a8a5b6'
const cubeMaterials = [colorInside, '#5342b3'].map(inside => {
  return [colorOutside, '#ff7e5e'].map(outside => {
    const material = new BABYLON.StandardMaterial(`cube ${inside} ${outside}`, scene)
    material.emissiveTexture = createSquareTexture(inside, outside)
    return material
  })
})

const cubeMaterialHover = new BABYLON.StandardMaterial('cubeHover', scene)
cubeMaterialHover.emissiveColor = BABYLON.Color3.FromHexString('#ffcf3d')
cubeMaterialHover.opacityTexture = createSquareTexture('rgba(255,255,255,0.25)', '#fff')

function getLevel() {
  return parseLevel(levels[currentLevel]) || shuffle(indexedArray(edgeLength ** 3, i => i < 13))
}

function parseLevel(str: string | undefined) {
  if (!str || str.length !== edgeLength ** 3) {
    return
  }
  return str.split('').map(char => char === '1')
}

let currentLevel = 0
let sideState = getLevel()
const cubesState = sideState.map(() => false)

const translateCenter = new BABYLON.Vector3(0.5 - edgeLength / 2, 0.5, 0.5 - edgeLength / 2)
const cubePlanes = new Map<BABYLON.Mesh, { position: BABYLON.Vector3, side: BABYLON.Vector3 }>()

const cubeBottomGroup = new BABYLON.TransformNode('cubeBottom')
indexedArray(edgeLength * edgeLength, i => {
  const iV3 = iToVector3(i)
  const position = new BABYLON.Vector3(iV3.y, -1, iV3.z)
  const plane = BABYLON.Mesh.CreatePlane(`${i}`, 1, scene)
  plane.position = position.add(new BABYLON.Vector3(0, 0.5, 0)).add(translateCenter)
  plane.rotate(BABYLON.Axis.X, Math.PI / 2)
  plane.material = cubeMaterials[0][0]
  plane.parent = cubeBottomGroup
  cubePlanes.set(plane, { position, side: new BABYLON.Vector3(0, 1, 0) })
})

const boxPlanes: Array<[BABYLON.Vector3, BABYLON.Vector3, number]> = [
  [new BABYLON.Vector3(0, 1, 0), BABYLON.Axis.X, Math.PI / 2],
  [new BABYLON.Vector3(0, 0, 1), BABYLON.Axis.Y, Math.PI],
  [new BABYLON.Vector3(1, 0, 0), BABYLON.Axis.Y, Math.PI / -2],
  [new BABYLON.Vector3(0, 0, -1), BABYLON.Axis.Y, 0],
  [new BABYLON.Vector3(-1, 0, 0), BABYLON.Axis.Y, Math.PI / 2],
  [new BABYLON.Vector3(0, -1, 0), BABYLON.Axis.X, Math.PI / -2],
]

const cubesGroup = new BABYLON.TransformNode('cubes')
const cubeGroups = cubesState.map((_, i) => {
  const cubeGroup = new BABYLON.TransformNode(`${i}`)
  cubeGroup.position = iToVector3(i).add(translateCenter)
  cubeGroup.scaling.setAll(0)
  cubeGroup.parent = cubesGroup

  boxPlanes.forEach((boxPlane, planeI) => {
    const plane = BABYLON.Mesh.CreatePlane(`${planeI}`, 1, scene)
    plane.position = boxPlane[0].scale(0.5)
    plane.rotate(boxPlane[1], boxPlane[2])
    plane.material = cubeMaterials[1][0]
    plane.parent = cubeGroup
    cubePlanes.set(plane, { position: iToVector3(i), side: boxPlane[0] })
  })

  return cubeGroup
})

scene.onPointerObservable.add(pointerInfo => {
  if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERTAP) {
    handleTap(pointerInfo.event.button !== 2)
  }
})

function pickCubePlane() {
  const pickInfo = scene.pick(scene.pointerX, scene.pointerY)
  if (!pickInfo || !cubePlanes.has(pickInfo.pickedMesh as BABYLON.Mesh)) {
    return
  }
  return pickInfo.pickedMesh as BABYLON.Mesh
}

const highlightPlane = BABYLON.Mesh.CreatePlane('hover', 1, scene)
highlightPlane.material = cubeMaterialHover
highlightPlane.position.z = -0.001
highlightPlane.isPickable = false

const highlightPlaneAnimation = new BABYLON.Animation(
  '', 'visibility', 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
)
highlightPlaneAnimation.setKeys([{
  frame: 0,
  value: 1,
}, {
  frame: 30,
  value: 0.3,
}, {
  frame: 60,
  value: 1,
}])
highlightPlane.animations.push(highlightPlaneAnimation)
scene.beginAnimation(highlightPlane, 0, 60, true)

function handleMove() {
  const hoveredPlane = pickCubePlane()
  highlightPlane.isVisible = !!hoveredPlane
  if (!hoveredPlane) {
    return
  }
  highlightPlane.parent = hoveredPlane
}

function handleTap(createCube: boolean) {
  const pickedPlane = pickCubePlane()
  if (!pickedPlane) {
    return
  }
  const cubePlaneInfo = cubePlanes.get(pickedPlane)!
  const position = createCube ? cubePlaneInfo.position.add(cubePlaneInfo.side) : cubePlaneInfo.position
  if (!isVector3InCube(position)) {
    return
  }
  const i = vector3ToI(position)
  if (createCube && !cubesState[i]) {
    const cube = cubeGroups[i]
    cube.scaling.setAll(0)
    cube.position = cubePlaneInfo.position.add(cubePlaneInfo.side.multiplyByFloats(0.5, 0.5, 0.5)).add(translateCenter)
  }
  cubesState[i] = createCube
  updateScene()
}

const sidePlanes = indexedArray(4, side => {
  const sideGroup = new BABYLON.TransformNode(`side${side}`)
  sideGroup.rotate(BABYLON.Axis.Y, Math.PI / 2 * side)
  return indexedArray(edgeLength * edgeLength, i => {
    const plane = BABYLON.Mesh.CreatePlane(`${i}`, 1, scene)
    plane.position = iToVector3(i).add(translateCenter).add(new BABYLON.Vector3(-2.5))
    plane.rotate(BABYLON.Axis.Y, Math.PI / -2)
    plane.isPickable = false
    plane.parent = sideGroup
    return plane
  })
})

function createBoxWithSidePlanes(name: string, width: number, height: number) {
  return BABYLON.Mesh.MergeMeshes(boxPlanes.filter(v => !v[0].y).map(v => {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene)
    plane.position = v[0].scale(width / 2)
    plane.rotate(v[1], v[2])
    return plane
  }))!
}

{
  const edgeName = 'groundEdge'
  const edgeMaterial = new BABYLON.StandardMaterial(edgeName, scene)
  edgeMaterial.emissiveColor = BABYLON.Color3.FromHexString(colorOutside)

  const edgeHeight = 0.1
  const edge = createBoxWithSidePlanes(edgeName, edgeLength, edgeHeight)
  edge.position.y -= edgeHeight / 2
  edge.material = edgeMaterial

  const cubeName = 'groundCube'
  const size = 64
  const opacityTexture = new BABYLON.DynamicTexture(cubeName, { width: size, height: size }, scene, false)
  const ctx = opacityTexture.getContext()
  const gradient = ctx.createLinearGradient(0, 0, 0, size)
  gradient.addColorStop(0, '#fff')
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  opacityTexture.update()

  const cubeMaterial = new BABYLON.StandardMaterial(cubeName, scene)
  cubeMaterial.opacityTexture = opacityTexture
  cubeMaterial.emissiveColor = BABYLON.Color3.FromHexString(colorInside)

  const cube = createBoxWithSidePlanes(cubeName, edgeLength, edgeLength)
  cube.position.y -= edgeLength / 2 + edgeHeight
  cube.material = cubeMaterial
}

updateScene()

function updateScene() {
  let isSolved = true

  sidePlanes.forEach((planes, side) => {
    const cubesProjection = getProjection(cubesState, side)
    const sideProjection = getProjection(sideState, side)
    planes.forEach((plane, i) => {
      const isCubeProjected = cubesProjection.includes(i)
      const isSideProjected = sideProjection.includes(i)
      if (isSolved) {
        isSolved = isCubeProjected === isSideProjected
      }
      plane.material = cubeMaterials[isCubeProjected ? 1 : 0][isSideProjected ? 1 : 0]
    })
  })

  if (isSolved) {
    currentLevel++
    sideState = getLevel()
    cubesState.fill(false)
    updateScene()
  }
}

scene.beforeRender = () => {
  cubeGroups.forEach((cubeGroup, i) => {
    const targetScale = cubesState[i] ? 1 : 0
    const delta = 0.1 * scene.getAnimationRatio()
    cubeGroup.scaling.setAll(tweenNumber(cubeGroup.scaling.x, targetScale, delta))
    tweenVector3(cubeGroup.position, iToVector3(i).add(translateCenter), delta / 2)
    cubeGroup.setEnabled(!!cubeGroup.scaling.x)
  })

  handleMove()
}

import { edgeLength, groundEdgeHeight } from './constants'
import { createInputManager } from './input'
import { getLevel } from './levels'
import { scene } from './scene'
import { getProjection, indexedArray, isVector3InCube, iToVector3, sleep, tweenNumber, tweenVector3, vector3ToI } from './utils'

function createSquareTexture(inside: string, outside: string, text?: string) {
  const size = 256
  const textureGap = 25
  const texture = new BABYLON.DynamicTexture(
    `square ${inside} ${outside} ${text || ''}`, { width: size, height: size }, scene, false,
  )
  const ctx = texture.getContext()
  ctx.fillStyle = outside
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = inside
  ctx.clearRect(textureGap, textureGap, size - textureGap * 2, size - textureGap * 2)
  ctx.fillRect(textureGap, textureGap, size - textureGap * 2, size - textureGap * 2)

  if (text) {
    ctx.fillStyle = outside
    ctx.font = 'bold 200px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, size / 2, size / 2 + 15)
  }

  texture.update()
  return texture
}

const createCubeTexture = (inside: string, outside: string, text?: string) => {
  const material = new BABYLON.StandardMaterial(`cube ${inside} ${outside} ${text || ''}`, scene)
  material.emissiveTexture = createSquareTexture(inside, outside, text)
  return material
}

const colorInside = '#2f2666'
const colorInsideWithCube = '#5342b3'
const colorOutside = '#a8a5b6'
const cubeMaterials = [colorInside, colorInsideWithCube].map(inside => {
  return createCubeTexture(inside, colorOutside)
})
const projectedCubeMaterials = [colorInside, colorInsideWithCube].map(inside => {
  return indexedArray(edgeLength * 2 + 1, i => {
    return createCubeTexture(inside, '#ff7e5e', !i ? undefined : `${i - edgeLength}`)
  })
})

const cubeMaterialHover = new BABYLON.StandardMaterial('cubeHover', scene)
cubeMaterialHover.emissiveColor = BABYLON.Color3.FromHexString('#ffcf3d')
cubeMaterialHover.opacityTexture = createSquareTexture('rgba(255,255,255,0.25)', '#fff')

let currentLevel = 0
let sideState = getLevel(currentLevel)
const cubesState = indexedArray(edgeLength ** 3, () => false)

const translateCenter = new BABYLON.Vector3(0.5 - edgeLength / 2, 0.5, 0.5 - edgeLength / 2)
const cubePlanes = new Map<BABYLON.Mesh | BABYLON.InstancedMesh, { position: BABYLON.Vector3, side: BABYLON.Vector3 }>()

const cubeBottomGroup = new BABYLON.TransformNode('cubeBottom')
indexedArray(edgeLength * edgeLength, i => {
  const iV3 = iToVector3(i)
  const position = new BABYLON.Vector3(iV3.y, -1, iV3.z)
  const plane = BABYLON.Mesh.CreatePlane(`${i}`, 1, scene)
  plane.position = position.add(new BABYLON.Vector3(0, 0.501, 0)).add(translateCenter)
  plane.rotate(BABYLON.Axis.X, Math.PI / 2)
  plane.material = cubeMaterials[0]
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

const cubePlane = BABYLON.Mesh.CreatePlane('cubePlane', 1, scene)
cubePlane.material = cubeMaterials[1]
cubePlane.setEnabled(false)

const cubeGroups = cubesState.map((_, i) => {
  const cubeGroup = new BABYLON.TransformNode(`${i}`)
  cubeGroup.position = iToVector3(i).add(translateCenter)
  cubeGroup.scaling.setAll(0)
  cubeGroup.parent = cubesGroup

  boxPlanes.forEach((boxPlane, planeI) => {
    const plane = cubePlane.createInstance(`${planeI}`)

    plane.position = boxPlane[0].scale(0.5)
    plane.rotate(boxPlane[1], boxPlane[2])

    plane.parent = cubeGroup
    cubePlanes.set(plane, { position: iToVector3(i), side: boxPlane[0] })
  })

  return cubeGroup
})

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

let interactionEnabled = true
const handleTap = (createCube: boolean) => {
  const pickedPlane = getSelectedMesh()
  if (!pickedPlane || !interactionEnabled) {
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

const getSelectedMesh = createInputManager(
  mesh => cubePlanes.has(mesh),
  handleTap,
)

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

  const edge = createBoxWithSidePlanes(edgeName, edgeLength, groundEdgeHeight)
  edge.position.y -= groundEdgeHeight / 2
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
  cube.position.y -= edgeLength / 2 + groundEdgeHeight
  cube.material = cubeMaterial
}

updateScene()

async function updateScene() {
  let isSolved = true

  sidePlanes.forEach((planes, side) => {
    const cubesProjection = getProjection(cubesState, side)
    const projectedSideState = side < 2 ? sideState[side] : indexedArray(edgeLength ** 2, i => {
      const v3 = iToVector3(i)
      return sideState[side - 2][vector3ToI(new BABYLON.Vector3(0, v3.y, edgeLength - 1 - v3.z))]
    })
    planes.forEach((plane, i) => {
      const cubesCount = cubesProjection.filter(cubeI => cubeI === i).length
      const sideValue = projectedSideState[i]
      if (isSolved) {
        isSolved =
          sideValue === -1 ? !cubesCount :
          sideValue === 0 ? !!cubesCount :
          sideValue === cubesCount
      }
      plane.material = sideValue === -1 ? cubeMaterials[!!cubesCount ? 1 : 0] :
        projectedCubeMaterials[!!cubesCount ? 1 : 0][!sideValue ? 0 : sideValue - cubesCount + edgeLength]
    })
  })

  if (isSolved) {
    interactionEnabled = false
    await sleep(100)
    cubePlane.material = projectedCubeMaterials[1][0]
    await sleep(500)
    cubePlane.material = cubeMaterials[1]
    interactionEnabled = true

    currentLevel++
    sideState = getLevel(currentLevel)
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

  const hoveredPlane = getSelectedMesh()
  highlightPlane.isVisible = !!hoveredPlane
  if (!hoveredPlane) {
    return
  }
  highlightPlane.parent = hoveredPlane
}

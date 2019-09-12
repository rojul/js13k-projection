import { edgeLength } from './constants'

export const indexedArray = <T>(length: number, mapfn: (i: number) => T) => {
  return Array.from({ length }, (_, i) => mapfn(i))
}

export const iToVector3 = (i: number) => {
  return new BABYLON.Vector3(
    i / (edgeLength * edgeLength) | 0,
    (i / edgeLength | 0) % edgeLength,
    i % edgeLength,
  )
}

export const vector3ToI = (v3: BABYLON.Vector3) => {
  return v3.x * edgeLength * edgeLength + v3.y * edgeLength + v3.z
}

export const isVector3InCube = (v3: BABYLON.Vector3) => {
  return [v3.x, v3.y, v3.z].every(value => value >= 0 && value < edgeLength)
}

export const shuffle = <T>(array: T[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

export const project = (v3: BABYLON.Vector3, side: number) => {
  return new BABYLON.Vector3(0, v3.y, [v3.z, v3.x, (edgeLength - 1) - v3.z, (edgeLength - 1) - v3.x][side])
}

export const  getProjection = (cubes: boolean[], side: number) => {
  return cubes.map((cube, i) => cube ? vector3ToI(project(iToVector3(i), side)) : -1).filter(i => i !== -1)
}

export const tweenNumber = (value: number, targetValue: number, delta: number) => {
  return value < targetValue ? Math.min(value + delta, targetValue) : Math.max(value - delta, targetValue)
}

export const tweenVector3 = (value: BABYLON.Vector3, targetValue: BABYLON.Vector3, delta: number) => {
  value.set(
    tweenNumber(value.x, targetValue.x, delta),
    tweenNumber(value.y, targetValue.y, delta),
    tweenNumber(value.z, targetValue.z, delta),
  )
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

import { edgeLength } from './constants'
import { getProjection, indexedArray, shuffle } from './utils'

const levels = [
  '..0....0....0...00....0.._.000....0...00....2..000.',
  '..0...0.0....0....0..000._.00.....0..000..0.....00.',
]

export function getLevel(level: number) {
  return parseLevel(levels[level]) || generateLevel()
}

function parseLevel(str: string | undefined) {
  if (!str || str.length !== edgeLength ** 2 * 2 + 1) {
    return
  }
  return str.split('_').map(sideStr => sideStr.split('').map(char => !isNaN(Number(char)) ? Number(char) : -1))
}

function generateLevel() {
  return parseLevel(stringifyLevel(shuffle(indexedArray(edgeLength ** 3, i => i < 13))))!
}

export function stringifyLevel(cubes: boolean[]) {
  return indexedArray(2, side => {
    const projection = getProjection(cubes, side)
    return indexedArray(edgeLength * edgeLength, i => {
      return projection.includes(i) ? '0' : '.'
    }).join('')
  }).join('_')
}

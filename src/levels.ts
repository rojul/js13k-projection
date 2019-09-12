import { edgeLength } from './constants'
import { getProjection, indexedArray, shuffle } from './utils'

export const levels = [
  '..0....0....0...00....0.._.000....0...00....0..000.',
  '..0...0.0....0....0..111._.00.....0..000..0.....00.',
  '0.0.00.0.0101.40.0..0.0.0_0.0.00.0.0000.00.0..0.0.0',
  '000000.1.00.0.00.1.000000_.000..1.0...0...0.1..000.',
  '.000..0.0.000000.0.000000_.0.0.000000.0.000000.0.0.',
  '....0...00..000.000000000_00000.0000..000...00....0',
  '2...2.1.1...1...1.1.2...2_11.111...1..1..1...111.11',
  '.0..000000.0..0000..0.000_.00.000...0..000000.....0',
  '..0..0000.0.0000000...0.._.000..0.0.00000.000...0..',
  '...00.000.00....000....00_.000....0..000..0....000.',
  '0.1110...10..000...10.111_.0.1..11...0....11...0.1.',
  '..0....0....0...00....0.._.000....0..000..0.0..000.',
  '1111112221123211222111111_1111112221123211222111111',
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

import { levels } from './levels'
import { scene } from './scene'
import { indexedArray } from './utils'

const rootEl = document.getElementById('level-selection')!
const localStorageKey = 'projection.level'

export let currentLevel = (localStorage.getItem(localStorageKey) as any) | 0
export const nextLevel = () => selectLevel(currentLevel + 1)
let isOpen = false

export const levelSelection: {
  onLevelChange?: () => void,
} = {}

const selectLevel = (level: number) => {
  if ((currentLevel !== level || level > levels.length - 1) && levelSelection.onLevelChange) {
    currentLevel = Math.min(level, levels.length)
    localStorage.setItem(localStorageKey, `${currentLevel}`)
    levelSelection.onLevelChange()
  }
  isOpen = false
  render()
}

scene.onPointerObservable.add(pointerInfo => {
  if (pointerInfo.event.type !== 'pointerdown') {
    return
  }
  isOpen = false
  render()
})

const render = () => {
  rootEl.innerHTML = ''
  if (!isOpen) {
    appendButton(currentLevel, false, () => {
      isOpen = true
      render()
    })
  } else {
    indexedArray(levels.length + 1, i => {
      appendButton(i, i === currentLevel, () => selectLevel(i))
    })
  }
}

const appendButton = (i: number, isSelected: boolean, onClick: () => void) => {
  const button = document.createElement('button')
  button.textContent = i < levels.length ? `${i + 1}` : '?'
  button.className = `level${isSelected ? ' level-selected' : ''}`
  button.addEventListener('click', onClick)
  rootEl.appendChild(button)
}

render()

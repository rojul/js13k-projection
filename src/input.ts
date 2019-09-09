import { edgeLength } from './constants'
import { scene, vrHelper } from './scene'

export const createInputManager = (
  pickPredicate: (mesh: BABYLON.Mesh) => boolean,
  handleTap: (createCube: boolean) => void,
) => {
  scene.onPointerObservable.add(pointerInfo => {
    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERTAP) {
      handleTap(pointerInfo.event.button !== 2)
    }
  })

  vrHelper.enableInteractions()

  const teleportationMesh = BABYLON.Mesh.CreateGround('teleportationMesh', edgeLength + 12, edgeLength + 12, 1, scene)
  teleportationMesh.setEnabled(false)
  vrHelper.enableTeleportation({ floorMeshName: teleportationMesh.name })

  let vrSelectedMesh: BABYLON.AbstractMesh | undefined
  vrHelper.onNewMeshSelected.add(mesh => {
    vrSelectedMesh = mesh
  })
  vrHelper.onSelectedMeshUnselected.add(() => {
    vrSelectedMesh = undefined
  })
  vrHelper.onExitingVRObservable.add(() => {
    vrSelectedMesh = undefined
  })

  vrHelper.onControllerMeshLoaded.add(webVRController => {
    webVRController.onMainButtonStateChangedObservable.add(stateObject => {
      if (stateObject.pressed) {
        handleTap(true)
      }
    })
    webVRController.onSecondaryButtonStateChangedObservable.add(stateObject => {
      if (stateObject.pressed) {
        handleTap(false)
      }
    })
  })

  const getSelectedMesh = () => {
    let pickedMesh: BABYLON.AbstractMesh | undefined | null
    if (!vrHelper.isInVRMode) {
      const pickInfo = scene.pick(scene.pointerX, scene.pointerY)
      if (pickInfo) {
        pickedMesh = pickInfo.pickedMesh
      }
    } else {
      pickedMesh = vrSelectedMesh
    }
    if (!pickedMesh || !pickPredicate(pickedMesh as BABYLON.Mesh)) {
      return
    }
    return pickedMesh as BABYLON.Mesh
  }

  return getSelectedMesh
}

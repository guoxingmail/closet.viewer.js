import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import FittingSkinControllerManager from "@/lib/fitting/avatar/FittingSkinControllerManager";
import ResizableBody from "@/lib/fitting/avatar/FittingResizableBody";
import FittingAccessory from "@/lib/fitting/avatar/FittingAccessory";

export default class FittingAvatar {
  constructor(container, zrest) {
    this.parentContainer = container;
    this.avatarContainer = null;

    this.zrest = zrest;
    this.accessory = null;
    this.resizableBody = null;
    this.scManager = null;

    this.bodyVertexIndex = [];
    this.bodyVertexPos = [];
  }

  init() {
    if (!this.zrest) return;

    const listFoundContainer = this.parentContainer.children.filter(
      (obj) => obj.name === "fittingAvatarContainer"
    );

    if (listFoundContainer.length <= 0) {
      console.error("FittingAvatar init failed.");
    }

    this.avatarContainer = listFoundContainer[0];

    const avatarGeometry = new Map(
      this.zrest.zProperty.rootMap.get("mapGeometry")
    );
    const listSkinController = this.loadGeometry({
      mapGeometry: avatarGeometry,
    });
    this.setAvatarInfo(listSkinController);

    this.scManager = new FittingSkinControllerManager();
    this.scManager.init(this.zrest);

    this.accessory = new FittingAccessory(listSkinController, this.scManager);
    this.accessory.attachThreeJSContainer(this.parentContainer);
    this.accessory.putBodyVertexInfo(this.bodyVertexPos, this.bodyVertexIndex);
  }

  // Init resizable body and accessory
  initResizableBodyWithAcc(avatarSizingInfoObj) {
    this.resizableBody = new ResizableBody({
      gender: 0,
      mapBaseMesh: avatarSizingInfoObj.mapBaseMesh,
      convertingMatData: avatarSizingInfoObj.convertingMatData,
      mapHeightWeightTo5Sizes: avatarSizingInfoObj.mapHeightWeightTo5Sizes,
      scManager: this.scManager,
    });

    // TODO: Move this module to the proper position.
    this.accessory.putMeshInfo(avatarSizingInfoObj.mapAccessoryMesh);
  }

  async resize({
    height,
    weight,
    bodyShape,
    chest = -1,
    waist = -1,
    hip = -1,
    armLength = -1,
    legLength = -1,
  }) {
    const computed = this.resizableBody.computeResizing(
      height,
      weight,
      bodyShape,
      chest,
      waist,
      hip,
      armLength,
      legLength
    );

    // TODO: CHECK THIS OUT
    const v = [];
    computed.forEach((vector) => {
      if (!vector.x || !vector.y || !vector.z) {
        console.warn(vector);
      }
      v.push(vector.x, vector.y, vector.z);
    });

    const l = this.bodyVertexPos.length;
    const nb = v.slice(0, l);
    this.bodyVertexPos = nb.map((x) => x * 10);

    for (const entries of this.resizableBody.mapStartIndex.entries()) {
      const partName = entries[0];
      const partRenderPos = this.resizableBody.updateRenderPositionFromPhysical(
        partName,
        computed
      );
      console.log("\t\t++" + partName);
      this.resizableBody.scManager.putVertexOntoMatMeshByPartName(
        partName,
        partRenderPos
      );
    }
  }

  resizeAccessory() {
    if (this.resizeAccessory) {
      this.accessory.putBodyVertexInfo(
        this.bodyVertexPos,
        this.bodyVertexIndex
      );
      this.accessory.resize();
    } else console.warn("Can't access accessory");
  }

  loadGeometry({ mapGeometry: mapGeometry }) {
    this.extractController(mapGeometry);
    return this.listSkinController;
  }

  setAvatarInfo(listSkinController) {
    const bodySkinController = this.findBodySkinController(listSkinController);
    console.log("bodySkin is");
    console.log(bodySkinController);
    this.bodySkinController = bodySkinController;

    const mapMesh = bodySkinController.get("mapMesh");
    const meshIndex = readByteArray("Uint", mapMesh.get("baIndex"));
    const meshPosition = readByteArray("Float", mapMesh.get("baPosition"));
    this.bodyVertexIndex = meshIndex;
    this.bodyVertexPos = meshPosition;
  }

  // TODO: Refactor this module
  extractController(mapInput) {
    const shouldRecursive = (element) => {
      return (
        element instanceof Map &&
        element.has("listChildrenTransformer3D") &&
        element.get("listChildrenTransformer3D") != null
      );
    };

    if (shouldRecursive(mapInput)) {
      this.extractController(mapInput.get("listChildrenTransformer3D"));
    } else {
      mapInput.forEach((inputElement) => {
        if (shouldRecursive(inputElement)) {
          return this.extractController(inputElement);
        }
        if (inputElement.has("listSkinController")) {
          console.log(inputElement);
          console.log(inputElement.get("listSkinController"));
          this.listSkinController = inputElement.get("listSkinController");
        }
      });
    }
  }

  findBodySkinController(listSkinController) {
    // NOTE: Assumed that the largest skin controller is the body controller (according to the CLO S/W algorithm).
    let largestSC = null;
    let largestLength = 0;
    listSkinController.forEach((sc) => {
      if (sc.has("baInitPosition")) {
        const length = sc.get("baInitPosition").byteLength;
        if (largestLength < length) {
          largestLength = length;
          largestSC = sc;
        }
      }
    });

    return largestSC;
  }
}
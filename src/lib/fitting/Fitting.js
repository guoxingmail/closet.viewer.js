import * as THREE from "@/lib/threejs/three";
import FittingGarment from "./garment/FittingGarment";
import FittingAvatar from "./avatar/FittingAvatar";
import FitMap from "@/lib/fitting/common/FitMap";
import FittingBodySize from "@/lib/fitting/common/FittingBodySize";
import {
  loadZrestForFitting,
  processAvatarSizingFile,
} from "./common/FittingIO";

export default class Fitting {
  constructor({ scene: scene, zrest: zrest }) {
    // Set containers for three.js
    this.scene = scene;
    this.container = new THREE.Object3D();
    zrest.addThreeContainerUniquely(this.container, "fittingContainer");

    this.processAvatarSizingFile = processAvatarSizingFile;
    this.mapHeightWeightTo5Sizes = null;

    // Interfaces
    this.zrest = zrest;
    this.avatar = null;
    this.garment = new FittingGarment();
    this.bodySize = new FittingBodySize();
    this.fitMap = new FitMap();

    this.getZcrpFilename = this.garment.getGarmentFileName;
    this.loadZcrp = this.garment.loadZcrp;
  }

  async loadResizableAvatar({
    avatarURL,
    sizingURL,
    accURL,
    onProgress,
    onLoad,
  }) {
    console.log("\t++loadAvatar");
    await this.loadAvatar({ url: avatarURL, onProgress, onLoad });
    console.log("\t--loadAvatar");
    console.log("\t++loadAvatarResizingData");
    await this.loadAvatarResizingDataWithAcc({ sizingURL, accURL });
    console.log("\t--loadAvatarResizingData");
  }

  async loadAvatar({ url, onProgress, onLoad }) {
    // TODO: Error when calling repeatedly. Fix it.
    // this.zrest.clear();
    await loadZrestForFitting({
      url: url,
      funcOnProgress: onProgress,
      funcOnLoad: onLoad,
      zrest: this.zrest,
      isAvatar: true,
    });

    this.avatar = new FittingAvatar(this.container, this.zrest);
    this.avatar.init();
  }

  async loadAvatarResizingDataWithAcc({ sizingURL, accURL }) {
    console.log("\t\t++processAvatarSizingFile");
    const avatarSizingInfoObj = await processAvatarSizingFile({
      sizingURL,
      accURL,
    });
    this.avatar.initResizableBodyWithAcc(avatarSizingInfoObj);
    this.mapHeightWeightTo5Sizes = this.avatar.resizableBody.mapHeightWeightTo5Sizes;
  }

  async loadFitMap({
    fitMapURL,
    bVisible = true,
    bOpacity = true,
    opacityValue = 0.5,
  }) {
    const mapMatMesh = this.zrest.matMeshMap;

    await this.fitMap.open({ url: fitMapURL, mapMatMesh: mapMatMesh });
    this.fitMap.setOpacityValue(opacityValue);
    this.fitMap.setOpacity(bOpacity);
    this.fitMap.setVisible(bVisible);
  }

  async resizeAvatarWithAcc({
    height,
    weight,
    bodyShape,
    chest = -1,
    waist = -1,
    hip = -1,
    armLength = -1,
    legLength = -1,
  }) {
    // console.log({
    //   height,
    //   weight,
    //   bodyShape,
    // });
    await this.resizeAvatar({
      height,
      weight,
      bodyShape,
      chest,
      waist,
      hip,
      armLength,
      legLength,
    });
    await this.resizeAccessory();
  }

  async resizeAvatar({
    height,
    weight,
    bodyShape,
    chest = -1,
    waist = -1,
    hip = -1,
    armLength = -1,
    legLength = -1,
  }) {
    if (!this.avatar) return;
    this.avatar.resize({
      height,
      weight,
      bodyShape,
      chest,
      waist,
      hip,
      armLength,
      legLength,
    });
  }

  resizeAccessory() {
    if (!this.avatar) return;
    this.avatar.resizeAccessory();
  }

  async loadGarmentData({
    garmentURL,
    samplingURL,
    onProgress,
    onLoad,
    garmentColorwayIndex,
  }) {
    console.log("+ loadGarment");
    await this.loadGarment({
      url: garmentURL,
      onProgress,
      onLoad,
      colorwayIndex: garmentColorwayIndex,
    });
    console.log("- loadGarment");

    this.garment.init({
      bodyVertexIndex: this.avatar.bodyVertexIndex,
      bodyVertexPos: this.avatar.bodyVertexPos,
      zrest: this.zrest,
    });

    console.log("+ loadSamplingJson");
    await this.garment.loadSamplingJson({
      jsonURL: samplingURL,
    });
    console.log("- loadSamplingJson");
  }

  async loadGarment({ url, colorwayIndex, onProgress, onLoad }) {
    // TODO: Error when calling repeatedly. Fix it.
    // this.zrest.clear();
    await loadZrestForFitting({
      url,
      funcOnProgress: onProgress,
      funcOnLoad: onLoad,
      zrest: this.zrest,
      colorwayIndex,
      isAvatar: false,
    });
  }

  async drapingUsingZcrpURL({ zcrpURL }) {
    await this.garment.loadZcrp(zcrpURL);
    const listBarycentricCoord = this.garment.listBarycentricCoord;
    const mapMatMesh = this.zrest.matMeshMap;
    this.garment.draping({ listBarycentricCoord, mapMatMesh });
  }

  async resizingSupplementsUsingURL(supplementsURL) {
    const mapMatMesh = this.zrest.matMeshMap;
    await this.garment.resizingSupplement(supplementsURL, mapMatMesh);
  }
}

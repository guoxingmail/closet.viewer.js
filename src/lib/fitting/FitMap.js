import * as THREE from "@/lib/threejs/three";
import { MATMESH_TYPE } from "@/lib/clo/readers/predefined";
import { readByteArray, readMap } from "@/lib/clo/file/KeyValueMapReader";
import { loadFile } from "@/lib/clo/readers/FileLoader";

export default class FitMap {
  constructor() {
    this.mapVertexColor = new Map();
    this.geometry = new THREE.BufferGeometry();

    this.open = this.open.bind(this);
    this.setOpacity = this.setOpacity.bind(this);
    this.setVisible = this.setVisible.bind(this);
  }

  async open({ url, mapMatMesh }) {
    this.clear();
    this.mapMatMesh = mapMatMesh;

    // Load file the parse
    const rootMap = await this.loadThenParse(url);

    const listFitMap = rootMap.get("listFitMap");
    listFitMap.forEach((fm) => {
      const listMatMeshID = fm.get("listMatMeshID");
      if (!fm.has("baFitmapVertexColor")) {
        console.warn("WARNING: baFitmapVertexColor not found.");
        return;
      }

      const listVertexValue = readByteArray(
        "Float",
        fm.get("baFitmapVertexColor")
      );
      listMatMeshID.forEach((matMeshID) => {
        this.mapVertexColor.set(matMeshID, listVertexValue);
      });
    });

    this.assignVertexColor();
  }

  clear() {
    this.mapVertexColor.clear();
    this.geometry.dispose();
  }

  async loadThenParse(url) {
    const loadedData = await loadFile(url);
    return readMap(new DataView(loadedData), { Offset: 0 });
  }

  assignVertexColor() {
    this.mapVertexColor.forEach((listVertexColor, matMeshID) => {
      const matMesh = this.mapMatMesh.get(matMeshID);
      if (!matMesh) {
        console.warn("WARNING: MatMeshID(" + matMeshID + ") not found.");
        return;
      }

      const arrRGBA = Float32Array.from(listVertexColor);
      const geometry = matMesh.geometry;

      // NOTE: vFittingColor is used by shaders to render fit map.
      geometry.addAttribute(
        "vFittingColor",
        new THREE.BufferAttribute(arrRGBA, 4)
      );
    });
  }

  setOpacity(bOpacity) {
    this.loopToSet("bUseFitMapOpacity", bOpacity);
  }

  setVisible(bVisible) {
    this.mapMatMesh.forEach((matMesh) => {
      const type = matMesh.userData.TYPE;
      const isSupplement =
        MATMESH_TYPE.isGarment(type) && type !== MATMESH_TYPE.PATTERN_MATMESH;

      // NOTE: Supplements should not appear when rendering the fit map.
      if (isSupplement) {
        matMesh.visible = !bVisible;
      }
    });

    this.loopToSet("bUseFitMap", bVisible);
  }

  loopToSet(key, bValue) {
    const iValue = bValue ? 1 : 0;

    this.mapVertexColor.forEach((v, matMeshID) => {
      const matMesh = this.mapMatMesh.get(matMeshID);
      if (!matMesh) {
        console.warn("WARNING: MatMeshID(" + matMeshID + ") not found.");
      } else {
        const uniforms = matMesh.material.uniforms;
        uniforms[key].value = iValue;
      }
    });
  }
}

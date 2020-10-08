import * as THREE from "@/lib/threejs/three";
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
      const arrMatMeshID = fm.get("listMatMeshID");
      if (!fm.has("baFitmapVertexColor")) {
        console.warn("WARNING: baFitmapVertexColor not found.");
        return;
      }

      const arrVertexValue = readByteArray(
        "Float",
        fm.get("baFitmapVertexColor")
      );
      arrMatMeshID.forEach((matMeshID) => {
        this.mapVertexColor.set(matMeshID, arrVertexValue);
      });
    });

    this.createVertexColor();
  }

  clear() {
    this.mapVertexColor.clear();
    this.geometry.dispose();
  }

  async loadThenParse(url) {
    const loadedData = await loadFile(url);
    return readMap(new DataView(loadedData), { Offset: 0 });
  }

  createVertexColor() {
    for (const entries of this.mapVertexColor) {
      const matMeshID = entries[0];
      const arrVertexColor = entries[1];

      const matMesh = this.mapMatMesh.get(matMeshID);
      const arrRGBA = Float32Array.from(arrVertexColor);

      if (!matMesh) {
        console.warn("WARNING: MatMeshID(" + matMeshID + ") not found.");
        // return;
      } else {
        const geometry = matMesh.geometry;
        // NOTE: vFittingColor is used by shaders to render fit map.
        geometry.addAttribute(
          "vFittingColor",
          new THREE.BufferAttribute(arrRGBA, 4)
        );
      }
    }
  }

  setOpacity(bOpacity) {
    this.loopToSet("bUseFitMapOpacity", bOpacity);
  }

  loopToSet(key, bValue) {
    const iValue = bValue ? 1 : 0;
    for (const entries of this.mapVertexColor) {
      const matMeshID = entries[0];
      const matMesh = this.mapMatMesh.get(matMeshID);

      if (!matMesh) {
        console.warn("WARNING: MatMeshID(" + matMeshID + ") not found.");
      } else {
        const uniforms = matMesh.material.uniforms;
        uniforms[key].value = iValue;
      }
    }
  }

  setVisible(bVisible) {
    this.loopToSet("bUseFitMap", bVisible);
  }

  // TODO: Delete the comment below after QA
  /*
  // Parse the information to render a fit map from mapGeometry of ZRest.
  parseMapGeometry(mapGeometry) {
    const fieldKey = "listChildrenTransformer3D";

    const shouldRecursive = (element) => {
      return (
        element instanceof Map &&
        element.has(fieldKey) &&
        element.get(fieldKey) != null
      );
    };

    if (shouldRecursive(mapGeometry)) {
      this.parseMapGeometry(mapGeometry.get(fieldKey));
    } else {
      mapGeometry.forEach((element) => {
        if (shouldRecursive(element)) {
          this.parseMapGeometry(element);
        }
        const listMatShape = element.get("listMatShape");
        if (listMatShape) {
          this.extractFitMapDataFromMatShape(listMatShape);
        }
      });
    }
  }

  extractFitMapDataFromMatShape(listMatShape) {
    // NOTE: vertexValue consists of RGBA list. (E.g. RGBARGBARGBA....)
    // TODO: Ask to change field Key Fitmap to FitMap
    const fieldKey = "baFitmapVertexValue";

    listMatShape.forEach((matShape) => {
      if (matShape.has(fieldKey)) {
        const listMeshID = matShape.get("listMatMeshIDOnIndexedMesh");
        const baVertexColor = readByteArray("Float", matShape.get(fieldKey));

        // NOTE: meshID is an array but might have only 1 element.
        listMeshID.forEach((meshID) => {
          const matMeshID = meshID.get("uiMatMeshID");
          this.mapVertexColor.set(matMeshID, baVertexColor);
        });
      }
    });
  }
   */
}

import * as THREE from "@/lib/threejs/three";
import { readByteArray, readMap } from "@/lib/clo/file/KeyValueMapReader";
import { loadFile } from "@/lib/clo/readers/FileLoader";

export default class FitMap {
  constructor() {
    this.mapVertexColor = new Map();
    this.geometry = new THREE.BufferGeometry();
    // this.mapChangedIndex = new Map();

    // TODO: Change map to multi-map later. Map is wasting memory.
    // this.mapVertexValue = this.mapVertexColor;
    // this.mapVertexValue = new Map();
  }

  clear() {
    this.mapVertexColor.clear();
    this.geometry.dispose();
    // this.mapChangedIndex.clear();
  }

  init({
    mapGeometry: mapGeometry,
    // mapChangedIndex: mapChangedIndex,
    mapMatMesh,
  }) {
    // this.mapChangedIndex = mapChangedIndex;
    this.mapMatMesh = mapMatMesh;
    this.clear();
    this.extract(mapGeometry);
  }

  async loadFile(url, mapChangedIndex) {
    // this.mapChangedIndex = mapChangedIndex;
    this.clear();

    console.log("loadFile");
    const loadedData = await loadFile(url);
    console.log(loadedData);
    const rootMap = readMap(new DataView(loadedData), { Offset: 0 });
    console.log(rootMap);

    const listFitMap = rootMap.get("listFitMap");
    listFitMap.forEach((fm) => {
      const arrMatMeshID = fm.get("listMatMeshID");
      const baFM = fm.get("baFitmapVertexColor");
      if (!baFM) {
        console.log(fm);
        return;
      }
      const arrVertexValue = readByteArray(
        "Float",
        fm.get("baFitmapVertexColor")
      );
      arrMatMeshID.forEach((matMeshID) => {
        // console.log(arrVertexValue.length);
        // console.log(this.mapChangedIndex.get(matMeshID).length);
        this.mapVertexColor.set(matMeshID, arrVertexValue);
      });
    });

    console.log(this.mapVertexColor);

    // return rootMap;
  }

  setVisible(bVisible) {
    const iVisible = bVisible ? 1 : 0;

    for (const entries of this.mapVertexColor) {
      const matMeshID = entries[0];
      const matMesh = this.mapMatMesh.get(matMeshID);

      if (!matMesh) {
        console.warn("WARNING: MatMeshID(" + matMeshID + ") not found.");
        return;
      }

      matMesh.material.uniforms.bUseFitMap = {
        type: "i",
        value: iVisible,
      };
    }
  }

  extract(mapInput) {
    const shouldRecursive = (element) => {
      return (
        element instanceof Map &&
        element.has("listChildrenTransformer3D") &&
        element.get("listChildrenTransformer3D") != null
      );
    };

    if (shouldRecursive(mapInput)) {
      this.extract(mapInput.get("listChildrenTransformer3D"));
    } else {
      mapInput.forEach((element) => {
        if (shouldRecursive(element)) {
          this.extract(element);
        }
        const listMatShape = element.get("listMatShape");
        if (listMatShape) {
          this.extractFitMapData(listMatShape);
        }
      });
    }
  }

  extractFitMapData(listMatShape) {
    // const vertexColor = "baFitmapVertexColor";
    const vertexValue = "baFitmapVertexValue"; // NOTE: Not used yet.

    console.log(listMatShape);
    listMatShape.forEach((matShape) => {
      if (matShape.has(vertexValue)) {
        const meshIDs = matShape.get("listMatMeshIDOnIndexedMesh");
        const baVertexColor = readByteArray("Float", matShape.get(vertexValue));
        console.log(baVertexColor);
        meshIDs.forEach((meshID) => {
          // NOTE: meshID is an array but might have only 1 element
          const matMeshID = meshID.get("uiMatMeshID");
          this.mapVertexColor.set(matMeshID, baVertexColor);
        });
      }
    });
  }

  createVertices(mapMatMesh) {
    this.mapMatMesh = mapMatMesh;
    for (const entries of this.mapVertexColor) {
      const matMeshID = entries[0];
      const arrVertexColor = entries[1];

      const matMesh = mapMatMesh.get(matMeshID);
      const arrRGBA = Float32Array.from(arrVertexColor);

      const geometry = matMesh.geometry;
      geometry.addAttribute(
        "vFittingColor",
        new THREE.BufferAttribute(arrRGBA, 4)
      );
    }
  }
}

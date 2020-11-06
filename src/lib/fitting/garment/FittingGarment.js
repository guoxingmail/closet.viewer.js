"use strict";
import * as THREE from "@/lib/threejs/three";

import { loadJson } from "@/lib/clo/readers/FileLoader";
import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap, readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import { computeBarycentric } from "../common/FittingBarycentricCoord";
import FittingSupplements from "./FittingSupplements";
import { getGarmentFileName } from "@/lib/fitting/common/FittingUtil";

export default class FittingGarment {
  constructor() {
    this.listBarycentricCoord = [];
    // this.samplingJSON = null;
    FittingGarment.prototype.samplingJSON = null;

    // TODO: Consider getting the address, not the value.
    this.bodyVertexIndex = [];
    this.bodyVertexPos = [];
  }

  // TODO: rootMap is huge. Find out the better way.
  init({ bodyVertexPos, bodyVertexIndex, zrest }) {
    this.setBody({ bodyVertexPos, bodyVertexIndex} );
    this.supplements = new FittingSupplements(zrest);

    // FIXME: This is dangerous code.
    this.ODM = zrest.meshFactory.matmeshManager.ODM;
  }

  setBody = ({bodyVertexPos, bodyVertexIndex}) => {
    this.bodyVertexPos = bodyVertexPos;
    this.bodyVertexIndex = bodyVertexIndex;
  }

  async loadSamplingJson({ jsonURL }) {
    const onLoad = (data) => {
      return data;
    };
    const jsonData = await loadJson(jsonURL, onLoad);
    this.samplingJSON = jsonData;
    return jsonData;
  }

  async loadZcrp(url) {
    const getFilename = (textureURL) => {
      const splitTextureURL = textureURL.split("/");
      const filenameWithToken = splitTextureURL[splitTextureURL.length - 1];
      const filenameWithoutToken = filenameWithToken.split("?")[0];

      return filenameWithoutToken;
    };

    const loadedData = await loadFile(url);
    if (!loadedData) return;

    const crpFilename = getFilename(url).replace(".zcrp", ".crp");
    const unzippedData = await unZip(loadedData, crpFilename);

    const fileOffset = { Offset: 0 };
    const dataView = new DataView(unzippedData);
    const loadedMap = readMap(dataView, fileOffset);
    this.listBarycentricCoord =
      loadedMap.get("listBarycentric") || loadedMap.get("listBaryCentric"); // FIX ME: Would be "listBarycentric"

    return this.listBarycentricCoord;
  }

  // async loadDrapingDataFromURL({ zcrpURL }) {
  //   await this.loadZcrp(zcrpURL);
  // }
  
  getGarmentFileName = ({ height, weight}) => {
    return getGarmentFileName(height, weight, this.samplingJSON);
  }

  async loadDrapingData({ rootPath, height, weight }) {
    const zcrpName = getGarmentFileName(height, weight, this.samplingJSON);
    // const zcrpURL = rootPath + `P0_${height}_${weight}.zcrp`;
    const zcrpURL = rootPath + zcrpName;
    await this.loadZcrp(zcrpURL);
  }

  getListBarycentricCoord() {
    return this.listBarycentricCoord;
  }

  draping({ listBarycentricCoord, mapMatMesh }) {
    if (!listBarycentricCoord) {
      console.warn("Build barycentric coordinate failed.");
      return;
    }

    listBarycentricCoord.forEach((garment) => {
      const listABG = readByteArray("Float", garment.get("baAbgs"));
      const listTriangleIndex = readByteArray(
        "Uint",
        garment.get("baTriangleIndices")
      );
      const listMatMeshID = garment.get("listMatMeshID");
      if (!listMatMeshID) {
        console.warn("MatMeshID info missing");
        return;
      }

      const calculatedCoord = computeBarycentric({
        listABG: listABG,
        listTriangleIndex: listTriangleIndex,
        bodyVertexPos: this.bodyVertexPos,
        bodyVertexIndex: this.bodyVertexIndex,
      });

      listMatMeshID.forEach((matMeshID) => {
        const matMesh = mapMatMesh.get(matMeshID);
        // console.log(matMeshId, matMesh.userData.TYPE);

        if (!matMesh) {
          console.error(
            "matMesh(" + matMeshID + ") is not exist on init garment"
          );
          console.log(matMeshID);
          console.log(mapMatMesh);

          return;
        }

        // TODO: Take a deep look
        if (matMesh.userData.TYPE !== 0) return; // PATTERN ONLY
        // if (matMesh.userData.TYPE === 4 || matMesh.userData.TYPE === 3) return; // NORMAL_MATMESH, BUTTONHEAD

        const originalData = this.ODM.get(matMeshID);
        if (!originalData) {
          console.warn("WARNING: Original data not found! (" + matMeshID + ")." )
        }
        const index = originalData.index;
        const uv = originalData.uv;

        const sorted = Array.from(index).sort((a, b) => a - b);
        const minIndex = sorted[0];
        const maxIndex = sorted[sorted.length - 1];

        const arrSlicedVertex = calculatedCoord.slice(minIndex * 3, (maxIndex + 1) * 3);
        const reindex = index.map(x => (x - minIndex));

        const arrSlicedUV = uv.slice(minIndex * 2, (maxIndex + 1) * 2);
        // const arrSlicedUV2 = uv2.slice(minIndex * 2, (maxIndex + 1) * 2);

        const taPos = new Float32Array(arrSlicedVertex);
        const taIndex = new Uint32Array(reindex);
        const taUV = new Float32Array(arrSlicedUV);

        const bufferGeometry = new THREE.BufferGeometry();

        bufferGeometry.addAttribute(
          "position",
          new THREE.BufferAttribute(taPos, 3)
        );

        bufferGeometry.setIndex(
          new THREE.BufferAttribute(taIndex, 1)
        );

        bufferGeometry.computeBoundingBox();
        bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();

        bufferGeometry.addAttribute(
          "uv",
          new THREE.BufferAttribute(taUV, 2)
        );
        matMesh.geometry.dispose();
        matMesh.geometry = bufferGeometry;

        matMesh.material.needsUpdate = true;
      });
    });
  }

  async resizingSupplement(supplementsURL, mapMatMesh) {
    // TODO: Rename this module after testing, Remove return
    return await this.supplements.processTextureSupplement(supplementsURL, mapMatMesh, this.ODM);
  }
}
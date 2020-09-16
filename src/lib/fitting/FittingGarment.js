"use strict";
import * as THREE from "@/lib/threejs/three";

import { loadJson } from "@/lib/clo/readers/FileLoader";
import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap, readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import { getGarmentFileName } from "@/lib/clo/utils/UtilFunctions";
import { computeBarycentric } from "./FittingBarycentricCoord";
import FittingSupplements from "./supplements/FittingSupplements";

export default class FittingGarment {
  constructor() {
    this.listBarycentricCoord = [];
    // this.samplingJSON = null;
    FittingGarment.prototype.samplingJSON = null;

    // TODO: Consider getting the address, not the value.
    this.bodyVertexIndex = [];
    this.bodyVertexPos = [];
  }

  // TODO: rootMap is huge. Find out better way.
  init({ bodyVertexPos, bodyVertexIndex, zrest }) {
    //mapBarycentricPrintTexture
    // console.log({ bodyVertexPos, bodyVertexIndex, zrest })
    this.setBody(bodyVertexPos, bodyVertexIndex);
    this.supplements = new FittingSupplements(zrest);
  }

  setBody = (bodyVertexPos, bodyVertexIndex) => {
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

  async loadDrapingDataFromURL({ zcrpURL }) {
    const listBarycentricCoord = await this.loadZcrp(zcrpURL);
    // return this.draping({ listBarycentricCoord, mapMatMesh });
  }
  
  getGarmentFileName = ({ height, weight}) => {
    return getGarmentFileName(height, weight, this.samplingJSON);
  }

  async loadDrapingData({ rootPath, height, weight, mapMatMesh }) {
    const zcrpName = getGarmentFileName(height, weight, this.samplingJSON);
    // const zcrpURL = rootPath + `P0_${height}_${weight}.zcrp`;
    const zcrpURL = rootPath + zcrpName;
    const listBarycentricCoord = await this.loadZcrp(zcrpURL);

    // console.log(this.samplingJSON);
    // console.log(mapMatMesh);
    // console.log(listBarycentricCoord);

    // return this.draping({ listBarycentricCoord, mapMatMesh });
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

      listMatMeshID.forEach((matMeshId) => {
        const matMesh = mapMatMesh.get(matMeshId);
        // console.log(matMeshId, matMesh.userData.TYPE);

        if (!matMesh) {
          console.error(
            "matMesh(" + matMeshId + ") is not exist on init garment"
          );
          console.log(matMeshId);
          console.log(mapMatMesh);

          return;
        }

        // TODO: Take a deep look
        if (matMesh.userData.TYPE === 4) return; // NORMAL_MATMESH

        const index = matMesh.userData.originalIndices;
        const uv = matMesh.userData.originalUv;
        const uv2 = matMesh.userData.originalUv2;

        const sorted = Array.from(index).sort((a, b) => a - b);
        const minIndex = sorted[0];
        const maxIndex = sorted[sorted.length - 1];

        const arrSlicedVertex = calculatedCoord.slice(minIndex * 3, (maxIndex + 1) * 3);
        const reindex = index.map(x => (x - minIndex));

        const arrSlicedUV = uv.slice(minIndex * 2, (maxIndex + 1) * 2);
        const arrSlicedUV2 = uv2.slice(minIndex * 2, (maxIndex + 1) * 2);

        const taPos = new Float32Array(arrSlicedVertex);
        const taIndex = new Uint32Array(reindex);
        const taUV = new Float32Array(arrSlicedUV);

        const bufferGeometry = new THREE.BufferGeometry();
        // const bufferGeometry = matMesh.geometry;

        bufferGeometry.addAttribute(
          "position",
          new THREE.BufferAttribute(taPos, 3)
          // new THREE.Float32BufferAttribute(new Float32Array(arrSlicedVertex), 3)
          // taPos
        );

        bufferGeometry.setIndex(
          new THREE.BufferAttribute(taIndex, 1)
          // new THREE.BufferAttribute(new Uint32Array(reindex), 1)
          //new THREE.BufferAttribute(new Uint32Array(...matMesh.geometry.index.array), 1)
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
        // console.log(matMesh.geometry);
        // matMesh.geometry.attributes.uv.needsUpdate = true;
        // matMesh.geometry.attributes.uv2.needsUpdate = true;

        // matMesh.geometry.computeBoundingBox();
        // matMesh.geometry.computeFaceNormals();
        // matMesh.geometry.computeVertexNormals();

        matMesh.material.needsUpdate = true;
      });
    });
  }

  async resizingSupplement(supplementsURL, mapMatMesh, mapTransMatrix) {
    // TODO: Rename this module after testing, Remove return
    return await this.supplements.test(supplementsURL, mapMatMesh, mapTransMatrix);
  }
}
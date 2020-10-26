import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";
import { ZRestLoader } from "@/lib/zrest/ZRestLoader";
import * as THREE from "@/lib/threejs/three";

export async function processAvatarSizingFile({ sizingURL, accURL }) {
  const sizeObj = await processAvatarSizingBodyFile(sizingURL);

  const mapBaseMesh = sizeObj.mapBaseMesh;
  const convertingMatData = sizeObj.convertingMatData;
  const mapHeightWeightTo5Sizes = sizeObj.mapHeightWeightTo5Sizes;
  const mapAccessoryMesh = await processAvatarSizingAccFile(accURL);

  return {
    mapBaseMesh,
    convertingMatData,
    mapHeightWeightTo5Sizes,
    mapAccessoryMesh,
  };
}

export async function processAvatarSizingBodyFile(sizingURL) {
  const getParsedData = async (filename, loadedData) => {
    return await unzipParse({
      loadedData: loadedData,
      filename: filename,
    });
  };

  console.log("\t\t\t++loadSizingData");
  const loadedSizingData = await loadFile(sizingURL);
  console.log(loadedSizingData);
  console.log("\t\t\t++getParsedData");
  const mapBaseMesh = await getParsedData("BaseMesh.map", loadedSizingData);

  console.log("\t\t\t++unZip");
  const unzippedConvertingMatData = await unZip(
    loadedSizingData,
    "ConvertingMat_DETAIL_Simple_Weight_TotalHeight.bd"
  );
  // console.log("\t\t\t++readConvertingMatData");
  const convertingMatData = readConvertingMatData({
    unzippedConvertingMatData,
  });

  // console.log("\t\t\t++getParsedData");
  const mapHeightWeightTo5Sizes = await getParsedData(
    "HeightWeightTo5SizesMap.map",
    loadedSizingData
  );

  return {
    mapBaseMesh,
    convertingMatData,
    mapHeightWeightTo5Sizes,
  };
}

async function processAvatarSizingAccFile(accURL) {
  // console.log("\t\t\t++loadAccData");
  const loadedAccData = await loadFile(accURL);

  // console.log("\t\t\t++readMapFromUnzippedData");
  const mapAccessoryMesh = await readMapFromUnzippedData(loadedAccData, 0);

  return mapAccessoryMesh;
}

function readConvertingMatData({ unzippedConvertingMatData }) {
  const matrixSizes = new Int32Array(unzippedConvertingMatData, 0, 2);
  const matWidth = matrixSizes[0]; // Features
  const matHeight = matrixSizes[1]; // Indices
  const offsetByMatrixSizes = matrixSizes.BYTES_PER_ELEMENT * 2;
  const convertingMatData = new Float32Array(
    unzippedConvertingMatData,
    offsetByMatrixSizes
  );

  const mat = new Array(matWidth);
  for (let i = 0; i < matWidth; ++i) {
    const begin = matHeight * i;
    const end = matHeight * (i + 1) - 1;
    mat[i] = convertingMatData.slice(begin, end);
  }

  return mat;
}

async function unzipParse({ loadedData, filename }) {
  const unzippedData = await unZip(loadedData, filename);
  return readMapFromUnzippedData(unzippedData, 0);
}

function readMapFromUnzippedData(unzippedData, offset) {
  const fileOffset = { Offset: offset };
  const dataView = new DataView(unzippedData);
  return readMap(dataView, fileOffset);
}

export async function loadZrestForFitting({
  url: url,
  funcOnProgress: onProgress,
  funcOnLoad: onLoad,
  zrest: zrest,
  colorwayIndex,
  // parentContainer: container,
  isAvatar: isAvatar = false,
}) {
  // const scene = this.scene;

  const progress = function (xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
      const percent = Math.round(percentComplete, 2);
      if (onProgress) onProgress(percent);
    }
  };

  const error = function (xhr) {
    console.error("Load zrest failed. " + xhr);
  };

  const loaded = async (object, loadedCamera, data) => {
    if (zrest !== undefined) {
      zrest.clearMaps();
    }

    if (isAvatar)
      zrest.addThreeContainerUniquely(
        object,
        "fittingAvatarContainer",
        "fittingContainer"
      );
    else {
      if (colorwayIndex > -1) {
        await zrest.changeColorway(colorwayIndex);
      }
      zrest.addThreeContainerUniquely(
        object,
        "fittingGarmentContainer",
        "fittingContainer"
      );
    }

    if (onLoad) onLoad(this);

    zrest.zoomToObjects(loadedCamera, zrest.scene);
    // if (!isAvatar) this.updateRenderer();
    // this.updateRenderer();

    return zrest.scene;
  };

  // TODO: This module is not stable and may cause memory leaks.
  // if (zrest !== undefined) {
  //   zrest.clearMaps();
  //   zrest.clear();
  // }

  console.log("\t\t\t\t+ zrest.loadOnly");
  const dataArr = await zrest.loadForFitting(url, progress);
  console.log("\t\t\t\t- zrest.loadOnly");

  console.log("\t\t\t\t+ zrest.parseAsync");
  await zrest.parseAsync(dataArr, loaded);
  console.log("\t\t\t\t- zrest.parseAsync");

  return zrest;
}

export function convertFloatArrayToVec3Array(floatArray) {
  const vec3Array = [];
  for (let v = 0; v < floatArray.length; v += 3) {
    vec3Array.push(
      new THREE.Vector3(floatArray[v], floatArray[v + 1], floatArray[v + 2])
    );
  }
  return vec3Array;
}

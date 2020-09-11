import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";

export function processOverlayPrint(listPrintTextureBarycentric, mapMatMesh) {
  console.log("processOverlayPrint");
  if (!listPrintTextureBarycentric || !mapMatMesh) return;

  // TODO: Test only
  // mapMatMesh.forEach((matMesh) => (matMesh.visible = false));

  const listPrintTexture = readData(listPrintTextureBarycentric);
  // console.log(listPrintTexture);

  // TEST: turn off all matmesh
  // mapMatMesh.forEach((m) => {
  //   if (m.userData.TYPE === 2) {
  //     console.log(m.userData.MATMESH_ID);
  //     m.visible = true;
  //   } else m.visible = false;
  // m.visible = false;
  // });

  listPrintTexture.forEach((obj) => {
    const matMeshID = obj.matMeshID;
    const matMesh = mapMatMesh.get(matMeshID);

    // if (matMesh) {
    //   console.log(matMesh);
    //   matMesh.visible = false;
    // }
    const textureMatMesh = mapMatMesh.get(obj.printTextureMatMeshID);
    // console.log(textureMatMesh);

    process(matMesh, textureMatMesh, obj.listABG, obj.listPtIndex);

    // console.log(textureMatMesh);
    // textureMatMesh.visible = true;
  });
}
//
// function readData(listPrintTextureBarycentric) {
//   const listPrintTexture = [];
//
//   listPrintTextureBarycentric.forEach((element) => {
//     // TODO: Ask to change the data type from byte to int
//     const matMeshID = parseInt(
//       readByteArray("String", element.get("patternMatMeshID"))
//     );
//     const printTextureMatMeshID = parseInt(
//       readByteArray("String", element.get("printTextureMatMeshID"))
//     );
//     const listIndex = readByteArray("Uint", element.get("baIndices"));
//     const loadedABG = readByteArray("Float", element.get("baAbgs"));
//     const loadedPtIndex = readByteArray("Uint", element.get("baPtIndices"));
//
//     const listABG = [];
//     const listPtIndex = [];
//
//     // Parse data
//     for (let i = 0; i < listIndex.length; ++i) {
//       const idx = i * 3;
//
//       const ABG = new Object({
//         a: loadedABG[idx],
//         b: loadedABG[idx + 1],
//         g: loadedABG[idx + 2],
//       });
//       listABG.push(ABG);
//
//       listPtIndex.push([
//         loadedPtIndex[idx],
//         loadedPtIndex[idx + 1],
//         loadedPtIndex[idx + 2],
//       ]);
//     }
//
//     const obj = new Object();
//     obj["matMeshID"] = matMeshID;
//     obj["printTextureMatMeshID"] = printTextureMatMeshID;
//     obj["listABG"] = listABG;
//     obj["listIndex"] = listIndex;
//     obj["listPtIndex"] = listPtIndex;
//
//     listPrintTexture.push(obj);
//   });
//
//   return listPrintTexture;
// }

function process(matMesh, textureMatMesh, listABG, listPtIndex) {
  if (!matMesh) return;

  const vertexCount = textureMatMesh.geometry.attributes.position.count;
  const texMeshPos = textureMatMesh.geometry.attributes.position.array;
  const meshPos = matMesh.geometry.attributes.position.array;
  // const uv = matMesh.geometry.attributes.uv.array;

  const bBoth = vertexCount / 2 === listABG.length;

  // if (vertexCount !== listABG.length || vertexCount !== listPtIndex.length) {
  //   console.log("Warning: Invalid data");
  //   console.log({
  //     pos: texMeshPos,
  //     listAGB: listABG,
  //     listPtIndex: listPtIndex,
  //   });
  //   console.log(matMesh);
  //   return;
  // } else {
  //   console.log("ok");
  //   console.log({
  //     pos: texMeshPos,
  //     listAGB: listABG,
  //     listPtIndex: listPtIndex,
  //   });
  // }

  const getPos = (idx) => {
    // if (idx * 3 > meshPos.length) console.log(idx);

    return new THREE.Vector3(
      meshPos[idx * 3],
      meshPos[idx * 3 + 1],
      meshPos[idx * 3 + 2]
    );
  };

  // console.log(vertexCount);
  // console.log(texturePos.length / 3);
  // // console.log(listPos);
  // // console.log(listABG.length);
  // // console.log(listPtIndex.length);
  // // console.log("===");

  if (bBoth) console.log("bBoth: " + matMesh.userData.MATMESH_ID);

  const end = bBoth ? vertexCount / 2 : vertexCount;
  console.log("end: " + end);

  // for (let i = 0; i < vertexCount; i += 100) {
  for (let i = 0; i < end; ++i) {
    // console.log(i, listPtIndex[i]);
    const step1 = getPos(listPtIndex[i][0]).multiplyScalar(listABG[i].a);
    const step2 = getPos(listPtIndex[i][1]).multiplyScalar(listABG[i].b);
    const step3 = getPos(listPtIndex[i][2]).multiplyScalar(listABG[i].g);

    texMeshPos[i * 3] = step1.x + step2.x + step3.x;
    texMeshPos[i * 3 + 1] = step1.y + step2.y + step3.y;
    texMeshPos[i * 3 + 2] = step1.z + step2.z + step3.z;

    // if (bBoth) {
    //   const idx = i + vertexCount / 2;
    //   texMeshPos[idx * 3] = step1.x + step2.x + step3.x;
    //   texMeshPos[idx * 3 + 1] = step1.y + step2.y + step3.y;
    //   texMeshPos[idx * 3 + 2] = step1.z + step2.z + step3.z;
    // }
  }

  if (bBoth) {
    const index = textureMatMesh.geometry.index.array;
    const frontVertexCnt = vertexCount / 2;
    const frontIdxCnt = index.length / 2;

    for (let i = frontIdxCnt; i < index.length; ++i) {
      const idx = frontVertexCnt + index[i - frontIdxCnt];

      if (i % 3 === 1) {
        // console.log(index[i + 1], idx);
        index[i + 1] = idx;
      } else if (i % 3 === 2) {
        // console.log(index[i - 1], idx);
        index[i - 1] = idx;
      } else {
        // console.log(index[i], idx);
        index[i] = idx;
      }
    }

    textureMatMesh.geometry.index.needsUpdate = true;
  }

  // Needs update
  textureMatMesh.geometry.attributes.position.needsUpdate = true;
  // textureMatMesh.geometry.attributes.normal.needsUpdate = true;
  // textureMatMesh.geometry.computeBoundingSphere();
  textureMatMesh.geometry.computeFaceNormals();
  textureMatMesh.geometry.computeVertexNormals();

  // textureMatMesh.geometry.verticesNeedUpdate = true;
  // textureMatMesh.geometry.elementsNeedUpdate = true;
  // textureMatMesh.geometry.morphTargetsNeedUpdate = true;
  // textureMatMesh.geometry.uvsNeedUpdate = true;
  // textureMatMesh.geometry.normalsNeedUpdate = true;
  // textureMatMesh.geometry.colorsNeedUpdate = true;
  // textureMatMesh.geometry.tangentsNeedUpdate = true;

  // NOTE: Modules to avoid z-fighting. It works for now but could be a problem in the future.
  // textureMatMesh.material.polygonOffset = true;
  // textureMatMesh.material.polygonOffsetFactor = -1;

  // FOR TEST
  // textureMatMesh.material.uniforms.sGlobal.value = null;
  // textureMatMesh.material.uniforms.materialBaseColor.value.y = 0;
  // END FOR TEST

  textureMatMesh.material.needsUpdate = true;
  matMesh.material.needsUpdate = true;

  // TODO: Remove this
  // textureMatMesh.visible = false;

  // if (bBoth) console.log(textureMatMesh.geometry);
  // else textureMatMesh.visible = false;
  // textureMatMesh.visible = true;
  // matMesh.visible = true;
  console.log(matMesh);
}


export function processPuckering(listBaryPuckering, mapMatMesh) {
  console.log("processPuckering");
  if (!listBaryPuckering || !mapMatMesh) return;

  // TODO: Test only
  // mapMatMesh.forEach((matMesh) => (matMesh.visible = false));

  console.log(listBaryPuckering);
  const listPuckering = readData(listBaryPuckering, "uiPuckeringMatMeshID");
  console.log(listPuckering);

  listPuckering.forEach((obj) => {
    const matMeshID = obj.matMeshID;
    const matMesh = mapMatMesh.get(matMeshID);
    const textureMatMesh = mapMatMesh.get(obj.printTextureMatMeshID);
    // console.log(textureMatMesh);

    process(matMesh, textureMatMesh, obj.listABG, obj.listPtIndex);

    // console.log(textureMatMesh);
    // textureMatMesh.visible = true;
  });
}

export function processStitch(listBaryStitch, mapMatMesh) {
  console.log("processStitch");
  if (!listBaryStitch || !mapMatMesh) return;

  // TODO: Test only
  // mapMatMesh.forEach((matMesh) => (matMesh.visible = false));

  console.log(listBaryStitch);
  const listPuckering = readData(listBaryStitch, "uiStitchMatMeshID");
  console.log(listPuckering);

  listPuckering.forEach((obj) => {
    // const matMesh = mapMatMesh.get(obj.matMeshID);
    // const textureMatMesh = mapMatMesh.get(obj.printTextureMatMeshID);

    const textureMatMesh = mapMatMesh.get(obj.matMeshID);
    const matMesh = mapMatMesh.get(obj.printTextureMatMeshID);


    process(matMesh, textureMatMesh, obj.listABG, obj.listPtIndex);

    // console.log(textureMatMesh);
    // textureMatMesh.visible = true;
  });
}

function processCommon(listBarycentricElement, dataFieldName, objFieldName, mapMatMesh) {
  const listElement = readData(listBarycentricElement, dataFieldName);
  listElement.forEach((obj) => {
    const parentMatMesh = mapMatMesh.get(obj.matMeshID);
    const elementMatMesh = mapMatMesh.get(obj[objFieldName]);
  })
}

function readData(listBaryPuckering, dataFieldName) {
  const retList = [];

  listBaryPuckering.forEach((element) => {
    const parentMatMeshID = element.get("uiPatternMatMeshID");
    const elementMatMeshID = element.get(dataFieldName);
    const listIndex = readByteArray("Uint", element.get("baIndices"));
    const loadedABG = readByteArray("Float", element.get("baAbgs"));
    const loadedPtIndex = readByteArray("Uint", element.get("baPtIndices"));

    const listABG = [];
    const listPtIndex = [];

    // Parse data
    for (let i = 0; i < listIndex.length; ++i) {
      const idx = i * 3;

      const ABG = new Object({
        a: loadedABG[idx],
        b: loadedABG[idx + 1],
        g: loadedABG[idx + 2],
      });
      listABG.push(ABG);

      listPtIndex.push([
        loadedPtIndex[idx],
        loadedPtIndex[idx + 1],
        loadedPtIndex[idx + 2],


      ]);
    }

    const obj = new Object();
    obj["parentMatMeshID"] = parentMatMeshID;
    obj["elementMatMeshID"] = elementMatMeshID;
    obj["listABG"] = listABG;
    obj["listIndex"] = listIndex;
    obj["listPtIndex"] = listPtIndex;

    retList.push(obj);
  });

  return retList;
}
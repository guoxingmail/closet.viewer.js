import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";

const RENDER_TYPE = {
  FRONT_SIDE_ONLY: 1,
  BACK_SIDE_ONLY: 2,
  BOTH_SIDE: 0,
};

export function processOverlayPrint(listPrintTextureBarycentric, mapMatMesh) {
  console.log("processOverlayPrint");
  if (!listPrintTextureBarycentric || !mapMatMesh) return;

  // TODO: Test only
  // mapMatMesh.forEach((matMesh) => (matMesh.visible = false));

  const listPrintTexture = readData(
    listPrintTextureBarycentric,
    "uiPrintTextureMatMeshID"
  );
  console.log(listPrintTexture);

  listPrintTexture.forEach((obj) => {
    const listParentMatMeshID = obj.listParentMatMeshID;
    const renderType = obj.renderType;
    const textureMatMesh = mapMatMesh.get(obj.elementMatMeshID);

    const executeProcess = (parentMatMesh, bSecondHalf = false) => {
      process(
        parentMatMesh,
        textureMatMesh,
        obj.listABG,
        obj.listPtIndex,
        bSecondHalf
      );
    };

    if (renderType === RENDER_TYPE.BOTH_SIDE) {
      const frontMatMeshID = Math.min(...listParentMatMeshID);
      const backMatMeshID = Math.max(...listParentMatMeshID);

      executeProcess(mapMatMesh.get(frontMatMeshID), false);
      executeProcess(mapMatMesh.get(backMatMeshID), true);
    } else {
      const parentMatMesh = mapMatMesh.get(listParentMatMeshID[0]);
      executeProcess(parentMatMesh, false);
    }
  });
}

function process(
  matMesh,
  textureMatMesh,
  listABG,
  listPtIndex,
  bSecondHalf = false
) {
  if (!matMesh) return;

  const texMeshPos = textureMatMesh.geometry.attributes.position.array;
  const texMeshPosCount = textureMatMesh.geometry.attributes.position.count;
  const meshPos = matMesh.geometry.attributes.position.array;
  const bBothSide = texMeshPosCount / 2 === listABG.length;

  const updateTexPos = () => {
    const getPos = (idx) => {
      return new THREE.Vector3(
        meshPos[idx * 3],
        meshPos[idx * 3 + 1],
        meshPos[idx * 3 + 2]
      );
    };

    const loopFinish = bBothSide ? texMeshPosCount / 2 : texMeshPosCount;

    for (let i = 0; i < loopFinish; ++i) {
      const alpha = getPos(listPtIndex[i][0]).multiplyScalar(listABG[i].a);
      const beta = getPos(listPtIndex[i][1]).multiplyScalar(listABG[i].b);
      const gamma = getPos(listPtIndex[i][2]).multiplyScalar(listABG[i].g);

      const idx = bSecondHalf ? i + texMeshPosCount / 2 : i;
      texMeshPos[idx * 3] = alpha.x + beta.x + gamma.x;
      texMeshPos[idx * 3 + 1] = alpha.y + beta.y + gamma.y;
      texMeshPos[idx * 3 + 2] = alpha.z + beta.z + gamma.z;
    }
  };

  // NOTE:
  // This module used to test only
  //
  // SW에서는 matShape 단위로 계산하기 때문에 back-face에 붙일 때는 normal을 뒤집기 위해 index를 조정해야 했음
  // 여기에서는 matMesh를 앞뒤옆 3개로 따로 생성하기 때문에 이러한 작업이 필요하지 않음
  const flipNormal = () => {
    const index = textureMatMesh.geometry.index.array;
    const reIndex = [];

    for (let i = 0; i < index.length; ++i) {
      if (i % 3 === 1) {
        reIndex[i + 1] = index[i];
      } else if (i % 3 === 2) {
        reIndex[i - 1] = index[i];
      } else {
        reIndex[i] = index[i];
      }
    }
    textureMatMesh.geometry.setIndex(reIndex);
    textureMatMesh.geometry.index.needsUpdate = true;
  };

  updateTexPos();
  // flipNormal();

  // Needs update
  textureMatMesh.geometry.attributes.position.needsUpdate = true;
  textureMatMesh.geometry.attributes.uv.needsUpdate = true;
  textureMatMesh.geometry.computeFaceNormals();
  textureMatMesh.geometry.computeVertexNormals();

  textureMatMesh.material.needsUpdate = true;
  matMesh.material.needsUpdate = true;
}

export function processPuckering(listBaryPuckering, mapMatMesh) {
  console.log("processPuckering");
  if (!listBaryPuckering || !mapMatMesh) return;

  console.log(listBaryPuckering);
  const listPuckering = readData(listBaryPuckering, "uiPuckeringMatMeshID");
  console.log(listPuckering);

  listPuckering.forEach((obj) => {
    const matMeshID = obj.matMeshID;
    const matMesh = mapMatMesh.get(matMeshID);
    const textureMatMesh = mapMatMesh.get(obj.printTextureMatMeshID);

    process(matMesh, textureMatMesh, obj.listABG, obj.listPtIndex);
  });
}

export function processStitch(listBaryStitch, mapMatMesh) {
  console.log("processStitch");
  if (!listBaryStitch || !mapMatMesh) return;

  console.log(listBaryStitch);
  const listPuckering = readData(listBaryStitch, "uiStitchMatMeshID");
  console.log(listPuckering);

  listPuckering.forEach((obj) => {
    const textureMatMesh = mapMatMesh.get(obj.matMeshID);
    const matMesh = mapMatMesh.get(obj.printTextureMatMeshID);

    process(matMesh, textureMatMesh, obj.listABG, obj.listPtIndex);
  });
}

function readData(listData, dataFieldName) {
  const listResult = [];

  // Parse Data
  listData.forEach((element) => {
    const listIndex = readByteArray("Uint", element.get("baIndices"));
    const loadedABG = readByteArray("Float", element.get("baAbgs"));
    const loadedPtIndex = readByteArray("Uint", element.get("baPtIndices"));

    const listABG = [];
    const listPtIndex = [];

    // Re-index ABG and PtIndex
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

    // Extract data
    const renderType = element.has("iRenderType")
      ? element.get("iRenderType")
      : -1;

    const getParentMatMeshID = (dataFieldName, renderType) => {
      if (renderType > -1) {
        switch (renderType) {
          case RENDER_TYPE.FRONT_SIDE_ONLY:
            return [element.get("uiFrontPatternMatMeshID")];
          case RENDER_TYPE.BACK_SIDE_ONLY:
            return [element.get("uiBackPatternMatMeshID")];
          case RENDER_TYPE.BOTH_SIDE:
            return [
              element.get("uiFrontPatternMatMeshID"),
              element.get("uiBackPatternMatMeshID"),
            ];
        }
      } else {
        return [element.get("uiPatternMatMeshID")];
      }
    };
    const listParentMatMeshID = getParentMatMeshID(dataFieldName, renderType);
    const elementMatMeshID = element.get(dataFieldName);

    const obj = {};
    obj["listParentMatMeshID"] = listParentMatMeshID;
    obj["elementMatMeshID"] = elementMatMeshID;
    obj["listABG"] = listABG;
    obj["listIndex"] = listIndex;
    obj["listPtIndex"] = listPtIndex;
    obj["renderType"] = renderType;

    listResult.push(obj);
  });

  return listResult;
}

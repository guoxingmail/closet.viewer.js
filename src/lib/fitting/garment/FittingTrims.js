import * as THREE from "@/lib/threejs/three";

export function processTrims(listBarycentricTrim, mapMatMesh) {
  listBarycentricTrim.forEach((trim) => {
    parseThenProcess({
      mapMatMesh: mapMatMesh,
      mapData: trim,
      arrMatMeshField: "arrTrimMatMeshID",
    });
  });
}

export function processButtonHead(listButtonHead, mapMatMesh) {
  listButtonHead.forEach((btn) => {
    // parseThenProcess({
    //   mapMatMesh: mapMatMesh,
    //   mapData: trim,
    //   arrMatMeshField: "arrTrimMeshID",
    // });
    // TODO: Ask to change field keys
    process({
      arrMeshID: btn.get("arrButtonMatMeshesID"),
      gluedMatMeshID: btn.get("uiPatternMatMeshID"),
      triangleIndex: btn.get("uiPatternTriangleIndex"),
      triangleABC: btn.get("vec3PatternABG"),
      localMatrix: btn.get("mat4ButtonLocalMatrix"),
      mapMatMesh: mapMatMesh,
    });
  });
}

// TODO: Refactor more
export function processZipper(listZipper, mapMatMesh) {
  // NOTE:
  // Zipper is made up of three parts that top stopper, bottom stopper, and slide.
  // But in this module, all parts are treated as the same.
  listZipper.forEach((mapZipperInfo) => {
    const bottomStopper = mapZipperInfo.get("listBottomStopperTF3DList");
    if (bottomStopper)
      bottomStopper.forEach((l) =>
        parseThenProcess({
          mapMatMesh: mapMatMesh,
          mapData: l,
          arrMatMeshField: "arrZipperBottomStopperMatMeshID",
        })
      );

    const topStopper = mapZipperInfo.get("listTopStopperTF3DList");
    if (topStopper)
      topStopper.forEach((l) =>
        parseThenProcess({
          mapMatMesh: mapMatMesh,
          mapData: l,
          arrMatMeshField: "arrZipperTopStopperMatMeshID",
        })
      );

    const slider = mapZipperInfo.get("mapZipperSlider");
    if (slider)
      parseThenProcess({
        mapMatMesh: mapMatMesh,
        mapData: slider,
        arrMatMeshField: "arrZipperPullerMatMeshID",
        optionalMatMeshField: "arrZipperSliderMatMeshID",
      });
  });
}

function parseThenProcess({
  mapMatMesh,
  mapData,
  arrMatMeshField,
  optionalMatMeshField,
}) {
  const arrMeshID = optionalMatMeshField
    ? [...mapData.get(arrMatMeshField), ...mapData.get(optionalMatMeshField)]
    : mapData.get(arrMatMeshField);

  process({
    arrMeshID: arrMeshID,
    gluedMatMeshID: mapData.get("uiPatternMatMeshID"),
    triangleIndex: mapData.get("iGluedPatternTriangleIndex"), // glued pattern triangle index
    triangleABC: mapData.get("v3GluedPatternTriangleABC"), // glued pattern triangle ABC
    localMatrix: mapData.get("m4LocalMatrixOnGluedPatternTriangle"), // local matrix on glued pattern triangle
    mapMatMesh: mapMatMesh,
  });
}

function process({
  arrMeshID,
  gluedMatMeshID,
  triangleIndex, // glued pattern triangle index
  triangleABC, // glued pattern triangle ABC
  localMatrix, // local matrix on glued pattern triangle
  mapMatMesh,
}) {
  const getLtoW = () => {
    const gluedMatMesh = mapMatMesh.get(gluedMatMeshID);
    const wtol = getTriangleWorldToLocal(
      gluedMatMesh,
      triangleIndex,
      triangleABC
    );
    const ltow = getInvertRotTrans(wtol);
    const isMatrixCLOStyle = localMatrix.a00 !== undefined;
    const threeStyleLocalMatrix = isMatrixCLOStyle
      ? getMatrix4(localMatrix)
      : localMatrix;
    ltow.multiply(threeStyleLocalMatrix);

    return ltow;
  };

  const ltow = getLtoW();

  arrMeshID.forEach((matMeshID) => {
    const matMesh = mapMatMesh.get(matMeshID);

    // NOTE: This flag should be false to control the matrix manually.
    matMesh.matrixAutoUpdate = false;

    // NOTE: Parent means the object3D that has matMesh. It's does not mesh or matMesh.
    const parentWtoL = new THREE.Matrix4().getInverse(
      matMesh.parent.matrixWorld
    );

    matMesh.matrix = new THREE.Matrix4().multiplyMatrices(parentWtoL, ltow);
  });
}

function getMatrix4(matrixFromCLO) {
  return new THREE.Matrix4().fromArray(Object.values(matrixFromCLO));
}

function getTriangleWorldToLocal(matMesh, triangleIndex, triangleABC) {
  const arrPos = matMesh.geometry.attributes.position.array;
  const arrIdx = matMesh.geometry.index.array;

  const getTriangle = (triangleIndex) => {
    return [
      arrIdx[triangleIndex * 3],
      arrIdx[triangleIndex * 3 + 1],
      arrIdx[triangleIndex * 3 + 2],
    ];
  };

  const getPoints = (arrPointIdx) => {
    const arrVector3 = [];
    arrPointIdx.forEach((pointIdx) => {
      const v3Point = new THREE.Vector3(
        arrPos[pointIdx * 3],
        arrPos[pointIdx * 3 + 1],
        arrPos[pointIdx * 3 + 2]
      );
      arrVector3.push(v3Point);
    });

    return arrVector3;
  };

  const p = getPoints(getTriangle(triangleIndex));

  const axisX = new THREE.Vector3().subVectors(p[1], p[0]);
  axisX.normalize();

  const axisY = new THREE.Vector3().subVectors(p[2], p[0]);
  const axisYDotAxisX = axisY.clone().dot(axisX);
  const axisYRestCompute = axisX.clone().multiplyScalar(axisYDotAxisX);
  axisY.sub(axisYRestCompute).normalize();

  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY);
  axisZ.normalize();

  const ltow = new THREE.Matrix4().identity();
  const trans = new THREE.Vector3()
    .addScaledVector(p[0], triangleABC.x)
    .addScaledVector(p[1], triangleABC.y)
    .addScaledVector(p[2], triangleABC.z);
  ltow.setPosition(trans);

  return getInvertRotTrans(ltow);
}

function getInvertRotTrans(matA) {
  const A = (n) => {
    return matA.elements[n];
  };

  // prettier-ignore
  const B = new THREE.Matrix4().set(
    A(0), A(1), A(2),  A(12),
    A(4), A(5), A(6),  A(13),
    A(8), A(9), A(10), A(14),
    -(A(0) * A(3) + A(4) * A(7) + A(8) * A(11)),
    -(A(1) * A(3) + A(5) * A(7) + A(9) * A(11)),
    -(A(2) * A(3) + A(6)* A(7) + A(10) * A(11)),
    A(15)
  );

  return B;
}

// TODO: Delete the comment below after QA
/*
function readData(listBarycentricTrim) {
  const listTrims = [];

  listBarycentricTrim.forEach((element) => {
    const obj = new Object();

    obj["isGlueToOtherPatternPossible"] = element.get(
      "bGlueToOtherPatternPossible"
    );
    obj["gluedPatternTriangleIndex"] = element.get(
      "iGluedPatternTriangleIndex"
    );
    // obj["patternIndex"] = element.get("iPatternIndex");
    obj["m4LocalMatrixOnGluedPatternTriangle"] = element.get(
      "m4LocalMatrixOnGluedPatternTriangle"
    );
    obj["patternMatMeshID"] = element.get("uiPatternMatMeshID");
    obj["trimMatMeshID"] = element.get("uiTrimID");
    obj["localAxisXGluedPattern"] = element.get("v2LocalAxisXOnGluedPattern");
    obj["localPositionOnGluedPattern"] = element.get(
      "v2LocalPositionOnGluedPattern"
    );
    obj["gluedPatternTriangleABC"] = element.get("v3GluedPatternTriangleABC");
    obj["arrTrimMeshID"] = element.get("arrTrimMeshID");
    obj["trimTF3DID"] = element.get("uiTrimTF3DID");

    listTrims.push(obj);
  });

  return listTrims;
}
 */

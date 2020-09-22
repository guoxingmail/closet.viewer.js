import * as THREE from "@/lib/threejs/three";

export function processTrims(listBarycentricTrim, mapMatMesh, mapTransMatrix) {
  const listTrims = readData(listBarycentricTrim);

  const tempObject3D = new THREE.Object3D();

  listTrims.forEach((obj) => {
    const arrTrimMeshID = obj.arrTrimMeshID;
    const gluedMatMesh = mapMatMesh.get(obj.patternMatMeshID);
    const triangleIndex = obj.gluedPatternTriangleIndex;
    const triangleABC = obj.gluedPatternTriangleABC;
    const localMatrixOnGluedPatternTriangle = getMatrix4(
      obj.m4LocalMatrixOnGluedPatternTriangle
    );
    console.log("m4");
    console.log(trimTF3DID);
    console.log(m4LocalMatrixOnGluedPatternTriangle);
    matMesh.visible = true;
    //
    const wtol = getTriangleWorldToLocal(
      gluedMatMesh,
      triangleIndex,
      triangleABC
    );
    const ltow = getInvertRotTrans(wtol);
    ltow.multiply(localMatrixOnGluedPatternTriangle);

    arrTrimMeshID.forEach((trimMeshID) => {
      const matMesh = mapMatMesh.get(trimMeshID);
      // NOTE: Parent means the object3D that has matMesh. It's does not mesh or matMesh.
      const parentWtoL = new THREE.Matrix4().getInverse(
        matMesh.parent.matrixWorld
      );

      // NOTE: This flag should be false to control the matrix manually.
      matMesh.matrixAutoUpdate = false;
      matMesh.matrix = parentWtoL.multiply(ltow);
    });

    const t = buildTriangle(gluedMatMesh, triangleIndex, triangleABC);
    // console.log(t);
    tempObject3D.add(t);
    // tempObject3D.add(matMesh);
  });

  // NOTE: TEST ONLY
  return tempObject3D;
}

function getMatrix4(matrixFromCLO) {
  return new THREE.Matrix4().fromArray(Object.values(matrixFromCLO));
}

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

  // console.log(getTriangle(triangleIndex));
  // console.log(getPoints(getTriangle(triangleIndex)));

  const p = getPoints(getTriangle(triangleIndex));

  const axisX = new THREE.Vector3().subVectors(p[1], p[0]);
  axisX.normalize();

  const axisY = new THREE.Vector3().subVectors(p[2], p[0]);
  const axisYDotAxisX = axisY.clone().dot(axisX);
  const axisYRestCompute = axisX.clone().multiplyScalar(axisYDotAxisX);
  axisY.sub(axisYRestCompute).normalize();

  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY);
  axisZ.normalize();

  const ltow = new THREE.Matrix4().makeBasis(axisX, axisY, axisZ);
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

// NOTE: Test only
function buildTriangle(matMesh, triangleIndex, triangleABC) {
  const arrPos = matMesh.geometry.attributes.position.array;
  const arrIdx = matMesh.geometry.index.array;

  // const arrPos = matMesh.userData.originalPos;
  // const arrIdx = matMesh.userData.originalIndices;

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

  // console.log(getTriangle(triangleIndex));
  // console.log(getPoints(getTriangle(triangleIndex)));

  const p = getPoints(getTriangle(triangleIndex));
  const ps = [];
  for (let i = 0; i < p.length; ++i) {
    ps.push(p[i].x, p[i].y, p[i].z);
  }

  const bufferGeometry = new THREE.BufferGeometry();
  bufferGeometry.addAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(ps), 3)
  );
  const material = new THREE.MeshPhongMaterial({});
  const threeMesh = new THREE.Mesh(bufferGeometry, material);
  return threeMesh;
}

// export function processZipper(listZipper, mapMatMesh) {
//   const parse = (mapData) => {
//     console.log(mapData);
//     // mapData.
//   };
//
//   listZipper.forEach((mapZipperInfo) => {
//     // NOTE:
//     // Zipper is made up of three parts that top stopper, bottom stopper, and slide.
//     // But in this module, all parts are treated as the same.
//     const listTF = [];
//
//     mapZipperInfo
//       .get("listBottomStopperTF3DList")
//       .forEach((l) => listTF.push[l]);
//     mapZipperInfo.get("listTopStopperTF3DList").forEach((l) => listTF.push[l]);
//     listTF.push(mapZipperInfo.get("mapZipperSlider"));
//
//     mapZipperInfo.forEach((mapData) => {
//       parse(mapData);
//       process({});
//     });
//   });
// }

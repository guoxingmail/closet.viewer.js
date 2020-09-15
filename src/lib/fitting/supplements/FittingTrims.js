import * as THREE from "@/lib/threejs/three";

export function processTrims(listBarycentricTrim, mapMatMesh, mapTransMatrix) {
  console.log("processTrims");

  mapMatMesh.forEach((m) => (m.visible = false));

  const listTrims = readData(listBarycentricTrim);
  console.log(listTrims);

  listTrims.forEach((obj) => {
    const arrTrimMeshID = obj.arrTrimMeshID;
    const trimTF3DID = obj.trimTF3DID;

    // TODO: It's temporary
    const matMesh = mapMatMesh.get(arrTrimMeshID[0]);
    // console.log(mapTransMatrix.get(trimTF3DID));
    const parentMatMesh = mapMatMesh.get(obj.patternMatMeshID);
    const triangleIndex = obj.gluedPatternTriangleIndex;
    const triangleABC = obj.gluedPatternTriangleABC;
    const m4LocalMatrixOnGluedPatternTriangle = getMatrix4(
      obj.m4LocalMatrixOnGluedPatternTriangle
    );
    console.log("m4");
    console.log(trimTF3DID);
    console.log(m4LocalMatrixOnGluedPatternTriangle);
    matMesh.visible = true;
    //
    const wtol = getTriangleWorldToLocal(
      parentMatMesh,
      // matMesh,
      triangleIndex,
      triangleABC
    );
    // console.log("wtol");
    // console.log(wtol);
    //
    const ltow = getInvertRotTrans(wtol);
    ltow.multiply(m4LocalMatrixOnGluedPatternTriangle);
    //
    // console.log("matrixWorld: ");
    // console.log(matMesh);
    // // console.log(parentMatMesh);
    // // console.log(parentMatMesh.parent);
    //
    const parentWtoL = new THREE.Matrix4().getInverse(
      // new THREE.Matrix4().identity()

      mapTransMatrix.get(trimTF3DID).LtoW
      // parentMatMesh.parent.matrixWorld
    );
    // console.log("parent");
    // console.log(mapTransMatrix.get(trimTF3DID).LtoW);

    matMesh.geometry.applyMatrix(parentWtoL.multiply(ltow));
    // console.log(parentWtoL);
    // console.log(ltow);
    // console.log(parentWtoL.multiply(ltow));
    // console.log(matMesh.parent.localToWorld());
  });
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
  const axisX = new THREE.Vector3().subVectors(p[1], p[0]).normalize();
  const axisY = new THREE.Vector3().subVectors(p[2], p[0]);
  const axisYRestCompute = new THREE.Vector3()
    .multiplyVectors(axisX, axisY)
    .multiply(axisX);
  axisY.sub(axisYRestCompute).normalize();
  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();

  const ltow = new THREE.Matrix4().makeBasis(axisX, axisY, axisZ);
  console.log("makeBasic");
  console.log(ltow);
  const trans = new THREE.Vector3()
    .addScaledVector(p[0], triangleABC.x)
    .addScaledVector(p[1], triangleABC.y)
    .addScaledVector(p[2], triangleABC.z);
  console.log(trans);
  ltow.setPosition(trans);

  console.log(ltow);
  return getInvertRotTrans(ltow);
}

function getInvertRotTrans(matA) {
  /*
   0  4  8 12
   1  5  9 13
   2  6 10 14
   3  7 11 15
 */
  /*
            nv_scalar a00, a10, a20, a30;   // standard names for components
            nv_scalar a01, a11, a21, a31;   // standard names for components
            nv_scalar a02, a12, a22, a32;   // standard names for components
            nv_scalar a03, a13, a23, a33;   // standard names for components
   */
  const A = (n) => {
    return matA.elements[n];
  };

  // prettier-ignore
  const B = new THREE.Matrix4().set(
    A(0), A(1), A(2),  -(A(0) * A(12) + A(1) * A(13) + A(2) * A(14)),
    A(4), A(5), A(6),  -(A(4) * A(12) + A(5) * A(13) + A(6) * A(14)),
    A(8), A(9), A(10), -(A(8) * A(12) + A(9) * A(13) + A(10) * A(14)),
    A(3), A(7), A(11), A(15)
  )

  return B;
}

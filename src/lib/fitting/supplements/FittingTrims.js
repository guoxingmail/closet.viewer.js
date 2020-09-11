import * as THREE from "@/lib/threejs/three";

export function processTrims(listBarycentricTrim, mapMatMesh) {
  console.log("processTrims");

  mapMatMesh.forEach(m => m.visible = false);

  const listTrims = readData(listBarycentricTrim);
  console.log(listTrims);

  const mapTempID = new Map()
      .set(10373, 10376)
      .set(10363, 10366)
      .set(10345, 10348)
      .set(10332, 10335);

  console.log(mapTempID);

  listTrims.forEach((obj) => {
    // process(matMesh, textureMatMesh, obj.listABG, obj.listPtIndex);

    // const matMesh = mapMatMesh.get(obj.patternMatMeshID);
    console.log(obj.trimMatMeshID);
    console.log(mapTempID.get(obj.trimMatMeshID));

    const matMesh = mapMatMesh.get(mapTempID.get(obj.trimMatMeshID));
    const triangleIndex = obj.gluedPatternTriangleIndex;
    const triangleABC = obj.gluedPatternTriangleABC;
    const m4LocalMatrixOnGluedPatternTriangle = getMatrix4(obj.m4LocalMatrixOnGluedPatternTriangle);

    // console.log(matMesh);
    matMesh.visible = true;

    const ltow = getTriangleLocalToWorld(matMesh, triangleIndex, triangleABC);
    console.log("ltow");
    console.log(ltow);
    // const wtol = getInvertRotTrans(ltow);
    // const ltow = getInvertRotTrans(wtol);
    ltow.multiply(m4LocalMatrixOnGluedPatternTriangle);

    // console.log(ltow);

    const parentMatMesh = mapMatMesh.get(obj.patternMatMeshID);
    // console.log(parentMatMesh)
    const invParentWtoL = new THREE.Matrix4().getInverse(parentMatMesh.modelViewMatrix);
    const m = invParentWtoL.multiply(ltow);
    // console.log(parentWtoL);

    matMesh.geometry.applyMatrix(m);


    // matMesh.geometry.applyMatrix(m4LocalMatrixOnGluedPatternTriangle);
    // console.log(m4LocalMatrixOnGluedPatternTriangle);

  });
}

function getMatrix4(matrixFromCLO) {
  return new THREE.Matrix4().fromArray(Object.values(matrixFromCLO)); //.transpose();
}

function readData(listBarycentricTrim) {
  const listTrims = [];

  listBarycentricTrim.forEach((element) => {
    const obj = new Object();

    obj["isGlueToOtherPatternPossible"] = element.get("bGlueToOtherPatternPossible");
    obj["gluedPatternTriangleIndex"] = element.get("iGluedPatternTriangleIndex");
    // obj["patternIndex"] = element.get("iPatternIndex");
    obj["m4LocalMatrixOnGluedPatternTriangle"] = element.get("m4LocalMatrixOnGluedPatternTriangle");
    obj["patternMatMeshID"] = element.get("uiPatternMatMeshID");
    obj["trimMatMeshID"] = element.get("uiTrimID");
    obj["localAxisXGluedPattern"] = element.get("v2LocalAxisXOnGluedPattern");
    obj["localPositionOnGluedPattern"] = element.get("v2LocalPositionOnGluedPattern");
    obj["gluedPatternTriangleABC"] = element.get("v3GluedPatternTriangleABC");

    listTrims.push(obj);
  });

  return listTrims;
}

function getTriangleLocalToWorld(matMesh, triangleIndex, triangleABC) {
  console.log(triangleIndex)
  const arrPos = matMesh.geometry.attributes.position.array;
  const arrIdx = matMesh.geometry.index.array;

  const getTriangle = (triangleIndex) => {
    return [arrIdx[triangleIndex * 3], arrIdx[triangleIndex * 3 + 1], arrIdx[triangleIndex * 3 + 2]];
  }

  const getPoints = (arrPointIdx) => {
    const arrVector3 = [];
    arrPointIdx.forEach(pointIdx => {
      const v3Point = new THREE.Vector3(arrPos[pointIdx * 3], arrPos[pointIdx * 3 + 1], arrPos[pointIdx * 3 + 2]);
      // const v3Point = [arrPos[pointIdx * 3], arrPos[pointIdx * 3 + 1], arrPos[pointIdx * 3 + 2]];
      arrVector3.push(v3Point);
      }
    );

    return arrVector3;
  };

  console.log(getTriangle(triangleIndex));
  console.log(getPoints(getTriangle(triangleIndex)));

  const p = getPoints(getTriangle(triangleIndex));

  const axisX = new THREE.Vector3().subVectors(p[1], p[0]).normalize();

  const axisY = new THREE.Vector3().subVectors(p[2], p[0]);
  const restCompute = new THREE.Vector3().multiplyVectors(axisX, axisY).multiply(axisX);
  axisY.sub(restCompute).normalize();

  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();

  const ltow = new THREE.Matrix4().identity().makeBasis(axisX, axisY, axisZ);
  const trans = new THREE.Vector3().addScaledVector(axisX, triangleABC.x).addScaledVector(axisY, triangleABC.y).addScaledVector(axisZ, triangleABC.z);
  ltow.setPosition(trans);

  return ltow;
}

function getInvertRotTrans(A)
{
 /*
   0  4  8 12
   1  5  9 13
   2  6 10 14
   3  7 11 15
 */
  const B = new THREE.Matrix4().set(
    A[0], A[4], A[8], A[3],
    A[1], A[5], A[9], A[7],
    A[2], A[6], A[10], A[11],
    (A[0] * A[12] + A[1] * A[13] + A[2] * A[14]),
    (A[4] * A[12] + A[5] * A[13] + A[6] * A[14]),
    (A[8] * A[12] + A[9] & A[13] + A[13] * A[14]),
    A[15]);

  return B;

  // B.a00 = A.a00;
  // B.a10 = A.a01;
  // B.a20 = A.a02;
  // B.a30 = A.a30;

// B.a01 = A.a10;
//   B.a11 = A.a11;
//   B.a21 = A.a12;
//   B.a31 = A.a31;

  // B.a02 = A.a20;
  // B.a12 = A.a21;
  // B.a22 = A.a22;
  // B.a32 = A.a32;

  // B.a03 = - (A.a00 * A.a03 + A.a10 * A.a13 + A.a20 * A.a23);
  // B.a13 = - (A.a01 * A.a03 + A.a11 * A.a13 + A.a21 * A.a23);
  // B.a23 = - (A.a02 * A.a03 + A.a12 * A.a13 + A.a22 * A.a23);
  // B.a33 = A.a33;
  // )
}
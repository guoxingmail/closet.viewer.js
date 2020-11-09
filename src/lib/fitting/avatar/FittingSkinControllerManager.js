export default class FittingSkinControllerManager {
  constructor() {
    this.mapSCMatMeshID = null;
    this.mapMatMesh = null;
  }

  init(zrest) {
    this.mapSCMatMeshID = zrest.meshFactory.matmeshManager.mapSCMatmeshID;
    this.mapMatMesh = zrest.zProperty.matMeshMap;
  }

  // NOTE:
  // Each body part consist of many matMeshes.
  // This function returns whole vertices of the body part.
  getVertexOntoMatMeshByPartName = (partName) => {
    const combinedVertex = [];
    this.mapSCMatMeshID.get(partName).forEach((oriMatMeshId) => {
      const matMeshId = this.getAvtMatMeshID(oriMatMeshId);
      const matMesh = this.mapMatMesh.get(matMeshId);
      if (!matMesh) console.warn(matMeshId);
      const vertex = matMesh.geometry.attributes.position.array;
      vertex.forEach((v) => combinedVertex.push(v));
    });

    return combinedVertex;
  };

  putVertexOntoMatMeshByPartName = (partName, partRenderPos) => {
    // prettier-ignore
    const combinedVertex = this.getVertexOntoMatMeshByPartName(partName);
    if (partRenderPos.length !== combinedVertex.length) {
      console.warn("FAILED: " + partName);
      console.log(partRenderPos.length + " != " + combinedVertex.length);
      return;
    }

    let lastIndex = 0;
    const retListMatMesh = [];
    this.mapSCMatMeshID.get(partName).forEach((oriMatMeshId) => {
      const matMeshId = this.getAvtMatMeshID(oriMatMeshId);
      const matMesh = this.mapMatMesh.get(matMeshId);
      retListMatMesh.push(matMesh);

      const vertexArr = matMesh.geometry.attributes.position.array;
      const vertexSize = vertexArr.length;
      matMesh.geometry.attributes.position.needsUpdate = true;

      const slicedVertexArr = new Float32Array(
        partRenderPos.slice(lastIndex, lastIndex + vertexSize)
      );

      // TODO: Find better way
      for (let j = 0; j < vertexArr.length; ++j) {
        vertexArr[j] = slicedVertexArr[j];
      }
      lastIndex += vertexSize;
    });

    return retListMatMesh;
  };

  getAvtMatMeshID = (originalMatMeshID) => {
    return originalMatMeshID + 500000; // NOTE: 500000 is prefix for avatar
  }

  validate = (mapMatShapeRenderToSkinPos) => {
    for (const entries of mapMatShapeRenderToSkinPos.entries()) {
      const partName = entries[0];
      const uiVertexCount = entries[1].get("uiVertexCount");
      const zrestVertexCount =
        this.getVertexOntoMatMeshByPartName(partName).length / 3;

      if (uiVertexCount !== zrestVertexCount) return false;
    }
    return true;
  };
}

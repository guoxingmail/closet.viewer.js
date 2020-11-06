import {
  processOverlayPrint,
  processPuckering,
  processStitch,
} from "@/lib/fitting/garment/FittingOverrayPrint";
import {
  processTrims,
  processZipper,
  processButtonHead,
} from "@/lib/fitting/garment/FittingTrims";
import { loadFile } from "@/lib/clo/readers/FileLoader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";
import { MATMESH_TYPE } from "@/lib/zrest/common/ZRestConst";

export default class FittingSupplements {
  constructor(zrest) {
    const zProperty = zrest.zProperty;

    this.mapMatMesh = zProperty.matMeshMap;
    console.log("FittingSupplements load complete");
  }

  cleanUp(mapMatMesh, ODM) {
    console.log("cleanUp");
    mapMatMesh.forEach((matMesh) => {
      const type = matMesh.userData.TYPE;
      if (MATMESH_TYPE.isSupplement(type)) {
        // FIXME: This is dangerous code
        const matMeshID = matMesh.userData.MATMESH_ID;
        const originalData = ODM.get(matMeshID);

        matMesh.geometry.index.array = originalData.index;
        matMesh.geometry.attributes.position.array = originalData.pos;
        matMesh.geometry.attributes.uv.array = originalData.uv;

        matMesh.geometry.computeFaceNormals();
        matMesh.geometry.computeVertexNormals();
        matMesh.userData.isCleanedUp = true;
      }
    });
  }

  async processTextureSupplement(supplementsFile, mapMatMesh, ODM) {
    const rootMap = await this.load(supplementsFile);

    console.log("rootMap");
    console.log(rootMap);

    this.cleanUp(mapMatMesh, ODM);

    const listBarycentricPrint = rootMap
      .get("mapBarycentricPrintTexture")
      .get("listBarycentricPrintTexture");
    if (listBarycentricPrint)
      processOverlayPrint(listBarycentricPrint, mapMatMesh);

    const listBarycentricPuckering = rootMap
      .get("mapBarycentricPuckering")
      .get("listBarycentricPuckering");
    if (listBarycentricPuckering)
      processPuckering(listBarycentricPuckering, mapMatMesh);

    const listStitch = rootMap
      .get("mapBarycentricStitch")
      .get("listBarycentricStitch");
    if (listStitch) processStitch(listStitch, mapMatMesh);

    const listBarycentricTrim = rootMap.get("listBarycentricTrim");
    if (listBarycentricTrim) processTrims(listBarycentricTrim, mapMatMesh);

    const listZipper = rootMap.get("listZipper");
    if (listZipper) {
      processZipper(listZipper, mapMatMesh);
    }

    const listButtonHead = rootMap.get("listButtonHead");
    if (listButtonHead) {
      processButtonHead(listButtonHead, mapMatMesh);
    }
  }

  async load(supplementsFile) {
    const loadedData = await loadFile(supplementsFile);
    const rootMap = readMap(new DataView(loadedData), { Offset: 0 });
    return rootMap;
  }
}

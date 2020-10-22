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
import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";
import { MATMESH_TYPE } from "@/lib/clo/readers/predefined";

export default class FittingSupplements {
  constructor(zrest) {
    const zProperty = zrest.zProperty;

    this.mapMatMesh = zProperty.matMeshMap;
    // this.mapBarycentricPrintTexture = zProperty.rootMap.get(
    //   "mapBarycentricPrintTexture"
    // );
    // this.listPrintBary = this.mapBarycentricPrintTexture
    //   ? this.mapBarycentricPrintTexture.get("listPrintTextureBarycentric")
    //   : [];

    // NOTE: Test only
    // processOverrayPrint(this.listPrintBary, zrest);

    // this.mapPrintTexture = this.read(this.listPrintBary);
    // console.log(this.mapPrintTexture);

    console.log("FittingSupplements load complete");
  }

  cleanUp(mapMatMesh) {
    console.log("cleanUp");
    mapMatMesh.forEach((matMesh) => {
      const type = matMesh.userData.TYPE;
      if (MATMESH_TYPE.isSupplement(type)) {
        matMesh.geometry.index.array = matMesh.userData.originalIndices;
        matMesh.geometry.attributes.position.array =
          matMesh.userData.originalPos;
        matMesh.geometry.attributes.uv.array = matMesh.userData.originalUv;
        matMesh.geometry.attributes.position.array =
          matMesh.userData.originalPos;
        matMesh.geometry.computeFaceNormals();
        matMesh.geometry.computeVertexNormals();
        matMesh.userData.isCleanedUp = true;
      }
    });
  }

  async test(supplementsFile, mapMatMesh) {
    const rootMap = await this.load(supplementsFile);

    console.log("rootMap");
    console.log(rootMap);

    this.cleanUp(mapMatMesh);

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

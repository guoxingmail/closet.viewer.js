import {
  processOverlayPrint,
  processPuckering,
  processStitch,
} from "@/lib/fitting/supplements/FittingOverrayPrint";
import {
  processTrims,
  processZipper,
  processButtonHead,
} from "@/lib/fitting/supplements/FittingTrims";
import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";

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

  async test(supplementsFile, mapMatMesh, mapTransMatrix) {
    const rootMap = await this.load(supplementsFile);

    console.log("rootMap");
    console.log(rootMap);

    const listBarycentricTrim = rootMap.get("listBarycentricTrim");
    if (listBarycentricTrim)
      return processTrims(listBarycentricTrim, mapMatMesh, mapTransMatrix); // NOTE: RETURN FOR TEST ONLY

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

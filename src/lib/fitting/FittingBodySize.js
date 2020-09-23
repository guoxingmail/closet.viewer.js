import { processAvatarSizingBodyFile } from "@/lib/fitting/FittingIO";
import { getTableSize } from "@/lib/fitting/FittingResizableBody";

export default class FittingBodySize {
  constructor() {
    this.mapHeightWeightTo5Sizes = new Map();
  }

  // NOTE: This function called when needs to get sizes only.
  async loadSizeFile(sizingURL) {
    const sizeObj = await processAvatarSizingBodyFile(sizingURL);
    this.mapHeightWeightTo5Sizes = sizeObj.mapHeightWeightTo5Sizes;
    console.log("Load sizing table complete.");
  }

  getSizes(height, weight) {
    if (!this.mapHeightWeightTo5Sizes) {
      console.log("ERROR: Load sizing file first.");
      console.log("\ttry 'loadSizeFile(sizingURL)'");
    }
    return getTableSize(height, weight, this.mapHeightWeightTo5Sizes);
  }
}

import { processAvatarSizingBodyFile } from "@/lib/fitting/common/FittingIO";
import { getTableSize } from "@/lib/fitting/avatar/FittingResizableBody";

export default class FittingBodySize {
  constructor() {
    this.mapHeightWeightTo5Sizes = new Map();
    this.getBodySizes = this.getBodySizes.bind(this);
    this.getMinMaxHeight = this.getMinMaxHeight.bind(this);
    this.getMinMaxWeight = this.getMinMaxWeight.bind(this);
  }

  // NOTE: This function called when needs to get sizes only.
  async loadSizeFile(sizingURL) {
    const sizeObj = await processAvatarSizingBodyFile(sizingURL);
    this.mapHeightWeightTo5Sizes = sizeObj.mapHeightWeightTo5Sizes;
    console.log("Load sizing table complete.");
  }

  getBodySizes(height, weight) {
    if (!this.mapHeightWeightTo5Sizes) {
      console.warn("WARNING: Load sizing file first.");
      console.warn("\ttry 'loadSizeFile(sizingURL)'");
    }
    return getTableSize(height, weight, this.mapHeightWeightTo5Sizes);
  }

  getMinMaxHeight() {
    return this.getMinMaxFromKeys(this.mapHeightWeightTo5Sizes.keys());
  }

  getMinMaxWeight(height) {
    const weights = this.mapHeightWeightTo5Sizes.get(height.toString());
    if (!weights) {
      console.warn("WARNING: height not found (" + height + ").");
      return { min: -1, max: -1 };
    }

    return this.getMinMaxFromKeys(weights.keys());
  }

  getMinMaxFromKeys(keys) {
    // TODO: Remove this module after changing the type of keys
    const listKey = [...keys].map((k) => parseInt(k));
    const min = Math.min(...listKey);
    const max = Math.max(...listKey);
    return { min, max };
  }
}

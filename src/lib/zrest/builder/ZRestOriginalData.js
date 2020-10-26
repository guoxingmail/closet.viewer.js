export default class ZRestOriginalDataManager {
  constructor() {
    this.listData = [];
    this.mapIDtoListIdx = new Map();
  }

  get(matMeshID) {
    return this.listData[this.mapIDtoListIdx.get(matMeshID)];
  }

  set({ listMatMeshID, pos, index, uv }) {
    const idx = this.listData.push({ pos: pos, index: index, uv: uv });
    listMatMeshID.forEach((matMeshID) => {
      this.mapIDtoListIdx.set(matMeshID, idx);
    });
  }

  clear() {
    this.listData = [];
    this.mapIDtoListIdx.clear();
  }

  dismiss() {
    clear();
  }
}

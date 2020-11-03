export default class ZRestOriginalDataManager {
  constructor() {
    this.listData = [];
    this.mapIDtoListIdx = new Map();

    this.get = this.get.bind(this);
    this.set = this.set.bind(this);
    this.clear = this.clear.bind(this);
    this.dismiss = this.dismiss.bind(this);
  }

  get(matMeshID) {
    return this.listData[this.mapIDtoListIdx.get(matMeshID)];
  }

  set({ listMatMeshID, pos, index, uv, uv2 }) {
    const idx = this.listData.push({
      pos: pos,
      index: index,
      uv: uv,
      uv2: uv2,
    });
    listMatMeshID.forEach((matMeshID) => {
      this.mapIDtoListIdx.set(matMeshID, idx - 1); // NOTE: 'push' returns length. Therefore 'idx - 1' is correct index.
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

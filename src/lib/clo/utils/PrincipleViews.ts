import {
  Box3,
  Camera,
  Euler,
  Frustum,
  Matrix4,
  Object3D,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";

const excludeOutliers = (frustum: Frustum) => (object3D: Object3D) => {
    const bbox = new Box3().setFromObject(object3D);
      if (frustum.intersectsBox(bbox)) {
        object3D.children.forEach((kid) => excludeOutliers(frustum)(kid));
      } else {
        object3D.parent.remove(object3D);
      }
};

function makeFrustum(camera: Camera): Frustum {
  var frustum = new Frustum();
  frustum.setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
  );
  return frustum;
}
export function recursiveObjectwiseViewFrustumCulling(
  camera: Camera,
  object3D: Object3D
) {
  excludeOutliers(makeFrustum(camera))(object3D);
}
export function capturePrincipleViews(
  scene: Scene,
  object3D: Object3D,
  width: number,
  height: number
) {
  const QUATER = Math.PI / 2;
  const rotations = [
    new Euler(0, 0, 0),
    new Euler(QUATER, 0, 0),
    new Euler(Math.PI, 0, 0),
    new Euler(Math.PI + QUATER, 0, 0),
    new Euler(0, QUATER, 0),
    new Euler(0, Math.PI + QUATER, 0),
  ];
  const bbox = new Box3().setFromObject(object3D);
  const center = bbox.getCenter(new Vector3());
  const I = object3D.matrix.clone();
  const T_ = new Matrix4().makeTranslation(-center.x, -center.y, -center.z);
  const T = new Matrix4().makeTranslation(center.x, center.y, center.z);

  const locals = rotations
    .map((rot) => new Matrix4().makeRotationFromEuler(rot))
    .map((R) => T.clone().multiply(R).multiply(T_).multiply(I));

  const renderer = new WebGLRenderer({ preserveDrawingBuffer: true });
  renderer.setSize(width, height);

  return locals.map((local) => {
    object3D.matrix = local;
    object3D.matrixAutoUpdate = false;
    object3D.updateMatrixWorld(true);

    const bbox = new Box3().setFromObject(object3D);
    const ocamera = new OrthographicCamera(
      Math.min(bbox.min.x, bbox.max.x),
      Math.max(bbox.min.x, bbox.max.x),
      Math.max(bbox.min.y, bbox.max.y),
      Math.min(bbox.min.y, bbox.max.y),
      1,
      100000
    );
    ocamera.position.set(0, 0, 5000);
    ocamera.lookAt(0, 0, 0);
    ocamera.updateProjectionMatrix();
    ocamera.updateMatrix();
    renderer.render(scene, ocamera);

    return renderer.domElement.toDataURL("image/png");
  });
}

  // debug() {
  //   this.capturePrincipleViews().forEach((imgurl) => {
  //     const img = document.createElement("img");
  //     img.src = imgurl;
  //     document.body.append(img);
  //   });
  // }
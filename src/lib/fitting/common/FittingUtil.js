import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";

export function buildMapMatshapeRenderToSkinPos(baseMeshMap) {
  const listMatshapeRenderToSkinPos = baseMeshMap.get(
    "listMatshapeRenderToSkinPos"
  );
  const mapMatshapeRenderToSkinPos = new Map();
  // this.mapMatshapeRenderToSkinPos = new Map();

  listMatshapeRenderToSkinPos.forEach((entry) => {
    const renderToSkinPos = readByteArray(
      "Int",
      entry.get("baRenderToSkinPos")
    );
    const strName = readByteArray("String", entry.get("strNameUTF8"));
    const uiVertexCount = entry.get("uiVertexCount");

    mapMatshapeRenderToSkinPos.set(
      strName,
      new Map([
        ["renderToSkinPos", renderToSkinPos],
        ["uiVertexCount", uiVertexCount],
      ])
    );
  });

  return mapMatshapeRenderToSkinPos;
}

function getClosestValue(inputValue, avgValue, stepSize, minValue, maxValue) {
  var localMin =
    stepSize * parseInt((inputValue - avgValue) / stepSize) + avgValue;
  var localMax = localMin + stepSize;
  var closestValue = 0;
  if (Math.abs(inputValue - localMin) < Math.abs(inputValue - localMax))
    closestValue = localMin;
  else closestValue = localMax;

  if (closestValue < minValue) closestValue = minValue;
  else if (closestValue > maxValue) closestValue = maxValue;

  return closestValue;
}

// inputHeight, inputWeight 는 float value
// samplingConfiguration. 해당 json 은 {s3domain}.clo-set.com/public/fitting/{styleId}/{version}/G{grading index}/{avatarID}/sampling.json 에 위치함. 이 json을 parsing하여 다음 변수를 채워줘야 함
// 관련 정보는 https://clo.atlassian.net/browse/NXPT-993 참고
// - version : integer value. ex) 100 -> 1.00,  234 -> 2.34
// - category : "female", "male" or "kid"
// - avgHeight : Integer. Average height (cm)
// - avgWeight : Integer. Average weight (kg)
// - minWeight : Integer
// - heightOffset : Integer
// - weightOffset : Integer
// - heightStepSize : Integer
// - weightStepSize : Integer
function getClosestSize(inputHeight, inputWeight, samplingConfiguration) {
  var returnValue = {};
  returnValue.height = getClosestValue(
    inputHeight,
    samplingConfiguration.avgHeight,
    samplingConfiguration.heightStepSize,
    samplingConfiguration.avgHeight - samplingConfiguration.heightOffset,
    samplingConfiguration.avgHeight + samplingConfiguration.heightOffset
  );

  const avgWeight =
    samplingConfiguration.avgWeight +
    returnValue.height -
    samplingConfiguration.avgHeight;
  var minWeight = Math.max(
    samplingConfiguration.minWeight,
    avgWeight - samplingConfiguration.weightOffset
  );
  var maxWeight = avgWeight + samplingConfiguration.weightOffset;

  returnValue.weight = getClosestValue(
    inputWeight,
    avgWeight,
    samplingConfiguration.weightStepSize,
    minWeight,
    maxWeight
  );

  return returnValue;
}

export function getGarmentFileName(height, weight, samplingConfiguration) {
  const closestSize = getClosestSize(height, weight, samplingConfiguration);
  return "P0_" + String(closestSize.height) + "_" + String(closestSize.weight);
}

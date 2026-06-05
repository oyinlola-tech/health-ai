export const abnormalityLevels = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  CRITICAL_LOW: "CRITICAL_LOW",
  CRITICAL_HIGH: "CRITICAL_HIGH",
  UNKNOWN: "UNKNOWN"
};

function hasNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function classifyLabResult(result) {
  if (!hasNumber(result.value) || (!hasNumber(result.referenceMin) && !hasNumber(result.referenceMax))) {
    return abnormalityLevels.UNKNOWN;
  }

  const lowLimit = result.referenceMin;
  const highLimit = result.referenceMax;
  const value = result.value;

  if (hasNumber(lowLimit) && value < lowLimit) {
    const criticalLimit = lowLimit - Math.abs(lowLimit) * 0.25;
    return value <= criticalLimit ? abnormalityLevels.CRITICAL_LOW : abnormalityLevels.LOW;
  }

  if (hasNumber(highLimit) && value > highLimit) {
    const criticalLimit = highLimit + Math.abs(highLimit) * 0.25;
    return value >= criticalLimit ? abnormalityLevels.CRITICAL_HIGH : abnormalityLevels.HIGH;
  }

  return abnormalityLevels.NORMAL;
}

export function detectAbnormalResults(labResults) {
  return labResults.map((result) => {
    const flag = classifyLabResult(result);
    return {
      ...result,
      flag,
      isAbnormal: ![abnormalityLevels.NORMAL, abnormalityLevels.UNKNOWN].includes(flag),
      isCritical: [abnormalityLevels.CRITICAL_LOW, abnormalityLevels.CRITICAL_HIGH].includes(flag)
    };
  });
}

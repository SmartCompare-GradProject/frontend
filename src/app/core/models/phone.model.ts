/**
 * Parsed mobile product specs JSON (`MobileSpecs` on the backend).
 * Field names match the backend contract (camelCase).
 */
export interface Phone {
  os: string | null;
  hdr: unknown | null;
  lan: string | null;
  usb: string | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  chipset: string | null;
  simType: string | null;
  bluetooth: string | null;
  buildBack: string | null;
  thickness: number | null;
  buildFrame: string | null;
  buildFront: string | null;
  mainCamera: string | null;
  aspectRatio: string | null;
  displaySize: number | null;
  displayType: string | null;
  refreshRate: number | null;
  isRefreshRatePredicted: boolean | null;
  batteryScore: string | null;
  isBatteryScorePredicted: boolean | null;
  selfieCamera: string | null;
  cameraFeatures: string | null;
  batteryCapacity: number | null;
  isBatteryCapacityPredicted: boolean | null;
  reverseCharging: boolean | null;
  displayProtection: string | null;
  displayResolution: string | null;
  screenToBodyRatio: number | null;
  isScreenToBodyRatioPredicted: boolean | null;
}

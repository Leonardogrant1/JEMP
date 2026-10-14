export type PixelCrop = { x: number; y: number; width: number; height: number }

export type DrawParams = { sx: number; sy: number; sWidth: number; sHeight: number; dSize: number }

// Rechnet die Pixel-Crop-Region von react-easy-crop in drawImage-Parameter um.
// Clampt auf die nativen Video-Maße — der Cropper liefert bei Zoom/Drag an den
// Rändern gelegentlich minimal negative bzw. überstehende Werte (Subpixel).
export function frameCropDrawParams(
  crop: PixelCrop,
  videoWidth: number,
  videoHeight: number,
  outputSize = 1024,
): DrawParams {
  const sx = Math.min(Math.max(0, Math.round(crop.x)), Math.max(0, videoWidth - 1))
  const sy = Math.min(Math.max(0, Math.round(crop.y)), Math.max(0, videoHeight - 1))
  const sWidth = Math.max(1, Math.min(Math.round(crop.width), videoWidth - sx))
  const sHeight = Math.max(1, Math.min(Math.round(crop.height), videoHeight - sy))
  return { sx, sy, sWidth, sHeight, dSize: outputSize }
}

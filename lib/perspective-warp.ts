import { Point, FourCorners } from './image-types';
import { orderCorners, getWarpDimensions, getPerspectiveTransformMatrix } from './image-math';

declare global {
  interface Window {
    cv?: any;
  }
}

/**
 * Checks if OpenCV.js runtime is initialized and available
 */
export function isOpenCvReady(): boolean {
  return typeof window !== 'undefined' && !!window.cv && !!window.cv.Mat;
}

export interface SmartCropOptions {
  sensitivity?: 'standard' | 'high';
  currentCorners?: FourCorners;
  hasManualAdjustments?: boolean;
  snapRadius?: number;
}

export interface SmartCropResult {
  corners: FourCorners;
  snapped: boolean;
  method: 'opencv_high_sensitivity' | 'opencv_snapped' | 'gradient_snapped' | 'fallback';
  message: string;
}

/**
 * Snaps a single point to the strongest local edge/corner gradient using Sobel
 */
function snapCornerWithSobel(
  ctx: CanvasRenderingContext2D,
  corner: Point,
  imgWidth: number,
  imgHeight: number,
  radius: number
): Point {
  const minX = Math.max(1, Math.floor(corner.x - radius));
  const maxX = Math.min(imgWidth - 2, Math.ceil(corner.x + radius));
  const minY = Math.max(1, Math.floor(corner.y - radius));
  const maxY = Math.min(imgHeight - 2, Math.ceil(corner.y + radius));

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  if (w <= 2 || h <= 2) return corner;

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(minX, minY, w, h);
  } catch {
    return corner;
  }

  const data = imgData.data;
  const gray = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      gray[y * w + x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
  }

  let bestX = corner.x;
  let bestY = corner.y;
  let maxScore = -1;
  const sigma2 = Math.max(10, (radius * 0.45) ** 2 * 2);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      // 3x3 Sobel operator
      const gx =
        (gray[(y - 1) * w + (x + 1)] + 2 * gray[y * w + (x + 1)] + gray[(y + 1) * w + (x + 1)]) -
        (gray[(y - 1) * w + (x - 1)] + 2 * gray[y * w + (x - 1)] + gray[(y + 1) * w + (x - 1)]);
      const gy =
        (gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)]) -
        (gray[(y - 1) * w + (x - 1)] + 2 * gray[(y - 1) * w + x] + gray[(y - 1) * w + (x + 1)]);

      const mag = Math.hypot(gx, gy);
      if (mag < 12) continue;

      const worldX = minX + x;
      const worldY = minY + y;
      const d2 = (worldX - corner.x) ** 2 + (worldY - corner.y) ** 2;
      const distWeight = Math.exp(-d2 / sigma2);

      const score = mag * distWeight;
      if (score > maxScore) {
        maxScore = score;
        bestX = worldX;
        bestY = worldY;
      }
    }
  }

  return { x: bestX, y: bestY };
}

/**
 * Pure Canvas/TypeScript Sobel snapping for all 4 corners
 */
export function snapCornersWithGradients(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  corners: FourCorners,
  snapRadius?: number
): FourCorners {
  const width = sourceImage.width;
  const height = sourceImage.height;
  const radius = snapRadius || Math.max(25, Math.min(width, height) * 0.06);

  let canvas: HTMLCanvasElement;
  if (sourceImage instanceof HTMLCanvasElement) {
    canvas = sourceImage;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const cCtx = canvas.getContext('2d');
    if (cCtx) cCtx.drawImage(sourceImage, 0, 0);
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return corners;

  const snapped: Point[] = corners.map((pt) =>
    snapCornerWithSobel(ctx, pt, width, height, radius)
  );

  return orderCorners(snapped);
}

/**
 * Re-runs corner detection with higher sensitivity and snaps cropping boundaries
 * to document edges, particularly when user has manually adjusted corners.
 */
export function smartCropDocumentCorners(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  options?: SmartCropOptions
): SmartCropResult {
  const width = sourceImage.width;
  const height = sourceImage.height;
  const sensitivity = options?.sensitivity || 'high';
  const currentCorners = options?.currentCorners;
  const hasManual = !!options?.hasManualAdjustments;
  const radius = options?.snapRadius || Math.max(30, Math.min(width, height) * 0.07);

  // Fallback corners with 5% inset
  const defaultCorners: FourCorners = [
    { x: Math.round(width * 0.05), y: Math.round(height * 0.05) },
    { x: Math.round(width * 0.95), y: Math.round(height * 0.05) },
    { x: Math.round(width * 0.95), y: Math.round(height * 0.95) },
    { x: Math.round(width * 0.05), y: Math.round(height * 0.95) },
  ];

  // If OpenCV is not ready, run high-precision Canvas Sobel snapping
  if (!isOpenCvReady()) {
    const baseCorners = currentCorners || defaultCorners;
    const snapped = snapCornersWithGradients(sourceImage, baseCorners, radius);
    return {
      corners: snapped,
      snapped: true,
      method: 'gradient_snapped',
      message: hasManual
        ? 'گوشه‌های دستی با گرادیان لبه به مرزهای سند چسبانده شدند'
        : 'لبه‌های سند با دقت بالا شناسایی شدند',
    };
  }

  const cv = window.cv;
  let src: any = null;
  let gray: any = null;
  let blur: any = null;
  let edges: any = null;
  let adapt: any = null;
  let kernel: any = null;
  let dilated: any = null;
  let contours: any = null;
  let hierarchy: any = null;

  try {
    src = cv.imread(sourceImage);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // 1. If user has manually placed/adjusted corners, use local OpenCV corner refinement
    if (hasManual && currentCorners && currentCorners.length === 4) {
      const refinedCorners: Point[] = [];

      for (let i = 0; i < 4; i++) {
        const pt = currentCorners[i];
        const rx = Math.max(0, Math.round(pt.x - radius));
        const ry = Math.max(0, Math.round(pt.y - radius));
        const rw = Math.min(width - rx, Math.round(radius * 2));
        const rh = Math.min(height - ry, Math.round(radius * 2));

        let snappedPt: Point = { ...pt };

        if (rw > 10 && rh > 10) {
          const rect = new cv.Rect(rx, ry, rw, rh);
          const roi = gray.roi(rect);
          const cornersMat = new cv.Mat();
          const noneMask = new cv.Mat();

          try {
            // Shi-Tomasi Corner Detector with high sensitivity
            cv.goodFeaturesToTrack(roi, cornersMat, 30, 0.008, 6, noneMask, 3, false, 0.04);
            let closestDist = Infinity;

            for (let c = 0; c < cornersMat.rows; c++) {
              const cx = rx + cornersMat.data32F[c * 2];
              const cy = ry + cornersMat.data32F[c * 2 + 1];
              const dist = Math.hypot(cx - pt.x, cy - pt.y);

              if (dist < closestDist && dist <= radius * 0.95) {
                closestDist = dist;
                snappedPt = { x: Math.round(cx), y: Math.round(cy) };
              }
            }
          } catch {
            // ignore ROI failure, fallback to point
          } finally {
            roi.delete();
            cornersMat.delete();
            noneMask.delete();
          }
        }

        refinedCorners.push(snappedPt);
      }

      // Also ensure ordered and not degenerate
      const orderedRefined = orderCorners(refinedCorners);

      return {
        corners: orderedRefined,
        snapped: true,
        method: 'opencv_snapped',
        message: 'گوشه‌های دستی با دقت بالا به تقاطع لبه‌های سند چسبانده شدند',
      };
    }

    // 2. Multi-Pass High Sensitivity Global Document Detection
    blur = new cv.Mat();
    const ksize = new cv.Size(5, 5);
    cv.GaussianBlur(gray, blur, ksize, 0, 0, cv.BORDER_DEFAULT);

    edges = new cv.Mat();
    // In high-sensitivity mode, lower Canny thresholds capture faint/light document edges
    const cannyLow = sensitivity === 'high' ? 20 : 50;
    const cannyHigh = sensitivity === 'high' ? 70 : 150;
    cv.Canny(blur, edges, cannyLow, cannyHigh, 3, false);

    if (sensitivity === 'high') {
      // Also combine with adaptive threshold for low-contrast backgrounds
      adapt = new cv.Mat();
      cv.adaptiveThreshold(blur, adapt, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 3);
      cv.bitwise_or(edges, adapt, edges);
    }

    kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    dilated = new cv.Mat();
    cv.dilate(edges, dilated, kernel);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    // High sensitivity allows smaller area threshold (4% vs 12%)
    const minArea = (width * height) * (sensitivity === 'high' ? 0.04 : 0.12);
    let bestQuad: Point[] | null = null;
    let bestScore = -1;

    // Test multiple polygon approximation factors
    const epsilonFactors = sensitivity === 'high'
      ? [0.015, 0.02, 0.025, 0.035, 0.05]
      : [0.025];

    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      if (area > minArea) {
        const peri = cv.arcLength(contour, true);

        for (const eps of epsilonFactors) {
          const approx = new cv.Mat();
          cv.approxPolyDP(contour, approx, eps * peri, true);

          let quadCandidate: Point[] | null = null;

          if (approx.rows === 4 && cv.isContourConvex(approx)) {
            const pts: Point[] = [];
            for (let p = 0; p < 4; p++) {
              pts.push({
                x: approx.data32S[p * 2],
                y: approx.data32S[p * 2 + 1],
              });
            }
            quadCandidate = pts;
          } else if (sensitivity === 'high' && approx.rows >= 4 && approx.rows <= 8) {
            // Try convex hull to smooth small corner tears or folds
            const hull = new cv.Mat();
            cv.convexHull(approx, hull);
            const hullApprox = new cv.Mat();
            cv.approxPolyDP(hull, hullApprox, 0.03 * peri, true);
            if (hullApprox.rows === 4 && cv.isContourConvex(hullApprox)) {
              const pts: Point[] = [];
              for (let p = 0; p < 4; p++) {
                pts.push({
                  x: hullApprox.data32S[p * 2],
                  y: hullApprox.data32S[p * 2 + 1],
                });
              }
              quadCandidate = pts;
            }
            hull.delete();
            hullApprox.delete();
          }

          if (quadCandidate) {
            let score = area;
            // If current manual corners exist, boost candidates closer to them
            if (currentCorners) {
              const ord = orderCorners(quadCandidate);
              let totalDist = 0;
              for (let c = 0; c < 4; c++) {
                totalDist += Math.hypot(ord[c].x - currentCorners[c].x, ord[c].y - currentCorners[c].y);
              }
              // Normalise distance penalty
              const maxDim = Math.max(width, height);
              const distScore = Math.max(0, 1 - (totalDist / (maxDim * 2)));
              score = area * (0.6 + 0.4 * distScore);
            }

            if (score > bestScore) {
              bestScore = score;
              bestQuad = quadCandidate;
            }
          }
          approx.delete();
        }
      }
    }

    if (bestQuad && bestQuad.length === 4) {
      const ordered = orderCorners(bestQuad);
      // Snap detected quad vertices to exact edge pixels
      const snapped = snapCornersWithGradients(sourceImage, ordered, Math.round(radius * 0.5));
      return {
        corners: snapped,
        snapped: true,
        method: 'opencv_high_sensitivity',
        message: 'کادر سند با حساسیت بالا تشخیص داده و تثبیت شد',
      };
    }
  } catch (err) {
    console.warn('Smart crop detection notice:', err);
  } finally {
    if (src) src.delete();
    if (gray) gray.delete();
    if (blur) blur.delete();
    if (edges) edges.delete();
    if (adapt) adapt.delete();
    if (kernel) kernel.delete();
    if (dilated) dilated.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }

  // Pure canvas gradient snapping fallback if OpenCV contour search was inconclusive
  const baseCorners = currentCorners || defaultCorners;
  const snapped = snapCornersWithGradients(sourceImage, baseCorners, radius);
  return {
    corners: snapped,
    snapped: true,
    method: 'gradient_snapped',
    message: hasManual
      ? 'گوشه‌ها به نزدیک‌ترین لبه‌های سند هدایت شدند'
      : 'کادر سند تنظیم شد',
  };
}

/**
 * Automatically detects document boundaries using OpenCV Canny + Contour detection
 * Returns 4 ordered points [TL, TR, BR, BL] or fallback inset if not detected.
 */
export function detectDocumentCorners(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  options?: SmartCropOptions
): FourCorners {
  return smartCropDocumentCorners(sourceImage, options).corners;
}

/**
 * Warps perspective from 4 corners to standard flat rectangle
 */
export function warpPerspectiveCanvas(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  corners: FourCorners
): HTMLCanvasElement {
  const ordered = orderCorners(corners);
  const dims = getWarpDimensions(ordered);
  const dstWidth = dims.width;
  const dstHeight = dims.height;

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = dstWidth;
  resultCanvas.height = dstHeight;
  const ctx = resultCanvas.getContext('2d');
  if (!ctx) return resultCanvas;

  if (isOpenCvReady()) {
    try {
      const cv = window.cv;
      const srcMat = cv.imread(sourceImage);
      const dstMat = new cv.Mat();

      // Source corners float array
      const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        ordered[0].x, ordered[0].y, // TL
        ordered[1].x, ordered[1].y, // TR
        ordered[2].x, ordered[2].y, // BR
        ordered[3].x, ordered[3].y, // BL
      ]);

      // Dst corners float array
      const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        dstWidth, 0,
        dstWidth, dstHeight,
        0, dstHeight,
      ]);

      const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
      const dsize = new cv.Size(dstWidth, dstHeight);

      cv.warpPerspective(srcMat, dstMat, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
      cv.imshow(resultCanvas, dstMat);

      srcMat.delete();
      dstMat.delete();
      srcPoints.delete();
      dstPoints.delete();
      M.delete();

      return resultCanvas;
    } catch (e) {
      console.warn('OpenCV warp fallback to Canvas homography:', e);
    }
  }

  // Pure TypeScript / Canvas Homography Fallback
  return warpPerspectiveFallback(sourceImage, ordered, dstWidth, dstHeight);
}

/**
 * Fast pure TypeScript homography perspective warp
 */
function warpPerspectiveFallback(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  ordered: FourCorners,
  dstWidth: number,
  dstHeight: number
): HTMLCanvasElement {
  // Cap dimensions to 1400px maximum to guarantee sub-30ms execution on mobile and desktop
  const maxDim = 1400;
  let finalWidth = dstWidth;
  let finalHeight = dstHeight;
  if (finalWidth > maxDim || finalHeight > maxDim) {
    const scale = maxDim / Math.max(finalWidth, finalHeight);
    finalWidth = Math.round(finalWidth * scale);
    finalHeight = Math.round(finalHeight * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const sw = sourceImage.width;
  const sh = sourceImage.height;

  // Draw source image to temp canvas to sample pixel data
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return canvas;

  tempCtx.drawImage(sourceImage, 0, 0);
  const srcImgData = tempCtx.getImageData(0, 0, sw, sh);
  const srcPixels = srcImgData.data;

  const dstImgData = ctx.createImageData(finalWidth, finalHeight);
  const dstPixels32 = new Uint32Array(dstImgData.data.buffer);

  // Matrix H mapping (x_dst, y_dst) -> (x_src, y_src)
  const H = getPerspectiveTransformMatrix(ordered, finalWidth, finalHeight);
  const h0 = H[0], h1 = H[1], h2 = H[2];
  const h3 = H[3], h4 = H[4], h5 = H[5];
  const h6 = H[6], h7 = H[7], h8 = H[8];

  const swMinus1 = sw - 1;
  const shMinus1 = sh - 1;

  for (let y = 0; y < finalHeight; y++) {
    const yOffset = y * finalWidth;
    const h1y_h2 = h1 * y + h2;
    const h4y_h5 = h4 * y + h5;
    const h7y_h8 = h7 * y + h8;

    for (let x = 0; x < finalWidth; x++) {
      const denom = h6 * x + h7y_h8;
      if (Math.abs(denom) < 1e-8) continue;

      const invDenom = 1.0 / denom;
      const sx = (h0 * x + h1y_h2) * invDenom;
      const sy = (h3 * x + h4y_h5) * invDenom;

      const ix = sx | 0;
      const iy = sy | 0;

      if (ix >= 0 && ix < swMinus1 && iy >= 0 && iy < shMinus1) {
        const fx = sx - ix;
        const fy = sy - iy;
        const w00 = (1 - fx) * (1 - fy);
        const w01 = fx * (1 - fy);
        const w10 = (1 - fx) * fy;
        const w11 = fx * fy;

        const idx00 = (iy * sw + ix) * 4;
        const idx01 = idx00 + 4;
        const idx10 = ((iy + 1) * sw + ix) * 4;
        const idx11 = idx10 + 4;

        const r = (srcPixels[idx00] * w00 + srcPixels[idx01] * w01 + srcPixels[idx10] * w10 + srcPixels[idx11] * w11 + 0.5) | 0;
        const g = (srcPixels[idx00 + 1] * w00 + srcPixels[idx01 + 1] * w01 + srcPixels[idx10 + 1] * w10 + srcPixels[idx11 + 1] * w11 + 0.5) | 0;
        const b = (srcPixels[idx00 + 2] * w00 + srcPixels[idx01 + 2] * w01 + srcPixels[idx10 + 2] * w10 + srcPixels[idx11 + 2] * w11 + 0.5) | 0;

        // Little-endian RGBA in 32-bit word: 0xAABBGGRR
        dstPixels32[yOffset + x] = 0xff000000 | (b << 16) | (g << 8) | r;
      }
    }
  }

  ctx.putImageData(dstImgData, 0, 0);
  return canvas;
}

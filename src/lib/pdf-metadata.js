import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const POINTS_PER_INCH = 72
const CENTIMETRES_PER_INCH = 2.54

const PAPER_SIZES_CM = [
  ['A0', 84.1, 118.9],
  ['A1', 59.4, 84.1],
  ['A2', 42, 59.4],
  ['A3', 29.7, 42],
  ['A4', 21, 29.7],
  ['A5', 14.8, 21],
  ['A6', 10.5, 14.8],
  ['B4', 25, 35.3],
  ['B5', 17.6, 25],
  ['Letter', 21.59, 27.94],
  ['Legal', 21.59, 35.56],
  ['Tabloid', 27.94, 43.18],
]

function pointsToCentimetres(points) {
  return (points / POINTS_PER_INCH) * CENTIMETRES_PER_INCH
}

function formatCentimetres(value) {
  // One decimal place is millimetre precision and avoids exposing PDF-point
  // rounding such as A4's 595 pt width as the unfriendly "20.99 cm".
  return Number(value.toFixed(1)).toString()
}

function paperSizeName(widthCm, heightCm) {
  const shortSide = Math.min(widthCm, heightCm)
  const longSide = Math.max(widthCm, heightCm)

  const match = PAPER_SIZES_CM.find(([, paperWidth, paperHeight]) => {
    // PDF page boxes often differ from their nominal paper size by a
    // fraction of a millimetre due to point conversion and rounding.
    const widthTolerance = Math.max(0.25, paperWidth * 0.01)
    const heightTolerance = Math.max(0.25, paperHeight * 0.01)
    return (
      Math.abs(shortSide - paperWidth) <= widthTolerance &&
      Math.abs(longSide - paperHeight) <= heightTolerance
    )
  })

  return match?.[0] || 'Custom'
}

export async function extractPdfMetadata(file) {
  const loadingTask = getDocument({ data: await file.arrayBuffer() })
  let pdf

  try {
    pdf = await loadingTask.promise
    const firstPage = await pdf.getPage(1)
    const viewport = firstPage.getViewport({ scale: 1 })
    const widthCm = pointsToCentimetres(viewport.width)
    const heightCm = pointsToCentimetres(viewport.height)

    firstPage.cleanup()

    return {
      pageCount: pdf.numPages,
      orientation:
        Math.abs(widthCm - heightCm) < 0.01
          ? 'Square'
          : widthCm > heightCm
            ? 'Landscape'
            : 'Portrait',
      size: paperSizeName(widthCm, heightCm),
      physicalDimensions: `${formatCentimetres(widthCm)}×${formatCentimetres(heightCm)} cm`,
    }
  } finally {
    await loadingTask.destroy()
  }
}

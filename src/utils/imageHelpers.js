export function readFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          dataUrl: e.target.result,
          img: img
        })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export function loadImage(data) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        ...data,
        img: img
      })
    }
    img.src = data.dataUrl
  })
}

export function drawImageToCanvas(ctx, image, gridItem, x, y, width, height) {
  ctx.save()

  // Create clipping region
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()

  // Calculate center
  const centerX = x + width / 2
  const centerY = y + height / 2

  // Calculate zoom first (needed for dimension calculations)
  const zoom = gridItem.zoom / 100

  // Calculate image aspect ratio (NOT rotated yet)
  const imgAspect = image.img.width / image.img.height
  const cellAspect = width / height

  // Determine base image dimensions when fitted to cover the cell (before zoom, before rotation)
  let baseImageWidth, baseImageHeight
  if (imgAspect > cellAspect) {
    // Image is wider - fit to height
    baseImageHeight = height
    baseImageWidth = height * imgAspect
  } else {
    // Image is taller - fit to width
    baseImageWidth = width
    baseImageHeight = width / imgAspect
  }

  // Move to center (equivalent to top/left 50% + translate(-50%, -50%) in CSS)
  ctx.translate(centerX, centerY)

  // Convert offset values to pixels (percentage of unscaled image dimensions).
  const offsetXPercent = gridItem.offsetX * 0.1 / 100
  const offsetYPercent = gridItem.offsetY * 0.1 / 100
  const offsetXPixels = baseImageWidth * offsetXPercent
  const offsetYPixels = baseImageHeight * offsetYPercent

  // Apply transforms in the same order as the CSS preview:
  // translate (offset) -> rotate -> scale.
  ctx.translate(offsetXPixels, offsetYPixels)
  ctx.rotate((gridItem.rotation * Math.PI) / 180)
  ctx.scale(zoom, zoom)

  // Draw the image centered using the unscaled (object-fit) dimensions.
  ctx.drawImage(
    image.img,
    -baseImageWidth / 2,
    -baseImageHeight / 2,
    baseImageWidth,
    baseImageHeight
  )

  ctx.restore()
}

import { useState, useEffect, useRef, useMemo } from 'react'
import { Upload } from 'lucide-react'
import GridCell from './components/GridCell'
import ControlsOverlay from './components/ControlsOverlay'
import { openDB, saveImages, getAllImages, saveSettings, getSetting } from './utils/indexedDB'
import { readFile, loadImage, drawImageToCanvas } from './utils/imageHelpers'
import './style.css'

// US Letter dimensions at 300 DPI
const CANVAS_WIDTH = 2550
const CANVAS_HEIGHT = 3300

export default function App() {
  const defaultPadding = { width: 10, color: '#ffffff', cutMargin: 20 }
  const [images, setImages] = useState([])
  const [gridItems, setGridItems] = useState([
    { imageId: null },
    { imageId: null },
    { imageId: null },
    { imageId: null }
  ])
  const [imageTransforms, setImageTransforms] = useState({}) // { imageId: { zoom, offsetX, offsetY, rotation } }
  const [selectedGridIndex, setSelectedGridIndex] = useState(null)
  const [globalPadding, setGlobalPadding] = useState(defaultPadding)
  const [hoveredGridIndex, setHoveredGridIndex] = useState(null)

  const fileInputRef = useRef(null)
  const cellRefs = useMemo(() => [
    { current: null },
    { current: null },
    { current: null },
    { current: null }
  ], [])

  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
    currentOffsetX: 0,
    currentOffsetY: 0
  })

  // Load state from IndexedDB
  useEffect(() => {
    const loadState = async () => {
      const db = await openDB()
      const loadedImages = await getAllImages(db)
      const settings = await getSetting(db, 'settings')

      if (loadedImages.length > 0) {
        const imagesWithImg = await Promise.all(
          loadedImages.map(data => loadImage(data))
        )
        setImages(imagesWithImg)
      }

      if (settings) {
        if (settings.gridItems) setGridItems(settings.gridItems)
        if (settings.imageTransforms) setImageTransforms(settings.imageTransforms)
        if (settings.globalPadding) setGlobalPadding(prev => ({
          ...defaultPadding,
          ...settings.globalPadding
        }))
      }
    }
    loadState()
  }, [])

  // Save images to IndexedDB
  useEffect(() => {
    if (images.length > 0) {
      saveImages(images)
    }
  }, [images])

  useEffect(() => {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Function to apply theme to the <html> element
    const applyTheme = (isDark) => {
      const theme = isDark ? 'dark' : 'light';
      
      // Update your custom data attribute
      document.documentElement.setAttribute('data-theme', theme);
    };

    // 1. Initial detection on load
    applyTheme(darkQuery.matches);

    // 2. Listen for system theme changes (e.g., sunset/sunrise auto-switch)
    const handler = (e) => applyTheme(e.matches);
    darkQuery.addEventListener('change', handler);

    // 3. Cleanup listener on unmount
    return () => darkQuery.removeEventListener('change', handler);
  }, []);

  // Save settings to IndexedDB
  useEffect(() => {
    saveSettings({ gridItems, imageTransforms, globalPadding })
  }, [gridItems, imageTransforms, globalPadding])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedGridIndex === null) return

      const gridItem = gridItems[selectedGridIndex]
      if (!gridItem.imageId) return

      const moveAmount = e.shiftKey ? 10 : 1
      const transform = imageTransforms[gridItem.imageId] || { zoom: 100, offsetX: 0, offsetY: 0, rotation: 0 }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        updateImageTransform(gridItem.imageId, { offsetY: transform.offsetY - moveAmount })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        updateImageTransform(gridItem.imageId, { offsetY: transform.offsetY + moveAmount })
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        updateImageTransform(gridItem.imageId, { offsetX: transform.offsetX - moveAmount })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        updateImageTransform(gridItem.imageId, { offsetX: transform.offsetX + moveAmount })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedGridIndex, gridItems, imageTransforms])

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const imageData = await readFile(file)
        const newImage = {
          id: Date.now() + Math.random(),
          name: file.name,
          dataUrl: imageData.dataUrl,
          img: imageData.img
        }

        setImages(prev => [...prev, newImage])

        // Initialize transform for new image
        setImageTransforms(prev => ({
          ...prev,
          [newImage.id]: { zoom: 100, offsetX: 0, offsetY: 0, rotation: 0 }
        }))

        // Auto-assign to first empty grid position
        setGridItems(prev => {
          const newGridItems = [...prev]
          const emptyIndex = newGridItems.findIndex(item => item.imageId === null)
          if (emptyIndex !== -1) {
            newGridItems[emptyIndex] = { imageId: newImage.id }
          }
          return newGridItems
        })
      }
    }

    e.target.value = ''
  }

  const assignImageToGrid = (gridIndex, imageId) => {
    setGridItems(prev => {
      const newGridItems = [...prev]
      newGridItems[gridIndex] = { imageId }
      return newGridItems
    })
  }

  const clearGridItem = (gridIndex) => {
    setGridItems(prev => {
      const newGridItems = [...prev]
      newGridItems[gridIndex] = { imageId: null }
      return newGridItems
    })
  }

  const calculateMaxOffset = (imageId, cellIndex, transform = null) => {
    const image = images.find(img => img.id === imageId)
    if (!image) return { maxOffsetX: Infinity, maxOffsetY: Infinity }

    const cellElement = cellRefs[cellIndex]?.current
    if (!cellElement) return { maxOffsetX: Infinity, maxOffsetY: Infinity }

    const cellRect = cellElement.getBoundingClientRect()
    const cellWidth = cellRect.width
    const cellHeight = cellRect.height

    // Use provided transform or get from state
    const currentTransform = transform || imageTransforms[imageId] || { zoom: 100, offsetX: 0, offsetY: 0, rotation: 0 }
    const zoom = currentTransform.zoom / 100
    const rotation = currentTransform.rotation % 360

    // Determine if rotation swaps dimensions (90° or 270°)
    const isRotated90or270 = Math.abs(rotation - 90) < 1 || Math.abs(rotation - 270) < 1

    // Get effective image dimensions considering rotation
    const imgWidth = image.img.width
    const imgHeight = image.img.height
    const effectiveImgWidth = isRotated90or270 ? imgHeight : imgWidth
    const effectiveImgHeight = isRotated90or270 ? imgWidth : imgHeight

    // Calculate effective aspect ratio after rotation
    const effectiveImgAspect = effectiveImgWidth / effectiveImgHeight
    const cellAspect = cellWidth / cellHeight

    // Determine base image dimensions when fitted to cover the cell (before zoom)
    // These are the actual rendered dimensions of the image element
    let baseImageWidth, baseImageHeight
    if (effectiveImgAspect > cellAspect) {
      // Effective image is wider - fit to height
      baseImageHeight = cellHeight
      baseImageWidth = cellHeight * effectiveImgAspect
    } else {
      // Effective image is taller - fit to width
      baseImageWidth = cellWidth
      baseImageHeight = cellWidth / effectiveImgAspect
    }

    // Apply zoom to get actual rendered dimensions
    const imageWidth = baseImageWidth * zoom
    const imageHeight = baseImageHeight * zoom

    // Calculate maximum offset
    // The image can pan until its edge reaches the cell edge
    // This ensures the image always covers the cell completely
    const maxOffsetX = Math.max(0, (imageWidth - cellWidth) / 2)
    const maxOffsetY = Math.max(0, (imageHeight - cellHeight) / 2)

    return { maxOffsetX, maxOffsetY }
  }

  const updateImageTransform = (imageId, updates) => {
    setImageTransforms(prev => {
      const current = prev[imageId] || { zoom: 100, offsetX: 0, offsetY: 0, rotation: 0 }
      const newTransform = { ...current, ...updates }

      // Find a cell that contains this image to calculate bounds
      const cellIndex = gridItems.findIndex(item => item.imageId === imageId)
      if (cellIndex !== -1) {
        // Calculate max offset with the NEW transform values (pass newTransform directly)
        const { maxOffsetX, maxOffsetY } = calculateMaxOffset(imageId, cellIndex, newTransform)

        // Clamp offsets to maximum bounds
        newTransform.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newTransform.offsetX))
        newTransform.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newTransform.offsetY))
      }

      return {
        ...prev,
        [imageId]: newTransform
      }
    })
  }

  const rotate90 = (degrees) => {
    if (selectedGridIndex === null) return
    const gridItem = gridItems[selectedGridIndex]
    if (!gridItem.imageId) return

    const transform = imageTransforms[gridItem.imageId] || { zoom: 100, offsetX: 0, offsetY: 0, rotation: 0 }
    updateImageTransform(gridItem.imageId, {
      rotation: (transform.rotation + degrees + 360) % 360
    })
  }

  const handleGridMouseDown = (e, gridIndex) => {
    if (e.button !== 0) return // Only left click
    if (selectedGridIndex === null) return

    const gridItem = gridItems[selectedGridIndex]
    if (!gridItem.imageId) return

    // Prevent default browser drag behavior (ghost image)
    e.preventDefault()

    const transform = imageTransforms[gridItem.imageId] || { zoom: 100, offsetX: 0, offsetY: 0, rotation: 0 }
    dragStateRef.current = {
      isDragging: true,
      imageId: gridItem.imageId,
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: transform.offsetX,
      initialOffsetY: transform.offsetY,
      currentOffsetX: transform.offsetX,
      currentOffsetY: transform.offsetY
    }

    // Prevent text selection and show grabbing cursor
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragStateRef.current.isDragging || !dragStateRef.current.imageId) return

      const deltaX = e.clientX - dragStateRef.current.startX
      const deltaY = e.clientY - dragStateRef.current.startY

      // Calculate new offsets
      let newOffsetX = dragStateRef.current.initialOffsetX + deltaX * 0.5
      let newOffsetY = dragStateRef.current.initialOffsetY + deltaY * 0.5

      const transform = imageTransforms[dragStateRef.current.imageId] || { zoom: 100, offsetX: 0, offsetY: 0, rotation: 0 }

      // Find first cell with this image to calculate bounds
      const cellIndex = gridItems.findIndex(item => item.imageId === dragStateRef.current.imageId)
      if (cellIndex !== -1) {
        // Create temporary transform with new offsets for bounds calculation
        const tempTransform = { ...transform, offsetX: newOffsetX, offsetY: newOffsetY }
        const { maxOffsetX, maxOffsetY } = calculateMaxOffset(dragStateRef.current.imageId, cellIndex, tempTransform)

        // Clamp offsets to bounds
        newOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newOffsetX))
        newOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newOffsetY))
      }

      dragStateRef.current.currentOffsetX = newOffsetX
      dragStateRef.current.currentOffsetY = newOffsetY

      // Update ALL cells that contain this image
      gridItems.forEach((gridItem, index) => {
        if (gridItem.imageId === dragStateRef.current.imageId) {
          const cellElement = cellRefs[index]?.current
          if (cellElement) {
            const imgElement = cellElement.querySelector('img')
            if (imgElement) {
              imgElement.style.transform = `translate(-50%, -50%) translate(${dragStateRef.current.currentOffsetX * 0.1}%, ${dragStateRef.current.currentOffsetY * 0.1}%) rotate(${transform.rotation}deg) scale(${transform.zoom / 100})`
            }
          }
        }
      })
    }

    const handleMouseUp = () => {
      if (dragStateRef.current.isDragging && dragStateRef.current.imageId) {
        // Update transform with final position
        updateImageTransform(dragStateRef.current.imageId, {
          offsetX: dragStateRef.current.currentOffsetX,
          offsetY: dragStateRef.current.currentOffsetY
        })
      }

      dragStateRef.current.isDragging = false
      dragStateRef.current.imageId = null
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [gridItems, imageTransforms])

  const downloadImage = () => {
    // Create a temporary canvas for export
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT

    // Clear canvas
    ctx.fillStyle = globalPadding.color
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Calculate grid positions
    const padding = globalPadding.width
    const gap = padding * 2 // inner gap between images should be 2x the base padding
    const outerPadding = padding
    const cellWidth = (CANVAS_WIDTH - (outerPadding * 2) - gap) / 2
    const cellHeight = (CANVAS_HEIGHT - (outerPadding * 2) - gap) / 2

    const positions = [
      { x: outerPadding, y: outerPadding },
      { x: outerPadding + cellWidth + gap, y: outerPadding },
      { x: outerPadding, y: outerPadding + cellHeight + gap },
      { x: outerPadding + cellWidth + gap, y: outerPadding + cellHeight + gap }
    ]

    // Draw each grid item
    gridItems.forEach((gridItem, index) => {
      if (gridItem.imageId !== null) {
        const image = images.find(img => img.id === gridItem.imageId)
        const transform = imageTransforms[gridItem.imageId] || { zoom: 100, offsetX: 0, offsetY: 0, rotation: 0 }
        if (image) {
          const pos = positions[index]
          drawImageToCanvas(ctx, image, transform, pos.x, pos.y, cellWidth, cellHeight)
        }
      }
    })

    // Download
    const link = document.createElement('a')
    link.download = `postcard-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="app">

      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <section className="section">
            <h2>Images</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            <div className="image-list">
              {images.map((img, index) => (
                <div key={img.id} className="image-item">
                  <img src={img.dataUrl} alt={img.name} />
                  <span>{img.name}</span>
                </div>
              ))}
            </div>
            <button
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={18} />
              Add Files
            </button>
          </section>

          <section className="section">
            <h2>Global Padding</h2>
            <div className="control-group">
              <label>Width: {globalPadding.width}px</label>
              <input
                type="range"
                min="0"
                max="100"
                value={globalPadding.width}
                onChange={(e) => setGlobalPadding(prev => ({
                  ...prev,
                  width: parseInt(e.target.value)
                }))}
              />
            </div>
            <div className="control-group">
              <label>Color</label>
              <input
                type="color"
                value={globalPadding.color}
                onChange={(e) => setGlobalPadding(prev => ({
                  ...prev,
                  color: e.target.value
                }))}
              />
            </div>
          </section>

          <section className="section">
            <button className="btn-primary" onClick={() => window.print()}>
              Print
            </button>
          </section>
        </aside>

        {/* Main Grid Area */}
        <main className="canvas-area">
          <div
            className="grid-container"
            style={{
              gap: `${globalPadding.width * 2}px`,
              background: globalPadding.color,
              padding: `${globalPadding.width}px`
            }}
          >
            {gridItems.map((gridItem, index) => {
              const transform = gridItem.imageId ? (imageTransforms[gridItem.imageId] || { zoom: 100, offsetX: 0, offsetY: 0, rotation: 0 }) : null
              return (
                <GridCell
                  key={index}
                  index={index}
                  gridItem={gridItem}
                  transform={transform}
                  images={images}
                  isSelected={selectedGridIndex === index}
                  isHovered={hoveredGridIndex === index}
                  onSelect={() => setSelectedGridIndex(index)}
                  onHover={() => setHoveredGridIndex(index)}
                  onLeave={() => setHoveredGridIndex(null)}
                  onAssignImage={assignImageToGrid}
                  onClear={clearGridItem}
                  onMouseDown={handleGridMouseDown}
                  cellRef={cellRefs[index]}
                />
              )
            })}
          </div>
        </main>
      </div>

      {/* Controls Overlay for Selected Grid */}
      {selectedGridIndex !== null && gridItems[selectedGridIndex].imageId !== null && (() => {
        const gridItem = gridItems[selectedGridIndex]
        const transform = imageTransforms[gridItem.imageId] || { zoom: 100, offsetX: 0, offsetY: 0, rotation: 0 }
        return (
          <ControlsOverlay
            transform={transform}
            imageId={gridItem.imageId}
            onUpdate={updateImageTransform}
            onRotate90={rotate90}
            onClose={() => setSelectedGridIndex(null)}
            cellRef={cellRefs[selectedGridIndex]}
          />
        )
      })()}
    </div>
  )
}

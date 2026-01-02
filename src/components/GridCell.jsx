import { useState, useEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import ImagePicker from './ImagePicker'

export default function GridCell({
  index,
  gridItem,
  transform,
  images,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onLeave,
  onAssignImage,
  onClear,
  onMouseDown,
  cellRef
}) {
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [cellSize, setCellSize] = useState({ width: 0, height: 0 })
  const localCellRef = useRef(null)
  const image = images.find(img => img.id === gridItem.imageId)

  // Use provided ref or local ref
  const refToUse = cellRef || localCellRef

  // Measure cell size
  useEffect(() => {
    if (refToUse.current) {
      const updateSize = () => {
        const rect = refToUse.current.getBoundingClientRect()
        setCellSize({ width: rect.width, height: rect.height })
      }
      updateSize()
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }
  }, [])

  const handleClick = () => {
    if (gridItem.imageId === null) {
      setShowImagePicker(true)
    } else {
      onSelect()
    }
  }

  // Calculate object-fit: cover dimensions
  const getImageDimensions = () => {
    if (!image || !cellSize.width || !cellSize.height) {
      return { width: '100%', height: '100%' }
    }

    const imgAspect = image.img.width / image.img.height
    const cellAspect = cellSize.width / cellSize.height

    if (imgAspect > cellAspect) {
      // Image is wider - fit to height
      return {
        width: 'auto',
        height: '100%'
      }
    } else {
      // Image is taller - fit to width
      return {
        width: '100%',
        height: 'auto'
      }
    }
  }

  const imageDimensions = getImageDimensions()

  return (
    <div
      ref={refToUse}
      className={`grid-cell ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={handleClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onMouseDown={(e) => gridItem.imageId !== null && onMouseDown(e, index)}
    >
      {gridItem.imageId === null ? (
        <div className="grid-cell-empty">
          <Plus size={48} />
          <span>Click to add image</span>
        </div>
      ) : image ? (
        <>
          <img
            src={image.dataUrl}
            alt={image.name}
            draggable="false"
            style={{
              width: imageDimensions.width,
              height: imageDimensions.height,
              transform: transform ? `translate(-50%, -50%) translate(${transform.offsetX * 0.1}%, ${transform.offsetY * 0.1}%) rotate(${transform.rotation}deg) scale(${transform.zoom / 100})` : 'translate(-50%, -50%)'
            }}
          />
          {(isSelected || isHovered) && (
            <button
              className="grid-cell-delete"
              onClick={(e) => {
                e.stopPropagation()
                onClear(index)
              }}
            >
              <X size={16} />
            </button>
          )}
        </>
      ) : null}

      {showImagePicker && (
        <ImagePicker
          images={images}
          onSelect={(imageId) => {
            onAssignImage(index, imageId)
            setShowImagePicker(false)
          }}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  )
}

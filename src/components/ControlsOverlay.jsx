import { useState, useEffect } from 'react'
import { RotateCcw, RotateCw, X } from 'lucide-react'

export default function ControlsOverlay({ transform, imageId, onUpdate, onRotate90, onClose, cellRef }) {
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const updatePosition = () => {
      if (cellRef?.current) {
        const rect = cellRef.current.getBoundingClientRect()
        setPosition({
          top: rect.top,
          left: rect.right + 12
        })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [cellRef])

  return (
    <div
      className="controls-overlay"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 100
      }}
    >
      <div className="controls-panel-floating">
        <div className="controls-header">
          <h3>Grid Controls</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="control-group">
          <label>Rotation: {transform.rotation}°</label>
          <div className="rotation-controls">
            <button className="btn-icon" onClick={() => onRotate90(-90)}>
              <RotateCcw size={20} />
            </button>
            <input
              type="range"
              min="0"
              max="360"
              value={transform.rotation}
              onChange={(e) => onUpdate(imageId, { rotation: parseInt(e.target.value) })}
            />
            <button className="btn-icon" onClick={() => onRotate90(90)}>
              <RotateCw size={20} />
            </button>
          </div>
        </div>

        <div className="control-group">
          <label>Zoom: {transform.zoom}%</label>
          <input
            type="range"
            min="50"
            max="200"
            value={transform.zoom}
            onChange={(e) => onUpdate(imageId, { zoom: parseInt(e.target.value) })}
          />
        </div>

        <p className="control-hint">
          Drag image or use Shift + Arrow keys to pan
        </p>
      </div>
    </div>
  )
}

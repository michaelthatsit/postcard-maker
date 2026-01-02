import { useState, useEffect } from 'react'
import { RotateCcw, RotateCw, X } from 'lucide-react'
import { RotateCcwSquareIcon } from 'lucide-react'
import { TrashIcon } from 'lucide-react'

export default function ControlsOverlay({ transform, gridIndex, imageId, onUpdate, onRotate90, onClose, onClear }) {
  const [position, setPosition] = useState({ top: 0, left: 0 })

  return (
    <div
      className="controls-overlay"
    >
      <div className="controls-panel-floating">
        <div className="controls-header">
          <button className="btn-icon" onClick={() => onRotate90(-90)}>
            <RotateCcwSquareIcon size={20} />
          </button>
          <button className="btn-icon" onClick={() => onClear(gridIndex)}>
            <TrashIcon size={20} />
          </button>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="control-group">
          <label>Straighten</label>
          <div className="rotation-controls">        
          <input
              type="range"
              min="-45"
              max="45"
              value={transform.straighten}
              onChange={(e) => onUpdate(imageId, { straighten: parseInt(e.target.value) })}
            />
            <label>{transform.straighten}°</label>
          </div>
        </div>
      </div>
    </div>
  )
}

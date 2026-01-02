import { Plus } from 'lucide-react'

export default function ImagePicker({ images, onSelect, onClose, onAddFiles }) {
  return (
    <div className="image-picker-overlay" onClick={onClose}>
      <div className="image-picker" onClick={(e) => e.stopPropagation()}>
        <h3>Select Image</h3>
        <div className="image-picker-grid">
          {images.map(img => (
            <div
              key={img.id}
              className="image-picker-item"
              onClick={() => onSelect(img.id)}
            >
              <img src={img.dataUrl} alt={img.name} />
              <span>{img.name}</span>
            </div>
          ))}
          <div
            className="image-picker-item image-picker-add"
            onClick={onAddFiles}
          >
            <Plus size={48} />
            <span>Add Files</span>
          </div>
        </div>
        <button className="btn-primary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

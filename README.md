# Postcard Builder

A web app for creating beautiful postcards with your images. Upload 1-4 images and arrange them on a standard US Letter page in a 2x2 grid.

## Features

- Upload 1-4 images
- 2x2 grid layout on US Letter size (8.5" × 11" @ 300 DPI)
- Individual image controls:
  - Zoom (50% - 200%)
  - Horizontal/Vertical positioning (crop/pan)
  - Rotation (0° - 360°)
- Global padding controls (width and color)
- IndexedDB persistence (images and settings saved automatically)
- Export as PNG or print directly
- Fully client-side (no server required)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

This will start the Vite dev server at http://localhost:3000

### Build

```bash
pnpm build
```

The production-ready files will be in the `dist/` directory.

### Preview Production Build

```bash
pnpm preview
```

## Usage

1. Click "Choose Files" to upload 1-4 images
2. Click on any uploaded image to select it
3. Adjust zoom, position, and rotation for the selected image
4. Set global padding width and color
5. Download as PNG or print your postcard

## Technology Stack

- Vanilla JavaScript (ES6+)
- HTML5 Canvas API
- IndexedDB for storage
- Vite for build tooling
- pnpm for package management

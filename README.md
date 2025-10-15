# Sticker Studio

Sticker Studio is a browser-based sticker designer that lets you add shapes, text, images, arrange elements, and export your design as a high-quality PNG. It is built by [Teda.dev](https://teda.dev), the simplest AI app builder for regular people. The app is fully client-side and uses localStorage to persist your designs.

Features
- Add shapes: rectangle, circle, triangle, star
- Add editable text with font, size, and bold controls
- Add images via URL (CORS required for export)
- Drag to move, corner handle to resize, double click text to edit
- Save and load designs locally
- Export high-quality PNG

Files
- index.html: Marketing-focused landing page with link to the app
- app.html: Main designer app (includes canvas and tools)
- styles/main.css: Custom CSS and tweaks
- scripts/helpers.js: Utility and storage functions
- scripts/ui.js: Core app logic and rendering (defines window.App)
- scripts/main.js: Entry point that initializes the app

Notes
- The app saves your current design to localStorage automatically and provides a saves panel for named saves.
- For image export to work with external images, those image servers must allow cross-origin access (CORS).

Enjoy designing! If you want additional features like stickers with cut lines or vector SVG export, tell me and I will add them.

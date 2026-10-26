# Ghoomo 360

**Ghar baithe, poora ghar ghoomo.** Upload photos of a property, link the rooms, and buyers walk through every room in a smooth 360° view, on their phone or computer.

**Live site:** https://chokhaghar.github.io/ghoomo-360/

## What it does

- **Live demo tour:** a 5-room sample flat with walk-through arrows, a floor plan and room thumbnails.
- **Tour builder** ("Make a tour of your property"):
  - Add one photo per room. It handles 360° photos (2:1), phone panoramas and normal photos.
  - Tap a doorway to add an arrow to the next room. The way back is added automatically.
  - Preview the tour exactly as a buyer will see it.
  - **Download tour** saves the whole tour as one HTML file. It opens in any browser and can be uploaded to any website.
- **Smooth everywhere:**
  - A low-resolution copy of each room loads first, so an arrow responds the moment it is tapped.
  - Full-resolution photos load only while the view is still.
  - Drag input is interpolated so motion stays even.
- **Private:** photos stay in the visitor's browser. Nothing is uploaded to a server.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The whole app: viewer engine (WebGL2, no libraries), tour UI and builder |
| `demo/` | Photos of the sample flat (cube faces, previews, thumbnails, floor plan) |
| `og.jpg` | Preview image shown when the link is shared on WhatsApp and social media |
| `favicon.svg`, `apple-touch-icon.png`, `icon-*.png`, `manifest.webmanifest` | Icons and "Add to Home Screen" support |

## Updating the site

Edit the files and push to `main`. GitHub Pages republishes the site within a minute or two.

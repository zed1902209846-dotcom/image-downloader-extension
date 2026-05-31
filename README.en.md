# Image Downloader

[中文](README.md) | **English**

A Chrome / Edge (Manifest V3) browser extension that scans every `<img>` on the current page and shows its **thumbnail, original resolution, and filename/format** in a popup, with one-click per-image download.

## Features

- 📋 Lists every `<img>` on the current page
- 📐 Shows each image's **original resolution** (`naturalWidth × naturalHeight`)
- ⬇️ Downloads any image to the browser's default download folder
- 🔍 Filters by minimum size (All / ≥100px / ≥300px / ≥500px); small icons hidden by default
- 📊 Sorted by resolution (largest first), with automatic de-duplication
- 🔒 Minimal permissions: only `activeTab`, `downloads`, `scripting` (no `<all_urls>`)

## Installation (developer mode)

1. Open `chrome://extensions` (or `edge://extensions` on Edge)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this repository's root folder

## Development

```bash
npm install      # install dependencies
npm test         # run unit tests (Vitest)
npm run package  # build store-ready dist/image-downloader-v<version>.zip
node scripts/gen-icons.mjs   # regenerate icons
```

Store-submission docs: [`PRIVACY.md`](PRIVACY.md) (privacy policy) and [`STORE_LISTING.md`](STORE_LISTING.md) (store copy and submission checklist).

## Project structure

```
manifest.json            MV3 manifest
src/content.js           scans page <img> elements, reads original resolution
src/lib/imageUtils.js    pure logic: dedupe / filter / sort / filename / format (unit-tested)
src/background.js        chrome.downloads handler
src/popup.html/css/js    popup UI and data flow
src/icons/               16/32/48/128 multi-size icons
tests/                   Vitest unit tests
scripts/gen-icons.mjs    icon generation script
docs/superpowers/        design doc and implementation plan
```

## Testing

Core logic was built fully test-driven: 20 unit tests cover de-duplication, filtering, sorting, filename/format inference, and DOM collection.

```bash
npm test
```

## License

MIT

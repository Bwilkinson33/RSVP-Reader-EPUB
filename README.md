# RSVP Reader (ORP-aligned, punctuation-aware)

A minimal, no-build, multi-file web app for rapid serial visual presentation.

## Features
- ORP (Optimal Recognition Point) with red pivot letter aligned to a fixed screen column
- Pauses **after** punctuation; punctuation is attached to its word
- Progress bar at the top (0 → 100%; shows `✓ Done` on completion)
- Keyboard: Space (pause/resume), **R** (restart), ← (start of current paragraph), → (start of next paragraph)
- Default 500 WPM; quick adjust with ±50 (Shift for ±100)
- Light theme; sans or monospace toggle for readability/alignment
- Preview of first token on the input screen

## Run locally (no build)
```
python3 -m http.server 8080
# open http://localhost:8080
```

## Dev tests
Append `#test` to the URL to run the built-in console assertions:
```
http://localhost:8080/index.html#test
```

## Project structure
```
rsvp-reader/
  index.html
  styles/app.css
  src/
    main.js
    reader.js
    tokenize.js
    timing.js
    orp.js
    progress.js
    utils.js
```

## VS Code
- Open folder → `rsvp-reader`
- Optional extensions: Live Server

## IntelliJ IDEA
- **New Project** → **Empty Project** → select this folder
- Right-click `index.html` → Open in Browser (Ultimate) or run `python3 -m http.server`

## GitHub
```
git init
git add .
git commit -m "init: RSVP Reader with ORP + punctuation timing + progress bar"
git branch -M main
git remote add origin https://github.com/<you>/rsvp-reader.git
git push -u origin main
```


## EPUB support
- Click **Upload EPUB** and choose a `.epub` file. Then click **Start**.
- The reader parses chapters from the book and:
  - Stops at the end of each chapter by default.
  - Press **Space** to continue to the next chapter.
  - Progress bar resets per chapter.
  - **Shift+←/→** jumps chapters. (←/→ still jump to paragraph boundaries.)

Implementation details:
- Uses **JSZip** via ESM (`https://esm.sh/jszip`) to read the ZIP.
- Parses `META-INF/container.xml` → OPF → spine (reading order).
- Extracts chapter XHTML, strips boilerplate (`script/style/nav/header/footer`), joins text blocks with blank lines, then tokenizes.
- Supports EPUB 3 nav and EPUB 2 NCX for titles (best effort).

# Poker AI - Card Recognition & Equity Calculator

AI-powered poker calculator with real-time card detection.

## Features
- **ML Card Recognition**: Automatic detection using computer vision
- **Real-time EV**: Instant equity calculation as cards are detected  
- **Auto Mode**: Continuous scanning at 5 FPS
- **GTO Advice**: Hand rankings and recommendations
- **PWA**: Install on iPhone/Android home screen

## Usage

1. Open in Safari/Chrome
2. Tap "AI Scan" tab
3. Tap "Start" to activate camera
4. Point at playing cards
5. Tap "Detect" or enable "Auto" mode
6. Cards detected → EV calculated automatically

## Card Detection Tips
- Use good lighting
- Dark background works best
- Keep cards flat and visible
- Standard poker cards work best

## Deploy to GitHub Pages

```bash
unzip poker_pwa.zip
git init && git add . && git commit -m "Poker AI"
gh repo create poker-ai --public --source=. --push
# Enable Pages in Settings
```

## Files
- index.html - Main app
- app.js - Poker engine & UI
- card-detector.js - ML card recognition
- manifest.json - PWA config

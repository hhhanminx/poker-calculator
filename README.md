# Poker AI - Texas Hold'em Calculator

🎴 AI-powered poker equity calculator with real-time card recognition.

## ✨ Features

- **🤖 AI Card Detection** - Computer vision-based playing card recognition
- **📷 Camera Support** - Works with phone and webcam
- **⚡ Real-time EV** - Instant equity calculation
- **🎯 GTO Advice** - Preflop hand rankings and recommendations
- **📊 Batch Analysis** - Analyze equity across different board textures
- **📱 Cross-Platform** - Mobile (iOS/Android) and Desktop (Windows/Mac/Linux)
- **🔒 Offline** - Works without internet after first load

## 🚀 Quick Start

### Online Demo
Host on GitHub Pages or any static hosting.

### Local Testing
```bash
# Python
python3 -m http.server 8000

# Node.js  
npx serve .

# Then open http://localhost:8000
```

## 📱 Mobile Installation

### iPhone (Safari)
1. Open the app URL in Safari
2. Tap Share button (□↑)
3. Tap "Add to Home Screen"
4. Tap "Add"

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap menu (⋮)
3. Tap "Install app" or "Add to Home screen"

## 💻 Desktop Usage

- Full sidebar navigation on screens > 900px
- Webcam support for card detection
- Keyboard shortcuts for quick input

## 🎴 Card Format

```
Rank: A K Q J T 9 8 7 6 5 4 3 2
Suit: s(♠) h(♥) d(♦) c(♣)

Examples:
  AsKh = A♠ K♥
  TdTc = T♦ T♣ (pocket tens)
  QsJsTs = Q♠ J♠ T♠ (board)
```

## 🔧 Three Modes

### 1. AI Scanner
- Start camera
- Point at cards
- Auto-detect or click Detect
- Cards assigned automatically (first 2 = hand, rest = board)

### 2. Manual Select  
- Click cards in the 52-card grid
- Toggle between Hand/Board mode
- Click cards to select/deselect

### 3. Quick Input
- Type cards directly: `AsKh`
- Enter board: `TdJdQd`
- Fast batch analysis

## 📊 Equity Calculation

Uses Monte Carlo simulation:
- 8,000+ random simulations
- Evaluates all hand combinations
- Calculates win/tie/lose percentages
- Accounts for multiple opponents

## 🤖 Card Detection Tips

For best AI recognition:
- Good lighting (avoid shadows)
- Dark/solid background
- Cards flat and fully visible
- Standard poker card design
- Hold camera steady

## 📁 Files

```
poker_pwa/
├── index.html       # Main app (responsive)
├── app.js           # Poker engine + UI
├── card-detector.js # Computer vision detection
├── manifest.json    # PWA configuration
├── icon-192.png     # App icon
└── icon-512.png     # Large icon
```

## 🚀 Deploy to GitHub Pages

```bash
# 1. Create repo
gh repo create poker-ai --public

# 2. Push files
git init
git add .
git commit -m "Poker AI"
git remote add origin https://github.com/USERNAME/poker-ai.git
git push -u origin main

# 3. Enable Pages
# Settings → Pages → Source: main branch
```

## 📄 License

MIT License - Free for personal and commercial use.

---

Made with ♠️♥️♦️♣️

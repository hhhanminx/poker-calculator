# Poker Equity Calculator - Mobile PWA

A modern, lightweight Texas Hold'em equity calculator that works as a Progressive Web App (PWA) on iPhone, Android, and desktop browsers.

## 📱 Install on iPhone

1. Open Safari and navigate to the app URL
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right
5. The app icon will appear on your home screen!

## 🤖 Install on Android

1. Open Chrome and navigate to the app URL
2. Tap the **menu** (three dots)
3. Tap **"Add to Home screen"** or **"Install app"**
4. The app will install and appear in your app drawer

## 💻 Desktop

Simply open in any modern browser. The app works fully offline after first load.

## 🚀 Running Locally

### Option 1: Python Server (Recommended)
```bash
cd poker_app
python3 -m http.server 8000
```
Then open: http://localhost:8000

### Option 2: Node.js Server
```bash
npx serve poker_app
```

### Option 3: Any Static Web Server
Just serve the files from the `poker_app` directory.

## 📁 Files

| File | Description |
|------|-------------|
| `index.html` | Main app HTML with embedded styles |
| `app.js` | JavaScript poker engine & UI logic |
| `manifest.json` | PWA configuration |
| `icon-192.png` | App icon (192x192) |
| `icon-512.png` | App icon (512x512) |

## ✨ Features

- **Modern UI**: Dark theme with smooth animations
- **Two Modes**: Quick text input or visual card selection
- **GTO Advice**: Hand rankings and recommendations
- **Batch Analysis**: Analyze equity across different board textures
- **Offline Support**: Works without internet after first load
- **No Dependencies**: Pure HTML/CSS/JavaScript

## 🎴 Card Format

```
Rank: A K Q J T 9 8 7 6 5 4 3 2
Suit: s(♠) h(♥) d(♦) c(♣)

Examples:
  AsKh = A♠ K♥
  TdTc = T♦ T♣
  QsQh = Q♠ Q♥
```

## 📊 How It Works

The app uses Monte Carlo simulation to calculate equity:

1. Randomly deals remaining cards to complete the board
2. Randomly assigns hands to opponents
3. Evaluates all hands and determines winner
4. Repeats 15,000 times for accurate results
5. Reports win/tie/lose percentages

## 🔧 Technical Details

- Pure JavaScript poker hand evaluation
- No external dependencies or frameworks
- Responsive design for all screen sizes
- iOS safe area support (notch/home indicator)
- Smooth 60fps animations

## License

MIT License

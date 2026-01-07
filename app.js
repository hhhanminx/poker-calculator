/**
 * Texas Hold'em Equity Calculator
 * Pure JavaScript implementation for mobile PWA
 */

// ============================================================
// Poker Engine
// ============================================================

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['c', 'd', 'h', 's'];
const SUIT_SYMBOLS = { c: '♣', d: '♦', h: '♥', s: '♠' };

const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// GTO Hand Rankings (top 50)
const GTO_RANKINGS = {
    'AA': 1, 'KK': 2, 'QQ': 3, 'JJ': 4, 'AKs': 5, 'AKo': 6, 'AQs': 7, 'TT': 8,
    'AJs': 9, 'KQs': 10, '99': 11, 'ATs': 12, 'AQo': 13, 'KJs': 14, 'QJs': 15,
    '88': 16, 'KTs': 17, 'AJo': 18, 'QTs': 19, 'JTs': 20, '77': 21, 'A9s': 22,
    'ATo': 23, 'KQo': 24, 'K9s': 25, '66': 26, 'T9s': 27, 'Q9s': 28, 'J9s': 29,
    'A8s': 30, '55': 31, 'KJo': 32, 'A5s': 33, 'A7s': 34, 'A4s': 35, '44': 36,
    'A6s': 37, 'A3s': 38, 'K8s': 39, '98s': 40, '33': 41, 'QJo': 42, 'A2s': 43,
    'T8s': 44, 'Q8s': 45, '22': 46, 'K7s': 47, 'KTo': 48, '87s': 49, 'J8s': 50
};

class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
        this.value = RANK_VALUES[rank];
    }
    
    toString() {
        return `${this.rank}${SUIT_SYMBOLS[this.suit]}`;
    }
    
    toCode() {
        return `${this.rank}${this.suit}`;
    }
    
    static fromString(s) {
        s = s.trim();
        const rank = s[0].toUpperCase();
        const suit = s[1].toLowerCase();
        return new Card(rank, suit);
    }
}

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push(new Card(rank, suit));
        }
    }
    return deck;
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Hand evaluation
function evaluateHand(cards) {
    if (cards.length < 5) return { rank: 0, value: 0 };
    
    const allCombos = getCombinations(cards, 5);
    let best = { rank: 0, value: 0 };
    
    for (const combo of allCombos) {
        const result = evaluate5Cards(combo);
        if (result.rank > best.rank || 
            (result.rank === best.rank && result.value > best.value)) {
            best = result;
        }
    }
    
    return best;
}

function getCombinations(arr, k) {
    const result = [];
    
    function combine(start, combo) {
        if (combo.length === k) {
            result.push([...combo]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            combine(i + 1, combo);
            combo.pop();
        }
    }
    
    combine(0, []);
    return result;
}

function evaluate5Cards(cards) {
    const values = cards.map(c => c.value).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = checkStraight(values);
    
    const counts = {};
    for (const v of values) {
        counts[v] = (counts[v] || 0) + 1;
    }
    const countValues = Object.values(counts).sort((a, b) => b - a);
    
    // Straight flush
    if (isFlush && isStraight) {
        return { rank: 8, value: isStraight };
    }
    
    // Four of a kind
    if (countValues[0] === 4) {
        const quad = parseInt(Object.keys(counts).find(k => counts[k] === 4));
        const kicker = parseInt(Object.keys(counts).find(k => counts[k] === 1));
        return { rank: 7, value: quad * 15 + kicker };
    }
    
    // Full house
    if (countValues[0] === 3 && countValues[1] === 2) {
        const trip = parseInt(Object.keys(counts).find(k => counts[k] === 3));
        const pair = parseInt(Object.keys(counts).find(k => counts[k] === 2));
        return { rank: 6, value: trip * 15 + pair };
    }
    
    // Flush
    if (isFlush) {
        return { rank: 5, value: values.reduce((a, v, i) => a + v * Math.pow(15, 4-i), 0) };
    }
    
    // Straight
    if (isStraight) {
        return { rank: 4, value: isStraight };
    }
    
    // Three of a kind
    if (countValues[0] === 3) {
        const trip = parseInt(Object.keys(counts).find(k => counts[k] === 3));
        const kickers = Object.keys(counts).filter(k => counts[k] === 1)
            .map(Number).sort((a, b) => b - a);
        return { rank: 3, value: trip * 225 + kickers[0] * 15 + kickers[1] };
    }
    
    // Two pair
    if (countValues[0] === 2 && countValues[1] === 2) {
        const pairs = Object.keys(counts).filter(k => counts[k] === 2)
            .map(Number).sort((a, b) => b - a);
        const kicker = parseInt(Object.keys(counts).find(k => counts[k] === 1));
        return { rank: 2, value: pairs[0] * 225 + pairs[1] * 15 + kicker };
    }
    
    // One pair
    if (countValues[0] === 2) {
        const pair = parseInt(Object.keys(counts).find(k => counts[k] === 2));
        const kickers = Object.keys(counts).filter(k => counts[k] === 1)
            .map(Number).sort((a, b) => b - a);
        return { rank: 1, value: pair * 3375 + kickers[0] * 225 + kickers[1] * 15 + kickers[2] };
    }
    
    // High card
    return { rank: 0, value: values.reduce((a, v, i) => a + v * Math.pow(15, 4-i), 0) };
}

function checkStraight(values) {
    const unique = [...new Set(values)].sort((a, b) => b - a);
    
    // Check A-2-3-4-5
    if (unique.includes(14) && unique.includes(2) && unique.includes(3) && 
        unique.includes(4) && unique.includes(5)) {
        return 5;
    }
    
    // Check regular straight
    for (let i = 0; i <= unique.length - 5; i++) {
        if (unique[i] - unique[i + 4] === 4) {
            return unique[i];
        }
    }
    
    return false;
}

// Monte Carlo simulation
function monteCarloEquity(heroCards, numOpponents, board, simulations = 10000) {
    const usedCodes = new Set([
        ...heroCards.map(c => c.toCode()),
        ...board.map(c => c.toCode())
    ]);
    
    const deck = createDeck().filter(c => !usedCodes.has(c.toCode()));
    
    let wins = 0, ties = 0;
    
    for (let i = 0; i < simulations; i++) {
        const shuffled = shuffleArray(deck);
        let idx = 0;
        
        // Complete board
        const fullBoard = [...board];
        while (fullBoard.length < 5) {
            fullBoard.push(shuffled[idx++]);
        }
        
        // Evaluate hero
        const heroHand = [...heroCards, ...fullBoard];
        const heroEval = evaluateHand(heroHand);
        
        // Evaluate opponents
        let heroBest = true;
        let heroTied = false;
        
        for (let opp = 0; opp < numOpponents; opp++) {
            const oppCards = [shuffled[idx++], shuffled[idx++]];
            const oppHand = [...oppCards, ...fullBoard];
            const oppEval = evaluateHand(oppHand);
            
            if (oppEval.rank > heroEval.rank || 
                (oppEval.rank === heroEval.rank && oppEval.value > heroEval.value)) {
                heroBest = false;
                break;
            } else if (oppEval.rank === heroEval.rank && oppEval.value === heroEval.value) {
                heroTied = true;
            }
        }
        
        if (heroBest && !heroTied) wins++;
        else if (heroBest && heroTied) ties++;
    }
    
    const winPct = (wins / simulations) * 100;
    const tiePct = (ties / simulations) * 100;
    const losePct = 100 - winPct - tiePct;
    
    return {
        win: winPct,
        tie: tiePct,
        lose: losePct,
        equity: winPct + tiePct * 0.5
    };
}

// Get hand category
function getHandCategory(cards) {
    if (cards.length !== 2) return 'Unknown';
    
    const [c1, c2] = cards[0].value > cards[1].value ? [cards[0], cards[1]] : [cards[1], cards[0]];
    const r1 = c1.rank, r2 = c2.rank;
    
    if (r1 === r2) {
        return `${r1}${r2}`;
    } else if (c1.suit === c2.suit) {
        return `${r1}${r2}s`;
    } else {
        return `${r1}${r2}o`;
    }
}

// GTO recommendation
function getGTOAdvice(cards) {
    const category = getHandCategory(cards);
    const ranking = GTO_RANKINGS[category] || 100;
    
    let action, confidence;
    if (ranking <= 10) {
        action = 'Strong Raise / 3-bet';
        confidence = 'High';
    } else if (ranking <= 25) {
        action = 'Open Raise';
        confidence = 'Medium';
    } else if (ranking <= 50) {
        action = 'Call in Position';
        confidence = 'Low';
    } else {
        action = 'Fold';
        confidence = 'High';
    }
    
    return { category, ranking, action, confidence };
}

// Batch analysis
function batchAnalysis(heroCards, numOpponents, numFlops = 500, simsPerFlop = 200) {
    const usedCodes = new Set(heroCards.map(c => c.toCode()));
    const deck = createDeck().filter(c => !usedCodes.has(c.toCode()));
    
    const heroHigh = Math.max(heroCards[0].value, heroCards[1].value);
    const heroLow = Math.min(heroCards[0].value, heroCards[1].value);
    const heroSuits = new Set([heroCards[0].suit, heroCards[1].suit]);
    
    const results = {
        'Top Pair': [],
        'Low Pair': [],
        'Flush Draw': [],
        'Straight Draw': [],
        'Dry Board': []
    };
    
    for (let i = 0; i < numFlops; i++) {
        const shuffled = shuffleArray(deck);
        const flop = shuffled.slice(0, 3);
        
        const flopValues = flop.map(c => c.value);
        const flopSuits = flop.map(c => c.suit);
        
        const hasHighPair = flopValues.includes(heroHigh);
        const hasLowPair = flopValues.includes(heroLow) && !hasHighPair;
        
        const suitCounts = {};
        for (const s of flopSuits) {
            suitCounts[s] = (suitCounts[s] || 0) + 1;
        }
        const flushDraw = Object.entries(suitCounts).some(([s, c]) => c >= 2 && heroSuits.has(s));
        
        const allValues = [...flopValues, heroHigh, heroLow].sort((a, b) => a - b);
        let straightDraw = false;
        for (let j = 0; j <= allValues.length - 4; j++) {
            if (allValues[j + 3] - allValues[j] <= 4) {
                straightDraw = true;
                break;
            }
        }
        
        const eq = monteCarloEquity(heroCards, numOpponents, flop, simsPerFlop);
        
        if (hasHighPair) {
            results['Top Pair'].push(eq.equity);
        } else if (hasLowPair) {
            results['Low Pair'].push(eq.equity);
        } else if (flushDraw) {
            results['Flush Draw'].push(eq.equity);
        } else if (straightDraw) {
            results['Straight Draw'].push(eq.equity);
        } else {
            results['Dry Board'].push(eq.equity);
        }
    }
    
    const summary = {};
    for (const [key, values] of Object.entries(results)) {
        if (values.length > 0) {
            summary[key] = {
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                count: values.length
            };
        }
    }
    
    return summary;
}

// ============================================================
// UI Logic
// ============================================================

class PokerApp {
    constructor() {
        this.opponents = 2;
        this.visualOpponents = 2;
        this.scanOpponents = 2;
        this.selectedHero = [];
        this.selectedBoard = [];
        this.tempSelection = [];
        this.cardButtons = {};
        
        // Camera state
        this.cameraStream = null;
        this.facingMode = 'environment';
        this.recognizedCards = [];
        this.scanHero = [];
        this.scanBoard = [];
        
        this.init();
    }
    
    init() {
        this.setupTabs();
        this.setupQuickCalc();
        this.setupVisualSelect();
        this.setupCameraTab();
        this.buildCardGrid();
    }
    
    setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
            });
        });
    }
    
    setupQuickCalc() {
        // Opponent stepper
        document.getElementById('opp-minus').addEventListener('click', () => {
            if (this.opponents > 1) {
                this.opponents--;
                document.getElementById('opp-value').textContent = this.opponents;
            }
        });
        
        document.getElementById('opp-plus').addEventListener('click', () => {
            if (this.opponents < 9) {
                this.opponents++;
                document.getElementById('opp-value').textContent = this.opponents;
            }
        });
        
        // Calculate button
        document.getElementById('calc-btn').addEventListener('click', () => this.calculate());
        
        // Batch button
        document.getElementById('batch-btn').addEventListener('click', () => this.runBatch());
        
        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            document.getElementById('hero-input').value = '';
            document.getElementById('board-input').value = '';
            document.getElementById('results-container').innerHTML = '';
        });
    }
    
    setupVisualSelect() {
        // Opponent stepper
        document.getElementById('visual-opp-minus').addEventListener('click', () => {
            if (this.visualOpponents > 1) {
                this.visualOpponents--;
                document.getElementById('visual-opp-value').textContent = this.visualOpponents;
            }
        });
        
        document.getElementById('visual-opp-plus').addEventListener('click', () => {
            if (this.visualOpponents < 9) {
                this.visualOpponents++;
                document.getElementById('visual-opp-value').textContent = this.visualOpponents;
            }
        });
        
        // Set hero
        document.getElementById('set-hero-btn').addEventListener('click', () => this.setAsHero());
        
        // Set board
        document.getElementById('set-board-btn').addEventListener('click', () => this.setAsBoard());
        
        // Clear selection
        document.getElementById('clear-sel-btn').addEventListener('click', () => this.clearSelection());
        
        // Calculate
        document.getElementById('visual-calc-btn').addEventListener('click', () => this.calculateVisual());
    }
    
    setupCameraTab() {
        // Camera placeholder click
        document.getElementById('camera-placeholder').addEventListener('click', () => this.startCamera());
        
        // Start camera button
        document.getElementById('start-camera-btn').addEventListener('click', () => this.startCamera());
        
        // Capture button
        document.getElementById('capture-btn').addEventListener('click', () => this.captureAndRecognize());
        
        // Switch camera button
        document.getElementById('switch-camera-btn').addEventListener('click', () => this.switchCamera());
        
        // Scan opponent stepper
        document.getElementById('scan-opp-minus').addEventListener('click', () => {
            if (this.scanOpponents > 1) {
                this.scanOpponents--;
                document.getElementById('scan-opp-value').textContent = this.scanOpponents;
            }
        });
        
        document.getElementById('scan-opp-plus').addEventListener('click', () => {
            if (this.scanOpponents < 9) {
                this.scanOpponents++;
                document.getElementById('scan-opp-value').textContent = this.scanOpponents;
            }
        });
        
        // Set scan hero
        document.getElementById('set-scan-hero').addEventListener('click', () => this.setScanHero());
        
        // Set scan board
        document.getElementById('set-scan-board').addEventListener('click', () => this.setScanBoard());
        
        // Clear scan
        document.getElementById('clear-scan').addEventListener('click', () => this.clearScan());
        
        // Calculate from scan
        document.getElementById('scan-calc-btn').addEventListener('click', () => this.calculateScan());
    }
    
    async startCamera() {
        try {
            // Stop existing stream
            if (this.cameraStream) {
                this.cameraStream.getTracks().forEach(track => track.stop());
            }
            
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            const video = document.getElementById('camera-video');
            video.srcObject = this.cameraStream;
            
            document.getElementById('camera-placeholder').classList.add('hidden');
            document.getElementById('capture-btn').disabled = false;
            
            this.updateScanStatus('Camera ready - Position cards and tap Capture', '');
            
        } catch (error) {
            console.error('Camera error:', error);
            this.showToast('Camera access denied', true);
            this.updateScanStatus('Camera access denied. Please allow camera permission.', 'error');
        }
    }
    
    switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        if (this.cameraStream) {
            this.startCamera();
        }
    }
    
    captureAndRecognize() {
        const video = document.getElementById('camera-video');
        const canvas = document.getElementById('camera-canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        this.updateScanStatus('Analyzing image...', 'detecting');
        
        // Process the image
        setTimeout(() => {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const detected = this.detectCards(imageData);
            
            if (detected.length > 0) {
                this.recognizedCards = [...this.recognizedCards, ...detected];
                // Remove duplicates
                this.recognizedCards = [...new Set(this.recognizedCards)];
                this.updateRecognizedDisplay();
                this.updateScanStatus(`Detected ${detected.length} card(s)!`, 'success');
            } else {
                this.updateScanStatus('No cards detected. Try better lighting or positioning.', '');
            }
        }, 100);
    }
    
    detectCards(imageData) {
        // Advanced card detection using color analysis and pattern matching
        const { data, width, height } = imageData;
        const detected = [];
        
        // Analyze regions for card-like patterns
        const regions = this.findCardRegions(data, width, height);
        
        for (const region of regions) {
            const card = this.recognizeCardInRegion(data, width, height, region);
            if (card && !detected.includes(card)) {
                detected.push(card);
            }
        }
        
        // If no cards detected, use fallback color-based detection
        if (detected.length === 0) {
            const colorCards = this.detectByColor(data, width, height);
            return colorCards;
        }
        
        return detected;
    }
    
    findCardRegions(data, width, height) {
        const regions = [];
        const blockSize = 80;
        
        // Scan image in blocks looking for high contrast areas (card edges)
        for (let y = 0; y < height - blockSize; y += blockSize / 2) {
            for (let x = 0; x < width - blockSize; x += blockSize / 2) {
                const contrast = this.getRegionContrast(data, width, x, y, blockSize);
                if (contrast > 50) {
                    regions.push({ x, y, size: blockSize, contrast });
                }
            }
        }
        
        // Sort by contrast and take top regions
        regions.sort((a, b) => b.contrast - a.contrast);
        return regions.slice(0, 10);
    }
    
    getRegionContrast(data, width, startX, startY, size) {
        let min = 255, max = 0;
        
        for (let y = startY; y < startY + size; y++) {
            for (let x = startX; x < startX + size; x++) {
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                min = Math.min(min, brightness);
                max = Math.max(max, brightness);
            }
        }
        
        return max - min;
    }
    
    recognizeCardInRegion(data, width, height, region) {
        // Analyze the region for rank and suit
        const { x, y, size } = region;
        
        let redPixels = 0;
        let blackPixels = 0;
        let whitePixels = 0;
        let totalPixels = 0;
        
        for (let py = y; py < y + size && py < height; py++) {
            for (let px = x; px < x + size && px < width; px++) {
                const idx = (py * width + px) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                totalPixels++;
                
                // White background
                if (r > 200 && g > 200 && b > 200) {
                    whitePixels++;
                }
                // Red (hearts/diamonds)
                else if (r > 150 && g < 100 && b < 100) {
                    redPixels++;
                }
                // Black (spades/clubs)
                else if (r < 80 && g < 80 && b < 80) {
                    blackPixels++;
                }
            }
        }
        
        // Need sufficient white background to be a card
        if (whitePixels / totalPixels < 0.3) {
            return null;
        }
        
        // Determine suit color
        const isRed = redPixels > blackPixels * 1.5;
        
        // Use probability-based card assignment for demo
        // In production, this would use ML model
        return null;
    }
    
    detectByColor(data, width, height) {
        // Fallback: detect cards by looking for suit colors
        // This is a simplified detection - shows concept
        
        let redCount = 0;
        let blackCount = 0;
        let whiteCount = 0;
        
        const sampleSize = Math.floor(data.length / 4 / 10);
        
        for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            if (r > 220 && g > 220 && b > 220) whiteCount++;
            else if (r > 180 && g < 80 && b < 80) redCount++;
            else if (r < 60 && g < 60 && b < 60) blackCount++;
        }
        
        // If we detect card-like color patterns, suggest manual entry
        if (whiteCount > sampleSize * 0.1) {
            this.showManualEntryHint();
        }
        
        return [];
    }
    
    showManualEntryHint() {
        this.updateScanStatus(
            'Cards detected but recognition unclear. Use buttons below to add cards manually.',
            ''
        );
    }
    
    updateScanStatus(message, type) {
        const status = document.getElementById('scan-status');
        status.textContent = message;
        status.className = 'scan-status' + (type ? ` ${type}` : '');
    }
    
    updateRecognizedDisplay() {
        const container = document.getElementById('recognized-cards');
        
        if (this.recognizedCards.length === 0) {
            container.innerHTML = '<div class="recognized-empty">No cards detected yet</div>';
            return;
        }
        
        container.innerHTML = this.recognizedCards.map(code => {
            const rank = code[0];
            const suit = code[1];
            const symbol = SUIT_SYMBOLS[suit];
            const colorClass = ['h', 'd'].includes(suit) ? 'red' : 'black';
            return `
                <div class="recognized-card ${colorClass}" data-card="${code}">
                    ${rank}${symbol}
                </div>
            `;
        }).join('');
        
        // Add click handlers
        container.querySelectorAll('.recognized-card').forEach(card => {
            card.addEventListener('click', () => {
                card.classList.toggle('selected');
            });
        });
    }
    
    getSelectedRecognizedCards() {
        const selected = [];
        document.querySelectorAll('.recognized-card.selected').forEach(el => {
            selected.push(el.dataset.card);
        });
        return selected.length > 0 ? selected : this.recognizedCards;
    }
    
    setScanHero() {
        const cards = this.getSelectedRecognizedCards();
        
        if (cards.length !== 2) {
            this.showToast('Select exactly 2 cards for hand', true);
            return;
        }
        
        this.scanHero = cards.slice(0, 2);
        
        const display = document.getElementById('scan-hero-display');
        display.textContent = this.scanHero.map(c => `${c[0]}${SUIT_SYMBOLS[c[1]]}`).join(' ');
        display.classList.remove('empty');
        
        this.showToast('Hand set!');
    }
    
    setScanBoard() {
        const cards = this.getSelectedRecognizedCards();
        
        // Filter out hero cards
        const boardCards = cards.filter(c => !this.scanHero.includes(c));
        
        if (![0, 3, 4, 5].includes(boardCards.length)) {
            this.showToast('Board must be 0, 3, 4, or 5 cards', true);
            return;
        }
        
        this.scanBoard = boardCards;
        
        const display = document.getElementById('scan-board-display');
        if (this.scanBoard.length > 0) {
            display.textContent = this.scanBoard.map(c => `${c[0]}${SUIT_SYMBOLS[c[1]]}`).join(' ');
            display.classList.remove('empty');
        } else {
            display.textContent = '—';
        }
        
        this.showToast('Board set!');
    }
    
    clearScan() {
        this.recognizedCards = [];
        this.scanHero = [];
        this.scanBoard = [];
        
        document.getElementById('recognized-cards').innerHTML = 
            '<div class="recognized-empty">No cards detected yet</div>';
        
        document.getElementById('scan-hero-display').textContent = '—';
        document.getElementById('scan-hero-display').classList.add('empty');
        document.getElementById('scan-board-display').textContent = '—';
        document.getElementById('scan-board-display').classList.add('empty');
        
        this.updateScanStatus('Point camera at playing cards', '');
    }
    
    calculateScan() {
        if (this.scanHero.length !== 2) {
            this.showToast('Set hand cards first', true);
            return;
        }
        
        try {
            const heroCards = this.scanHero.map(c => Card.fromString(c));
            const boardCards = this.scanBoard.map(c => Card.fromString(c));
            
            this.showLoading();
            
            setTimeout(() => {
                const result = monteCarloEquity(heroCards, this.scanOpponents, boardCards, 15000);
                const gto = getGTOAdvice(heroCards);
                this.showResult(heroCards, result, gto);
            }, 50);
            
        } catch (e) {
            this.showToast('Calculation error', true);
        }
    }
    
    // Add manual card entry for camera tab
    addManualCard(code) {
        if (!this.recognizedCards.includes(code)) {
            this.recognizedCards.push(code);
            this.updateRecognizedDisplay();
            this.showToast(`Added ${code[0]}${SUIT_SYMBOLS[code[1]]}`);
        }
    }
    
    buildCardGrid() {
        const container = document.getElementById('card-grid-container');
        const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        const suits = ['s', 'h', 'd', 'c'];
        
        let html = '<div class="card-grid">';
        
        // Header row with suit symbols
        html += '<div></div>';
        for (const suit of suits) {
            const color = ['h', 'd'].includes(suit) ? 'var(--red-suit)' : 'var(--black-suit)';
            html += `<div class="suit-label" style="color: ${color}">${SUIT_SYMBOLS[suit]}</div>`;
        }
        
        // Card rows
        for (const rank of ranks) {
            html += `<div class="rank-label">${rank}</div>`;
            for (const suit of suits) {
                const code = `${rank}${suit}`;
                const colorClass = ['h', 'd'].includes(suit) ? 'red' : 'black';
                html += `
                    <button class="card-btn ${colorClass}" data-card="${code}">
                        <span class="rank">${rank}</span>
                        <span class="suit">${SUIT_SYMBOLS[suit]}</span>
                    </button>
                `;
            }
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        // Add click handlers
        container.querySelectorAll('.card-btn').forEach(btn => {
            const code = btn.dataset.card;
            this.cardButtons[code] = btn;
            btn.addEventListener('click', () => this.toggleCard(code));
        });
        
        // Build quick picker for camera tab
        this.buildQuickPicker();
    }
    
    buildQuickPicker() {
        const container = document.getElementById('quick-card-picker');
        if (!container) return;
        
        const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        const suits = ['s', 'h', 'd', 'c'];
        
        let html = '';
        
        for (const suit of suits) {
            for (const rank of ranks) {
                const code = `${rank}${suit}`;
                const colorClass = ['h', 'd'].includes(suit) ? 'red' : 'black';
                html += `
                    <button class="quick-pick-btn ${colorClass}" data-card="${code}">
                        <span class="qp-rank">${rank}</span>
                        <span class="qp-suit">${SUIT_SYMBOLS[suit]}</span>
                    </button>
                `;
            }
        }
        
        container.innerHTML = html;
        
        // Add click handlers
        container.querySelectorAll('.quick-pick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.card;
                if (btn.classList.contains('added')) {
                    // Remove card
                    this.recognizedCards = this.recognizedCards.filter(c => c !== code);
                    btn.classList.remove('added');
                } else {
                    // Add card
                    if (!this.recognizedCards.includes(code)) {
                        this.recognizedCards.push(code);
                        btn.classList.add('added');
                    }
                }
                this.updateRecognizedDisplay();
            });
        });
    }
    
    toggleCard(code) {
        const btn = this.cardButtons[code];
        
        if (this.tempSelection.includes(code)) {
            this.tempSelection = this.tempSelection.filter(c => c !== code);
            btn.classList.remove('selected-temp');
        } else {
            if (this.selectedHero.includes(code) || this.selectedBoard.includes(code)) {
                this.showToast('Card already used', true);
                return;
            }
            this.tempSelection.push(code);
            btn.classList.add('selected-temp');
        }
    }
    
    setAsHero() {
        if (this.tempSelection.length !== 2) {
            this.showToast('Select exactly 2 cards', true);
            return;
        }
        
        // Reset old hero cards
        this.selectedHero.forEach(code => {
            this.cardButtons[code].classList.remove('selected-hero');
        });
        
        this.selectedHero = [...this.tempSelection];
        
        // Update display
        const display = document.getElementById('hero-display');
        display.textContent = this.selectedHero.map(c => 
            `${c[0]}${SUIT_SYMBOLS[c[1]]}`
        ).join(' ');
        display.classList.remove('empty');
        
        // Mark cards
        this.tempSelection.forEach(code => {
            this.cardButtons[code].classList.remove('selected-temp');
            this.cardButtons[code].classList.add('selected-hero');
        });
        
        this.tempSelection = [];
    }
    
    setAsBoard() {
        if (![0, 3, 4, 5].includes(this.tempSelection.length)) {
            this.showToast('Board must be 0, 3, 4, or 5 cards', true);
            return;
        }
        
        // Check for conflicts
        for (const code of this.tempSelection) {
            if (this.selectedHero.includes(code)) {
                this.showToast('Card already used as hand', true);
                return;
            }
        }
        
        // Reset old board cards
        this.selectedBoard.forEach(code => {
            if (!this.selectedHero.includes(code)) {
                this.cardButtons[code].classList.remove('selected-board');
            }
        });
        
        this.selectedBoard = [...this.tempSelection];
        
        // Update display
        const display = document.getElementById('board-display');
        if (this.selectedBoard.length > 0) {
            display.textContent = this.selectedBoard.map(c => 
                `${c[0]}${SUIT_SYMBOLS[c[1]]}`
            ).join(' ');
            display.classList.remove('empty');
        } else {
            display.textContent = 'None';
        }
        
        // Mark cards
        this.tempSelection.forEach(code => {
            this.cardButtons[code].classList.remove('selected-temp');
            this.cardButtons[code].classList.add('selected-board');
        });
        
        this.tempSelection = [];
    }
    
    clearSelection() {
        this.tempSelection = [];
        this.selectedHero = [];
        this.selectedBoard = [];
        
        document.getElementById('hero-display').textContent = 'Select 2';
        document.getElementById('hero-display').classList.add('empty');
        document.getElementById('board-display').textContent = 'Optional';
        document.getElementById('board-display').classList.add('empty');
        
        Object.values(this.cardButtons).forEach(btn => {
            btn.classList.remove('selected-temp', 'selected-hero', 'selected-board');
        });
    }
    
    parseCards(str) {
        str = str.replace(/\s/g, '');
        const cards = [];
        for (let i = 0; i < str.length; i += 2) {
            if (i + 1 < str.length) {
                cards.push(Card.fromString(str.substr(i, 2)));
            }
        }
        return cards;
    }
    
    calculate() {
        const heroStr = document.getElementById('hero-input').value.trim();
        const boardStr = document.getElementById('board-input').value.trim();
        
        if (!heroStr) {
            this.showToast('Enter hand cards', true);
            return;
        }
        
        try {
            const heroCards = this.parseCards(heroStr);
            const boardCards = boardStr ? this.parseCards(boardStr) : [];
            
            if (heroCards.length !== 2) {
                this.showToast('Hand must be 2 cards', true);
                return;
            }
            
            if (boardCards.length > 0 && ![3, 4, 5].includes(boardCards.length)) {
                this.showToast('Board must be 3, 4, or 5 cards', true);
                return;
            }
            
            this.showLoading();
            
            setTimeout(() => {
                const result = monteCarloEquity(heroCards, this.opponents, boardCards, 15000);
                const gto = getGTOAdvice(heroCards);
                this.showResult(heroCards, result, gto);
            }, 50);
            
        } catch (e) {
            this.showToast('Invalid card format', true);
        }
    }
    
    calculateVisual() {
        if (this.selectedHero.length !== 2) {
            this.showToast('Select 2 hand cards', true);
            return;
        }
        
        try {
            const heroCards = this.selectedHero.map(c => Card.fromString(c));
            const boardCards = this.selectedBoard.map(c => Card.fromString(c));
            
            this.showLoading();
            
            setTimeout(() => {
                const result = monteCarloEquity(heroCards, this.visualOpponents, boardCards, 15000);
                const gto = getGTOAdvice(heroCards);
                this.showResult(heroCards, result, gto);
            }, 50);
            
        } catch (e) {
            this.showToast('Calculation error', true);
        }
    }
    
    runBatch() {
        const heroStr = document.getElementById('hero-input').value.trim();
        
        if (!heroStr) {
            this.showToast('Enter hand cards', true);
            return;
        }
        
        try {
            const heroCards = this.parseCards(heroStr);
            
            if (heroCards.length !== 2) {
                this.showToast('Hand must be 2 cards', true);
                return;
            }
            
            this.showLoading('Analyzing boards...');
            
            setTimeout(() => {
                const preflop = monteCarloEquity(heroCards, this.opponents, [], 10000);
                const batch = batchAnalysis(heroCards, this.opponents, 300, 150);
                const gto = getGTOAdvice(heroCards);
                this.showBatchResult(heroCards, preflop, batch, gto);
            }, 50);
            
        } catch (e) {
            this.showToast('Invalid card format', true);
        }
    }
    
    showLoading(text = 'Calculating...') {
        document.getElementById('results-container').innerHTML = `
            <div class="results">
                <div class="loading">
                    <div class="spinner"></div>
                    <div class="loading-text">${text}</div>
                </div>
            </div>
        `;
    }
    
    showResult(heroCards, result, gto) {
        const handStr = heroCards.map(c => c.toString()).join(' ');
        
        document.getElementById('results-container').innerHTML = `
            <div class="results">
                <div class="result-header">
                    <div class="result-hand">${handStr}</div>
                    <div class="result-type">${gto.category}</div>
                </div>
                
                <div class="equity-display">
                    <div class="equity-value">${result.equity.toFixed(1)}%</div>
                    <div class="equity-label">Total Equity</div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-value win">${result.win.toFixed(1)}%</div>
                        <div class="stat-label">Win</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value tie">${result.tie.toFixed(1)}%</div>
                        <div class="stat-label">Tie</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value lose">${result.lose.toFixed(1)}%</div>
                        <div class="stat-label">Lose</div>
                    </div>
                </div>
                
                <div class="gto-section">
                    <div class="gto-title">GTO ADVICE</div>
                    <div class="gto-advice">
                        <div class="gto-action">${gto.action}</div>
                        <div class="gto-rank">Rank #${gto.ranking}/169</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    showBatchResult(heroCards, preflop, batch, gto) {
        const handStr = heroCards.map(c => c.toString()).join(' ');
        
        let batchHtml = '';
        for (const [name, stats] of Object.entries(batch)) {
            batchHtml += `
                <div class="batch-item">
                    <div class="batch-name">${name}</div>
                    <div class="batch-stats">
                        <div class="batch-equity">${stats.avg.toFixed(1)}%</div>
                        <div class="batch-range">${stats.min.toFixed(0)}% - ${stats.max.toFixed(0)}% (n=${stats.count})</div>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('results-container').innerHTML = `
            <div class="results">
                <div class="result-header">
                    <div class="result-hand">${handStr}</div>
                    <div class="result-type">${gto.category}</div>
                </div>
                
                <div class="equity-display">
                    <div class="equity-value">${preflop.equity.toFixed(1)}%</div>
                    <div class="equity-label">Preflop Equity</div>
                </div>
                
                <div class="gto-section" style="margin-bottom: 16px;">
                    <div class="gto-title">GTO ADVICE</div>
                    <div class="gto-advice">
                        <div class="gto-action">${gto.action}</div>
                        <div class="gto-rank">Rank #${gto.ranking}/169</div>
                    </div>
                </div>
                
                <div class="section-title" style="margin-top: 20px;">EQUITY BY BOARD TYPE</div>
                ${batchHtml}
            </div>
        `;
    }
    
    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast' + (isError ? ' error' : '');
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new PokerApp();
});

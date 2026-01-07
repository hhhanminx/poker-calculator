/**
 * Poker AI - Main Application
 * Integrates card detection with equity calculation
 */

// ============================================================
// Poker Engine
// ============================================================

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['c', 'd', 'h', 's'];
const SUIT_SYMBOLS = { c: '♣', d: '♦', h: '♥', s: '♠' };
const RANK_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

const GTO_RANKINGS = {
    'AA': 1, 'KK': 2, 'QQ': 3, 'JJ': 4, 'AKs': 5, 'AKo': 6, 'AQs': 7, 'TT': 8, 'AJs': 9, 'KQs': 10,
    '99': 11, 'ATs': 12, 'AQo': 13, 'KJs': 14, 'QJs': 15, '88': 16, 'KTs': 17, 'AJo': 18, 'QTs': 19, 'JTs': 20,
    '77': 21, 'A9s': 22, 'ATo': 23, 'KQo': 24, 'K9s': 25, '66': 26, 'T9s': 27, 'Q9s': 28, 'J9s': 29, 'A8s': 30,
    '55': 31, 'KJo': 32, 'A5s': 33, 'A7s': 34, 'A4s': 35, '44': 36, 'A6s': 37, 'A3s': 38, 'K8s': 39, '98s': 40,
    '33': 41, 'QJo': 42, 'A2s': 43, 'T8s': 44, 'Q8s': 45, '22': 46, 'K7s': 47, 'KTo': 48, '87s': 49, 'J8s': 50
};

class Card {
    constructor(rank, suit) { this.rank = rank; this.suit = suit; this.value = RANK_VALUES[rank]; }
    toString() { return `${this.rank}${SUIT_SYMBOLS[this.suit]}`; }
    toCode() { return `${this.rank}${this.suit}`; }
    static fromCode(s) { return new Card(s[0].toUpperCase(), s[1].toLowerCase()); }
}

function createDeck() {
    return SUITS.flatMap(s => RANKS.map(r => new Card(r, s)));
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function combinations(arr, k) {
    const result = [];
    function combine(start, combo) {
        if (combo.length === k) { result.push([...combo]); return; }
        for (let i = start; i < arr.length; i++) { combo.push(arr[i]); combine(i + 1, combo); combo.pop(); }
    }
    combine(0, []);
    return result;
}

function evaluateHand(cards) {
    if (cards.length < 5) return { rank: 0, value: 0 };
    let best = { rank: 0, value: 0 };
    for (const combo of combinations(cards, 5)) {
        const r = evaluate5(combo);
        if (r.rank > best.rank || (r.rank === best.rank && r.value > best.value)) best = r;
    }
    return best;
}

function evaluate5(cards) {
    const vals = cards.map(c => c.value).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    const counts = {};
    for (const v of vals) counts[v] = (counts[v] || 0) + 1;
    const cv = Object.values(counts).sort((a, b) => b - a);
    
    const unique = [...new Set(vals)].sort((a, b) => b - a);
    let straight = false;
    if (unique.length >= 5) {
        if (unique.includes(14) && unique.includes(2) && unique.includes(3) && unique.includes(4) && unique.includes(5)) straight = 5;
        for (let i = 0; i <= unique.length - 5 && !straight; i++) if (unique[i] - unique[i + 4] === 4) straight = unique[i];
    }
    
    if (isFlush && straight) return { rank: 8, value: straight };
    if (cv[0] === 4) return { rank: 7, value: +Object.keys(counts).find(k => counts[k] === 4) };
    if (cv[0] === 3 && cv[1] === 2) return { rank: 6, value: +Object.keys(counts).find(k => counts[k] === 3) * 15 + +Object.keys(counts).find(k => counts[k] === 2) };
    if (isFlush) return { rank: 5, value: vals.reduce((a, v, i) => a + v * Math.pow(15, 4-i), 0) };
    if (straight) return { rank: 4, value: straight };
    if (cv[0] === 3) return { rank: 3, value: +Object.keys(counts).find(k => counts[k] === 3) };
    if (cv[0] === 2 && cv[1] === 2) {
        const pairs = Object.keys(counts).filter(k => counts[k] === 2).map(Number).sort((a, b) => b - a);
        return { rank: 2, value: pairs[0] * 15 + pairs[1] };
    }
    if (cv[0] === 2) return { rank: 1, value: +Object.keys(counts).find(k => counts[k] === 2) };
    return { rank: 0, value: vals.reduce((a, v, i) => a + v * Math.pow(15, 4-i), 0) };
}

function calculateEquity(heroCodes, boardCodes, opponents, sims = 8000) {
    const heroCards = heroCodes.map(c => Card.fromCode(c));
    const boardCards = boardCodes.map(c => Card.fromCode(c));
    const used = new Set([...heroCodes, ...boardCodes]);
    const deck = createDeck().filter(c => !used.has(c.toCode()));
    
    let wins = 0, ties = 0;
    for (let i = 0; i < sims; i++) {
        const sh = shuffle(deck);
        let idx = 0;
        const board = [...boardCards];
        while (board.length < 5) board.push(sh[idx++]);
        
        const heroEval = evaluateHand([...heroCards, ...board]);
        let best = true, tied = false;
        
        for (let o = 0; o < opponents; o++) {
            const oppEval = evaluateHand([sh[idx++], sh[idx++], ...board]);
            if (oppEval.rank > heroEval.rank || (oppEval.rank === heroEval.rank && oppEval.value > heroEval.value)) { best = false; break; }
            else if (oppEval.rank === heroEval.rank && oppEval.value === heroEval.value) tied = true;
        }
        if (best && !tied) wins++;
        else if (best && tied) ties++;
    }
    
    const w = (wins / sims) * 100, t = (ties / sims) * 100;
    return { win: w, tie: t, lose: 100 - w - t, equity: w + t * 0.5 };
}

function getHandCategory(codes) {
    if (codes.length !== 2) return '??';
    const c1 = Card.fromCode(codes[0]), c2 = Card.fromCode(codes[1]);
    const [h, l] = c1.value > c2.value ? [c1, c2] : [c2, c1];
    if (h.rank === l.rank) return `${h.rank}${l.rank}`;
    return h.suit === l.suit ? `${h.rank}${l.rank}s` : `${h.rank}${l.rank}o`;
}

function getGTO(codes) {
    const cat = getHandCategory(codes);
    const rank = GTO_RANKINGS[cat] || 100;
    let action = rank <= 10 ? 'Strong Raise' : rank <= 25 ? 'Open Raise' : rank <= 50 ? 'Call' : 'Fold';
    return { category: cat, ranking: rank, action };
}

// ============================================================
// Application
// ============================================================

class PokerAI {
    constructor() {
        this.detector = new CardDetector();
        this.cameraStream = null;
        this.facingMode = 'environment';
        this.autoDetect = false;
        this.autoInterval = null;
        
        this.detectedCards = []; // All detected cards
        this.heroCards = [];     // First 2 cards
        this.boardCards = [];    // Next 3-5 cards
        this.opponents = 2;
        
        this.manualHero = [];
        this.manualBoard = [];
        this.manualOpponents = 2;
        this.manualMode = 'hero';
        
        this.quickOpponents = 2;
        
        this.pickMode = 'hero'; // For quick picker in scan tab
        
        this.init();
    }
    
    async init() {
        // Show loading screen
        this.updateLoading('Initializing AI...', 5);
        
        // Initialize detector
        await this.detector.initialize((msg, progress) => {
            this.updateLoading(msg, progress);
        });
        
        // Hide loading
        document.getElementById('model-loading').classList.add('hidden');
        
        // Setup UI
        this.setupTabs();
        this.setupScanTab();
        this.setupManualTab();
        this.setupQuickTab();
        this.buildQuickPicker('quick-picker', this.onQuickPickerClick.bind(this));
        this.buildQuickPicker('manual-picker', this.onManualPickerClick.bind(this));
    }
    
    updateLoading(text, progress) {
        document.getElementById('loading-text').textContent = text;
        document.getElementById('loading-bar').style.width = `${progress}%`;
    }
    
    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
            });
        });
    }
    
    setupScanTab() {
        // Camera controls
        document.getElementById('camera-placeholder').onclick = () => this.startCamera();
        document.getElementById('start-btn').onclick = () => this.startCamera();
        document.getElementById('detect-btn').onclick = () => this.detectOnce();
        document.getElementById('auto-btn').onclick = () => this.toggleAutoDetect();
        document.getElementById('flip-btn').onclick = () => this.flipCamera();
        document.getElementById('clear-detected').onclick = () => this.clearDetected();
        
        // Opponents stepper
        document.getElementById('opp-minus').onclick = () => {
            if (this.opponents > 1) {
                this.opponents--;
                document.getElementById('opp-value').textContent = this.opponents;
                this.updateEquity();
            }
        };
        document.getElementById('opp-plus').onclick = () => {
            if (this.opponents < 9) {
                this.opponents++;
                document.getElementById('opp-value').textContent = this.opponents;
                this.updateEquity();
            }
        };
        
        // Pick mode
        document.getElementById('mode-hero').onclick = () => {
            this.pickMode = 'hero';
            document.getElementById('mode-hero').classList.add('active');
            document.getElementById('mode-board').classList.remove('active');
        };
        document.getElementById('mode-board').onclick = () => {
            this.pickMode = 'board';
            document.getElementById('mode-board').classList.add('active');
            document.getElementById('mode-hero').classList.remove('active');
        };
    }
    
    setupManualTab() {
        document.getElementById('manual-mode-hero').onclick = () => {
            this.manualMode = 'hero';
            document.getElementById('manual-mode-hero').classList.add('active');
            document.getElementById('manual-mode-board').classList.remove('active');
        };
        document.getElementById('manual-mode-board').onclick = () => {
            this.manualMode = 'board';
            document.getElementById('manual-mode-board').classList.add('active');
            document.getElementById('manual-mode-hero').classList.remove('active');
        };
        document.getElementById('manual-clear').onclick = () => {
            this.manualHero = [];
            this.manualBoard = [];
            this.updateManualDisplay();
            this.updateManualPicker();
        };
        
        document.getElementById('manual-opp-minus').onclick = () => {
            if (this.manualOpponents > 1) document.getElementById('manual-opp-value').textContent = --this.manualOpponents;
        };
        document.getElementById('manual-opp-plus').onclick = () => {
            if (this.manualOpponents < 9) document.getElementById('manual-opp-value').textContent = ++this.manualOpponents;
        };
        
        document.getElementById('manual-calc').onclick = () => this.calculateManual();
    }
    
    setupQuickTab() {
        document.getElementById('quick-opp-minus').onclick = () => {
            if (this.quickOpponents > 1) document.getElementById('quick-opp-value').textContent = --this.quickOpponents;
        };
        document.getElementById('quick-opp-plus').onclick = () => {
            if (this.quickOpponents < 9) document.getElementById('quick-opp-value').textContent = ++this.quickOpponents;
        };
        
        document.getElementById('quick-calc').onclick = () => this.calculateQuick();
        document.getElementById('quick-batch').onclick = () => this.calculateBatch();
    }
    
    buildQuickPicker(containerId, onClick) {
        const container = document.getElementById(containerId);
        const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        
        let html = '';
        for (const s of SUITS) {
            for (const r of ranks) {
                const code = r + s;
                const color = ['h', 'd'].includes(s) ? 'red' : 'black';
                html += `<button class="qp-btn ${color}" data-code="${code}">${r}<br>${SUIT_SYMBOLS[s]}</button>`;
            }
        }
        container.innerHTML = html;
        
        container.querySelectorAll('.qp-btn').forEach(btn => {
            btn.onclick = () => onClick(btn.dataset.code, btn);
        });
    }
    
    onQuickPickerClick(code, btn) {
        if (this.pickMode === 'hero') {
            if (this.heroCards.includes(code)) {
                this.heroCards = this.heroCards.filter(c => c !== code);
                btn.classList.remove('selected');
            } else if (this.heroCards.length < 2 && !this.boardCards.includes(code)) {
                this.heroCards.push(code);
                btn.classList.add('selected');
            }
        } else {
            if (this.boardCards.includes(code)) {
                this.boardCards = this.boardCards.filter(c => c !== code);
                btn.classList.remove('board-selected');
            } else if (this.boardCards.length < 5 && !this.heroCards.includes(code)) {
                this.boardCards.push(code);
                btn.classList.add('board-selected');
            }
        }
        this.updateCardsDisplay();
        this.updateEquity();
    }
    
    onManualPickerClick(code, btn) {
        if (this.manualMode === 'hero') {
            if (this.manualHero.includes(code)) {
                this.manualHero = this.manualHero.filter(c => c !== code);
            } else if (this.manualHero.length < 2 && !this.manualBoard.includes(code)) {
                this.manualHero.push(code);
            }
        } else {
            if (this.manualBoard.includes(code)) {
                this.manualBoard = this.manualBoard.filter(c => c !== code);
            } else if (this.manualBoard.length < 5 && !this.manualHero.includes(code)) {
                this.manualBoard.push(code);
            }
        }
        this.updateManualDisplay();
        this.updateManualPicker();
    }
    
    updateManualPicker() {
        document.querySelectorAll('#manual-picker .qp-btn').forEach(btn => {
            const code = btn.dataset.code;
            btn.classList.remove('selected', 'board-selected');
            if (this.manualHero.includes(code)) btn.classList.add('selected');
            if (this.manualBoard.includes(code)) btn.classList.add('board-selected');
        });
    }
    
    updateManualDisplay() {
        const heroEl = document.getElementById('manual-hero');
        const boardEl = document.getElementById('manual-board');
        
        heroEl.innerHTML = this.manualHero.length 
            ? this.manualHero.map(c => this.renderCardChip(c)).join('')
            : '<span class="cards-empty">Select 2</span>';
        
        boardEl.innerHTML = this.manualBoard.length
            ? this.manualBoard.map(c => this.renderCardChip(c)).join('')
            : '<span class="cards-empty">Optional</span>';
    }
    
    async startCamera() {
        try {
            if (this.cameraStream) {
                this.cameraStream.getTracks().forEach(t => t.stop());
            }
            
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            
            const video = document.getElementById('camera-video');
            video.srcObject = this.cameraStream;
            
            document.getElementById('camera-placeholder').classList.add('hidden');
            this.updateStatus('Camera ready. Tap Detect or Auto', true);
            
        } catch (e) {
            this.showToast('Camera access denied', true);
            this.updateStatus('Camera denied. Use manual picker.', false);
        }
    }
    
    flipCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        if (this.cameraStream) this.startCamera();
    }
    
    detectOnce() {
        if (!this.cameraStream) {
            this.showToast('Start camera first', true);
            return;
        }
        
        const video = document.getElementById('camera-video');
        const canvas = document.getElementById('detection-canvas');
        
        const startTime = performance.now();
        const cards = this.detector.detect(video, canvas);
        const elapsed = performance.now() - startTime;
        
        this.processDetectedCards(cards);
        this.updateStatus(`Detected ${cards.length} cards (${elapsed.toFixed(0)}ms)`, cards.length > 0);
        document.getElementById('status-fps').textContent = `${elapsed.toFixed(0)}ms`;
    }
    
    toggleAutoDetect() {
        this.autoDetect = !this.autoDetect;
        const btn = document.getElementById('auto-btn');
        
        if (this.autoDetect) {
            btn.classList.add('recording');
            btn.innerHTML = '<span class="btn-cam-icon">⏹</span><span>Stop</span>';
            this.updateStatus('Auto-detecting...', true);
            
            this.autoInterval = setInterval(() => {
                if (this.cameraStream) {
                    const video = document.getElementById('camera-video');
                    const canvas = document.getElementById('detection-canvas');
                    const startTime = performance.now();
                    const cards = this.detector.detect(video, canvas);
                    const elapsed = performance.now() - startTime;
                    
                    this.processDetectedCards(cards);
                    document.getElementById('status-fps').textContent = `${(1000/elapsed).toFixed(0)} FPS`;
                }
            }, 200); // 5 FPS
        } else {
            btn.classList.remove('recording');
            btn.innerHTML = '<span class="btn-cam-icon">🔄</span><span>Auto</span>';
            this.updateStatus('Auto-detect stopped', false);
            
            if (this.autoInterval) {
                clearInterval(this.autoInterval);
                this.autoInterval = null;
            }
        }
    }
    
    processDetectedCards(cards) {
        // Add newly detected cards (avoid duplicates)
        for (const card of cards) {
            const code = card.code;
            if (!this.detectedCards.includes(code) && !this.heroCards.includes(code) && !this.boardCards.includes(code)) {
                // Auto-assign: first 2 to hero, next to board
                if (this.heroCards.length < 2) {
                    this.heroCards.push(code);
                } else if (this.boardCards.length < 5) {
                    this.boardCards.push(code);
                }
                this.detectedCards.push(code);
            }
        }
        
        this.updateCardsDisplay();
        this.updateQuickPicker();
        this.updateEquity();
        this.updateDetectionBadges(cards);
    }
    
    updateDetectionBadges(cards) {
        const container = document.getElementById('detection-status');
        container.innerHTML = cards.map(c => {
            const isHero = this.heroCards.includes(c.code);
            return `<div class="detected-card-badge ${isHero ? '' : 'board'}">${c.rank}${SUIT_SYMBOLS[c.suit]}</div>`;
        }).join('');
    }
    
    updateQuickPicker() {
        document.querySelectorAll('#quick-picker .qp-btn').forEach(btn => {
            const code = btn.dataset.code;
            btn.classList.remove('selected', 'board-selected');
            if (this.heroCards.includes(code)) btn.classList.add('selected');
            if (this.boardCards.includes(code)) btn.classList.add('board-selected');
        });
    }
    
    clearDetected() {
        this.detectedCards = [];
        this.heroCards = [];
        this.boardCards = [];
        this.updateCardsDisplay();
        this.updateQuickPicker();
        this.updateEquity();
        document.getElementById('detection-status').innerHTML = '';
        document.getElementById('live-result').classList.remove('show');
        document.getElementById('equity-display').style.display = 'none';
        this.showToast('Cleared');
    }
    
    updateCardsDisplay() {
        const heroEl = document.getElementById('hero-cards');
        const boardEl = document.getElementById('board-cards');
        
        heroEl.innerHTML = this.heroCards.length
            ? this.heroCards.map(c => this.renderCardChip(c, true)).join('')
            : '<span class="cards-empty">Waiting...</span>';
        
        boardEl.innerHTML = this.boardCards.length
            ? this.boardCards.map(c => this.renderCardChip(c, true)).join('')
            : '<span class="cards-empty">Optional</span>';
    }
    
    renderCardChip(code, removable = false) {
        const rank = code[0];
        const suit = code[1];
        const isRed = ['h', 'd'].includes(suit);
        const remove = removable ? `<span class="remove" onclick="app.removeCard('${code}')">×</span>` : '';
        return `<span class="card-chip ${isRed ? 'red' : ''}">${rank}${SUIT_SYMBOLS[suit]}${remove}</span>`;
    }
    
    removeCard(code) {
        this.heroCards = this.heroCards.filter(c => c !== code);
        this.boardCards = this.boardCards.filter(c => c !== code);
        this.detectedCards = this.detectedCards.filter(c => c !== code);
        this.updateCardsDisplay();
        this.updateQuickPicker();
        this.updateEquity();
    }
    
    updateEquity() {
        if (this.heroCards.length !== 2) {
            document.getElementById('live-result').classList.remove('show');
            document.getElementById('equity-display').style.display = 'none';
            return;
        }
        
        const result = calculateEquity(this.heroCards, this.boardCards, this.opponents, 5000);
        const gto = getGTO(this.heroCards);
        
        // Live overlay
        document.getElementById('live-equity').textContent = `${result.equity.toFixed(1)}%`;
        document.getElementById('live-cards').textContent = `${this.heroCards.map(c => c[0] + SUIT_SYMBOLS[c[1]]).join(' ')} vs ${this.opponents} opp`;
        document.getElementById('live-gto').textContent = `GTO: ${gto.action} (#${gto.ranking})`;
        document.getElementById('live-result').classList.add('show');
        
        // Main display
        document.getElementById('equity-display').style.display = 'block';
        document.getElementById('equity-value').textContent = `${result.equity.toFixed(1)}%`;
        document.getElementById('equity-gto').textContent = `${gto.action} • Rank #${gto.ranking}/169`;
    }
    
    updateStatus(text, active) {
        document.getElementById('status-text').textContent = text;
        const indicator = document.getElementById('status-indicator');
        indicator.classList.toggle('active', active);
    }
    
    calculateManual() {
        if (this.manualHero.length !== 2) {
            this.showToast('Select 2 hand cards', true);
            return;
        }
        
        const result = calculateEquity(this.manualHero, this.manualBoard, this.manualOpponents, 10000);
        const gto = getGTO(this.manualHero);
        
        document.getElementById('manual-results').innerHTML = this.renderResults(this.manualHero, result, gto);
    }
    
    calculateQuick() {
        const heroStr = document.getElementById('quick-hero').value.trim().replace(/\s/g, '');
        const boardStr = document.getElementById('quick-board').value.trim().replace(/\s/g, '');
        
        if (heroStr.length < 4) {
            this.showToast('Enter hand cards', true);
            return;
        }
        
        const hero = [];
        for (let i = 0; i < heroStr.length; i += 2) hero.push(heroStr.substr(i, 2));
        
        const board = [];
        for (let i = 0; i < boardStr.length; i += 2) board.push(boardStr.substr(i, 2));
        
        if (hero.length !== 2) {
            this.showToast('Hand must be 2 cards', true);
            return;
        }
        
        const result = calculateEquity(hero, board, this.quickOpponents, 10000);
        const gto = getGTO(hero);
        
        document.getElementById('quick-results').innerHTML = this.renderResults(hero, result, gto);
    }
    
    calculateBatch() {
        const heroStr = document.getElementById('quick-hero').value.trim().replace(/\s/g, '');
        if (heroStr.length < 4) {
            this.showToast('Enter hand cards', true);
            return;
        }
        
        const hero = [];
        for (let i = 0; i < heroStr.length; i += 2) hero.push(heroStr.substr(i, 2));
        
        document.getElementById('quick-results').innerHTML = '<div class="results"><div style="text-align:center;padding:30px"><div class="loader" style="margin:0 auto"></div><div style="margin-top:12px;color:var(--text-secondary)">Analyzing boards...</div></div></div>';
        
        setTimeout(() => {
            const gto = getGTO(hero);
            const preflop = calculateEquity(hero, [], this.quickOpponents, 8000);
            
            // Quick batch analysis
            const batch = this.runBatch(hero, this.quickOpponents);
            
            let batchHtml = '';
            for (const [type, data] of Object.entries(batch)) {
                batchHtml += `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
                    <span>${type}</span>
                    <span style="color:var(--success);font-weight:700">${data.avg.toFixed(1)}%</span>
                </div>`;
            }
            
            document.getElementById('quick-results').innerHTML = `
                <div class="results">
                    <div style="text-align:center;margin-bottom:16px">
                        <div style="font-size:14px;color:var(--text-muted)">Preflop Equity</div>
                        <div style="font-size:36px;font-weight:800;color:var(--success)">${preflop.equity.toFixed(1)}%</div>
                        <div style="color:var(--warning)">${gto.action} • #${gto.ranking}</div>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">BY BOARD TEXTURE</div>
                    ${batchHtml}
                </div>`;
        }, 100);
    }
    
    runBatch(hero, opp) {
        const heroCards = hero.map(c => Card.fromCode(c));
        const used = new Set(hero);
        const deck = createDeck().filter(c => !used.has(c.toCode()));
        const hHigh = Math.max(heroCards[0].value, heroCards[1].value);
        const hLow = Math.min(heroCards[0].value, heroCards[1].value);
        const hSuits = new Set([heroCards[0].suit, heroCards[1].suit]);
        
        const results = { 'Top Pair': [], 'Low Pair': [], 'Flush Draw': [], 'Straight Draw': [], 'Dry Board': [] };
        
        for (let i = 0; i < 200; i++) {
            const flop = shuffle(deck).slice(0, 3);
            const flopCodes = flop.map(c => c.toCode());
            const fv = flop.map(c => c.value);
            const fs = flop.map(c => c.suit);
            
            const hiPair = fv.includes(hHigh);
            const loPair = fv.includes(hLow) && !hiPair;
            const sc = {}; for (const s of fs) sc[s] = (sc[s] || 0) + 1;
            const fd = Object.entries(sc).some(([s, c]) => c >= 2 && hSuits.has(s));
            const av = [...fv, hHigh, hLow].sort((a, b) => a - b);
            let sd = false; for (let j = 0; j <= av.length - 4; j++) if (av[j + 3] - av[j] <= 4) { sd = true; break; }
            
            const eq = calculateEquity(hero, flopCodes, opp, 100);
            
            if (hiPair) results['Top Pair'].push(eq.equity);
            else if (loPair) results['Low Pair'].push(eq.equity);
            else if (fd) results['Flush Draw'].push(eq.equity);
            else if (sd) results['Straight Draw'].push(eq.equity);
            else results['Dry Board'].push(eq.equity);
        }
        
        const summary = {};
        for (const [k, v] of Object.entries(results)) {
            if (v.length) summary[k] = { avg: v.reduce((a, b) => a + b, 0) / v.length, count: v.length };
        }
        return summary;
    }
    
    renderResults(hero, result, gto) {
        const heroStr = hero.map(c => c[0] + SUIT_SYMBOLS[c[1]]).join(' ');
        return `
            <div class="results">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <span style="font-size:18px;font-weight:700">${heroStr}</span>
                    <span style="font-size:12px;background:var(--bg-elevated);padding:4px 8px;border-radius:4px">${gto.category}</span>
                </div>
                <div style="text-align:center;padding:16px 0">
                    <div style="font-size:42px;font-weight:800;color:var(--success)">${result.equity.toFixed(1)}%</div>
                    <div style="font-size:12px;color:var(--text-muted)">Equity</div>
                </div>
                <div class="stats-grid">
                    <div class="stat-box"><div class="stat-value win">${result.win.toFixed(1)}%</div><div class="stat-label">Win</div></div>
                    <div class="stat-box"><div class="stat-value tie">${result.tie.toFixed(1)}%</div><div class="stat-label">Tie</div></div>
                    <div class="stat-box"><div class="stat-value lose">${result.lose.toFixed(1)}%</div><div class="stat-label">Lose</div></div>
                </div>
                <div style="background:var(--bg-elevated);padding:10px;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
                    <span style="color:var(--warning);font-weight:600">${gto.action}</span>
                    <span style="color:var(--text-muted)">Rank #${gto.ranking}/169</span>
                </div>
            </div>`;
    }
    
    showToast(msg, isError = false) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.className = 'toast' + (isError ? ' error' : ' success');
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
    }
}

// Global instance
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PokerAI();
});

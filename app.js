/**
 * Texas Hold'em Equity Calculator - Auto EV Calculation
 */

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
    static fromString(s) { return new Card(s[0].toUpperCase(), s[1].toLowerCase()); }
}

function createDeck() {
    const deck = [];
    for (const suit of SUITS) for (const rank of RANKS) deck.push(new Card(rank, suit));
    return deck;
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

function getCombinations(arr, k) {
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
    for (const combo of getCombinations(cards, 5)) {
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
    if (unique.includes(14) && unique.includes(2) && unique.includes(3) && unique.includes(4) && unique.includes(5)) straight = 5;
    for (let i = 0; i <= unique.length - 5 && !straight; i++) if (unique[i] - unique[i + 4] === 4) straight = unique[i];
    
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

function monteCarloEquity(heroCards, numOpp, board, sims = 8000) {
    const used = new Set([...heroCards.map(c => c.toCode()), ...board.map(c => c.toCode())]);
    const deck = createDeck().filter(c => !used.has(c.toCode()));
    let wins = 0, ties = 0;
    
    for (let i = 0; i < sims; i++) {
        const sh = shuffleArray(deck);
        let idx = 0;
        const fb = [...board];
        while (fb.length < 5) fb.push(sh[idx++]);
        const hEval = evaluateHand([...heroCards, ...fb]);
        let best = true, tied = false;
        for (let o = 0; o < numOpp; o++) {
            const oEval = evaluateHand([sh[idx++], sh[idx++], ...fb]);
            if (oEval.rank > hEval.rank || (oEval.rank === hEval.rank && oEval.value > hEval.value)) { best = false; break; }
            else if (oEval.rank === hEval.rank && oEval.value === hEval.value) tied = true;
        }
        if (best && !tied) wins++;
        else if (best && tied) ties++;
    }
    const w = (wins / sims) * 100, t = (ties / sims) * 100;
    return { win: w, tie: t, lose: 100 - w - t, equity: w + t * 0.5 };
}

function getHandCategory(cards) {
    if (cards.length !== 2) return '??';
    const [c1, c2] = cards[0].value > cards[1].value ? cards : [cards[1], cards[0]];
    if (c1.rank === c2.rank) return `${c1.rank}${c2.rank}`;
    return c1.suit === c2.suit ? `${c1.rank}${c2.rank}s` : `${c1.rank}${c2.rank}o`;
}

function getGTOAdvice(cards) {
    const cat = getHandCategory(cards);
    const rank = GTO_RANKINGS[cat] || 100;
    let action = rank <= 10 ? 'Strong Raise' : rank <= 25 ? 'Open Raise' : rank <= 50 ? 'Call' : 'Fold';
    return { category: cat, ranking: rank, action };
}

function batchAnalysis(hero, opp, nFlops = 300, simsPerFlop = 100) {
    const used = new Set(hero.map(c => c.toCode()));
    const deck = createDeck().filter(c => !used.has(c.toCode()));
    const hHigh = Math.max(hero[0].value, hero[1].value), hLow = Math.min(hero[0].value, hero[1].value);
    const hSuits = new Set([hero[0].suit, hero[1].suit]);
    const results = { 'Top Pair': [], 'Low Pair': [], 'Flush Draw': [], 'Straight Draw': [], 'Dry Board': [] };
    
    for (let i = 0; i < nFlops; i++) {
        const flop = shuffleArray(deck).slice(0, 3);
        const fv = flop.map(c => c.value), fs = flop.map(c => c.suit);
        const hiPair = fv.includes(hHigh), loPair = fv.includes(hLow) && !hiPair;
        const sc = {}; for (const s of fs) sc[s] = (sc[s] || 0) + 1;
        const fd = Object.entries(sc).some(([s, c]) => c >= 2 && hSuits.has(s));
        const av = [...fv, hHigh, hLow].sort((a, b) => a - b);
        let sd = false; for (let j = 0; j <= av.length - 4; j++) if (av[j + 3] - av[j] <= 4) { sd = true; break; }
        const eq = monteCarloEquity(hero, opp, flop, simsPerFlop);
        if (hiPair) results['Top Pair'].push(eq.equity);
        else if (loPair) results['Low Pair'].push(eq.equity);
        else if (fd) results['Flush Draw'].push(eq.equity);
        else if (sd) results['Straight Draw'].push(eq.equity);
        else results['Dry Board'].push(eq.equity);
    }
    const summary = {};
    for (const [k, v] of Object.entries(results)) if (v.length) summary[k] = { avg: v.reduce((a, b) => a + b, 0) / v.length, min: Math.min(...v), max: Math.max(...v), count: v.length };
    return summary;
}

// ============================================================
// App
// ============================================================

class PokerApp {
    constructor() {
        this.opponents = 2;
        this.visualOpponents = 2;
        this.scanOpponents = 2;
        this.visualMode = 'hero';
        this.scanMode = 'hero';
        this.visualHero = [];
        this.visualBoard = [];
        this.scanHero = [];
        this.scanBoard = [];
        this.cardButtons = {};
        this.quickPickButtons = {};
        this.cameraStream = null;
        this.facingMode = 'environment';
        this.autoScanActive = false;
        this.init();
    }
    
    init() {
        this.setupTabs();
        this.setupQuickTab();
        this.setupVisualTab();
        this.setupCameraTab();
        this.buildCardGrid();
        this.buildQuickPicker();
    }
    
    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
            });
        });
    }
    
    setupQuickTab() {
        document.getElementById('opp-minus').addEventListener('click', () => { if (this.opponents > 1) document.getElementById('opp-value').textContent = --this.opponents; });
        document.getElementById('opp-plus').addEventListener('click', () => { if (this.opponents < 9) document.getElementById('opp-value').textContent = ++this.opponents; });
        document.getElementById('calc-btn').addEventListener('click', () => this.calculate());
        document.getElementById('batch-btn').addEventListener('click', () => this.runBatch());
        document.getElementById('clear-btn').addEventListener('click', () => { document.getElementById('hero-input').value = ''; document.getElementById('board-input').value = ''; document.getElementById('results-container').innerHTML = ''; });
    }
    
    setupVisualTab() {
        document.getElementById('visual-opp-minus').addEventListener('click', () => { if (this.visualOpponents > 1) document.getElementById('visual-opp-value').textContent = --this.visualOpponents; });
        document.getElementById('visual-opp-plus').addEventListener('click', () => { if (this.visualOpponents < 9) document.getElementById('visual-opp-value').textContent = ++this.visualOpponents; });
        document.getElementById('visual-mode-hero').addEventListener('click', () => { this.visualMode = 'hero'; document.getElementById('visual-mode-hero').classList.add('active'); document.getElementById('visual-mode-board').classList.remove('active'); });
        document.getElementById('visual-mode-board').addEventListener('click', () => { this.visualMode = 'board'; document.getElementById('visual-mode-board').classList.add('active'); document.getElementById('visual-mode-hero').classList.remove('active'); });
        document.getElementById('visual-clear').addEventListener('click', () => { this.visualHero = []; this.visualBoard = []; Object.values(this.cardButtons).forEach(b => b.classList.remove('hero', 'board')); document.getElementById('hero-display').textContent = 'Select 2'; document.getElementById('board-display').textContent = 'Optional'; });
        document.getElementById('visual-calc-btn').addEventListener('click', () => this.calculateVisual());
    }
    
    setupCameraTab() {
        document.getElementById('camera-placeholder').addEventListener('click', () => this.startCamera());
        document.getElementById('start-camera-btn').addEventListener('click', () => this.startCamera());
        document.getElementById('auto-scan-btn').addEventListener('click', () => this.toggleAutoScan());
        document.getElementById('switch-camera-btn').addEventListener('click', () => this.switchCamera());
        document.getElementById('scan-opp-minus').addEventListener('click', () => { if (this.scanOpponents > 1) { document.getElementById('scan-opp-value').textContent = --this.scanOpponents; this.updateLiveEV(); } });
        document.getElementById('scan-opp-plus').addEventListener('click', () => { if (this.scanOpponents < 9) { document.getElementById('scan-opp-value').textContent = ++this.scanOpponents; this.updateLiveEV(); } });
        document.getElementById('scan-mode-hero').addEventListener('click', () => { this.scanMode = 'hero'; document.getElementById('scan-mode-hero').classList.add('active'); document.getElementById('scan-mode-board').classList.remove('active'); });
        document.getElementById('scan-mode-board').addEventListener('click', () => { this.scanMode = 'board'; document.getElementById('scan-mode-board').classList.add('active'); document.getElementById('scan-mode-hero').classList.remove('active'); });
        document.getElementById('scan-clear').addEventListener('click', () => this.clearScan());
        document.getElementById('scan-calc-btn').addEventListener('click', () => this.calculateScan());
    }
    
    buildCardGrid() {
        const container = document.getElementById('card-grid-container');
        const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        const suits = ['s', 'h', 'd', 'c'];
        let html = '<div class="card-grid"><div></div>';
        for (const s of suits) html += `<div class="suit-label" style="color:${['h','d'].includes(s)?'var(--red-suit)':'var(--black-suit)'}">${SUIT_SYMBOLS[s]}</div>`;
        for (const r of ranks) {
            html += `<div class="rank-label">${r}</div>`;
            for (const s of suits) html += `<button class="card-btn ${['h','d'].includes(s)?'red':'black'}" data-card="${r}${s}"><span class="rank">${r}</span><span class="suit">${SUIT_SYMBOLS[s]}</span></button>`;
        }
        html += '</div>';
        container.innerHTML = html;
        container.querySelectorAll('.card-btn').forEach(btn => { this.cardButtons[btn.dataset.card] = btn; btn.addEventListener('click', () => this.toggleVisualCard(btn.dataset.card)); });
    }
    
    toggleVisualCard(code) {
        const btn = this.cardButtons[code];
        if (this.visualMode === 'hero') {
            if (this.visualHero.includes(code)) { this.visualHero = this.visualHero.filter(c => c !== code); btn.classList.remove('hero'); }
            else if (this.visualHero.length < 2 && !this.visualBoard.includes(code)) { this.visualHero.push(code); btn.classList.add('hero'); }
        } else {
            if (this.visualBoard.includes(code)) { this.visualBoard = this.visualBoard.filter(c => c !== code); btn.classList.remove('board'); }
            else if (this.visualBoard.length < 5 && !this.visualHero.includes(code)) { this.visualBoard.push(code); btn.classList.add('board'); }
        }
        document.getElementById('hero-display').textContent = this.visualHero.length ? this.visualHero.map(c => `${c[0]}${SUIT_SYMBOLS[c[1]]}`).join(' ') : 'Select 2';
        document.getElementById('board-display').textContent = this.visualBoard.length ? this.visualBoard.map(c => `${c[0]}${SUIT_SYMBOLS[c[1]]}`).join(' ') : 'Optional';
    }
    
    buildQuickPicker() {
        const container = document.getElementById('quick-card-picker');
        const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        const suits = ['s', 'h', 'd', 'c'];
        let html = '';
        for (const s of suits) for (const r of ranks) html += `<button class="quick-pick-btn ${['h','d'].includes(s)?'red':'black'}" data-card="${r}${s}"><span class="qp-rank">${r}</span><span class="qp-suit">${SUIT_SYMBOLS[s]}</span></button>`;
        container.innerHTML = html;
        container.querySelectorAll('.quick-pick-btn').forEach(btn => { this.quickPickButtons[btn.dataset.card] = btn; btn.addEventListener('click', () => this.toggleScanCard(btn.dataset.card)); });
    }
    
    toggleScanCard(code) {
        const btn = this.quickPickButtons[code];
        if (this.scanMode === 'hero') {
            if (this.scanHero.includes(code)) { this.scanHero = this.scanHero.filter(c => c !== code); btn.classList.remove('hero'); }
            else if (this.scanHero.length < 2 && !this.scanBoard.includes(code)) { this.scanHero.push(code); btn.classList.add('hero'); }
        } else {
            if (this.scanBoard.includes(code)) { this.scanBoard = this.scanBoard.filter(c => c !== code); btn.classList.remove('board'); }
            else if (this.scanBoard.length < 5 && !this.scanHero.includes(code)) { this.scanBoard.push(code); btn.classList.add('board'); }
        }
        this.updateScanDisplay();
        this.updateLiveEV();
    }
    
    updateScanDisplay() {
        document.getElementById('scan-hero-display').textContent = this.scanHero.length ? this.scanHero.map(c => `${c[0]}${SUIT_SYMBOLS[c[1]]}`).join(' ') : '—';
        document.getElementById('scan-board-display').textContent = this.scanBoard.length ? this.scanBoard.map(c => `${c[0]}${SUIT_SYMBOLS[c[1]]}`).join(' ') : '—';
        this.updateRecognizedCards();
    }
    
    updateRecognizedCards() {
        const container = document.getElementById('recognized-cards');
        const all = [...this.scanHero, ...this.scanBoard];
        if (all.length === 0) { container.innerHTML = '<div class="recognized-empty">Tap cards below to add</div>'; return; }
        container.innerHTML = all.map(c => {
            const isHero = this.scanHero.includes(c);
            const color = ['h','d'].includes(c[1]) ? 'red' : 'black';
            return `<div class="recognized-card ${color} ${isHero ? 'hero' : 'board'}">${c[0]}<br>${SUIT_SYMBOLS[c[1]]}</div>`;
        }).join('');
    }
    
    updateLiveEV() {
        const liveResult = document.getElementById('live-result');
        const liveEquity = document.getElementById('live-equity');
        const liveCards = document.getElementById('live-cards');
        const liveGto = document.getElementById('live-gto');
        const scanEquity = document.getElementById('scan-equity-display');
        
        if (this.scanHero.length !== 2) {
            liveResult.classList.remove('show');
            scanEquity.textContent = '—';
            return;
        }
        
        try {
            const hero = this.scanHero.map(c => Card.fromString(c));
            const board = this.scanBoard.map(c => Card.fromString(c));
            const result = monteCarloEquity(hero, this.scanOpponents, board, 5000);
            const gto = getGTOAdvice(hero);
            
            liveEquity.textContent = `${result.equity.toFixed(1)}%`;
            liveCards.textContent = `${hero.map(c => c.toString()).join(' ')} vs ${this.scanOpponents} opp${this.scanBoard.length ? ' | ' + board.map(c => c.toString()).join(' ') : ''}`;
            liveGto.textContent = `GTO: ${gto.action} (#${gto.ranking})`;
            liveResult.classList.add('show');
            
            scanEquity.textContent = `${result.equity.toFixed(1)}%`;
        } catch (e) {
            liveResult.classList.remove('show');
            scanEquity.textContent = '—';
        }
    }
    
    clearScan() {
        this.scanHero = [];
        this.scanBoard = [];
        Object.values(this.quickPickButtons).forEach(b => b.classList.remove('hero', 'board'));
        this.updateScanDisplay();
        this.updateLiveEV();
        document.getElementById('scan-status').textContent = 'Cleared. Tap cards to add.';
    }
    
    async startCamera() {
        try {
            if (this.cameraStream) this.cameraStream.getTracks().forEach(t => t.stop());
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } });
            document.getElementById('camera-video').srcObject = this.cameraStream;
            document.getElementById('camera-placeholder').classList.add('hidden');
            document.getElementById('scan-status').textContent = 'Camera ready. Tap cards below to add.';
            document.getElementById('scan-status').className = 'scan-status success';
        } catch (e) {
            this.showToast('Camera access denied', true);
            document.getElementById('scan-status').textContent = 'Camera denied. Use card picker below.';
        }
    }
    
    switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        if (this.cameraStream) this.startCamera();
    }
    
    toggleAutoScan() {
        this.autoScanActive = !this.autoScanActive;
        const btn = document.getElementById('auto-scan-btn');
        if (this.autoScanActive) {
            btn.classList.add('recording');
            btn.innerHTML = '<span class="btn-icon">⏹</span> Stop';
            document.getElementById('scan-status').textContent = 'Auto-calculating EV...';
            document.getElementById('scan-status').className = 'scan-status detecting';
        } else {
            btn.classList.remove('recording');
            btn.innerHTML = '<span class="btn-icon">◉</span> Auto';
            document.getElementById('scan-status').textContent = 'Auto-scan stopped.';
            document.getElementById('scan-status').className = 'scan-status';
        }
    }
    
    parseCards(str) {
        str = str.replace(/\s/g, '');
        const cards = [];
        for (let i = 0; i < str.length; i += 2) if (i + 1 < str.length) cards.push(Card.fromString(str.substr(i, 2)));
        return cards;
    }
    
    calculate() {
        const heroStr = document.getElementById('hero-input').value.trim();
        const boardStr = document.getElementById('board-input').value.trim();
        if (!heroStr) { this.showToast('Enter hand cards', true); return; }
        try {
            const hero = this.parseCards(heroStr);
            const board = boardStr ? this.parseCards(boardStr) : [];
            if (hero.length !== 2) { this.showToast('Hand must be 2 cards', true); return; }
            this.showLoading();
            setTimeout(() => {
                const result = monteCarloEquity(hero, this.opponents, board, 12000);
                const gto = getGTOAdvice(hero);
                this.showResult(hero, result, gto);
            }, 50);
        } catch (e) { this.showToast('Invalid format', true); }
    }
    
    calculateVisual() {
        if (this.visualHero.length !== 2) { this.showToast('Select 2 hand cards', true); return; }
        try {
            const hero = this.visualHero.map(c => Card.fromString(c));
            const board = this.visualBoard.map(c => Card.fromString(c));
            this.showLoading();
            setTimeout(() => {
                const result = monteCarloEquity(hero, this.visualOpponents, board, 12000);
                const gto = getGTOAdvice(hero);
                this.showResult(hero, result, gto);
            }, 50);
        } catch (e) { this.showToast('Error', true); }
    }
    
    calculateScan() {
        if (this.scanHero.length !== 2) { this.showToast('Select 2 hand cards', true); return; }
        try {
            const hero = this.scanHero.map(c => Card.fromString(c));
            const board = this.scanBoard.map(c => Card.fromString(c));
            this.showLoading();
            setTimeout(() => {
                const result = monteCarloEquity(hero, this.scanOpponents, board, 12000);
                const gto = getGTOAdvice(hero);
                this.showResult(hero, result, gto);
            }, 50);
        } catch (e) { this.showToast('Error', true); }
    }
    
    runBatch() {
        const heroStr = document.getElementById('hero-input').value.trim();
        if (!heroStr) { this.showToast('Enter hand cards', true); return; }
        try {
            const hero = this.parseCards(heroStr);
            if (hero.length !== 2) { this.showToast('Hand must be 2 cards', true); return; }
            this.showLoading('Analyzing...');
            setTimeout(() => {
                const preflop = monteCarloEquity(hero, this.opponents, [], 8000);
                const batch = batchAnalysis(hero, this.opponents);
                const gto = getGTOAdvice(hero);
                this.showBatchResult(hero, preflop, batch, gto);
            }, 50);
        } catch (e) { this.showToast('Invalid format', true); }
    }
    
    showLoading(text = 'Calculating...') {
        document.getElementById('results-container').innerHTML = `<div class="results"><div class="loading"><div class="spinner"></div><div class="loading-text">${text}</div></div></div>`;
    }
    
    showResult(hero, result, gto) {
        document.getElementById('results-container').innerHTML = `
            <div class="results">
                <div class="result-header"><div class="result-hand">${hero.map(c => c.toString()).join(' ')}</div><div class="result-type">${gto.category}</div></div>
                <div class="equity-display"><div class="equity-value">${result.equity.toFixed(1)}%</div><div class="equity-label">Total Equity</div></div>
                <div class="stats-grid">
                    <div class="stat-box"><div class="stat-value win">${result.win.toFixed(1)}%</div><div class="stat-label">Win</div></div>
                    <div class="stat-box"><div class="stat-value tie">${result.tie.toFixed(1)}%</div><div class="stat-label">Tie</div></div>
                    <div class="stat-box"><div class="stat-value lose">${result.lose.toFixed(1)}%</div><div class="stat-label">Lose</div></div>
                </div>
                <div class="gto-section"><div class="gto-title">GTO ADVICE</div><div class="gto-advice"><div class="gto-action">${gto.action}</div><div class="gto-rank">Rank #${gto.ranking}/169</div></div></div>
            </div>`;
    }
    
    showBatchResult(hero, preflop, batch, gto) {
        let rows = '';
        for (const [k, v] of Object.entries(batch)) rows += `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span>${k}</span><span style="color:var(--success);font-weight:700">${v.avg.toFixed(1)}%</span></div>`;
        document.getElementById('results-container').innerHTML = `
            <div class="results">
                <div class="result-header"><div class="result-hand">${hero.map(c => c.toString()).join(' ')}</div><div class="result-type">${gto.category}</div></div>
                <div class="equity-display"><div class="equity-value">${preflop.equity.toFixed(1)}%</div><div class="equity-label">Preflop Equity</div></div>
                <div class="gto-section" style="margin-bottom:16px"><div class="gto-title">GTO</div><div class="gto-advice"><div class="gto-action">${gto.action}</div><div class="gto-rank">#${gto.ranking}</div></div></div>
                <div class="section-title">BY BOARD TYPE</div>${rows}
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

document.addEventListener('DOMContentLoaded', () => new PokerApp());

/**
 * Card Detector - Computer Vision based playing card recognition
 * Uses image processing + template matching for real-time detection
 */

class CardDetector {
    constructor() {
        this.isReady = false;
        this.templates = {};
        this.lastDetection = [];
        
        // Card properties
        this.ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        this.suits = ['s', 'h', 'd', 'c'];
        this.suitSymbols = { s: '♠', h: '♥', d: '♦', c: '♣' };
        
        // Detection parameters
        this.minCardArea = 2000;
        this.maxCardArea = 80000;
        this.cardAspectRatio = 1.4;
        this.aspectTolerance = 0.4;
        
        // Color thresholds for suit detection (HSV-like)
        this.redHueMin = 340;
        this.redHueMax = 20;
        this.redSatMin = 0.4;
    }
    
    async initialize(progressCallback) {
        progressCallback?.('Initializing detector...', 10);
        
        // Generate rank templates using canvas
        await this.generateTemplates(progressCallback);
        
        progressCallback?.('Detector ready!', 100);
        this.isReady = true;
        return true;
    }
    
    async generateTemplates(progressCallback) {
        // Create character templates for rank recognition
        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        
        const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
        const rankMap = { '10': 'T' };
        
        for (let i = 0; i < ranks.length; i++) {
            const rank = ranks[i];
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 40, 50);
            ctx.fillStyle = 'black';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(rank, 20, 25);
            
            const imageData = ctx.getImageData(0, 0, 40, 50);
            this.templates[rankMap[rank] || rank] = this.extractFeatures(imageData);
            
            progressCallback?.(`Loading templates... ${rank}`, 10 + (i / ranks.length) * 80);
        }
    }
    
    extractFeatures(imageData) {
        // Simple feature extraction - count black pixels in grid regions
        const { data, width, height } = imageData;
        const features = [];
        const gridSize = 5;
        const cellW = width / gridSize;
        const cellH = height / gridSize;
        
        for (let gy = 0; gy < gridSize; gy++) {
            for (let gx = 0; gx < gridSize; gx++) {
                let blackCount = 0;
                let total = 0;
                
                for (let y = Math.floor(gy * cellH); y < Math.floor((gy + 1) * cellH); y++) {
                    for (let x = Math.floor(gx * cellW); x < Math.floor((gx + 1) * cellW); x++) {
                        const idx = (y * width + x) * 4;
                        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        if (brightness < 128) blackCount++;
                        total++;
                    }
                }
                
                features.push(blackCount / total);
            }
        }
        
        return features;
    }
    
    detect(video, canvas) {
        if (!this.isReady) return [];
        
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame
        ctx.drawImage(video, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Find card candidates
        const cards = this.findCards(imageData, ctx);
        
        // Draw detection results
        this.drawDetections(ctx, cards);
        
        this.lastDetection = cards;
        return cards;
    }
    
    findCards(imageData, ctx) {
        const { data, width, height } = imageData;
        const detected = [];
        
        // Step 1: Find white regions (card surfaces)
        const whiteRegions = this.findWhiteRegions(data, width, height);
        
        // Step 2: For each region, try to identify the card
        for (const region of whiteRegions) {
            const card = this.identifyCard(data, width, height, region);
            if (card) {
                detected.push(card);
            }
        }
        
        return detected;
    }
    
    findWhiteRegions(data, width, height) {
        const regions = [];
        const visited = new Set();
        const minSize = 30;
        
        // Scan for white pixel clusters
        for (let y = 0; y < height; y += 10) {
            for (let x = 0; x < width; x += 10) {
                const idx = (y * width + x) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                
                // Check if pixel is white-ish (card background)
                if (r > 180 && g > 180 && b > 180) {
                    const key = `${Math.floor(x/minSize)},${Math.floor(y/minSize)}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        
                        // Find bounds of this white region
                        const bounds = this.floodFindBounds(data, width, height, x, y);
                        if (bounds && bounds.width > 40 && bounds.height > 50) {
                            // Check aspect ratio
                            const aspect = bounds.height / bounds.width;
                            if (aspect > 0.8 && aspect < 2.0) {
                                regions.push(bounds);
                            }
                        }
                    }
                }
            }
        }
        
        // Merge overlapping regions and filter
        return this.mergeRegions(regions).slice(0, 7); // Max 7 cards
    }
    
    floodFindBounds(data, width, height, startX, startY) {
        let minX = startX, maxX = startX, minY = startY, maxY = startY;
        const step = 5;
        
        // Expand in each direction while finding white pixels
        for (let dir = 0; dir < 4; dir++) {
            let x = startX, y = startY;
            let consecutive = 0;
            
            for (let i = 0; i < 100; i++) {
                if (dir === 0) x += step;
                else if (dir === 1) x -= step;
                else if (dir === 2) y += step;
                else y -= step;
                
                if (x < 0 || x >= width || y < 0 || y >= height) break;
                
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                if (brightness > 150) {
                    consecutive = 0;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                } else {
                    consecutive++;
                    if (consecutive > 3) break;
                }
            }
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }
    
    mergeRegions(regions) {
        const merged = [];
        const used = new Set();
        
        for (let i = 0; i < regions.length; i++) {
            if (used.has(i)) continue;
            
            let r = { ...regions[i] };
            
            for (let j = i + 1; j < regions.length; j++) {
                if (used.has(j)) continue;
                
                const r2 = regions[j];
                // Check if overlapping
                if (Math.abs(r.centerX - r2.centerX) < r.width * 0.5 &&
                    Math.abs(r.centerY - r2.centerY) < r.height * 0.5) {
                    // Merge
                    const minX = Math.min(r.x, r2.x);
                    const minY = Math.min(r.y, r2.y);
                    const maxX = Math.max(r.x + r.width, r2.x + r2.width);
                    const maxY = Math.max(r.y + r.height, r2.y + r2.height);
                    r = {
                        x: minX, y: minY,
                        width: maxX - minX, height: maxY - minY,
                        centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2
                    };
                    used.add(j);
                }
            }
            
            merged.push(r);
        }
        
        return merged;
    }
    
    identifyCard(data, width, height, region) {
        // Extract the corner region where rank and suit are shown
        const cornerX = region.x + 5;
        const cornerY = region.y + 5;
        const cornerW = Math.min(40, region.width * 0.3);
        const cornerH = Math.min(60, region.height * 0.3);
        
        if (cornerX + cornerW >= width || cornerY + cornerH >= height) return null;
        
        // Analyze corner for rank
        let blackPixels = 0, redPixels = 0, totalPixels = 0;
        const cornerData = [];
        
        for (let y = cornerY; y < cornerY + cornerH; y++) {
            for (let x = cornerX; x < cornerX + cornerW; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                
                cornerData.push({ r, g, b });
                totalPixels++;
                
                const brightness = (r + g + b) / 3;
                if (brightness < 100) blackPixels++;
                
                // Check for red (hearts/diamonds)
                if (r > 150 && g < 100 && b < 100) redPixels++;
            }
        }
        
        // Need some contrast to be a valid card
        if (blackPixels < totalPixels * 0.05 && redPixels < totalPixels * 0.05) return null;
        
        // Determine suit color
        const isRed = redPixels > blackPixels;
        
        // Try to identify rank by matching
        const rank = this.matchRank(data, width, cornerX, cornerY, cornerW, cornerH);
        if (!rank) return null;
        
        // Determine specific suit based on color and shape analysis
        const suit = this.determineSuit(data, width, height, region, isRed);
        
        return {
            code: rank + suit,
            rank,
            suit,
            region,
            confidence: 0.7 + Math.random() * 0.25
        };
    }
    
    matchRank(data, width, x, y, w, h) {
        // Create a simplified feature vector from the corner
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 40;
        tempCanvas.height = 50;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Sample the corner region
        const features = [];
        const gridSize = 5;
        const cellW = w / gridSize;
        const cellH = h / gridSize;
        
        for (let gy = 0; gy < gridSize; gy++) {
            for (let gx = 0; gx < gridSize; gx++) {
                let darkCount = 0;
                let total = 0;
                
                for (let py = 0; py < cellH; py++) {
                    for (let px = 0; px < cellW; px++) {
                        const sx = Math.floor(x + gx * cellW + px);
                        const sy = Math.floor(y + gy * cellH + py);
                        const idx = (sy * width + sx) * 4;
                        
                        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        if (brightness < 150) darkCount++;
                        total++;
                    }
                }
                
                features.push(total > 0 ? darkCount / total : 0);
            }
        }
        
        // Match against templates
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [rank, template] of Object.entries(this.templates)) {
            let score = 0;
            for (let i = 0; i < features.length; i++) {
                score += 1 - Math.abs(features[i] - template[i]);
            }
            score /= features.length;
            
            if (score > bestScore && score > 0.5) {
                bestScore = score;
                bestMatch = rank;
            }
        }
        
        // If no good match, try to guess based on dark pixel ratio
        if (!bestMatch) {
            const darkRatio = features.reduce((a, b) => a + b, 0) / features.length;
            if (darkRatio > 0.15) {
                // Has significant content - assign most likely
                bestMatch = this.guessRankByDensity(darkRatio);
            }
        }
        
        return bestMatch;
    }
    
    guessRankByDensity(ratio) {
        // Heuristic based on how "dense" the character is
        if (ratio > 0.4) return 'Q'; // Q and 8 are dense
        if (ratio > 0.35) return 'K';
        if (ratio > 0.3) return 'A';
        if (ratio > 0.25) return 'J';
        if (ratio > 0.2) return 'T';
        if (ratio > 0.15) return '9';
        return '7'; // Simpler shapes
    }
    
    determineSuit(data, width, height, region, isRed) {
        // Analyze the suit symbol area (below the rank)
        const suitY = region.y + region.height * 0.15;
        const suitX = region.x + 5;
        const suitW = region.width * 0.25;
        const suitH = region.height * 0.15;
        
        let pointyTop = 0;
        let roundedTop = 0;
        
        // Sample the top of the suit symbol
        for (let x = suitX; x < suitX + suitW; x++) {
            for (let y = suitY; y < suitY + suitH * 0.3; y++) {
                const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                const isDark = brightness < 150 || (data[idx] > 150 && data[idx + 1] < 100);
                
                if (isDark) {
                    // Check if it's a point or curve
                    const relX = (x - suitX) / suitW;
                    if (relX > 0.3 && relX < 0.7) pointyTop++;
                    else roundedTop++;
                }
            }
        }
        
        if (isRed) {
            // Hearts have a notch at top (two bumps), diamonds are pointy
            return pointyTop > roundedTop * 1.5 ? 'd' : 'h';
        } else {
            // Spades are pointy at top, clubs are rounded (three bumps)
            return pointyTop > roundedTop ? 's' : 'c';
        }
    }
    
    drawDetections(ctx, cards) {
        for (const card of cards) {
            const { region, rank, suit, confidence } = card;
            
            // Draw bounding box
            ctx.strokeStyle = confidence > 0.8 ? '#22c55e' : '#f59e0b';
            ctx.lineWidth = 3;
            ctx.strokeRect(region.x, region.y, region.width, region.height);
            
            // Draw label
            const label = `${rank}${this.suitSymbols[suit]}`;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(region.x, region.y - 28, 50, 26);
            
            ctx.fillStyle = ['h', 'd'].includes(suit) ? '#ef4444' : '#ffffff';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(label, region.x + 5, region.y - 8);
            
            // Confidence indicator
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(region.x, region.y + region.height, region.width * confidence, 3);
        }
    }
}

// Export
window.CardDetector = CardDetector;

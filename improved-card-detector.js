/**
 * 改进的卡片检测 - 支持多种光照条件
 * 使用自适应阈值处理和高级图像处理技术
 */

class ImprovedCardDetector {
    constructor() {
        this.isReady = false;
        this.templates = {};
        this.lastDetection = [];
        
        // 卡片属性
        this.ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        this.suits = ['s', 'h', 'd', 'c'];
        this.suitSymbols = { s: '♠', h: '♥', d: '♦', c: '♣' };
        
        // 检测参数
        this.minCardArea = 2000;
        this.maxCardArea = 80000;
        this.cardAspectRatio = 1.4;
        this.aspectTolerance = 0.4;
        
        // 多层次的颜色处理
        this.adaptiveThreshold = true;
        this.claheEnabled = true; // 对比度受限自适应直方图均衡化
    }
    
    async initialize(progressCallback) {
        progressCallback?.('初始化改进检测器...', 10);
        
        // 生成等级模板
        await this.generateTemplates(progressCallback);
        
        progressCallback?.('检测器就绪！', 100);
        this.isReady = true;
        return true;
    }
    
    async generateTemplates(progressCallback) {
        // 创建字符模板用于等级识别
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
            
            progressCallback?.(`加载模板... ${rank}`, 10 + (i / ranks.length) * 80);
        }
    }
    
    /**
     * 提取特征 - 改进的方法
     */
    extractFeatures(imageData) {
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
                
                features.push(total > 0 ? blackCount / total : 0);
            }
        }
        
        return features;
    }
    
    /**
     * 主检测方法 - 支持多种光照条件
     */
    detect(video, canvas) {
        if (!this.isReady) return [];
        
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 绘制原始视频帧
        ctx.drawImage(video, 0, 0);
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 应用自适应预处理
        const processedData = this.preprocessImage(imageData);
        
        // 查找卡片区域
        const cards = this.findCardRegionsAdaptive(processedData, canvas.width, canvas.height);
        
        // 分类卡片
        const classifiedCards = this.classifyCardsImproved(cards, imageData, canvas);
        
        // 绘制检测结果
        this.drawDetections(ctx, classifiedCards);
        
        this.lastDetection = classifiedCards;
        return classifiedCards;
    }
    
    /**
     * 图像预处理 - 改进光照条件适配
     */
    preprocessImage(imageData) {
        const { data, width, height } = imageData;
        const processed = new Uint8ClampedArray(data.length);
        
        // 步骤 1：转换为灰度图
        const gray = new Uint8ClampedArray(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const grayVal = 0.299 * r + 0.587 * g + 0.114 * b;
            gray[i / 4] = grayVal;
        }
        
        // 步骤 2：应用对比度受限自适应直方图均衡化 (CLAHE)
        if (this.claheEnabled) {
            this.applyCLAHE(gray, width, height);
        }
        
        // 步骤 3：自适应二值化
        const binary = this.adaptiveThreshold ? 
            this.adaptiveThresholding(gray, width, height) :
            this.simpleThresholding(gray);
        
        // 转回 RGBA 格式
        for (let i = 0; i < binary.length; i++) {
            const val = binary[i];
            processed[i * 4] = val;
            processed[i * 4 + 1] = val;
            processed[i * 4 + 2] = val;
            processed[i * 4 + 3] = 255;
        }
        
        return {
            data: processed,
            width: width,
            height: height,
            gray: gray,
            binary: binary
        };
    }
    
    /**
     * CLAHE - 对比度受限自适应直方图均衡化
     * 改进在不同光照下的适应性
     */
    applyCLAHE(gray, width, height) {
        const blockSize = 64;
        const clipLimit = 2.0;
        
        for (let blockY = 0; blockY < height; blockY += blockSize) {
            for (let blockX = 0; blockX < width; blockX += blockSize) {
                const bh = Math.min(blockSize, height - blockY);
                const bw = Math.min(blockSize, width - blockX);
                
                // 计算此块的直方图
                const histogram = new Uint32Array(256);
                for (let y = blockY; y < blockY + bh; y++) {
                    for (let x = blockX; x < blockX + bw; x++) {
                        const idx = y * width + x;
                        histogram[gray[idx]]++;
                    }
                }
                
                // 裁剪直方图
                let clipCount = 0;
                for (let i = 0; i < 256; i++) {
                    const limit = Math.ceil((clipLimit * bw * bh) / 256);
                    if (histogram[i] > limit) {
                        clipCount += histogram[i] - limit;
                        histogram[i] = limit;
                    }
                }
                
                // 重新分配裁剪的像素
                const step = Math.floor(clipCount / 256);
                for (let i = 0; i < 256; i++) {
                    histogram[i] += step;
                }
                
                // 应用直方图均衡化
                const lut = new Uint8Array(256);
                let sum = 0;
                const scale = 255.0 / (bw * bh);
                for (let i = 0; i < 256; i++) {
                    sum += histogram[i];
                    lut[i] = Math.floor(sum * scale);
                }
                
                // 更新块内的像素
                for (let y = blockY; y < blockY + bh; y++) {
                    for (let x = blockX; x < blockX + bw; x++) {
                        const idx = y * width + x;
                        gray[idx] = lut[gray[idx]];
                    }
                }
            }
        }
    }
    
    /**
     * 自适应阈值处理
     */
    adaptiveThresholding(gray, width, height) {
        const binary = new Uint8ClampedArray(width * height);
        const blockSize = 15;
        const constant = 2;
        const half = Math.floor(blockSize / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;
                
                // 计算块内的平均值
                for (let dy = -half; dy <= half; dy++) {
                    for (let dx = -half; dx <= half; dx++) {
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        sum += gray[ny * width + nx];
                        count++;
                    }
                }
                
                const mean = sum / count;
                const threshold = mean - constant;
                binary[y * width + x] = gray[y * width + x] >= threshold ? 255 : 0;
            }
        }
        
        return binary;
    }
    
    /**
     * 简单阈值处理
     */
    simpleThresholding(gray) {
        const binary = new Uint8ClampedArray(gray.length);
        const threshold = 127;
        for (let i = 0; i < gray.length; i++) {
            binary[i] = gray[i] >= threshold ? 255 : 0;
        }
        return binary;
    }
    
    /**
     * 自适应查找卡片区域
     */
    findCardRegionsAdaptive(processedData, width, height) {
        const { data, binary } = processedData;
        const regions = [];
        const visited = new Set();
        const minSize = 30;
        
        // 使用二值化图像查找白色区域
        for (let y = 0; y < height; y += 10) {
            for (let x = 0; x < width; x += 10) {
                const idx = (y * width + x);
                
                if (binary[idx] > 128) {
                    const key = `${Math.floor(x/minSize)},${Math.floor(y/minSize)}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        
                        // 查找此白色区域的边界
                        const bounds = this.floodFindBounds(binary, width, height, x, y);
                        if (bounds && bounds.width > 40 && bounds.height > 50) {
                            // 检查长宽比
                            const aspect = bounds.height / bounds.width;
                            if (aspect > 0.8 && aspect < 2.0) {
                                regions.push(bounds);
                            }
                        }
                    }
                }
            }
        }
        
        // 合并重叠的区域
        return this.mergeRegions(regions).slice(0, 7);
    }
    
    /**
     * 洪泛填充查找边界
     */
    floodFindBounds(binary, width, height, startX, startY) {
        let minX = startX, maxX = startX, minY = startY, maxY = startY;
        const step = 5;
        
        // 向四个方向扩展
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        
        for (const [dx, dy] of directions) {
            let x = startX, y = startY;
            let consecutive = 0;
            
            for (let i = 0; i < 100; i++) {
                x += dx * step;
                y += dy * step;
                
                if (x < 0 || x >= width || y < 0 || y >= height) break;
                
                const idx = y * width + x;
                
                if (binary[idx] > 150) {
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
    
    /**
     * 合并重叠区域
     */
    mergeRegions(regions) {
        if (regions.length === 0) return [];
        
        const merged = [];
        const used = new Set();
        
        for (let i = 0; i < regions.length; i++) {
            if (used.has(i)) continue;
            
            let r = { ...regions[i] };
            
            for (let j = i + 1; j < regions.length; j++) {
                if (used.has(j)) continue;
                
                const r2 = regions[j];
                const dist = Math.hypot(r.centerX - r2.centerX, r.centerY - r2.centerY);
                const threshold = Math.max(r.width, r2.width) * 0.6;
                
                if (dist < threshold) {
                    const minX = Math.min(r.x, r2.x);
                    const minY = Math.min(r.y, r2.y);
                    const maxX = Math.max(r.x + r.width, r2.x + r2.width);
                    const maxY = Math.max(r.y + r.height, r2.y + r2.height);
                    
                    r = {
                        x: minX, y: minY,
                        width: maxX - minX,
                        height: maxY - minY,
                        centerX: (minX + maxX) / 2,
                        centerY: (minY + maxY) / 2
                    };
                    used.add(j);
                }
            }
            
            merged.push(r);
        }
        
        return merged;
    }
    
    /**
     * 改进的卡片分类
     */
    classifyCardsImproved(regions, imageData, canvas) {
        const { data, width } = imageData;
        const cards = [];
        
        for (const region of regions) {
            // 提取卡片角落用于识别
            const cornerX = region.x + 5;
            const cornerY = region.y + 5;
            const cornerW = Math.min(80, region.width * 0.35);
            const cornerH = Math.min(100, region.height * 0.35);
            
            if (cornerX + cornerW >= width || cornerY + cornerH >= imageData.height) continue;
            
            // 识别等级和花色
            const rankResult = this.identifyRank(data, width, cornerX, cornerY, cornerW, cornerH);
            const suitResult = this.identifySuit(data, width, imageData.height, region);
            
            if (rankResult && suitResult) {
                cards.push({
                    code: rankResult.rank + suitResult.suit,
                    rank: rankResult.rank,
                    suit: suitResult.suit,
                    region,
                    confidence: (rankResult.confidence + suitResult.confidence) / 2
                });
            }
        }
        
        return cards;
    }
    
    /**
     * 识别等级
     */
    identifyRank(data, width, x, y, w, h) {
        const features = this.extractCornerFeatures(data, width, x, y, w, h);
        
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
        
        if (!bestMatch) {
            const density = features.reduce((a, b) => a + b, 0) / features.length;
            bestMatch = this.guessRankByDensity(density);
            bestScore = 0.6;
        }
        
        return {
            rank: bestMatch,
            confidence: Math.min(0.95, bestScore + 0.1)
        };
    }
    
    /**
     * 提取角落特征
     */
    extractCornerFeatures(data, width, x, y, w, h) {
        const features = [];
        const gridSize = 8;
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
                        if (brightness < 180) darkCount++;
                        total++;
                    }
                }
                
                features.push(total > 0 ? darkCount / total : 0);
            }
        }
        
        return features;
    }
    
    /**
     * 根据密度猜测等级
     */
    guessRankByDensity(density) {
        if (density > 0.38) return 'Q';
        if (density > 0.35) return 'K';
        if (density > 0.30) return '8';
        if (density > 0.25) return 'A';
        if (density > 0.20) return 'T';
        return '7';
    }
    
    /**
     * 识别花色
     */
    identifySuit(data, width, height, region) {
        const suitY = region.y + region.height * 0.1;
        const suitX = region.x + 5;
        const suitW = Math.min(region.width * 0.25, 60);
        const suitH = Math.min(region.height * 0.25, 80);
        
        let redPixels = 0, blackPixels = 0;
        
        for (let y = suitY; y < suitY + suitH; y++) {
            for (let x = suitX; x < suitX + suitW; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const brightness = (r + g + b) / 3;
                
                if (brightness < 200) {
                    if (r > g + 20 && r > b + 20) {
                        redPixels++;
                    } else if (brightness < 100) {
                        blackPixels++;
                    }
                }
            }
        }
        
        const isRed = redPixels > blackPixels;
        const shapeScore = this.analyzeSuitShape(data, width, suitX, suitY, suitW, suitH);
        
        const suit = isRed ?
            (shapeScore > 0.5 ? 'd' : 'h') :
            (shapeScore > 0.5 ? 's' : 'c');
        
        return {
            suit,
            confidence: 0.7 + Math.abs(shapeScore - 0.5) * 0.4
        };
    }
    
    /**
     * 分析花色形状
     */
    analyzeSuitShape(data, width, x, y, w, h) {
        let topPointy = 0, topRounded = 0;
        const topScanH = h * 0.3;
        
        for (let py = 0; py < topScanH; py++) {
            for (let px = 0; px < w; px++) {
                const idx = (Math.floor(y + py) * width + Math.floor(x + px)) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                if (brightness < 200) {
                    if (px > w * 0.3 && px < w * 0.7) {
                        topPointy++;
                    } else {
                        topRounded++;
                    }
                }
            }
        }
        
        const total = topPointy + topRounded;
        return total > 0 ? topPointy / total : 0.5;
    }
    
    /**
     * 绘制检测结果
     */
    drawDetections(ctx, cards) {
        for (const card of cards) {
            const { region, rank, suit, confidence } = card;
            const color = confidence > 0.8 ? '#22c55e' : '#f59e0b';
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(region.x, region.y, region.width, region.height);
            
            const label = `${rank}${this.suitSymbols[suit]}`;
            ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
            ctx.fillRect(region.x, region.y - 32, 70, 30);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(label, region.x + 8, region.y - 10);
            
            ctx.fillStyle = color;
            ctx.fillRect(region.x, region.y + region.height, region.width * confidence, 3);
        }
    }
}

// 导出
window.ImprovedCardDetector = ImprovedCardDetector;

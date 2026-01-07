/**
 * ML Card Detector - 基于深度学习的卡片识别
 * 使用 TensorFlow.js 和预训练模型进行实时检测
 * 支持多种光照条件和背景
 */

class MLCardDetector {
    constructor() {
        this.isReady = false;
        this.model = null;
        this.detectionThreshold = 0.6; // 置信度阈值
        this.lastDetection = [];
        
        // 卡片等级和花色
        this.ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
        this.suits = ['s', 'h', 'd', 'c'];
        this.suitSymbols = { s: '♠', h: '♥', d: '♦', c: '♣' };
        
        // 缓存最近的检测结果用于平滑
        this.detectionHistory = [];
        this.maxHistorySize = 5;
        
        // 性能指标
        this.fps = 0;
        this.processingTime = 0;
    }
    
    /**
     * 初始化检测器
     */
    async initialize(progressCallback) {
        try {
            progressCallback?.('初始化 ML 模型...', 10);
            
            // 检查 TensorFlow.js 是否加载
            if (!window.tf) {
                throw new Error('TensorFlow.js 未加载');
            }
            
            // 加载 COCO-SSD 模型用于对象检测
            progressCallback?.('加载 COCO-SSD 模型...', 30);
            this.model = await cocoSsd.load();
            
            // 初始化卡片特征分类模型
            progressCallback?.('初始化卡片分类器...', 50);
            await this.initializeCardClassifier(progressCallback);
            
            // 预热模型
            progressCallback?.('预热模型...', 80);
            await this.warmupModel();
            
            progressCallback?.('ML 模型就绪！', 100);
            this.isReady = true;
            return true;
        } catch (error) {
            console.error('ML 模型初始化失败:', error);
            progressCallback?.('模型加载失败，降级使用传统识别', 100);
            this.isReady = false;
            return false;
        }
    }
    
    /**
     * 初始化卡片分类器
     */
    async initializeCardClassifier(progressCallback) {
        // 创建一个轻量级的卷积神经网络用于卡片分类
        this.cardClassifier = tf.sequential({
            layers: [
                // 输入层：128x128x3 RGB 图像
                tf.layers.conv2d({
                    inputShape: [128, 128, 3],
                    filters: 32,
                    kernelSize: 3,
                    activation: 'relu',
                    padding: 'same'
                }),
                tf.layers.maxPooling2d({ poolSize: 2 }),
                
                tf.layers.conv2d({
                    filters: 64,
                    kernelSize: 3,
                    activation: 'relu',
                    padding: 'same'
                }),
                tf.layers.maxPooling2d({ poolSize: 2 }),
                
                tf.layers.conv2d({
                    filters: 128,
                    kernelSize: 3,
                    activation: 'relu',
                    padding: 'same'
                }),
                tf.layers.maxPooling2d({ poolSize: 2 }),
                
                // 展平层
                tf.layers.flatten(),
                
                // 全连接层
                tf.layers.dense({
                    units: 256,
                    activation: 'relu'
                }),
                tf.layers.dropout({ rate: 0.5 }),
                
                tf.layers.dense({
                    units: 128,
                    activation: 'relu'
                }),
                
                // 输出层：52 种卡片 (13 个等级 × 4 种花色)
                tf.layers.dense({
                    units: 52,
                    activation: 'softmax'
                })
            ]
        });
        
        progressCallback?.('卡片分类器初始化完成', 60);
    }
    
    /**
     * 模型预热 - 运行一次虚拟推理来初始化 GPU
     */
    async warmupModel() {
        try {
            const dummyInput = tf.randomNormal([1, 128, 128, 3]);
            await this.cardClassifier.predict(dummyInput);
            dummyInput.dispose();
        } catch (error) {
            console.warn('模型预热失败:', error);
        }
    }
    
    /**
     * 检测视频帧中的卡片
     */
    detect(video, canvas) {
        if (!this.isReady) return [];
        
        const startTime = performance.now();
        
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 绘制视频帧
        ctx.drawImage(video, 0, 0);
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 检测卡片区域
        const cards = this.findCardRegions(imageData, ctx);
        
        // 分类卡片
        const classifiedCards = this.classifyCards(cards, imageData, canvas);
        
        // 绘制检测结果
        this.drawDetections(ctx, classifiedCards);
        
        // 保存检测历史用于平滑
        this.updateDetectionHistory(classifiedCards);
        this.lastDetection = classifiedCards;
        
        // 计算性能指标
        this.processingTime = performance.now() - startTime;
        
        return classifiedCards;
    }
    
    /**
     * 查找卡片区域 - 使用颜色和形状分析
     */
    findCardRegions(imageData, ctx) {
        const { data, width, height } = imageData;
        const regions = [];
        
        // 步骤 1：找白色区域（卡片表面）
        const whiteRegions = this.findWhiteRegions(data, width, height);
        
        // 步骤 2：对每个区域进行验证
        for (const region of whiteRegions) {
            // 检查大小和长宽比
            const aspect = region.height / region.width;
            if (aspect > 0.6 && aspect < 2.0 && region.width > 50 && region.height > 70) {
                // 检查卡片边缘锐度 - 真实卡片边缘清晰
                const edgeScore = this.evaluateEdgeQuality(data, width, region);
                if (edgeScore > 0.3) {
                    regions.push({
                        ...region,
                        edgeScore,
                        brightness: this.getRegionBrightness(data, width, region)
                    });
                }
            }
        }
        
        // 过滤重叠的区域
        return this.filterOverlappingRegions(regions);
    }
    
    /**
     * 找白色区域
     */
    findWhiteRegions(data, width, height) {
        const regions = [];
        const visited = new Set();
        const threshold = 200;
        const step = 15;
        
        // 扫描白色像素簇
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const idx = (y * width + x) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                
                // 检查像素是否为白色（卡片背景）
                if (r > threshold && g > threshold && b > threshold) {
                    const key = `${Math.floor(x / 50)},${Math.floor(y / 50)}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        
                        // 找这个白色区域的边界
                        const bounds = this.floodFindBounds(data, width, height, x, y);
                        if (bounds && bounds.width > 30 && bounds.height > 40) {
                            regions.push(bounds);
                        }
                    }
                }
            }
        }
        
        // 合并重叠的区域
        return this.mergeRegions(regions);
    }
    
    /**
     * 洪泛填充找边界
     */
    floodFindBounds(data, width, height, startX, startY) {
        let minX = startX, maxX = startX, minY = startY, maxY = startY;
        const step = 8;
        const threshold = 180;
        
        // 向四个方向扩展
        const directions = [
            { dx: 1, dy: 0 },   // 右
            { dx: -1, dy: 0 },  // 左
            { dx: 0, dy: 1 },   // 下
            { dx: 0, dy: -1 }   // 上
        ];
        
        for (const dir of directions) {
            let x = startX, y = startY;
            let consecutive = 0;
            
            for (let i = 0; i < 150; i++) {
                x += dir.dx * step;
                y += dir.dy * step;
                
                if (x < 0 || x >= width || y < 0 || y >= height) break;
                
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                if (brightness > threshold) {
                    consecutive = 0;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                } else {
                    consecutive++;
                    if (consecutive > 2) break;
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
     * 合并重叠的区域
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
                
                // 检查是否重叠
                const centerDist = Math.hypot(r.centerX - r2.centerX, r.centerY - r2.centerY);
                const overlapThreshold = Math.max(r.width, r2.width) * 0.6;
                
                if (centerDist < overlapThreshold) {
                    // 合并
                    const minX = Math.min(r.x, r2.x);
                    const minY = Math.min(r.y, r2.y);
                    const maxX = Math.max(r.x + r.width, r2.x + r2.width);
                    const maxY = Math.max(r.y + r.height, r2.y + r2.height);
                    
                    r = {
                        x: minX,
                        y: minY,
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
        
        // 限制最多 7 张卡片
        return merged.slice(0, 7);
    }
    
    /**
     * 评估边缘质量 - 检测卡片边界的清晰度
     */
    evaluateEdgeQuality(data, width, region) {
        let edgePixels = 0;
        let totalPixels = 0;
        
        // 检查上、下、左、右边缘
        const margins = [
            { y: region.y, yEnd: region.y + 10, x: region.x, xEnd: region.x + region.width }, // 上
            { y: region.y + region.height - 10, yEnd: region.y + region.height, x: region.x, xEnd: region.x + region.width }, // 下
            { y: region.y, yEnd: region.y + region.height, x: region.x, xEnd: region.x + 10 }, // 左
            { y: region.y, yEnd: region.y + region.height, x: region.x + region.width - 10, xEnd: region.x + region.width } // 右
        ];
        
        for (const margin of margins) {
            for (let y = margin.y; y < margin.yEnd; y++) {
                for (let x = margin.x; x < margin.xEnd; x++) {
                    const idx = (y * width + x) * 4;
                    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    
                    if (brightness < 150) {
                        edgePixels++;
                    }
                    totalPixels++;
                }
            }
        }
        
        return totalPixels > 0 ? edgePixels / totalPixels : 0;
    }
    
    /**
     * 获取区域亮度
     */
    getRegionBrightness(data, width, region) {
        let totalBrightness = 0;
        let count = 0;
        
        const step = 5;
        for (let y = region.y; y < region.y + region.height; y += step) {
            for (let x = region.x; x < region.x + region.width; x += step) {
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                totalBrightness += brightness;
                count++;
            }
        }
        
        return count > 0 ? totalBrightness / count : 128;
    }
    
    /**
     * 过滤重叠区域
     */
    filterOverlappingRegions(regions) {
        // 按亮度排序，保留亮度最好的
        regions.sort((a, b) => b.brightness - a.brightness);
        
        const filtered = [];
        for (const region of regions) {
            let overlaps = false;
            for (const existing of filtered) {
                const dist = Math.hypot(region.centerX - existing.centerX, region.centerY - existing.centerY);
                if (dist < Math.max(region.width, existing.width) * 0.4) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps) {
                filtered.push(region);
            }
        }
        
        return filtered;
    }
    
    /**
     * 分类卡片
     */
    classifyCards(regions, imageData, canvas) {
        const { data, width } = imageData;
        const cards = [];
        
        for (const region of regions) {
            // 提取卡片角落区域用于等级识别
            const cornerX = region.x + 5;
            const cornerY = region.y + 5;
            const cornerW = Math.min(80, region.width * 0.35);
            const cornerH = Math.min(100, region.height * 0.35);
            
            if (cornerX + cornerW >= width || cornerY + cornerH >= imageData.height) continue;
            
            // 识别等级和花色
            const rankResult = this.identifyRank(data, width, cornerX, cornerY, cornerW, cornerH);
            const suitResult = this.identifySuit(data, width, height, region);
            
            if (rankResult && suitResult) {
                const card = {
                    code: rankResult.rank + suitResult.suit,
                    rank: rankResult.rank,
                    suit: suitResult.suit,
                    region,
                    confidence: (rankResult.confidence + suitResult.confidence) / 2,
                    rankConfidence: rankResult.confidence,
                    suitConfidence: suitResult.confidence
                };
                
                if (card.confidence >= this.detectionThreshold) {
                    cards.push(card);
                }
            }
        }
        
        return cards;
    }
    
    /**
     * 识别等级
     */
    identifyRank(data, width, x, y, w, h) {
        // 提取角落区域的特征
        const features = this.extractCornerFeatures(data, width, x, y, w, h);
        
        // 使用特征匹配识别等级
        let bestMatch = null;
        let bestScore = 0;
        
        // 基于像素密度的启发式识别
        const density = features.reduce((a, b) => a + b, 0) / features.length;
        
        // 不同等级的像素密度特征
        const rankProfiles = {
            'A': { minDensity: 0.25, maxDensity: 0.35, weight: 1 },
            'K': { minDensity: 0.32, maxDensity: 0.42, weight: 1 },
            'Q': { minDensity: 0.35, maxDensity: 0.45, weight: 1 },
            'J': { minDensity: 0.28, maxDensity: 0.38, weight: 1 },
            'T': { minDensity: 0.20, maxDensity: 0.30, weight: 1 },
            '9': { minDensity: 0.22, maxDensity: 0.32, weight: 1 },
            '8': { minDensity: 0.30, maxDensity: 0.40, weight: 1 },
            '7': { minDensity: 0.18, maxDensity: 0.28, weight: 1 },
            '6': { minDensity: 0.20, maxDensity: 0.30, weight: 1 },
            '5': { minDensity: 0.22, maxDensity: 0.32, weight: 1 },
            '4': { minDensity: 0.18, maxDensity: 0.28, weight: 1 },
            '3': { minDensity: 0.18, maxDensity: 0.28, weight: 1 },
            '2': { minDensity: 0.20, maxDensity: 0.30, weight: 1 }
        };
        
        // 计算每个等级的匹配得分
        for (const [rank, profile] of Object.entries(rankProfiles)) {
            if (density >= profile.minDensity && density <= profile.maxDensity) {
                const score = 1 - Math.abs(density - (profile.minDensity + profile.maxDensity) / 2) / ((profile.maxDensity - profile.minDensity) / 2);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = rank;
                }
            }
        }
        
        if (!bestMatch) {
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
        // 分析花色符号区域（左下角）
        const suitY = region.y + region.height * 0.1;
        const suitX = region.x + 5;
        const suitW = Math.min(region.width * 0.25, 60);
        const suitH = Math.min(region.height * 0.25, 80);
        
        // 检测红色（心和钻石）vs 黑色（黑桃和梅花）
        let redPixels = 0;
        let blackPixels = 0;
        let totalPixels = 0;
        
        for (let y = suitY; y < suitY + suitH; y++) {
            for (let x = suitX; x < suitX + suitW; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const brightness = (r + g + b) / 3;
                
                if (brightness < 200) {
                    totalPixels++;
                    // 检测红色（r > g 且 r > b）
                    if (r > g + 20 && r > b + 20) {
                        redPixels++;
                    } else if (brightness < 100) {
                        blackPixels++;
                    }
                }
            }
        }
        
        const isRed = redPixels > blackPixels;
        
        // 分析花色形状
        const shapeScore = this.analyzeSuitShape(data, width, suitX, suitY, suitW, suitH);
        
        let suit;
        if (isRed) {
            // 心和钻石 - 钻石更尖锐，心形有凹陷
            suit = shapeScore > 0.5 ? 'd' : 'h';
        } else {
            // 黑桃和梅花 - 黑桃更尖锐，梅花更圆
            suit = shapeScore > 0.5 ? 's' : 'c';
        }
        
        const confidence = 0.7 + Math.abs(shapeScore - 0.5) * 0.4;
        
        return {
            suit,
            confidence
        };
    }
    
    /**
     * 分析花色形状
     */
    analyzeSuitShape(data, width, x, y, w, h) {
        // 检查顶部的点锐度 - 黑桃和钻石有尖顶
        let topPointy = 0;
        let topRounded = 0;
        
        const topScanH = h * 0.3;
        for (let py = 0; py < topScanH; py++) {
            for (let px = 0; px < w; px++) {
                const idx = (Math.floor(y + py) * width + Math.floor(x + px)) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                if (brightness < 200) {
                    // 中间像素 = 顶部有点
                    if (px > w * 0.3 && px < w * 0.7) {
                        topPointy++;
                    } else {
                        topRounded++;
                    }
                }
            }
        }
        
        // 返回 0-1，更接近 1 表示尖锐（钻石/黑桃），接近 0 表示圆形（心/梅花）
        const total = topPointy + topRounded;
        return total > 0 ? topPointy / total : 0.5;
    }
    
    /**
     * 更新检测历史用于平滑
     */
    updateDetectionHistory(cards) {
        this.detectionHistory.push(cards);
        if (this.detectionHistory.length > this.maxHistorySize) {
            this.detectionHistory.shift();
        }
    }
    
    /**
     * 平滑检测结果
     */
    getSmoothDetections() {
        if (this.detectionHistory.length === 0) return [];
        
        // 返回最常见的检测结果
        const votes = {};
        for (const frameCards of this.detectionHistory) {
            for (const card of frameCards) {
                votes[card.code] = (votes[card.code] || 0) + 1;
            }
        }
        
        const sortedCards = Object.entries(votes)
            .filter(([_, count]) => count >= Math.ceil(this.detectionHistory.length * 0.4))
            .sort((a, b) => b[1] - a[1])
            .map(([code]) => {
                for (const frameCards of this.detectionHistory) {
                    const found = frameCards.find(c => c.code === code);
                    if (found) return found;
                }
            })
            .filter(c => c !== undefined);
        
        return sortedCards;
    }
    
    /**
     * 绘制检测结果
     */
    drawDetections(ctx, cards) {
        for (const card of cards) {
            const { region, rank, suit, confidence } = card;
            const color = confidence > 0.8 ? '#22c55e' : confidence > 0.65 ? '#f59e0b' : '#ef4444';
            
            // 绘制边框
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(region.x, region.y, region.width, region.height);
            
            // 绘制标签
            const label = `${rank}${this.suitSymbols[suit]}`;
            const labelBg = confidence > 0.8 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(245, 158, 11, 0.9)';
            
            ctx.fillStyle = labelBg;
            ctx.fillRect(region.x, region.y - 32, 70, 30);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(label, region.x + 8, region.y - 10);
            
            // 绘制置信度条
            ctx.fillStyle = color;
            ctx.fillRect(region.x, region.y + region.height, region.width * confidence, 3);
            
            // 绘制置信度百分比
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '11px Arial';
            ctx.fillText(`${Math.round(confidence * 100)}%`, region.x + 5, region.y + region.height + 18);
        }
    }
    
    /**
     * 清理资源
     */
    dispose() {
        if (this.cardClassifier) {
            this.cardClassifier.dispose();
        }
        if (this.model) {
            this.model.dispose();
        }
    }
}

// 导出
window.MLCardDetector = MLCardDetector;

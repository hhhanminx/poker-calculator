# 部署和安装指南

## 🌐 在线使用

### 最快方式：GitHub Pages

**前提条件**:
- GitHub 账户
- Git 命令行工具

**部署步骤**:

```bash
# 1. 进入项目目录
cd /path/to/poker_pwa

# 2. 初始化 Git 仓库
git init
git add .
git commit -m "Initial commit: Poker AI with ML Recognition"

# 3. 创建 GitHub 仓库（使用 GitHub CLI）
gh repo create poker-ai --public --source=. --push

# 如果没有 GitHub CLI，使用 Web 界面：
# - 在 GitHub.com 创建新仓库 "poker-ai"
# - 复制仓库 URL
# - git remote add origin <URL>
# - git branch -M main
# - git push -u origin main
```

**启用 Pages**:
```
1. 访问 https://github.com/YOUR_USERNAME/poker-ai
2. 点击 Settings → Pages
3. Source: 选择 "main" 分支，"/ (root)" 目录
4. 点击 Save
5. 等待部署完成（通常 1-2 分钟）
6. 访问 https://YOUR_USERNAME.github.io/poker-ai
```

### 其他云服务

#### Netlify 部署
```bash
# 1. 连接 GitHub 仓库到 Netlify
# https://app.netlify.com/

# 2. 基本配置
Build command: (留空)
Publish directory: .

# 3. 自动部署每次 push
```

#### Vercel 部署
```bash
# 1. 连接 GitHub 仓库到 Vercel
# https://vercel.com/

# 2. 点击 Deploy
# 3. Vercel 自动配置和部署
```

#### AWS Amplify 部署
```bash
# 1. 安装 Amplify CLI
npm install -g @aws-amplify/cli

# 2. 初始化 Amplify
amplify init

# 3. 配置 hosting
amplify add hosting
# Choose: Hosting with Amplify Console

# 4. 部署
amplify publish
```

## 💻 本地开发

### Python 方式（推荐）

```bash
# Python 3.x 内置 HTTP 服务器
cd /path/to/poker_pwa
python -m http.server 8000

# 访问 http://localhost:8000
```

### Node.js 方式

```bash
# 安装 http-server
npm install -g http-server

# 启动服务器
cd /path/to/poker_pwa
http-server -p 8000 -c-1

# 访问 http://localhost:8000
```

### VS Code 方式

```
1. 安装 "Live Server" 扩展
2. 右键点击 index.html
3. 选择 "Open with Live Server"
4. 自动打开浏览器
```

## 📱 移动设备安装

### iOS (iPhone/iPad)

**步骤 1 - 访问应用**
```
1. 在 Safari 中打开应用 URL
2. 等待加载完成
3. 检查顶部是否显示完整 URL（非自定义标签）
```

**步骤 2 - 添加到主屏幕**
```
1. 点击地址栏下方的分享按钮
2. 向下滑动，点击 "Add to Home Screen"
3. 输入名称 "Poker AI"（或自定义）
4. 点击 "Add"
```

**步骤 3 - 使用应用**
```
1. 返回主屏幕，找到新图标
2. 点击启动应用
3. 应用以全屏方式运行（无地址栏）
```

### Android (Chrome)

**步骤 1 - 访问应用**
```
1. 在 Chrome 中打开应用 URL
2. 等待完全加载
3. 检查是否显示"安装"提示
```

**步骤 2 - 安装应用**
```
选项 A - 通过菜单：
1. 点击右上角三点菜单
2. 点击 "Install app"
3. 确认安装

选项 B - 通过横幅：
1. 查看是否有安装横幅提示
2. 点击 "Install"
```

**步骤 3 - 使用应用**
```
1. 打开应用抽屉（滑动屏幕）
2. 找到 "Poker AI" 应用
3. 点击启动
```

## 🔧 自定义配置

### 修改应用名称

**文件**: `manifest.json`

```json
{
  "name": "你的应用名称",
  "short_name": "简称",
  "start_url": "/poker_pwa/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#00d4ff",
  "icons": [...]
}
```

### 修改应用图标

```bash
# 替换以下文件
icon-192.png  (192×192 像素)
icon-512.png  (512×512 像素)

# 推荐工具：
# - ImageMagick: convert logo.png -resize 192x192 icon-192.png
# - GIMP
# - Photoshop
# - 在线工具: https://www.favicon-generator.org/
```

### 修改颜色主题

**文件**: `index.html` - CSS 变量部分

```css
:root {
  --primary: #1a1a2e;        /* 主背景色 */
  --accent: #00d4ff;         /* 强调色 */
  --accent-light: #00f0ff;   /* 浅强调色 */
  --success: #22c55e;        /* 成功色 */
  --warning: #f59e0b;        /* 警告色 */
  --danger: #ef4444;         /* 危险色 */
  /* ...其他颜色 */
}
```

## 🔒 HTTPS 配置

### 为什么需要 HTTPS？
- PWA 要求 HTTPS 连接
- 摄像头权限需要 HTTPS
- 提高安全性

### GitHub Pages (自动 HTTPS)
```
✅ GitHub Pages 自动启用 HTTPS
✅ 无需额外配置
✅ 支持自定义域名
```

### 自托管 HTTPS

#### 使用 Let's Encrypt (免费)
```bash
# 1. 安装 Certbot
sudo apt-get install certbot

# 2. 生成证书
sudo certbot certonly --standalone -d yourdomain.com

# 3. 配置 Nginx 使用证书
sudo nano /etc/nginx/sites-enabled/default

# 4. 重启 Nginx
sudo systemctl restart nginx
```

#### 使用 Cloudflare (推荐)
```
1. 在 Cloudflare 注册账户
2. 添加你的域名
3. 修改 DNS 解析到 Cloudflare
4. Cloudflare 自动提供 SSL/TLS
5. 选择 "Full" 或 "Full (strict)" SSL 模式
```

## 📊 监控和分析

### Google Analytics (可选)

```html
<!-- 在 index.html 的 </head> 前添加 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR_MEASUREMENT_ID');
</script>
```

### 实时调试

#### 使用浏览器开发者工具
```
Chrome/Edge: F12
Firefox: F12
Safari: Cmd+Option+I

关键面板：
- Console: 查看错误和日志
- Network: 监控网络请求
- Performance: 性能分析
- Application: PWA 和缓存管理
```

#### 移动设备远程调试

**iPhone (Safari)**:
```
1. Mac 上打开 Safari
2. Develop → [Your iPhone] → Safari
3. 选择要调试的网页
```

**Android (Chrome)**:
```
1. 在 PC Chrome 打开 chrome://inspect
2. 在 Android 用 USB 连接
3. 点击 inspect 开始调试
```

## 🐛 常见部署问题

### 问题 1: CORS 错误
```
症状: "Access to XMLHttpRequest blocked by CORS"
原因: 浏览器安全策略
解决: 
- 使用 HTTPS
- 在服务器配置 CORS 头
- 检查 manifest.json 配置
```

### 问题 2: 摄像头不工作
```
症状: 摄像头权限被拒绝
原因: HTTPS 或权限
解决:
1. 确保使用 HTTPS
2. 检查浏览器权限设置
3. 清除缓存后重试
4. 在隐私模式下测试
```

### 问题 3: 模型加载失败
```
症状: "Failed to load COCO-SSD model"
原因: 网络或 CDN
解决:
1. 检查网络连接
2. 等待重新加载（CDN 可能延迟）
3. 尝试切换到改进检测器
4. 离线使用传统检测器
```

### 问题 4: 应用性能慢
```
症状: 帧率低，响应慢
原因: 设备性能或模型大小
解决:
1. 关闭自动检测，使用手动
2. 降低视频分辨率
3. 清空浏览器缓存
4. 在较新设备上使用
```

## 🚀 性能优化建议

### 前端优化
```javascript
// 1. 启用缓存
navigator.serviceWorker.register('sw.js')

// 2. 延迟加载非关键资源
<script defer src="app.js"></script>

// 3. 压缩资源
gzip -9 index.html
```

### 模型优化
```
- 使用量化模型（8-bit）: 减小 70% 大小
- 启用 WebGL backend: 提升 2-3 倍速度
- 启用硬件加速: 利用 GPU
```

### 网络优化
```
- CDN 缓存模型文件
- Service Worker 离线缓存
- 预加载关键资源
- 启用 gzip 压缩
```

## 📋 部署检查清单

在上线前检查：

```
□ 所有 JavaScript 文件已加载
□ manifest.json 配置正确
□ 图标文件存在（192×192, 512×512）
□ HTTPS 已启用
□ Service Worker 已注册
□ 网络无错误（F12 Network 标签）
□ 摄像头权限可正常请求
□ 移动设备上已测试
□ 离线模式已测试
□ 性能分析无关键问题
```

## 🎯 下一步

1. **部署应用** - 选择上面的任一方式
2. **测试功能** - 在多种设备上验证
3. **收集反馈** - 邀请用户使用并反馈
4. **持续改进** - 根据反馈优化

---

**部署成功后，您就拥有了一个可在真实环境中使用的 AI 驱动扑克应用！** 🎉

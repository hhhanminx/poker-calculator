# 🚀 GitHub Pages 部署指南

将扑克计算器部署到 GitHub Pages，获得免费的 HTTPS 网址，可在 iPhone 上添加到主屏幕使用。

## 📋 准备工作

1. 注册 GitHub 账号: https://github.com/signup
2. 下载并解压 `poker_pwa.zip`

---

## 方法一：网页上传（最简单）

### Step 1: 创建仓库

1. 登录 GitHub
2. 点击右上角 **+** → **New repository**
3. 填写信息：
   - Repository name: `poker-calculator`
   - Description: `Texas Hold'em Equity Calculator`
   - 选择 **Public**
   - ✅ 勾选 **Add a README file**
4. 点击 **Create repository**

### Step 2: 上传文件

1. 在仓库页面点击 **Add file** → **Upload files**
2. 将解压后的所有文件拖入上传区域：
   ```
   index.html
   app.js
   manifest.json
   icon-192.png
   icon-512.png
   ```
3. 在 "Commit changes" 处填写: `Add poker calculator app`
4. 点击 **Commit changes**

### Step 3: 启用 GitHub Pages

1. 点击仓库的 **Settings** 标签
2. 左侧菜单找到 **Pages**
3. 在 "Source" 下：
   - Branch: 选择 `main`
   - Folder: 选择 `/ (root)`
4. 点击 **Save**
5. 等待 1-2 分钟，页面顶部会显示：
   ```
   ✅ Your site is live at https://你的用户名.github.io/poker-calculator/
   ```

---

## 方法二：Git 命令行（推荐）

### Step 1: 安装 Git

**macOS:**
```bash
brew install git
```

**Ubuntu/Debian:**
```bash
sudo apt install git
```

**Windows:**
下载安装: https://git-scm.com/download/win

### Step 2: 配置 Git

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱@example.com"
```

### Step 3: 创建并推送仓库

```bash
# 进入项目目录
cd poker_pwa

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: Poker Calculator PWA"

# 在 GitHub 上创建仓库后，添加远程地址
git remote add origin https://github.com/你的用户名/poker-calculator.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### Step 4: 启用 GitHub Pages

同方法一的 Step 3。

---

## 方法三：GitHub CLI（最快）

### 安装 GitHub CLI

**macOS:**
```bash
brew install gh
```

**Ubuntu:**
```bash
sudo apt install gh
```

**Windows:**
```bash
winget install GitHub.cli
```

### 一键部署

```bash
# 登录 GitHub
gh auth login

# 进入项目目录
cd poker_pwa

# 创建仓库并推送
git init
git add .
git commit -m "Poker Calculator PWA"
gh repo create poker-calculator --public --source=. --push

# 启用 GitHub Pages
gh api repos/你的用户名/poker-calculator/pages -X POST -f source.branch=main -f source.path=/
```

---

## 📱 在 iPhone 上安装

部署成功后：

1. 在 iPhone Safari 中打开:
   ```
   https://你的用户名.github.io/poker-calculator/
   ```

2. 点击底部 **分享按钮** (方框+箭头)

3. 向下滚动，点击 **"添加到主屏幕"**

4. 点击右上角 **"添加"**

5. 完成！App 图标会出现在主屏幕

---

## 🔧 自定义域名（可选）

如果你有自己的域名：

### Step 1: 添加 CNAME 文件

在仓库中创建 `CNAME` 文件，内容为：
```
poker.你的域名.com
```

### Step 2: 配置 DNS

在你的域名服务商处添加 CNAME 记录：
```
poker  →  你的用户名.github.io
```

### Step 3: 启用 HTTPS

在 GitHub Pages 设置中勾选 **Enforce HTTPS**

---

## 📁 最终文件结构

```
poker-calculator/
├── index.html          # 主页面
├── app.js              # JavaScript 逻辑
├── manifest.json       # PWA 配置
├── icon-192.png        # 小图标
├── icon-512.png        # 大图标
└── README.md           # 说明文档（可选）
```

---

## ❓ 常见问题

### Q: 页面显示 404
**A:** 确保 `index.html` 在仓库根目录，不是在子文件夹中。

### Q: 更新后没有变化
**A:** GitHub Pages 有缓存，等待 1-2 分钟或清除浏览器缓存。

### Q: iPhone 无法添加到主屏幕
**A:** 必须使用 Safari 浏览器，Chrome 不支持此功能。

### Q: 图标不显示
**A:** 确保 `icon-192.png` 和 `icon-512.png` 文件存在且路径正确。

---

## 🔗 有用链接

- GitHub Pages 文档: https://docs.github.com/pages
- PWA 教程: https://web.dev/progressive-web-apps/
- 项目示例: https://github.com/example/poker-calculator

---

## 📝 快速命令汇总

```bash
# 克隆后本地测试
python3 -m http.server 8000
# 然后打开 http://localhost:8000

# Git 提交更新
git add .
git commit -m "Update"
git push

# 查看部署状态
gh repo view --web
```

部署完成后，你将拥有一个免费的、HTTPS 加密的、全球可访问的扑克计算器网站！

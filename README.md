# 图片下载器 (Image Downloader)

一个 Chrome / Edge (Manifest V3) 浏览器扩展：扫描当前页面所有 `<img>` 图片，在弹窗里显示**缩略图、原始分辨率、文件名/格式**，并支持逐张下载。

## 功能

- 📋 列出当前页面所有 `<img>` 图片
- 📐 显示每张图的**原始分辨率**（`naturalWidth × naturalHeight`）
- ⬇️ 逐张下载到浏览器默认下载目录
- 🔍 按最小尺寸过滤（全部 / ≥100px / ≥300px / ≥500px），默认隐藏小图标
- 📊 按分辨率从大到小排序，去重
- 🔒 权限克制：仅 `activeTab`、`downloads`、`scripting`（不申请 `<all_urls>`）

## 安装（开发者模式）

1. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）
2. 开启右上角「开发者模式」
3. 点「加载已解压的扩展程序」，选择本仓库根目录

## 开发

```bash
npm install      # 安装依赖
npm test         # 运行单元测试 (Vitest)
npm run package  # 打包为商店可上传的 dist/image-downloader-v<version>.zip
node scripts/gen-icons.mjs   # 重新生成图标
```

上架相关文档：[`PRIVACY.md`](PRIVACY.md)（隐私政策）、[`STORE_LISTING.md`](STORE_LISTING.md)（商店文案与上架清单）。

## 项目结构

```
manifest.json            MV3 清单
src/content.js           扫描页面 <img>，读取原始分辨率
src/lib/imageUtils.js    纯逻辑：去重 / 过滤 / 排序 / 文件名 / 格式（含单元测试）
src/background.js        chrome.downloads 下载处理
src/popup.html/css/js    弹窗界面与数据流
src/icons/               16/32/48/128 多尺寸图标
tests/                   Vitest 单元测试
scripts/gen-icons.mjs    图标生成脚本
docs/superpowers/        设计文档与实现计划
```

## 测试

核心逻辑全程 TDD，20 个单元测试覆盖去重、过滤、排序、文件名/格式推断、DOM 采集。

```bash
npm test
```

## License

MIT

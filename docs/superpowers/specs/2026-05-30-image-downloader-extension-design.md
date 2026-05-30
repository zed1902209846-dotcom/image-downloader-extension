# 图片下载器浏览器插件 — 设计文档

- 日期：2026-05-30
- 目标浏览器：Chrome / Edge（Chromium，Manifest V3）
- 状态：已与用户确认，待写实现计划

## 目标

一个 Chrome/Edge 扩展，扫描当前页面中所有 `<img>` 图片，在弹窗里列出每张图的**缩略图、原始分辨率、文件名/格式**，并支持逐张下载。

## 范围（Scope）

**做：**
- 抓取页面中所有 `<img>` 元素。
- 显示每张图的原始分辨率（`naturalWidth × naturalHeight`）。
- 逐张下载到浏览器默认下载目录。
- 按最小尺寸过滤、按分辨率排序。

**不做（YAGNI）：**
- 不抓 CSS 背景图、SVG、canvas。
- 不做批量勾选 / ZIP 打包（逐张下载即可，不引 JSZip）。
- 不引第三方前端框架。
- 不申请 `<all_urls>` 等宽泛权限。

## 架构（Manifest V3）

三个职责单一、可独立测试的部分：

| 部分 | 职责 | 依赖 |
|------|------|------|
| content script | 扫描当前页所有 `<img>`，读取 `src/currentSrc` 与原始分辨率 | 浏览器 DOM |
| popup | 展示图片列表 + 缩略图 + 分辨率，每张一个下载按钮 | content script 返回的数据 |
| background service worker | 接收下载请求，调用 `chrome.downloads` API 落盘 | Chrome downloads 权限 |

**数据流：**
点图标 → popup 注入/调用 content script 扫描页面 → 返回图片清单 → popup 渲染列表 → 点某张下载按钮 → 通知 background → `chrome.downloads.download`。

**权限：** `activeTab`、`downloads`、`scripting`。（不申请 `<all_urls>`，更安全、易过审。）

## Popup 界面

纵向滚动列表，每行一张图：

```
┌──────────────────────────────────────┐
│  图片下载器        共 23 张  [最小尺寸▾]│
├──────────────────────────────────────┤
│ [缩略图]  1920 × 1080            [下载] │
│           photo.jpg · JPG              │
├──────────────────────────────────────┤
│ [缩略图]  800 × 600              [下载] │
│           banner.png · PNG             │
└──────────────────────────────────────┘
```

每行：左侧小缩略图、原始分辨率、文件名 + 格式、右侧下载按钮。

- **过滤**：默认隐藏宽或高 < 100px 的图。顶部"最小尺寸"下拉：全部 / ≥100px / ≥300px / ≥500px。
- **排序**：默认按原始分辨率从大到小。

## 下载行为

- 点"下载" → background 用 `chrome.downloads.download({ url })` 落到默认下载目录。
- 文件名从 URL 最后一段推断；无合法文件名（动态图 / blob）时回退为 `image-<分辨率>.<格式>`，格式从 MIME 或 URL 后缀判断。
- 下载中按钮短暂置灰，完成后显示 ✓。

## 边界 & 错误处理

- **跨域 / 防盗链**：把原始 `src` 交给 `chrome.downloads`，由浏览器发请求，通常绕过 canvas 跨域限制。单张失败该行显示红色 ✗，不影响其他。
- **懒加载**：优先 `currentSrc`/`src`；读不到分辨率标注为"未知"，仍可尝试下载。
- **去重**：同一 URL 只列一次。
- **空页面**：无符合条件的图时显示"未找到图片"。

## 测试策略

- 纯逻辑（去重、文件名推断、格式判断、尺寸过滤、排序）抽成独立函数，用单元测试覆盖（Vitest）。
- 本地测试 HTML（含大图、小图标、懒加载、跨域图）做手动端到端验证。

## 技术栈 & 目录

原生 JS + HTML/CSS，无框架。

```
manifest.json
popup.html
popup.js
popup.css
content.js
background.js
```

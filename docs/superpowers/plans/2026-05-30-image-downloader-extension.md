# 图片下载器插件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Chrome/Edge (Manifest V3) 扩展，扫描当前页所有 `<img>`，在弹窗里显示每张图的缩略图、原始分辨率、文件名/格式，并支持逐张下载。

**Architecture:** content script 只负责从 DOM 读原始图片数据（src/currentSrc/naturalWidth/naturalHeight）；所有处理逻辑（去重、过滤、排序、文件名/格式推断）抽到纯函数模块 `lib/imageUtils.js`，由 popup（ES module）调用；background service worker 收到消息后用 `chrome.downloads` API 落盘。

**Tech Stack:** 原生 JavaScript (ES modules) + HTML/CSS，无前端框架；Vitest + jsdom 做单元测试；`chrome.downloads`/`chrome.scripting`/`chrome.tabs` API。

---

## File Structure

| 文件 | 职责 |
|------|------|
| `manifest.json` | MV3 清单：权限、popup、background、图标 |
| `src/lib/imageUtils.js` | 纯函数：`detectExt`、`formatLabel`、`inferFilename`、`dedupeBySrc`、`filterByMinSize`、`sortByResolution`。**全部可单元测试** |
| `src/content.js` | 注入页面，`collectImages(document)` 返回原始图片数组 |
| `src/background.js` | 监听下载消息，调用 `chrome.downloads.download` |
| `src/popup.html` | 弹窗结构（标题栏 + 最小尺寸下拉 + 列表容器） |
| `src/popup.css` | 弹窗样式 |
| `src/popup.js` | ES module：调 content script 取数据 → 用 imageUtils 处理 → 渲染 → 绑定下载按钮 |
| `tests/imageUtils.test.js` | imageUtils 单元测试 |
| `tests/content.test.js` | collectImages 的 jsdom 测试 |
| `test-page/index.html` | 手动端到端验证页面 |
| `package.json` / `vitest.config.js` | 依赖与测试配置 |

---

## Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `.gitignore`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "image-downloader-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: 创建 vitest.config.js**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
```

- [ ] **Step 3: 创建 .gitignore**

```
node_modules/
dist/
*.zip
```

- [ ] **Step 4: 安装依赖并确认 vitest 可运行**

Run: `npm install && npx vitest run`
Expected: 安装成功；vitest 报 "No test files found"（暂无测试，正常）。

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.js .gitignore
git commit -m "chore: scaffold extension project with vitest"
```

---

## Task 2: detectExt（从 URL/MIME 推断小写扩展名）

**Files:**
- Create: `src/lib/imageUtils.js`
- Test: `tests/imageUtils.test.js`

- [ ] **Step 1: 写失败测试**

```js
// tests/imageUtils.test.js
import { describe, it, expect } from "vitest";
import { detectExt } from "../src/lib/imageUtils.js";

describe("detectExt", () => {
  it("从 URL 后缀取扩展名", () => {
    expect(detectExt("https://x.com/a/photo.JPG", "")).toBe("jpg");
  });
  it("忽略 URL 上的 query 和 hash", () => {
    expect(detectExt("https://x.com/p.png?w=200#frag", "")).toBe("png");
  });
  it("URL 无扩展名时回退到 MIME", () => {
    expect(detectExt("https://x.com/dynamic", "image/webp")).toBe("webp");
  });
  it("jpeg MIME 归一化为 jpg", () => {
    expect(detectExt("https://x.com/dynamic", "image/jpeg")).toBe("jpg");
  });
  it("都无法判断时返回 null", () => {
    expect(detectExt("https://x.com/dynamic", "")).toBe(null);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: FAIL — "Failed to resolve import" / `detectExt is not a function`。

- [ ] **Step 3: 实现 detectExt**

```js
// src/lib/imageUtils.js
const KNOWN_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif", "ico"];

export function detectExt(url, mime = "") {
  try {
    const path = new URL(url, "https://_").pathname;
    const last = path.split("/").pop() || "";
    const dot = last.lastIndexOf(".");
    if (dot !== -1) {
      const ext = last.slice(dot + 1).toLowerCase();
      if (KNOWN_EXTS.includes(ext)) return ext === "jpeg" ? "jpg" : ext;
    }
  } catch {
    // 非法 URL，落到 MIME 分支
  }
  if (mime) {
    const sub = mime.split("/")[1]?.toLowerCase();
    if (sub) {
      const ext = sub === "jpeg" ? "jpg" : sub.replace("+xml", "");
      if (KNOWN_EXTS.includes(ext)) return ext;
    }
  }
  return null;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: PASS（5 个用例）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageUtils.js tests/imageUtils.test.js
git commit -m "feat: add detectExt to imageUtils"
```

---

## Task 3: formatLabel（显示用的格式标签）

**Files:**
- Modify: `src/lib/imageUtils.js`
- Test: `tests/imageUtils.test.js`

- [ ] **Step 1: 追加失败测试**

```js
import { detectExt, formatLabel } from "../src/lib/imageUtils.js";

describe("formatLabel", () => {
  it("已知扩展名转大写", () => {
    expect(formatLabel("https://x.com/a.png", "")).toBe("PNG");
  });
  it("无法判断时返回 IMG", () => {
    expect(formatLabel("https://x.com/dynamic", "")).toBe("IMG");
  });
});
```

（把第一行 import 替换为上面这行。）

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: FAIL — `formatLabel is not a function`。

- [ ] **Step 3: 实现 formatLabel**

```js
export function formatLabel(url, mime = "") {
  const ext = detectExt(url, mime);
  return ext ? ext.toUpperCase() : "IMG";
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageUtils.js tests/imageUtils.test.js
git commit -m "feat: add formatLabel to imageUtils"
```

---

## Task 4: inferFilename（推断下载文件名）

**Files:**
- Modify: `src/lib/imageUtils.js`
- Test: `tests/imageUtils.test.js`

- [ ] **Step 1: 追加失败测试**

```js
import { detectExt, formatLabel, inferFilename } from "../src/lib/imageUtils.js";

describe("inferFilename", () => {
  it("URL 有合法文件名时直接用", () => {
    expect(inferFilename("https://x.com/pics/cat.jpg", 800, 600, "")).toBe("cat.jpg");
  });
  it("去掉 query/hash 后取文件名", () => {
    expect(inferFilename("https://x.com/cat.png?v=2", 800, 600, "")).toBe("cat.png");
  });
  it("无文件名但能判断格式时回退 image-WxH.ext", () => {
    expect(inferFilename("https://x.com/dynamic", 1920, 1080, "image/webp")).toBe("image-1920x1080.webp");
  });
  it("完全无法判断时回退 image-WxH", () => {
    expect(inferFilename("https://x.com/dynamic", 100, 50, "")).toBe("image-100x50");
  });
});
```

（更新第一行 import 为上面这行。）

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: FAIL — `inferFilename is not a function`。

- [ ] **Step 3: 实现 inferFilename**

```js
export function inferFilename(url, width, height, mime = "") {
  try {
    const path = new URL(url, "https://_").pathname;
    const last = path.split("/").pop() || "";
    if (last.includes(".") && !last.startsWith(".")) {
      return last;
    }
  } catch {
    // 落到回退逻辑
  }
  const ext = detectExt(url, mime);
  const base = `image-${width}x${height}`;
  return ext ? `${base}.${ext}` : base;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageUtils.js tests/imageUtils.test.js
git commit -m "feat: add inferFilename to imageUtils"
```

---

## Task 5: dedupeBySrc（按 URL 去重）

**Files:**
- Modify: `src/lib/imageUtils.js`
- Test: `tests/imageUtils.test.js`

- [ ] **Step 1: 追加失败测试**

```js
import { detectExt, formatLabel, inferFilename, dedupeBySrc } from "../src/lib/imageUtils.js";

describe("dedupeBySrc", () => {
  it("相同 src 只保留第一个", () => {
    const input = [
      { src: "https://x.com/a.jpg", width: 100, height: 100 },
      { src: "https://x.com/a.jpg", width: 100, height: 100 },
      { src: "https://x.com/b.jpg", width: 50, height: 50 },
    ];
    const out = dedupeBySrc(input);
    expect(out).toHaveLength(2);
    expect(out.map((i) => i.src)).toEqual(["https://x.com/a.jpg", "https://x.com/b.jpg"]);
  });
  it("空 src 被剔除", () => {
    expect(dedupeBySrc([{ src: "" }, { src: null }])).toHaveLength(0);
  });
});
```

（更新第一行 import。）

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: FAIL — `dedupeBySrc is not a function`。

- [ ] **Step 3: 实现 dedupeBySrc**

```js
export function dedupeBySrc(images) {
  const seen = new Set();
  const out = [];
  for (const img of images) {
    if (!img.src) continue;
    if (seen.has(img.src)) continue;
    seen.add(img.src);
    out.push(img);
  }
  return out;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageUtils.js tests/imageUtils.test.js
git commit -m "feat: add dedupeBySrc to imageUtils"
```

---

## Task 6: filterByMinSize（按最小尺寸过滤）

**Files:**
- Modify: `src/lib/imageUtils.js`
- Test: `tests/imageUtils.test.js`

- [ ] **Step 1: 追加失败测试**

```js
import {
  detectExt, formatLabel, inferFilename, dedupeBySrc, filterByMinSize,
} from "../src/lib/imageUtils.js";

describe("filterByMinSize", () => {
  const imgs = [
    { src: "a", width: 50, height: 400 },
    { src: "b", width: 200, height: 200 },
    { src: "c", width: 0, height: 0 }, // 未知尺寸
  ];
  it("minSize=0 返回全部", () => {
    expect(filterByMinSize(imgs, 0)).toHaveLength(3);
  });
  it("宽或高任一小于阈值即剔除", () => {
    const out = filterByMinSize(imgs, 100);
    expect(out.map((i) => i.src)).toEqual(["b"]);
  });
  it("未知尺寸(0)在 minSize>0 时被剔除", () => {
    expect(filterByMinSize(imgs, 100).some((i) => i.src === "c")).toBe(false);
  });
});
```

（更新第一行 import。）

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: FAIL — `filterByMinSize is not a function`。

- [ ] **Step 3: 实现 filterByMinSize**

```js
export function filterByMinSize(images, minSize) {
  if (!minSize) return images.slice();
  return images.filter((i) => i.width >= minSize && i.height >= minSize);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageUtils.js tests/imageUtils.test.js
git commit -m "feat: add filterByMinSize to imageUtils"
```

---

## Task 7: sortByResolution（按面积降序）

**Files:**
- Modify: `src/lib/imageUtils.js`
- Test: `tests/imageUtils.test.js`

- [ ] **Step 1: 追加失败测试**

```js
import {
  detectExt, formatLabel, inferFilename, dedupeBySrc, filterByMinSize, sortByResolution,
} from "../src/lib/imageUtils.js";

describe("sortByResolution", () => {
  it("按 宽*高 从大到小排，不修改原数组", () => {
    const input = [
      { src: "small", width: 100, height: 100 },
      { src: "big", width: 1920, height: 1080 },
      { src: "mid", width: 800, height: 600 },
    ];
    const out = sortByResolution(input);
    expect(out.map((i) => i.src)).toEqual(["big", "mid", "small"]);
    expect(input[0].src).toBe("small"); // 原数组未变
  });
});
```

（更新第一行 import。）

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: FAIL — `sortByResolution is not a function`。

- [ ] **Step 3: 实现 sortByResolution**

```js
export function sortByResolution(images) {
  return images
    .slice()
    .sort((a, b) => b.width * b.height - a.width * a.height);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/imageUtils.test.js`
Expected: PASS（全部用例）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageUtils.js tests/imageUtils.test.js
git commit -m "feat: add sortByResolution to imageUtils"
```

---

## Task 8: content.js — collectImages

**Files:**
- Create: `src/content.js`
- Test: `tests/content.test.js`

说明：content.js 既要能被 `chrome.scripting.executeScript({ files })` 当作**经典脚本**注入页面，又要能被 Vitest 当作 ESM 导入测试。关键约束：**文件里不能出现任何 `import`/`export` 语句**——否则注入时会因 `export` 而解析报错。做法是只把函数挂到 `globalThis.__collectImages`（无 import/export 的文件既是合法经典脚本，也是合法 ESM 模块）。测试用 `import "../src/content.js"` 触发其副作用，再从 `globalThis` 取函数。

- [ ] **Step 1: 为该测试文件单独启用 jsdom 环境 + 写失败测试**

```js
// tests/content.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import "../src/content.js"; // 副作用：设置 globalThis.__collectImages

const collectImages = globalThis.__collectImages;

describe("collectImages", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("__collectImages 已被注册", () => {
    expect(typeof collectImages).toBe("function");
  });

  it("读取每个 img 的 src 与原始尺寸", () => {
    const img = document.createElement("img");
    Object.defineProperty(img, "naturalWidth", { value: 1920 });
    Object.defineProperty(img, "naturalHeight", { value: 1080 });
    Object.defineProperty(img, "currentSrc", { value: "https://x.com/a.jpg" });
    img.src = "https://x.com/a.jpg";
    document.body.appendChild(img);

    const out = collectImages(document);
    expect(out).toEqual([
      { src: "https://x.com/a.jpg", width: 1920, height: 1080 },
    ]);
  });

  it("currentSrc 优先于 src", () => {
    const img = document.createElement("img");
    Object.defineProperty(img, "naturalWidth", { value: 10 });
    Object.defineProperty(img, "naturalHeight", { value: 10 });
    Object.defineProperty(img, "currentSrc", { value: "https://x.com/real.jpg" });
    img.src = "https://x.com/placeholder.gif";
    document.body.appendChild(img);

    expect(collectImages(document)[0].src).toBe("https://x.com/real.jpg");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/content.test.js`
Expected: FAIL — `collectImages` 为 undefined（文件还不存在/未注册）。

- [ ] **Step 3: 实现 content.js（无 import/export，仅挂到 globalThis）**

```js
// src/content.js
// 注意：本文件不得包含任何 import/export 语句，
// 以便既能作为经典脚本注入页面，又能被 Vitest 作为 ESM 导入。
globalThis.__collectImages = function collectImages(doc) {
  return Array.from(doc.querySelectorAll("img")).map((img) => ({
    src: img.currentSrc || img.src || "",
    width: img.naturalWidth || 0,
    height: img.naturalHeight || 0,
  }));
};
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/content.test.js`
Expected: PASS（2 个用例）。

- [ ] **Step 5: 跑全量测试确保未回归**

Run: `npx vitest run`
Expected: 所有测试 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/content.js tests/content.test.js
git commit -m "feat: add collectImages content script logic"
```

---

## Task 9: background.js — 下载处理

**Files:**
- Create: `src/background.js`

说明：background 依赖 `chrome.*` API，不做单元测试，靠后续手动 E2E 验证。

- [ ] **Step 1: 实现 background.js**

```js
// src/background.js
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "download-image") return;

  chrome.downloads.download(
    { url: msg.url, filename: msg.filename },
    (downloadId) => {
      if (chrome.runtime.lastError || downloadId === undefined) {
        sendResponse({ ok: false, error: chrome.runtime.lastError?.message || "unknown" });
      } else {
        sendResponse({ ok: true, downloadId });
      }
    }
  );
  return true; // 异步 sendResponse
});
```

- [ ] **Step 2: Commit**

```bash
git add src/background.js
git commit -m "feat: add background download handler"
```

---

## Task 10: popup UI（html + css）

**Files:**
- Create: `src/popup.html`
- Create: `src/popup.css`

- [ ] **Step 1: 创建 popup.html**

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <header class="bar">
      <span class="title">图片下载器</span>
      <span id="count" class="count"></span>
      <select id="minSize" title="最小尺寸">
        <option value="0">全部</option>
        <option value="100" selected>≥100px</option>
        <option value="300">≥300px</option>
        <option value="500">≥500px</option>
      </select>
    </header>
    <ul id="list" class="list"></ul>
    <p id="empty" class="empty" hidden>未找到图片</p>
    <script type="module" src="popup.js"></script>
  </body>
</html>
```

- [ ] **Step 2: 创建 popup.css**

```css
* { box-sizing: border-box; }
body { width: 420px; max-height: 560px; margin: 0; font: 13px/1.4 system-ui, sans-serif; }
.bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #e3e3e3; position: sticky; top: 0; background: #fff; }
.title { font-weight: 600; }
.count { color: #888; margin-left: auto; }
.list { list-style: none; margin: 0; padding: 0; }
.row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
.thumb { width: 48px; height: 48px; object-fit: contain; background: #f6f6f6; border-radius: 4px; flex: none; }
.meta { min-width: 0; flex: 1; }
.res { font-weight: 600; }
.sub { color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dl { flex: none; padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px; background: #fafafa; cursor: pointer; }
.dl:disabled { opacity: 0.5; cursor: default; }
.dl.ok { color: #137333; border-color: #137333; }
.dl.err { color: #c5221f; border-color: #c5221f; }
.empty { text-align: center; color: #888; padding: 24px; }
```

- [ ] **Step 3: Commit**

```bash
git add src/popup.html src/popup.css
git commit -m "feat: add popup html and css"
```

---

## Task 11: popup.js — 取数据、处理、渲染、下载

**Files:**
- Create: `src/popup.js`

说明：popup.js 依赖 `chrome.*`，逻辑核心已在 imageUtils 测过；这里是装配代码，靠手动 E2E 验证。

- [ ] **Step 1: 实现 popup.js**

```js
// src/popup.js
import {
  dedupeBySrc,
  filterByMinSize,
  sortByResolution,
  inferFilename,
  formatLabel,
} from "./lib/imageUtils.js";

const listEl = document.getElementById("list");
const countEl = document.getElementById("count");
const emptyEl = document.getElementById("empty");
const minSizeEl = document.getElementById("minSize");

let allImages = [];

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function scanPage() {
  const tabId = await getActiveTabId();
  if (tabId === undefined) return [];
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
  // content.js 注入后暴露 __collectImages；再执行它取结果
  const [out] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => globalThis.__collectImages(document),
  });
  return out?.result || [];
}

function render() {
  const minSize = Number(minSizeEl.value);
  const images = sortByResolution(filterByMinSize(allImages, minSize));

  listEl.innerHTML = "";
  countEl.textContent = `共 ${images.length} 张`;
  emptyEl.hidden = images.length > 0;

  for (const img of images) {
    listEl.appendChild(renderRow(img));
  }
}

function renderRow(img) {
  const li = document.createElement("li");
  li.className = "row";

  const thumb = document.createElement("img");
  thumb.className = "thumb";
  thumb.src = img.src;
  thumb.loading = "lazy";

  const meta = document.createElement("div");
  meta.className = "meta";
  const res = document.createElement("div");
  res.className = "res";
  res.textContent = img.width && img.height ? `${img.width} × ${img.height}` : "未知";
  const sub = document.createElement("div");
  sub.className = "sub";
  const name = inferFilename(img.src, img.width, img.height, "");
  sub.textContent = `${name} · ${formatLabel(img.src, "")}`;
  meta.append(res, sub);

  const btn = document.createElement("button");
  btn.className = "dl";
  btn.textContent = "下载";
  btn.addEventListener("click", () => download(img, btn));

  li.append(thumb, meta, btn);
  return li;
}

function download(img, btn) {
  btn.disabled = true;
  const filename = inferFilename(img.src, img.width, img.height, "");
  chrome.runtime.sendMessage(
    { type: "download-image", url: img.src, filename },
    (resp) => {
      if (resp?.ok) {
        btn.textContent = "✓";
        btn.classList.add("ok");
      } else {
        btn.textContent = "✗";
        btn.classList.add("err");
        btn.disabled = false;
      }
    }
  );
}

minSizeEl.addEventListener("change", render);

(async function init() {
  try {
    allImages = dedupeBySrc(await scanPage());
  } catch (e) {
    allImages = [];
  }
  render();
})();
```

- [ ] **Step 2: Commit**

```bash
git add src/popup.js
git commit -m "feat: wire up popup data flow and download"
```

---

## Task 12: manifest.json + 图标

**Files:**
- Create: `manifest.json`
- Create: `src/icons/icon128.png`（任意 128×128 占位 PNG）

- [ ] **Step 1: 创建 manifest.json**

```json
{
  "manifest_version": 3,
  "name": "图片下载器",
  "version": "0.1.0",
  "description": "扫描页面图片，显示原始分辨率并逐张下载。",
  "permissions": ["activeTab", "downloads", "scripting"],
  "action": {
    "default_title": "图片下载器",
    "default_popup": "src/popup.html",
    "default_icon": "src/icons/icon128.png"
  },
  "icons": { "128": "src/icons/icon128.png" },
  "background": {
    "service_worker": "src/background.js"
  }
}
```

注意：`content.js` 通过 `chrome.scripting.executeScript({ files: ["content.js"] })` 按需注入，文件相对扩展根目录，因此注入路径写 `src/content.js` —— 见下一步修正。

- [ ] **Step 2: 修正 popup.js 中注入路径**

把 Task 11 的 `files: ["content.js"]` 改为 `files: ["src/content.js"]`（注入文件路径相对扩展根目录）。

Modify `src/popup.js`：
```js
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["src/content.js"],
  });
```

- [ ] **Step 3: 放一个 128×128 占位图标**

任意生成一个纯色 128×128 PNG 存到 `src/icons/icon128.png`（可用在线工具或截图裁剪；内容不重要，仅占位）。

- [ ] **Step 4: Commit**

```bash
git add manifest.json src/icons/icon128.png src/popup.js
git commit -m "feat: add manifest and icon, fix content injection path"
```

---

## Task 13: 手动端到端验证

**Files:**
- Create: `test-page/index.html`

- [ ] **Step 1: 创建测试页面**

```html
<!DOCTYPE html>
<html lang="zh">
  <head><meta charset="UTF-8" /><title>测试页</title></head>
  <body>
    <h1>图片下载器测试页</h1>
    <!-- 大图 -->
    <img src="https://picsum.photos/1920/1080" alt="big" />
    <!-- 中图 -->
    <img src="https://picsum.photos/800/600" alt="mid" />
    <!-- 小图标（应被默认过滤） -->
    <img src="https://picsum.photos/32/32" alt="icon" />
    <!-- 重复 URL（应去重） -->
    <img src="https://picsum.photos/800/600" alt="dup" />
  </body>
</html>
```

- [ ] **Step 2: 加载扩展**

1. Chrome/Edge 打开 `chrome://extensions`
2. 打开右上角「开发者模式」
3. 点「加载已解压的扩展程序」，选择项目根目录
4. 确认无报错（manifest 解析成功）

- [ ] **Step 3: 功能验证清单**

用浏览器打开 `test-page/index.html`（`file://` 路径或本地服务器），点扩展图标，逐项确认：

- [ ] 弹窗列出图片，默认（≥100px）只显示 1920×1080 和 800×600 两张（32×32 被过滤，800×600 去重只剩一张）
- [ ] 每张显示正确的「宽 × 高」原始分辨率
- [ ] 文件名/格式标签显示合理
- [ ] 顶部计数「共 N 张」正确
- [ ] 切换最小尺寸下拉为「全部」，小图标出现
- [ ] 点某张「下载」，文件落到下载目录，按钮变 ✓
- [ ] 在一个真实网页（如新闻站）上打开，能列出图片并下载
- [ ] 找一张明显跨域/防盗链的图测试，失败时按钮变 ✗ 且不影响其他行

- [ ] **Step 4: 跑一次全量单测确保仍绿**

Run: `npx vitest run`
Expected: 所有测试 PASS。

- [ ] **Step 5: Commit**

```bash
git add test-page/index.html
git commit -m "test: add manual e2e test page"
```

---

## 完成标准（Definition of Done）

- 所有 Vitest 单测通过。
- 扩展在 Chrome/Edge 能加载无报错。
- 手动验证清单全部通过。
- 代码已分任务提交。

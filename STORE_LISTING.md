# Edge 商店上架文案 / Store Listing Copy

提交 Edge Add-ons 时，把对应字段复制粘贴即可。截图需你自行在浏览器中截取（1280×800 或 640×480，至少 1 张）。

---

## 基本信息 / Basics

| 字段 | 内容 |
|------|------|
| 名称 / Name | 图片下载器 (Image Downloader) |
| 分类 / Category | Productivity（生产力工具） |
| 隐私政策 URL / Privacy policy URL | https://github.com/zed1902209846-dotcom/image-downloader-extension/blob/master/PRIVACY.md |
| 是否收集数据 / Data collection | 否 / No（不收集任何数据） |
| 语言 / Language | 中文（简体）+ English |

---

## 简短描述 / Short description（≤ 132 字符）

**中文：**
> 一键查看并下载网页中的所有图片，显示原始分辨率，可按尺寸过滤。

**English:**
> View and download all images on a web page in one click — shows original resolution and filters by size.

---

## 详细描述 / Detailed description

**中文：**

```
图片下载器是一个简洁、轻量的图片抓取工具。点击工具栏图标，即可列出当前网页中的所有图片。

主要功能：
• 显示每张图片的原始分辨率（真实像素尺寸，而非页面缩放后的大小）
• 逐张一键下载到默认下载目录
• 按最小尺寸过滤，默认隐藏小图标和追踪像素（可切换：全部 / ≥100px / ≥300px / ≥500px）
• 按分辨率从大到小排序，方便快速找到高清大图
• 自动去重，相同图片只显示一次

隐私与权限：
本扩展不收集任何数据，不联网上传，没有任何追踪代码。仅在你点击图标时读取当前页面的图片信息。权限申请克制——只用到 activeTab、downloads、scripting，不会读取你的浏览历史或其他页面。

适合需要快速保存网页配图、查找高分辨率素材的设计师、编辑和普通用户。
```

**English:**

```
Image Downloader is a clean, lightweight tool for grabbing images from any web page. Click the toolbar icon to list every image on the current page.

Features:
• Shows each image's original resolution (true pixel dimensions, not the scaled on-page size)
• One-click download of any image to your default download folder
• Filter by minimum size — small icons and tracking pixels are hidden by default (toggle: All / ≥100px / ≥300px / ≥500px)
• Sorted by resolution, largest first, so you can quickly find high-res images
• Automatic de-duplication — identical images appear only once

Privacy & permissions:
This extension collects no data, uploads nothing, and contains no tracking code. It only reads image info from the current tab when you click the icon. Permissions are minimal — only activeTab, downloads, and scripting; it never reads your browsing history or other pages.

Great for designers, editors, and anyone who needs to quickly save page images or find high-resolution assets.
```

---

## 搜索关键词 / Search terms

```
图片下载, 批量图片, 图片分辨率, image downloader, save images, download images, image resolution, picture downloader
```

---

## 权限说明 / Permission justifications

审核时若被问到“为什么需要这些权限”，可如下回答：

| 权限 / Permission | 用途说明 / Justification |
|-------------------|--------------------------|
| `activeTab` | 仅在用户点击扩展图标时，访问当前活动标签页以读取页面中的图片。不会在后台或其他标签页运行。Only accesses the active tab when the user clicks the icon, to read images on that page. |
| `downloads` | 调用浏览器下载功能，把用户选择的图片保存到本地。Used to save the user-selected image via the browser's download manager. |
| `scripting` | 向当前页面注入一段脚本以收集 `<img>` 元素的地址和原始尺寸。Injects a small script into the current page to collect `<img>` URLs and natural dimensions. |

注：本扩展**未**申请 `<all_urls>` 等宽泛主机权限，仅按需作用于用户点击时的当前页面。
Note: the extension does **not** request broad host permissions like `<all_urls>`; it acts only on the current page when the user clicks.

---

## 上架前自查清单 / Pre-submission checklist

- [ ] 用 `npm run package` 生成最新的 `dist/image-downloader-v<version>.zip`
- [ ] 已把 `PRIVACY.md` 推到 GitHub（隐私政策 URL 可访问）
- [ ] 准备至少 1 张截图（1280×800 或 640×480）—— 建议截“弹窗列出图片 + 分辨率”的画面
- [ ] 在 Edge 中以开发者模式加载并实测通过
- [ ] 填写名称、描述、分类、隐私声明、权限说明

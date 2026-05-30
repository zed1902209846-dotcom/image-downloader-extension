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
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["src/content.js"],
  });
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
  thumb.addEventListener("error", () => {
    thumb.style.visibility = "hidden";
  });

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
      void chrome.runtime.lastError; // 读取以消除未处理告警
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

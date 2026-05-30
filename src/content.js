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

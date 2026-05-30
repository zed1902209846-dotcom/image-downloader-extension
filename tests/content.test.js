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

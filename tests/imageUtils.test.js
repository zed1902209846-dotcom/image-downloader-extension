import { describe, it, expect } from "vitest";
import { detectExt, formatLabel } from "../src/lib/imageUtils.js";

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

describe("formatLabel", () => {
  it("已知扩展名转大写", () => {
    expect(formatLabel("https://x.com/a.png", "")).toBe("PNG");
  });
  it("无法判断时返回 IMG", () => {
    expect(formatLabel("https://x.com/dynamic", "")).toBe("IMG");
  });
});

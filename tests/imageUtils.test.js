import { describe, it, expect } from "vitest";
import { detectExt, formatLabel, inferFilename, dedupeBySrc } from "../src/lib/imageUtils.js";

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

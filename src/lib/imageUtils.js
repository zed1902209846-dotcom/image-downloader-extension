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

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

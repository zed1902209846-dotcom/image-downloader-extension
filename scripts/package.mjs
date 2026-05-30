// 打包扩展为商店可上传的 zip。
// 只包含运行时文件（manifest.json + src/），排除 node_modules、tests、docs、scripts 等开发文件。
// 用法: npm run package  ->  dist/image-downloader-v<version>.zip
import AdmZip from "adm-zip";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const manifestPath = path.join(ROOT, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("找不到 manifest.json，请在项目根目录运行。");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = manifest.version;
const outDir = path.join(ROOT, "dist");
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, `image-downloader-v${version}.zip`);
if (fs.existsSync(outFile)) fs.rmSync(outFile);

const zip = new AdmZip();
// manifest 放在 zip 根目录
zip.addLocalFile(manifestPath);
// 整个 src/ 目录（popup、background、content、icons）保持原路径
zip.addLocalFolder(path.join(ROOT, "src"), "src");
zip.writeZip(outFile);

// 输出清单，便于核对
const entries = new AdmZip(outFile).getEntries().map((e) => e.entryName).sort();
console.log(`✓ 已生成 ${path.relative(ROOT, outFile)} (${fs.statSync(outFile).size} bytes)`);
console.log(`  包含 ${entries.length} 个文件:`);
for (const name of entries) console.log(`    ${name}`);

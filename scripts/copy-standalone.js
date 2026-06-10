/**
 * 构建 standalone 输出后处理脚本
 * Next.js standalone 模式不会自动复制 static 和 public 文件，
 * 需要手动将它们复制到 standalone 目录中。
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const staticDir = path.join(projectRoot, '.next', 'static');
const publicDir = path.join(projectRoot, 'public');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.log('[copy-standalone] Source not found, skipping:', src);
    return;
  }

  // 确保目标目录存在
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  console.log('[copy-standalone] Starting post-build copy...');

  // 检查 standalone 目录是否存在
  if (!fs.existsSync(standaloneDir)) {
    console.error('[copy-standalone] ERROR: .next/standalone directory not found!');
    console.error('[copy-standalone] Make sure next.config.ts has output: "standalone"');
    process.exit(1);
  }

  console.log('[copy-standalone] Standalone dir:', standaloneDir);

  // 1. 复制 .next/static → .next/standalone/.next/static
  const standaloneStaticDir = path.join(standaloneDir, '.next', 'static');
  console.log('[copy-standalone] Copying .next/static → .next/standalone/.next/static');
  copyDirSync(staticDir, standaloneStaticDir);
  console.log('[copy-standalone] Static files copied.');

  // 2. 复制 public → .next/standalone/public
  const standalonePublicDir = path.join(standaloneDir, 'public');
  console.log('[copy-standalone] Copying public → .next/standalone/public');
  copyDirSync(publicDir, standalonePublicDir);
  console.log('[copy-standalone] Public files copied.');

  // 3. 复制 .env 文件 → .next/standalone/
  const envFiles = ['.env', '.env.local', '.env.production'];
  for (const envFile of envFiles) {
    const src = path.join(projectRoot, envFile);
    if (fs.existsSync(src)) {
      const dest = path.join(standaloneDir, envFile);
      fs.copyFileSync(src, dest);
      console.log(`[copy-standalone] Copied ${envFile}`);
    }
  }

  // 4. 复制 package.json (standalone 服务器可能需要)
  const pkgSrc = path.join(projectRoot, 'package.json');
  const pkgDest = path.join(standaloneDir, 'package.json');
  if (fs.existsSync(pkgSrc) && !fs.existsSync(pkgDest)) {
    fs.copyFileSync(pkgSrc, pkgDest);
    console.log('[copy-standalone] Copied package.json');
  }

  console.log('[copy-standalone] Post-build copy complete!');
}

main();

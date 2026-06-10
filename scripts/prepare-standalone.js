/**
 * Electron 打包前置脚本
 * 临时将 next.config.ts 切换为 standalone 模式 + outputFileTracingRoot
 * 这样云端部署用默认模式，Electron 打包用 standalone 模式
 */
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'next.config.ts');

let content = fs.readFileSync(configPath, 'utf-8');

// 检查是否已经是 standalone 模式
if (content.includes("output: 'standalone'") && !content.includes('// output:')) {
  console.log('[prepare-standalone] Already in standalone mode, skipping.');
  process.exit(0);
}

// 取消注释 standalone 相关行
content = content.replace(
  "// output: 'standalone',",
  "output: 'standalone',"
);
content = content.replace(
  "// outputFileTracingRoot: path.resolve(__dirname),",
  "outputFileTracingRoot: path.resolve(__dirname),"
);

fs.writeFileSync(configPath, content);
console.log('[prepare-standalone] Switched next.config.ts to standalone mode.');

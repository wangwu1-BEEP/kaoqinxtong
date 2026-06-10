const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let nextServer = null;

const SERVER_PORT = 5000;
const LOCAL_URL = `http://localhost:${SERVER_PORT}/login`;
const HEALTH_URL = `http://localhost:${SERVER_PORT}`;

// 判断是否在打包后的生产环境中运行
function isPackaged() {
  // app.isPackaged 在 electron-builder 打包后为 true
  return app.isPackaged === true;
}

// 获取 standalone 服务器根目录
function getStandaloneRoot() {
  if (isPackaged()) {
    // 打包后: resources/standalone/
    return path.join(process.resourcesPath, 'standalone');
  }
  // 开发环境: 项目根目录
  return path.join(__dirname, '..');
}

// 启动 Next.js 服务
function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isPackaged()) {
      startStandaloneServer(resolve, reject);
    } else {
      startDevServer(resolve, reject);
    }
  });
}

// 开发环境: 使用 npx next start
function startDevServer(resolve, reject) {
  const projectRoot = path.join(__dirname, '..');
  const nextBin = path.join(projectRoot, 'node_modules', '.bin', 'next');
  const nextCmd = process.platform === 'win32' ? nextBin + '.cmd' : nextBin;

  console.log('[Electron] Dev mode: starting next start...');

  nextServer = spawn(nextCmd, ['start', '-p', String(SERVER_PORT)], {
    cwd: projectRoot,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, PORT: String(SERVER_PORT), NODE_ENV: 'production' }
  });

  setupServerHandlers(nextServer, resolve, reject);
}

// 生产环境: 使用 ELECTRON_RUN_AS_NODE 启动 standalone server.js
function startStandaloneServer(resolve, reject) {
  const standaloneRoot = getStandaloneRoot();
  const serverScript = path.join(standaloneRoot, 'server.js');

  console.log('[Electron] Production mode: starting standalone server...');
  console.log('[Electron] Standalone root:', standaloneRoot);
  console.log('[Electron] Server script:', serverScript);

  // 检查 server.js 是否存在
  if (!fs.existsSync(serverScript)) {
    console.error('[Electron] server.js not found at:', serverScript);
    // 尝试列出目录内容帮助诊断
    try {
      console.log('[Electron] Resources dir contents:', fs.readdirSync(process.resourcesPath));
      if (fs.existsSync(standaloneRoot)) {
        console.log('[Electron] Standalone dir contents:', fs.readdirSync(standaloneRoot));
      }
    } catch (e) {
      console.error('[Electron] Failed to list directory:', e.message);
    }
    reject(new Error('server.js not found'));
    return;
  }

  // 使用 Electron 自身作为 Node.js 运行时 (ELECTRON_RUN_AS_NODE=1)
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(SERVER_PORT),
    HOSTNAME: 'localhost',
    NODE_ENV: 'production',
  };

  // 读取 .env 文件并注入环境变量
  const envPaths = [
    path.join(standaloneRoot, '.env'),
    path.join(standaloneRoot, '.env.local'),
    path.join(standaloneRoot, '.env.production'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log('[Electron] Loading env from:', envPath);
      const envContent = fs.readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
            const key = trimmed.substring(0, eqIndex).trim();
            const value = trimmed.substring(eqIndex + 1).trim();
            env[key] = value;
          }
        }
      }
    }
  }

  nextServer = spawn(process.execPath, [serverScript], {
    cwd: standaloneRoot,
    stdio: 'pipe',
    env: env,
  });

  setupServerHandlers(nextServer, resolve, reject);
}

// 统一的服务进程事件处理
function setupServerHandlers(server, resolve, reject) {
  let resolved = false;

  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('[Next.js]', output.trim());
    if (!resolved && (output.includes('Ready') || output.includes('started') || output.includes(`localhost:${SERVER_PORT}`))) {
      resolved = true;
      resolve();
    }
  });

  server.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('[Next.js stderr]', output.trim());
    if (!resolved && (output.includes('Ready') || output.includes('started') || output.includes(`localhost:${SERVER_PORT}`))) {
      resolved = true;
      resolve();
    }
  });

  server.on('error', (err) => {
    console.error('[Next.js] Failed to start:', err);
    if (!resolved) {
      resolved = true;
      reject(err);
    }
  });

  server.on('close', (code) => {
    console.log(`[Next.js] Process exited with code ${code}`);
    nextServer = null;
  });

  // 超时保底：20秒后如果还没检测到就尝试加载
  setTimeout(() => {
    if (!resolved) {
      console.log('[Electron] Server start timeout, attempting to load anyway...');
      resolved = true;
      resolve();
    }
  }, 20000);
}

// 等待服务可用
function waitForServer(url, maxRetries = 30) {
  return new Promise((resolve, reject) => {
    let retries = 0;

    function check() {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, 1000);
        }
      });
      req.setTimeout(3000, () => {
        req.destroy();
        retries++;
        if (retries >= maxRetries) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, 1000);
        }
      });
    }
    check();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '智能考勤',
    icon: path.join(__dirname, '../public/icon-512x512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    backgroundColor: '#1e40af',
    show: false,
  });

  // 移除默认菜单栏
  Menu.setApplicationMenu(null);

  // 加载本地 Next.js 应用
  mainWindow.loadURL(LOCAL_URL);

  // 加载完成后显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 外部链接在默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron/shell').openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    console.log('[Electron] Starting Next.js server...');
    console.log('[Electron] isPackaged:', isPackaged());
    await startNextServer();
    console.log('[Electron] Next.js server started, waiting for it to be ready...');
    await waitForServer(HEALTH_URL);
    console.log('[Electron] Server is ready, opening window...');
    await createWindow();
  } catch (err) {
    console.error('[Electron] Failed to start:', err);
    // 即使服务启动失败也尝试打开窗口
    await createWindow();
  }
});

// macOS 点击 dock 图标重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 退出时关闭 Next.js 服务
app.on('before-quit', () => {
  if (nextServer) {
    console.log('[Electron] Stopping Next.js server...');
    nextServer.kill();
    nextServer = null;
  }
});

// ============================================
// 截屏模块 — 使用 FFmpeg gdigrab
// 全屏截取 Windows 桌面，保存为 PNG
// ============================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/** FFmpeg 可执行文件路径 */
function getFfmpegPath() {
  // 开发环境：项目 bin/ 目录
  const devPath = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(devPath)) return devPath;

  // 打包后：extraResources
  const prodPath = path.join(process.resourcesPath, 'bin', 'ffmpeg.exe');
  if (fs.existsSync(prodPath)) return prodPath;

  // 兜底：系统 PATH
  return 'ffmpeg';
}

/** 截图保存目录 */
function getScreenshotDir() {
  const dir = path.join(os.homedir(), 'Pictures', 'ScreenRecorder');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** 生成文件名 */
function generateFileName() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `截图_${y}-${mo}-${d}_${h}-${mi}-${s}.png`;
}

/**
 * 执行 FFmpeg 命令
 * @param {string[]} args
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegPath();
    const proc = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk; });
    proc.stderr.on('data', (chunk) => { stderr += chunk; });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`FFmpeg 退出码 ${code}: ${stderr.slice(-200)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`无法启动 FFmpeg: ${err.message}`));
    });
  });
}

/**
 * 全屏截图
 */
async function captureFullscreen() {
  const outputDir = getScreenshotDir();
  const fileName = generateFileName();
  const filePath = path.join(outputDir, fileName);

  // ffmpeg -f gdigrab -framerate 1 -i desktop -vframes 1 output.png
  await runFfmpeg([
    '-f', 'gdigrab',      // Windows GDI 屏幕捕获
    '-framerate', '1',    // 1 帧
    '-i', 'desktop',      // 输入：桌面
    '-vframes', '1',      // 只抓 1 帧
    '-update', '1',       // 单张图片模式（消除序列帧警告）
    '-y',                 // 覆盖已有文件
    filePath
  ]);

  return {
    filePath,
    fileName,
    createdAt: new Date().toISOString()
  };
}

/**
 * 区域截图
 * @param {{ x: number, y: number, width: number, height: number }} rect
 */
async function captureRegion(rect) {
  const outputDir = getScreenshotDir();
  const fileName = generateFileName();
  const filePath = path.join(outputDir, fileName);

  // ffmpeg -f gdigrab -framerate 1 -offset_x X -offset_y Y -video_size WxH -i desktop -vframes 1 output.png
  await runFfmpeg([
    '-f', 'gdigrab',
    '-framerate', '1',
    '-offset_x', String(Math.round(rect.x)),
    '-offset_y', String(Math.round(rect.y)),
    '-video_size', `${Math.round(rect.width)}x${Math.round(rect.height)}`,
    '-i', 'desktop',
    '-vframes', '1',
    '-update', '1',
    '-y',
    filePath
  ]);

  return {
    filePath,
    fileName,
    createdAt: new Date().toISOString()
  };
}

module.exports = { captureFullscreen, captureRegion };

// ============================================
// 录屏模块 — FFmpeg gdigrab + dshow 音频
// 支持：纯视频 / 视频+麦克风 / 视频+系统音频 / 视频+双音源混音
// ============================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let recordingProcess = null;
let recordingStartTime = null;

function getFfmpegPath() {
  const devPath = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(devPath)) return devPath;
  const prodPath = path.join(process.resourcesPath, 'bin', 'ffmpeg.exe');
  if (fs.existsSync(prodPath)) return prodPath;
  return 'ffmpeg';
}

function getVideoDir() {
  const dir = path.join(os.homedir(), 'Videos', 'ScreenRecorder');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generateFileName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `录制_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.mp4`;
}

/**
 * 开始录制
 * @param {object} params
 * @param {'fullscreen'|'region'} params.mode
 * @param {{x,y,width,height}} [params.rect]
 * @param {boolean} [params.enableMic]
 * @param {boolean} [params.enableSystemAudio]
 * @param {string} [params.micDevice]    - dshow 麦克风设备名
 * @param {string} [params.systemDevice] - dshow 环回设备名
 */
function startRecording(params) {
  if (recordingProcess) throw new Error('已经在录制中');

  const outputDir = getVideoDir();
  const fileName = generateFileName();
  const filePath = path.join(outputDir, fileName);

  const args = ['-f', 'gdigrab', '-framerate', '30'];

  // 区域录制参数
  if (params.mode === 'region' && params.rect) {
    args.push(
      '-offset_x', String(Math.round(params.rect.x)),
      '-offset_y', String(Math.round(params.rect.y)),
      '-video_size', `${Math.round(params.rect.width)}x${Math.round(params.rect.height)}`
    );
  }

  args.push('-i', 'desktop');

  // 构建音频输入
  const audioInputs = [];
  const audioLabels = [];

  if (params.enableMic && params.micDevice) {
    args.push('-f', 'dshow', '-i', `audio=${params.micDevice}`);
    audioInputs.push(params.micDevice);
    audioLabels.push('mic');
  }

  if (params.enableSystemAudio && params.systemDevice) {
    args.push('-f', 'dshow', '-i', `audio=${params.systemDevice}`);
    audioInputs.push(params.systemDevice);
    audioLabels.push('sys');
  }

  // 音频混音滤镜
  if (audioInputs.length === 2) {
    // 两个音源：混音
    args.push('-filter_complex', '[1:a][2:a]amix=inputs=2:duration=first');
  }

  // 视频编码
  args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p');

  // 音频编码（如果有音源）
  if (audioInputs.length > 0) {
    args.push('-c:a', 'aac', '-b:a', '128k');
  }

  // 映射：确保正确的流映射
  if (audioInputs.length === 2) {
    // 有混音滤镜时，视频来自 0:v，音频来自滤镜输出
    args.push('-map', '0:v', '-map', '[a]');
  } else if (audioInputs.length === 1) {
    args.push('-map', '0:v', '-map', '1:a');
  }

  args.push('-y', filePath);

  console.log('[录屏] FFmpeg:', args.join(' '));

  recordingProcess = spawn(getFfmpegPath(), args, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  recordingStartTime = Date.now();

  let stderr = '';
  recordingProcess.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  recordingProcess.on('close', (code) => {
    console.log(`[录屏] 退出码=${code}, 文件=${filePath}`);
    if (code !== 0 && code !== 255) {
      console.error('[录屏] FFmpeg stderr (最后500字):', stderr.slice(-500));
    }
    recordingProcess = null;
    recordingStartTime = null;
  });

  recordingProcess.on('error', (err) => {
    console.error('[录屏] 进程错误:', err);
    recordingProcess = null;
    recordingStartTime = null;
  });

  return { filePath, fileName };
}

/**
 * 停止录制
 */
function stopRecording() {
  if (!recordingProcess) throw new Error('当前没有在录制');

  const args = recordingProcess.spawnargs;
  const filePath = args[args.length - 1];
  const fileName = path.basename(filePath);
  const duration = Math.round((Date.now() - recordingStartTime) / 1000);

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (recordingProcess) recordingProcess.kill('SIGKILL');
      resolve({ filePath, fileName, duration });
    }, 8000);

    recordingProcess.on('close', () => {
      clearTimeout(timeout);
      resolve({ filePath, fileName, duration });
    });

    // 优雅退出
    try { recordingProcess.stdin.write('q\n'); } catch (e) {}
    setTimeout(() => {
      if (recordingProcess) recordingProcess.kill('SIGTERM');
    }, 2000);
  });
}

function isRecording() {
  return recordingProcess !== null && recordingProcess.exitCode === null;
}

function getElapsedSeconds() {
  if (!recordingStartTime) return 0;
  return Math.round((Date.now() - recordingStartTime) / 1000);
}

module.exports = { startRecording, stopRecording, isRecording, getElapsedSeconds };

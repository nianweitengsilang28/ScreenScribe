// ============================================
// 录屏模块 — FFmpeg gdigrab + dshow 音频
// ============================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let recordingProcess = null;
let recordingFilePath = null;
let recordingStartTime = null;
let recordingStderr = '';

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
  const p = (n) => String(n).padStart(2, '0');
  return `录制_${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}_${p(now.getHours())}-${p(now.getMinutes())}-${p(now.getSeconds())}.mp4`;
}

function startRecording(params) {
  if (recordingProcess && recordingProcess.exitCode === null) {
    throw new Error('已经在录制中');
  }

  // 清理上次残留状态
  recordingProcess = null;
  recordingFilePath = null;
  recordingStartTime = null;
  recordingStderr = '';

  const outputDir = getVideoDir();
  const fileName = generateFileName();
  const filePath = path.join(outputDir, fileName);

  const args = ['-f', 'gdigrab', '-framerate', '30'];

  if (params.mode === 'region' && params.rect) {
    args.push(
      '-offset_x', String(Math.round(params.rect.x)),
      '-offset_y', String(Math.round(params.rect.y)),
      '-video_size', `${Math.round(params.rect.width)}x${Math.round(params.rect.height)}`
    );
  }

  args.push('-i', 'desktop');

  // 音频输入
  const audioCount = (params.enableMic && params.micDevice ? 1 : 0)
    + (params.enableSystemAudio && params.systemDevice ? 1 : 0);

  if (params.enableMic && params.micDevice) {
    args.push('-f', 'dshow', '-i', `audio=${params.micDevice}`);
  }
  if (params.enableSystemAudio && params.systemDevice) {
    args.push('-f', 'dshow', '-i', `audio=${params.systemDevice}`);
  }

  // 混音
  if (audioCount === 2) {
    args.push('-filter_complex', '[1:a][2:a]amix=inputs=2:duration=first[a]');
  }

  args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p');

  if (audioCount > 0) {
    args.push('-c:a', 'aac', '-b:a', '128k');
  }

  // 流映射
  if (audioCount === 2) {
    args.push('-map', '0:v', '-map', '[a]');
  } else if (audioCount === 1) {
    args.push('-map', '0:v', '-map', '1:a');
  }

  args.push('-y', filePath);

  console.log('[录屏]', args.join(' '));

  const ffmpeg = getFfmpegPath();
  if (!fs.existsSync(ffmpeg)) {
    throw new Error(`FFmpeg 未找到: ${ffmpeg}`);
  }

  recordingProcess = spawn(ffmpeg, args, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  recordingFilePath = filePath;
  recordingStartTime = Date.now();
  recordingStderr = '';

  recordingProcess.stderr.on('data', (chunk) => {
    recordingStderr += chunk.toString();
  });

  // 监听意外退出
  recordingProcess.on('close', (code) => {
    console.log(`[录屏] 退出码=${code}`);
    // 如果是异常退出且还没被 stop 清理，记录错误
    if (code !== 0 && code !== null && recordingProcess) {
      console.error('[录屏] 异常退出, stderr 尾部:', recordingStderr.slice(-400));
    }
  });

  recordingProcess.on('error', (err) => {
    console.error('[录屏] 启动失败:', err.message);
    recordingProcess = null;
  });

  return { filePath, fileName };
}

function stopRecording() {
  if (!recordingProcess) {
    throw new Error('当前没有在录制。请先点击"开始录屏"按钮。');
  }

  const filePath = recordingFilePath;
  const fileName = path.basename(filePath);
  const duration = Math.round((Date.now() - recordingStartTime) / 1000);

  return new Promise((resolve) => {
    // 超时保护
    const forceKill = setTimeout(() => {
      if (recordingProcess) {
        try { recordingProcess.kill('SIGKILL'); } catch (e) {}
      }
      cleanup();
      resolve({ filePath, fileName, duration });
    }, 10000);

    const onClose = () => {
      clearTimeout(forceKill);
      cleanup();
      resolve({ filePath, fileName, duration });
    };

    recordingProcess.once('close', onClose);

    // 优雅停止 FFmpeg
    try {
      recordingProcess.stdin.write('q\n');
    } catch (e) {
      // stdin 不可用，直接 SIGTERM
      try { recordingProcess.kill('SIGTERM'); } catch (e2) {}
    }

    // 2 秒后还没退出发 SIGTERM
    setTimeout(() => {
      if (recordingProcess && recordingProcess.exitCode === null) {
        try { recordingProcess.kill('SIGTERM'); } catch (e) {}
      }
    }, 2000);
  });
}

function cleanup() {
  recordingProcess = null;
  recordingFilePath = null;
  recordingStartTime = null;
  recordingStderr = '';
}

function isRecording() {
  return recordingProcess !== null && recordingProcess.exitCode === null;
}

function getElapsedSeconds() {
  if (!recordingStartTime) return 0;
  return Math.round((Date.now() - recordingStartTime) / 1000);
}

module.exports = { startRecording, stopRecording, isRecording, getElapsedSeconds };

// ============================================
// 录屏模块 — FFmpeg gdigrab + dshow 音频
// ============================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 使用闭包防止并发问题
let proc = null;
let filePath = null;
let startTime = null;
let stderrBuf = '';
let stopped = false; // 防止重复 stop

function ffmpegPath() {
  const dev = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(dev)) return dev;
  const prod = path.join(process.resourcesPath, 'bin', 'ffmpeg.exe');
  if (fs.existsSync(prod)) return prod;
  return 'ffmpeg';
}

function videoDir() {
  const d = path.join(os.homedir(), 'Videos', 'ScreenRecorder');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function genName() {
  const n = new Date();
  const p = (v) => String(v).padStart(2, '0');
  return `录制_${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())}_${p(n.getHours())}-${p(n.getMinutes())}-${p(n.getSeconds())}.mp4`;
}

function buildArgs(params, outPath) {
  const args = ['-f', 'gdigrab', '-framerate', '30'];

  if (params.mode === 'region' && params.rect) {
    args.push(
      '-offset_x', String(Math.round(params.rect.x)),
      '-offset_y', String(Math.round(params.rect.y)),
      '-video_size', `${Math.round(params.rect.width)}x${Math.round(params.rect.height)}`
    );
  }

  args.push('-i', 'desktop');

  const ac = (params.enableMic && params.micDevice ? 1 : 0)
    + (params.enableSystemAudio && params.systemDevice ? 1 : 0);

  if (params.enableMic && params.micDevice) {
    args.push('-f', 'dshow', '-i', `audio=${params.micDevice}`);
  }
  if (params.enableSystemAudio && params.systemDevice) {
    args.push('-f', 'dshow', '-i', `audio=${params.systemDevice}`);
  }

  if (ac === 2) {
    args.push('-filter_complex', '[1:a][2:a]amix=inputs=2:duration=first[a]');
  }

  args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p');

  if (ac > 0) {
    args.push('-c:a', 'aac', '-b:a', '128k');
  }

  if (ac === 2) {
    args.push('-map', '0:v', '-map', '[a]');
  } else if (ac === 1) {
    args.push('-map', '0:v', '-map', '1:a');
  }

  args.push('-y', outPath);
  return args;
}

function reset() {
  proc = null;
  filePath = null;
  startTime = null;
  stderrBuf = '';
  stopped = false;
}

/**
 * 开始录制 — 返回 Promise，等 FFmpeg 确认存活后才 resolve
 */
function startRecording(params) {
  return new Promise((resolve, reject) => {
    if (proc && proc.exitCode === null) {
      return reject(new Error('已经在录制中'));
    }

    reset();

    const outDir = videoDir();
    const name = genName();
    const fp = path.join(outDir, name);
    const exe = ffmpegPath();

    if (!fs.existsSync(exe)) {
      return reject(new Error(`FFmpeg 未找到: ${exe}`));
    }

    const args = buildArgs(params, fp);
    console.log('[录屏]', args.join(' '));

    proc = spawn(exe, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    filePath = fp;
    startTime = Date.now();

    proc.stderr.on('data', (c) => { stderrBuf += c.toString(); });

    // 启动后等 500ms，确认 FFmpeg 没有立即崩溃
    const earlyCheck = setTimeout(() => {
      if (proc && proc.exitCode === null) {
        // FFmpeg 还活着，成功
        resolve({ filePath: fp, fileName: name });
      }
    }, 500);

    proc.on('error', (err) => {
      clearTimeout(earlyCheck);
      reset();
      reject(new Error(`FFmpeg 启动失败: ${err.message}`));
    });

    proc.on('close', (code) => {
      clearTimeout(earlyCheck);
      // 如果是 stopRecording 正常停止，不处理
      if (stopped) return;

      // 意外退出
      const errMsg = stderrBuf.slice(-400);
      console.error(`[录屏] 意外退出 (码=${code}):`, errMsg);
      reset();
    });
  });
}

/**
 * 停止录制 — 返回 Promise<{ filePath, fileName, duration }>
 */
function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!proc) {
      return reject(new Error('当前没有在录制'));
    }

    // 已经停了
    if (proc.exitCode !== null) {
      const dur = Math.round((Date.now() - startTime) / 1000);
      const fp = filePath;
      const fn = path.basename(fp);
      reset();
      return resolve({ filePath: fp, fileName: fn, duration: dur });
    }

    stopped = true;
    const fp = filePath;
    const fn = path.basename(fp);
    const dur = Math.round((Date.now() - startTime) / 1000);

    // 超时强制杀
    const force = setTimeout(() => {
      if (proc) {
        try { proc.kill('SIGKILL'); } catch (e) {}
      }
      const f = filePath || fp;
      reset();
      resolve({ filePath: f, fileName: path.basename(f), duration: dur });
    }, 8000);

    proc.once('close', () => {
      clearTimeout(force);
      const f = filePath || fp;
      reset();
      resolve({ filePath: f, fileName: path.basename(f), duration: dur });
    });

    // 优雅停止
    try {
      proc.stdin.write('q\n');
    } catch (e) {
      try { proc.kill('SIGTERM'); } catch (e2) {}
    }

    // 2 秒后 SIGTERM
    setTimeout(() => {
      if (proc && proc.exitCode === null) {
        try { proc.kill('SIGTERM'); } catch (e) {}
      }
    }, 2000);
  });
}

function isRecording() {
  return proc !== null && proc.exitCode === null;
}

module.exports = { startRecording, stopRecording, isRecording };

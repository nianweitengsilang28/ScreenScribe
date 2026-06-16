// ============================================
// 语音识别模块 — whisper.cpp 封装
// 流程：提取音频 → 语音识别 → SRT 字幕
// ============================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/** FFmpeg 路径 */
function getFfmpegPath() {
  const devPath = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(devPath)) return devPath;
  return 'ffmpeg';
}

/** whisper-cli 路径 */
function getWhisperPath() {
  const devPath = path.join(__dirname, '..', 'bin', 'whisper-cli.exe');
  if (fs.existsSync(devPath)) return devPath;
  return 'whisper-cli';
}

/** 模型路径 */
function getModelPath() {
  const smallModel = path.join(__dirname, '..', 'models', 'ggml-small.bin');
  if (fs.existsSync(smallModel)) return smallModel;

  const baseModel = path.join(__dirname, '..', 'models', 'ggml-base.bin');
  if (fs.existsSync(baseModel)) return baseModel;

  const tinyModel = path.join(__dirname, '..', 'models', 'ggml-tiny.bin');
  if (fs.existsSync(tinyModel)) return tinyModel;

  return null;
}

/** 字幕输出目录 */
function getSubtitleDir() {
  const dir = path.join(os.homedir(), 'AppData', 'Roaming', 'screen-recorder', 'subtitles');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * 运行命令并返回结果
 */
function runCommand(exePath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(exePath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`退出码 ${code}: ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`无法启动进程: ${err.message}`));
    });
  });
}

/**
 * 从视频中提取音频为 WAV (16kHz, mono, PCM)
 */
async function extractAudio(videoPath, outputWav) {
  const ffmpeg = getFfmpegPath();
  await runCommand(ffmpeg, [
    '-i', videoPath,
    '-vn',                    // 不要视频
    '-acodec', 'pcm_s16le',   // PCM 16-bit
    '-ar', '16000',           // 16kHz（whisper 要求）
    '-ac', '1',               // 单声道
    '-y',
    outputWav
  ]);
  return outputWav;
}

/**
 * 语音识别：WAV → SRT 字幕
 * @param {string} wavPath    - 音频文件路径
 * @param {string} outputBase - 输出基础名（不含扩展名）
 * @param {Function} onProgress - 进度回调 (percent, stage)
 * @returns {Promise<{srtPath: string, text: string}>}
 */
async function transcribe(wavPath, outputBase, onProgress) {
  const modelPath = getModelPath();
  if (!modelPath) {
    throw new Error(
      '未找到语音模型文件！\n\n' +
      '请下载模型到 models/ 目录：\n' +
      '  ggml-small.bin (推荐，460MB):\n' +
      '  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin\n\n' +
      '  或 ggml-base.bin (140MB):\n' +
      '  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin'
    );
  }

  if (onProgress) onProgress(5, 'extracting');

  const whisper = getWhisperPath();

  if (onProgress) onProgress(15, 'transcribing');

  // whisper-cli -m model.bin -f audio.wav -osrt -of output_base
  const { stdout, stderr } = await runCommand(whisper, [
    '-m', modelPath,
    '-f', wavPath,
    '-osrt',                  // 输出 SRT 格式
    '-of', outputBase,        // 输出文件基础路径
    '-l', 'zh',               // 中文
    '--print-progress',       // 打印进度到 stderr
  ]);

  const srtPath = outputBase + '.srt';
  const txtPath = outputBase + '.txt';

  // 读取生成的 SRT
  let srtContent = '';
  if (fs.existsSync(srtPath)) {
    srtContent = fs.readFileSync(srtPath, 'utf-8');
  }

  // 读取纯文本（如果有）
  let text = '';
  if (fs.existsSync(txtPath)) {
    text = fs.readFileSync(txtPath, 'utf-8');
  }

  if (onProgress) onProgress(100, 'done');

  return { srtPath, srtContent, text };
}

/**
 * 完整的视频 → 字幕流程
 * @param {string} videoPath
 * @param {Function} onProgress
 * @returns {Promise<{srtPath: string}>}
 */
async function generateSubtitle(videoPath, onProgress) {
  if (onProgress) onProgress(0, 'extracting');

  const subtitleDir = getSubtitleDir();
  const baseName = path.basename(videoPath, path.extname(videoPath));
  const wavPath = path.join(subtitleDir, baseName + '.wav');
  // whisper-cli 的 -of 参数只接受不含扩展名的路径，用正斜杠避免编码问题
  const outputBase = path.join(subtitleDir, baseName).replace(/\\/g, '/');

  console.log('[字幕] 视频:', videoPath);
  console.log('[字幕] WAV:', wavPath);
  console.log('[字幕] 输出:', outputBase);

  await extractAudio(videoPath, wavPath);

  if (!fs.existsSync(wavPath)) {
    throw new Error('音频提取失败：WAV 文件未生成。请确认视频包含声音。');
  }

  const result = await transcribe(wavPath, outputBase, onProgress);

  // 清理临时 WAV
  try { fs.unlinkSync(wavPath); } catch (e) {}

  return result;
}

/** 检查模型是否就绪 */
function isModelReady() {
  return getModelPath() !== null;
}

module.exports = {
  generateSubtitle,
  extractAudio,
  transcribe,
  isModelReady,
  getModelPath
};

// ============================================
// 音频设备检测模块
// 通过 FFmpeg dshow 获取可用音频设备
// ============================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function getFfmpegPath() {
  const devPath = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(devPath)) return devPath;
  const prodPath = path.join(process.resourcesPath, 'bin', 'ffmpeg.exe');
  if (fs.existsSync(prodPath)) return prodPath;
  return 'ffmpeg';
}

/**
 * 检测系统中的音频设备
 * @returns {Promise<{ microphones: string[], loopbacks: string[] }>}
 */
async function detectAudioDevices() {
  return new Promise((resolve) => {
    const ffmpeg = getFfmpegPath();
    const proc = spawn(ffmpeg, ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    proc.stderr.on('data', (chunk) => { output += chunk.toString(); });

    proc.on('close', () => {
      const microphones = [];
      const loopbacks = [];

      // 解析 dshow 设备列表
      const lines = output.split('\n');
      for (const line of lines) {
        // 匹配 DirectShow 音频设备: "设备名" (audio)
        const match = line.match(/"(.+)"\s+\(audio\)/);
        if (match) {
          const name = match[1];
          const lower = name.toLowerCase();
          // 判断是否为环回/系统音频设备
          if (
            lower.includes('loopback') ||
            lower.includes('stereo mix') ||
            lower.includes('what u hear') ||
            lower.includes('wave out') ||
            lower.includes('混音') ||
            lower.includes('立体声混音') ||
            lower.includes('播放') ||
            lower.includes('speakers') ||
            lower.includes('output')
          ) {
            loopbacks.push(name);
          } else {
            // 其他音频设备视为麦克风
            microphones.push(name);
          }
        }
      }

      resolve({ microphones, loopbacks });
    });

    proc.on('error', () => {
      resolve({ microphones: [], loopbacks: [] });
    });
  });
}

/** 获取推荐的麦克风设备名 */
function getDefaultMicrophone(devices) {
  // 优先选非虚拟的麦克风
  const real = devices.microphones.filter(m => !m.includes('Virtual') && !m.includes('虚拟'));
  return real.length > 0 ? real[0] : devices.microphones[0] || null;
}

/** 获取推荐的系统音频环回设备名 */
function getDefaultLoopback(devices) {
  if (devices.loopbacks.length > 0) return devices.loopbacks[0];
  return null; // 无环回设备
}

module.exports = {
  detectAudioDevices,
  getDefaultMicrophone,
  getDefaultLoopback
};

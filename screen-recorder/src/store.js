// ============================================
// 文件元数据存储模块
// 使用本地 JSON 文件持久化
// ============================================

const path = require('path');
const fs = require('fs');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'screen-recorder');
const DATA_FILE = path.join(DATA_DIR, 'files.json');

/** 确保数据目录存在 */
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** 读取全部文件记录 */
function loadFiles() {
  ensureDir();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return data.files || [];
    }
  } catch (err) {
    console.error('读取文件记录失败:', err.message);
  }
  return [];
}

/** 保存全部文件记录 */
function saveFiles(files) {
  ensureDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ files }, null, 2), 'utf-8');
  } catch (err) {
    console.error('保存文件记录失败:', err.message);
  }
}

/** 添加一条文件记录 */
function addFile(record) {
  const files = loadFiles();
  files.unshift(record); // 最新在前面
  saveFiles(files);
  return record;
}

/** 获取全部文件（支持筛选） */
function getFiles(filter = 'all') {
  let files = loadFiles();
  if (filter === 'video') {
    files = files.filter(f => f.type === 'video');
  } else if (filter === 'screenshot') {
    files = files.filter(f => f.type === 'screenshot');
  }
  // 排序：置顶优先，再按时间倒序
  files.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  return files;
}

/** 更新一条记录 */
function updateFile(id, partial) {
  const files = loadFiles();
  const idx = files.findIndex(f => f.id === id);
  if (idx !== -1) {
    files[idx] = { ...files[idx], ...partial };
    saveFiles(files);
    return files[idx];
  }
  return null;
}

/** 删除一条记录（不删除物理文件） */
function removeFile(id) {
  const files = loadFiles();
  const filtered = files.filter(f => f.id !== id);
  if (filtered.length < files.length) {
    saveFiles(filtered);
    return true;
  }
  return false;
}

/** 切换置顶状态 */
function togglePin(id) {
  const files = loadFiles();
  const idx = files.findIndex(f => f.id === id);
  if (idx !== -1) {
    files[idx].isPinned = !files[idx].isPinned;
    saveFiles(files);
    return files[idx];
  }
  return null;
}

module.exports = {
  addFile,
  getFiles,
  updateFile,
  removeFile,
  togglePin,
};

// ============================================
// 截屏识字幕 — 渲染进程交互逻辑
// ============================================

// ===== 状态 =====
const state = {
  mode: 'fullscreen',       // 'fullscreen' | 'region'
  micEnabled: false,
  sysAudioEnabled: true,
  micDevice: null,           // 麦克风设备名
  sysAudioDevice: null,      // 系统音频环回设备名（可能为 null）
  isRecording: false,
  recordingSeconds: 0,
  recordingTimer: null,
  currentFilter: 'all',     // 'all' | 'video' | 'screenshot'
  contextTargetId: null,
  files: [],                // 从主进程加载的文件列表
};

// ===== DOM 工具 =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== 初始化：从主进程加载文件列表 =====
async function loadFiles() {
  state.files = await window.api.getFiles(state.currentFilter);
  renderFileList();
}

// ===== 模式切换 =====
$$('.mode-option').forEach(option => {
  option.addEventListener('click', () => {
    $$('.mode-option').forEach(o => o.classList.remove('active'));
    option.classList.add('active');
    state.mode = option.dataset.mode;
  });
});

// ===== 筛选标签 =====
$$('.filter-tab').forEach(tab => {
  tab.addEventListener('click', async () => {
    $$('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.currentFilter = tab.dataset.filter;
    state.files = await window.api.getFiles(state.currentFilter);
    renderFileList();
  });
});

// ===== 右键菜单 =====
const contextMenu = $('#contextMenu');
const contextOverlay = $('#contextOverlay');

function showContextMenu(x, y, fileId) {
  state.contextTargetId = fileId;
  const file = state.files.find(f => f.id === fileId);
  if (!file) return;

  $('#contextPinText').textContent = file.isPinned ? '取消置顶' : '📌 置顶';

  const subItem = contextMenu.querySelector('[data-action="subtitle"]');
  const exportItem = contextMenu.querySelector('[data-action="export-srt"]');
  if (file.type === 'screenshot') {
    subItem.style.display = 'none';
    exportItem.style.display = 'none';
  } else {
    subItem.style.display = 'flex';
    exportItem.style.display = file.hasSubtitle ? 'flex' : 'none';
  }

  const menuW = 160;
  const menuH = file.type === 'screenshot' ? 152 : 216;
  const maxX = window.innerWidth - menuW - 8;
  const maxY = window.innerHeight - menuH - 8;
  contextMenu.style.left = Math.min(x, maxX) + 'px';
  contextMenu.style.top = Math.min(y, maxY) + 'px';
  contextMenu.classList.add('visible');
  contextOverlay.classList.add('visible');
}

function hideContextMenu() {
  contextMenu.classList.remove('visible');
  contextOverlay.classList.remove('visible');
  state.contextTargetId = null;
}

contextOverlay.addEventListener('click', hideContextMenu);

contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const action = item.dataset.action;
    const fileId = state.contextTargetId;
    hideContextMenu();

    switch (action) {
      case 'pin':       togglePin(fileId);       break;
      case 'rename':    showRenameModal(fileId);  break;
      case 'delete':    showDeleteModal(fileId);  break;
      case 'subtitle':  generateSubtitle(fileId); break;
      case 'export-srt': exportSrt(fileId);       break;
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideContextMenu();
});

// ===== 弹窗管理 =====
function showModal(id) { $('#' + id).classList.add('visible'); }
function hideModal(id) { $('#' + id).classList.remove('visible'); }

$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideModal(overlay.id);
  });
});

// ---- 重命名 ----
function showRenameModal(fileId) {
  const file = state.files.find(f => f.id === fileId);
  if (!file) return;
  $('#renameInput').value = file.fileName;
  $('#renameModal')._fileId = fileId;
  showModal('#renameModal');
  setTimeout(() => $('#renameInput').focus(), 100);
}

$('#btnRenameCancel').addEventListener('click', () => hideModal('#renameModal'));

$('#btnRenameConfirm').addEventListener('click', async () => {
  const fileId = $('#renameModal')._fileId;
  const newName = $('#renameInput').value.trim();
  if (!newName) return;
  const result = await window.api.renameFile(fileId, newName);
  if (result.success) {
    hideModal('#renameModal');
    await loadFiles();
  } else {
    alert('重命名失败：' + result.error);
  }
});

$('#renameInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#btnRenameConfirm').click();
  if (e.key === 'Escape') hideModal('#renameModal');
});

// ---- 删除 ----
function showDeleteModal(fileId) {
  const file = state.files.find(f => f.id === fileId);
  if (!file) return;
  $('#deleteModal')._fileId = fileId;
  $('#deleteMessage').textContent = `确定要删除「${escapeHtml(file.fileName)}」吗？此操作不可恢复。`;
  showModal('#deleteModal');
}

$('#btnDeleteCancel').addEventListener('click', () => hideModal('#deleteModal'));

$('#btnDeleteConfirm').addEventListener('click', async () => {
  const fileId = $('#deleteModal')._fileId;
  const result = await window.api.deleteFile(fileId);
  if (result.success) {
    hideModal('#deleteModal');
    await loadFiles();
  } else {
    alert('删除失败：' + result.error);
  }
});

// ---- 字幕进度 ----
$('#btnSubtitleCancel').addEventListener('click', () => hideModal('#subtitleModal'));

// ===== 置顶 =====
async function togglePin(fileId) {
  await window.api.togglePin(fileId);
  await loadFiles();
}

// ===== 字幕操作 =====
async function generateSubtitle(fileId) {
  showModal('#subtitleModal');
  const bar = $('#subtitleProgress');
  const text = $('#subtitleProgressText');
  text.textContent = '正在提取音频...';
  bar.style.width = '0%';

  // 监听进度
  window.api.onSubtitleProgress((data) => {
    if (data.stage === 'extracting') {
      text.textContent = '正在提取音频...';
      bar.style.width = Math.min(data.percent, 15) + '%';
    } else if (data.stage === 'transcribing') {
      text.textContent = '正在识别语音（可能需要几分钟）...';
      bar.style.width = (15 + Math.min(data.percent, 85)) + '%';
    } else if (data.stage === 'done') {
      text.textContent = '✅ 字幕生成完成！';
      bar.style.width = '100%';
    }
  });

  const result = await window.api.generateSubtitle(fileId);
  window.api.removeSubtitleListener();

  if (result.success) {
    setTimeout(async () => {
      hideModal('#subtitleModal');
      await loadFiles();
    }, 1000);
  } else {
    bar.style.width = '0%';
    text.textContent = '❌ ' + result.error;
  }
}

async function exportSrt(fileId) {
  const result = await window.api.exportSrt(fileId);
  if (result.success) {
    alert('📤 字幕已导出到：' + result.exportPath);
  } else if (!result.canceled) {
    alert('导出失败：' + result.error);
  }
}

// ===== 截屏按钮 =====
$('#btnScreenshot').addEventListener('click', async () => {
  if (state.isRecording) return;

  const btn = $('#btnScreenshot');
  btn.style.transform = 'scale(0.9)';
  setTimeout(() => { btn.style.transform = ''; }, 150);

  let rect = null;

  // 区域模式：先弹出框选遮罩
  if (state.mode === 'region') {
    const regionResult = await window.api.startRegionSelect();
    if (regionResult.canceled) return; // 用户取消
    rect = regionResult.rect;
  }

  const result = await window.api.takeScreenshot(state.mode, rect);
  if (result.success) {
    state.files = await window.api.getFiles(state.currentFilter);
    renderFileList();
  } else {
    alert('❌ 截屏失败：' + result.error);
  }
});

// ===== 录屏按钮 =====
$('#btnRecord').addEventListener('click', () => {
  if (!state.isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

async function startRecording() {
  // 区域模式：先框选
  let rect = null;
  if (state.mode === 'region') {
    const regionResult = await window.api.startRegionSelect();
    if (regionResult.canceled) return;
    rect = regionResult.rect;
  }

  // 启动 FFmpeg 录制（带音频参数）
  const result = await window.api.startRecording({
    mode: state.mode,
    rect,
    enableMic: state.micEnabled,
    enableSystemAudio: state.sysAudioEnabled,
    micDevice: state.micDevice,
    systemDevice: state.sysAudioDevice
  });
  if (!result.success) {
    alert('❌ 录制启动失败：' + result.error);
    return;
  }

  state.isRecording = true;
  state.recordingSeconds = 0;

  const btn = $('#btnRecord');
  btn.querySelector('.btn-icon').textContent = '⏹️';
  btn.querySelector('span:last-child').textContent = '停止录屏';
  btn.classList.add('btn-recording');
  $('#recordingTimer').classList.add('visible');
  updateTimerDisplay();

  state.recordingTimer = setInterval(() => {
    state.recordingSeconds++;
    updateTimerDisplay();
  }, 1000);
}

async function stopRecording() {
  const result = await window.api.stopRecording();
  if (!result.success) {
    alert('⚠️ 录制停止异常：' + result.error);
  }

  state.isRecording = false;
  clearInterval(state.recordingTimer);
  state.recordingTimer = null;

  const btn = $('#btnRecord');
  btn.querySelector('.btn-icon').textContent = '🔴';
  btn.querySelector('span:last-child').textContent = '开始录屏';
  btn.classList.remove('btn-recording');
  $('#recordingTimer').classList.remove('visible');

  state.recordingSeconds = 0;
  updateTimerDisplay();

  // 刷新文件列表
  state.files = await window.api.getFiles(state.currentFilter);
  renderFileList();
}

function updateTimerDisplay() {
  const s = state.recordingSeconds;
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  $('#timerDisplay').textContent = `${mm}:${ss}`;
}

// ===== 渲染文件列表 =====
function renderFileList() {
  const container = $('#fileList');
  const emptyEl = $('#emptyState');
  let files = [...state.files];

  // 排序：置顶优先，再按时间倒序
  files.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // 清空旧卡片
  container.querySelectorAll('.file-card').forEach(c => c.remove());

  // 更新筛选计数
  updateFilterCounts();

  // 空状态
  if (files.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  // 渲染卡片
  files.forEach(file => {
    const card = document.createElement('div');
    card.className = 'file-card' + (file.isPinned ? ' pinned' : '');
    card.dataset.fileId = file.id;

    const isVideo = file.type === 'video';
    const typeIcon = isVideo ? '🎬' : '🖼️';
    const metaLeft = isVideo
      ? (file.duration ? formatDuration(file.duration) : '视频')
      : 'PNG 截图';
    const subtitleBadge = file.hasSubtitle
      ? '<span class="file-badge subtitle">💬 字幕</span>'
      : '';

    card.innerHTML = `
      <span class="file-icon">${typeIcon}</span>
      <div class="file-info">
        <span class="file-name" title="${escapeHtml(file.fileName)}">${escapeHtml(file.fileName)}</span>
        <div class="file-meta">
          <span>${metaLeft}</span>
          <span>${formatDate(file.createdAt)}</span>
          ${subtitleBadge}
        </div>
      </div>
      <span class="pin-icon">${file.isPinned ? '📌' : ''}</span>
      <button class="file-actions-trigger" title="更多操作">⋮</button>
    `;

    // 右键
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, file.id);
    });

    // ⋮ 按钮
    const trigger = card.querySelector('.file-actions-trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = trigger.getBoundingClientRect();
      showContextMenu(rect.left - 140, rect.bottom + 4, file.id);
    });

    // 双击打开
    card.addEventListener('dblclick', () => {
      window.api.openFile(file.id);
    });

    container.appendChild(card);
  });
}

async function updateFilterCounts() {
  const all = await window.api.getFiles('all');
  const videos = all.filter(f => f.type === 'video');
  const screenshots = all.filter(f => f.type === 'screenshot');
  $('#countAll').textContent = `(${all.length})`;
  $('#countVideo').textContent = `(${videos.length})`;
  $('#countScreenshot').textContent = `(${screenshots.length})`;
}

// ===== 工具函数 =====
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== 音频设备初始化 =====
async function initAudioDevices() {
  const result = await window.api.getAudioDevices();
  if (result.success) {
    state.micDevice = result.defaultMic;
    state.sysAudioDevice = result.defaultSystem;

    // 如果没有系统音频设备，禁用开关并提示
    if (!result.defaultSystem) {
      state.sysAudioEnabled = false;
      $('#sysAudioToggle').checked = false;
      $('#sysAudioToggle').disabled = true;
      const label = $('#sysAudioToggle').closest('.toggle-group').querySelector('.toggle-label');
      label.style.opacity = '0.4';
      label.title = '未检测到系统音频环回设备\n请在 Windows 声音设置中启用"立体声混音"';
    }
    if (!result.defaultMic) {
      state.micEnabled = false;
      $('#micToggle').checked = false;
      $('#micToggle').disabled = true;
      const label = $('#micToggle').closest('.toggle-group').querySelector('.toggle-label');
      label.style.opacity = '0.4';
    }

    console.log('音频设备:', {
      mic: state.micDevice,
      sys: state.sysAudioDevice,
      loopbacks: result.loopbacks
    });
  }
}

// Toggle 开关事件
$('#micToggle').addEventListener('change', () => {
  state.micEnabled = $('#micToggle').checked;
});
$('#sysAudioToggle').addEventListener('change', () => {
  state.sysAudioEnabled = $('#sysAudioToggle').checked;
});

// ===== 初始加载 =====
async function init() {
  await initAudioDevices();
  await loadFiles();
}
init();
console.log('🎀 截屏识字幕 v1.0.0 — 就绪');

// storage.js — all localStorage reads/writes live here.
// Everything is client-side only; nothing leaves the browser.

const Storage = (() => {

  const KEY_BATCHES = 'tiket_batches_v1';
  const KEY_SETTINGS = 'tiket_settings_v1';
  const KEY_COUNTER = 'tiket_counter_v1';

  function loadBatches() {
    try {
      const raw = localStorage.getItem(KEY_BATCHES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Gagal membaca data batch, mengembalikan array kosong.', e);
      return [];
    }
  }

  function saveBatches(batches) {
    try {
      localStorage.setItem(KEY_BATCHES, JSON.stringify(batches));
      return true;
    } catch (e) {
      console.error('Gagal menyimpan data (mungkin localStorage penuh).', e);
      return false;
    }
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(KEY_SETTINGS);
      return raw ? JSON.parse(raw) : { retentionDays: 7 };
    } catch (e) {
      return { retentionDays: 7 };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  }

  function nextCode() {
    let n = parseInt(localStorage.getItem(KEY_COUNTER) || '0', 10);
    n += 1;
    localStorage.setItem(KEY_COUNTER, String(n));
    return `LDY-${String(n).padStart(4, '0')}`;
  }

  // Auto-delete: only batches with a resolved status (selesai_lengkap /
  // selesai_ada_hilang) whose completedAt is older than retentionDays are
  // removed. Batches still "diproses" are never auto-deleted, so an
  // unresolved missing-item investigation can't silently disappear.
  function runAutoCleanup(batches, retentionDays) {
    const now = Date.now();
    const cutoffMs = retentionDays * 24 * 60 * 60 * 1000;
    const kept = [];
    let removed = 0;
    for (const b of batches) {
      const isResolved = b.status === 'selesai_lengkap' || b.status === 'selesai_ada_hilang';
      if (isResolved && b.completedAt && (now - b.completedAt) > cutoffMs) {
        removed++;
        continue;
      }
      kept.push(b);
    }
    return { kept, removed };
  }

  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'tiket-laundry-tracker',
      version: 1,
      settings: loadSettings(),
      batches: loadBatches()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `tiket-laundry-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importData(jsonText) {
    const data = JSON.parse(jsonText);
    if (!data || !Array.isArray(data.batches)) {
      throw new Error('Format file tidak dikenali.');
    }
    saveBatches(data.batches);
    if (data.settings) saveSettings(data.settings);
    return data.batches.length;
  }

  function clearAll() {
    localStorage.removeItem(KEY_BATCHES);
    localStorage.removeItem(KEY_SETTINGS);
    localStorage.removeItem(KEY_COUNTER);
  }

  return {
    loadBatches, saveBatches,
    loadSettings, saveSettings,
    nextCode, runAutoCleanup,
    exportData, importData, clearAll
  };
})();

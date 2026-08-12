// storage.js — all localStorage reads/writes live here.

const Storage = (() => {
  // Changed storage keys to avoid conflicts with previous version schemas
  const KEY_BATCHES = 'ticket_batches_v2';
  const KEY_SETTINGS = 'ticket_settings_v2';
  const KEY_COUNTER = 'ticket_counter_v2';

  function loadBatches() {
    try {
      const raw = localStorage.getItem(KEY_BATCHES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse batches, returning empty array.', e);
      return [];
    }
  }

  function saveBatches(batches) {
    try {
      localStorage.setItem(KEY_BATCHES, JSON.stringify(batches));
      return true;
    } catch (e) {
      console.error('Failed to save data (localStorage might be full).', e);
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

  function runAutoCleanup(batches, retentionDays) {
    const now = Date.now();
    const cutoffMs = retentionDays * 24 * 60 * 60 * 1000;
    const kept = [];
    let removed = 0;
    
    for (const b of batches) {
      const isResolved = b.status === 'completed' || b.status === 'missing_items';
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
      app: 'ticket-laundry-tracker',
      version: 2,
      settings: loadSettings(),
      batches: loadBatches()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `ticket-laundry-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importData(jsonText) {
    const data = JSON.parse(jsonText);
    if (!data || !Array.isArray(data.batches)) {
      throw new Error('Unrecognized file format.');
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

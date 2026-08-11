// app.js — application state, rendering, and event wiring.

(function () {
  'use strict';

  // ---------- state ----------
  let batches = [];
  let settings = { retentionDays: 7 };
  let draftItems = [];
  let photoBeforeData = null;
  let photoAfterDraft = null;
  let activeVerifyId = '';
  let activeFilter = 'all';

  // ---------- element refs ----------
  const el = (id) => document.getElementById(id);

  const els = {
    tabs: el('tabs'),
    panels: document.querySelectorAll('.tab-panel'),

    batchForm: el('batch-form'),
    laundryName: el('f-laundry-name'),
    dateIn: el('f-date-in'),
    dateEst: el('f-date-est'),
    notes: el('f-notes'),

    photoBeforeDrop: el('photo-before-drop'),
    photoBeforeInput: el('f-photo-before'),
    photoBeforeEmpty: el('photo-before-empty'),
    photoBeforePreview: el('photo-before-preview'),
    photoBeforeImg: el('photo-before-img'),
    photoBeforeRemove: el('photo-before-remove'),

    itemName: el('f-item-name'),
    itemTag: el('f-item-tag'),
    itemAdd: el('f-item-add'),
    itemList: el('item-list'),
    itemListEmpty: el('item-list-empty'),
    itemsCount: el('items-count'),

    filterChips: el('filter-chips'),
    ticketList: el('ticket-list'),
    ticketListEmpty: el('ticket-list-empty'),

    verifySelect: el('verify-select'),
    verifyEmpty: el('verify-empty'),
    verifyDetail: el('verify-detail'),
    verifyTitle: el('verify-title'),
    verifyStatusStamp: el('verify-status-stamp'),

    photoAfterDrop: el('photo-after-drop'),
    photoAfterInput: el('f-photo-after'),
    photoAfterEmpty: el('photo-after-empty'),
    photoAfterPreview: el('photo-after-preview'),
    photoAfterImg: el('photo-after-img'),
    photoAfterRemove: el('photo-after-remove'),

    photoCompare: el('photo-compare'),
    compareBeforeImg: el('compare-before-img'),
    compareAfterImg: el('compare-after-img'),

    checklist: el('checklist'),
    checklistProgress: el('checklist-progress'),
    btnCheckAll: el('btn-check-all'),
    btnFinishVerify: el('btn-finish-verify'),
    missingBanner: el('missing-banner'),

    statGrid: el('stat-grid'),
    missingList: el('missing-list'),
    missingListEmpty: el('missing-list-empty'),
    expiryList: el('expiry-list'),
    expiryListEmpty: el('expiry-list-empty'),

    retention: el('f-retention'),
    btnExport: el('btn-export'),
    fImport: el('f-import'),
    btnClearAll: el('btn-clear-all'),

    toast: el('toast')
  };

  // ---------- toast ----------
  let toastTimer = null;
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2600);
  }

  // ---------- tabs ----------
  els.tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    els.panels.forEach(p => p.classList.toggle('active', p.id === `tab-${btn.dataset.tab}`));
    if (btn.dataset.tab === 'dashboard') renderDashboard();
  });

  function goToVerifyTab(batchId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'verify'));
    els.panels.forEach(p => p.classList.toggle('active', p.id === 'tab-verify'));
    els.verifySelect.value = batchId;
    activeVerifyId = batchId;
    renderVerifyDetail();
  }

  // ==================================================
  // BATCH FORM
  // ==================================================

  function renderDraftItems() {
    els.itemList.innerHTML = '';
    els.itemsCount.textContent = `${draftItems.length} barang`;
    els.itemListEmpty.hidden = draftItems.length > 0;
    draftItems.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="item-name">${Utils.escapeHtml(item.name)}</span>
        <span class="tag-pill">${Utils.tagLabel(item.tag)}</span>
        <button type="button" class="item-remove" data-id="${item.id}" aria-label="Hapus barang">✕</button>
      `;
      els.itemList.appendChild(li);
    });
  }

  els.itemAdd.addEventListener('click', addDraftItem);
  els.itemName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addDraftItem(); }
  });

  function addDraftItem() {
    const name = els.itemName.value.trim();
    if (!name) { els.itemName.focus(); return; }
    draftItems.push({ id: Utils.uid('item'), name, tag: els.itemTag.value, checked: false });
    els.itemName.value = '';
    els.itemName.focus();
    renderDraftItems();
  }

  els.itemList.addEventListener('click', (e) => {
    const btn = e.target.closest('.item-remove');
    if (!btn) return;
    draftItems = draftItems.filter(i => i.id !== btn.dataset.id);
    renderDraftItems();
  });

  // photo before upload
  setupPhotoDrop(els.photoBeforeDrop, els.photoBeforeInput, els.photoBeforeEmpty,
    els.photoBeforePreview, els.photoBeforeImg, els.photoBeforeRemove,
    (dataUrl) => { photoBeforeData = dataUrl; },
    () => { photoBeforeData = null; });

  function setupPhotoDrop(drop, input, empty, preview, img, removeBtn, onSet, onClear) {
    drop.addEventListener('click', (e) => {
      if (e.target === removeBtn) return;
      input.click();
    });
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => {
      if (input.files[0]) handleFile(input.files[0]);
    });
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClear();
      input.value = '';
      empty.hidden = false;
      preview.hidden = true;
    });
    async function handleFile(file) {
      try {
        const dataUrl = await Utils.compressImage(file);
        onSet(dataUrl);
        img.src = dataUrl;
        empty.hidden = true;
        preview.hidden = false;
      } catch (err) {
        showToast('Gagal memproses foto: ' + err.message);
      }
    }
  }

  els.batchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const laundryName = els.laundryName.value.trim();
    if (!laundryName) { showToast('Isi nama tempat laundry dulu.'); els.laundryName.focus(); return; }
    if (!els.dateIn.value) { showToast('Isi tanggal masuk dulu.'); els.dateIn.focus(); return; }
    if (draftItems.length === 0) { showToast('Tambahkan minimal 1 barang.'); els.itemName.focus(); return; }

    const batch = {
      id: Utils.uid('batch'),
      code: Storage.nextCode(),
      laundryName,
      dateIn: els.dateIn.value,
      estimatedDone: els.dateEst.value || '',
      items: draftItems.map(i => ({ ...i, checked: false })),
      photoBefore: photoBeforeData,
      photoAfter: null,
      status: 'diproses',
      createdAt: Date.now(),
      completedAt: null,
      notes: els.notes.value.trim()
    };

    batches.unshift(batch);
    Storage.saveBatches(batches);
    resetBatchForm();
    renderTicketList();
    renderVerifySelect();
    showToast(`Batch ${batch.code} disimpan.`);
  });

  function resetBatchForm() {
    els.batchForm.reset();
    els.dateIn.value = Utils.todayISO();
    draftItems = [];
    photoBeforeData = null;
    els.photoBeforeEmpty.hidden = false;
    els.photoBeforePreview.hidden = true;
    els.photoBeforeInput.value = '';
    renderDraftItems();
  }

  // ==================================================
  // TICKET LIST (batch tab)
  // ==================================================

  els.filterChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    activeFilter = chip.dataset.filter;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
    renderTicketList();
  });

  function renderTicketList() {
    const filtered = batches
      .filter(b => activeFilter === 'all' || b.status === activeFilter)
      .sort((a, b) => b.createdAt - a.createdAt);

    els.ticketListEmpty.hidden = batches.length > 0;
    els.ticketList.innerHTML = '';

    filtered.forEach(b => {
      const returned = b.items.filter(i => i.checked).length;
      const tagSet = [...new Set(b.items.map(i => i.tag))].slice(0, 4);

      let expiryHtml = '';
      const isResolved = b.status === 'selesai_lengkap' || b.status === 'selesai_ada_hilang';
      if (isResolved && b.completedAt) {
        const deleteAt = b.completedAt + settings.retentionDays * 86400000;
        const daysLeft = Math.max(0, Math.ceil((deleteAt - Date.now()) / 86400000));
        expiryHtml = `<span class="ticket-expiry">Terhapus otomatis dalam ${daysLeft} hari</span>`;
      }

      const div = document.createElement('div');
      div.className = 'ticket';
      div.innerHTML = `
        <div class="ticket-stub">
          <span class="ticket-code">${b.code}</span>
          <span class="stamp stamp-${b.status}">${Utils.statusLabel(b.status)}</span>
        </div>
        <div class="ticket-body">
          <div class="ticket-body-top">
            <h3>${Utils.escapeHtml(b.laundryName)}</h3>
            <span class="ticket-meta"><span>${b.items.length} barang</span></span>
          </div>
          <div class="ticket-meta">
            <span>Masuk: ${Utils.formatDate(b.dateIn)}</span>
            <span>Estimasi: ${b.estimatedDone ? Utils.formatDate(b.estimatedDone) : '—'}</span>
            <span>Kembali: ${returned}/${b.items.length}</span>
          </div>
          <div class="ticket-tags">
            ${tagSet.map(t => `<span class="tag-pill">${Utils.tagLabel(t)}</span>`).join('')}
          </div>
          ${expiryHtml}
          <div class="ticket-actions">
            <button class="btn btn-secondary" data-action="verify" data-id="${b.id}">
              ${b.status === 'diproses' ? 'Verifikasi' : 'Lihat detail'}
            </button>
            <button class="btn btn-ghost" data-action="delete" data-id="${b.id}">Hapus</button>
          </div>
        </div>
      `;
      els.ticketList.appendChild(div);
    });
  }

  els.ticketList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'verify') {
      goToVerifyTab(id);
    } else if (btn.dataset.action === 'delete') {
      const batch = batches.find(b => b.id === id);
      if (batch && confirm(`Hapus batch ${batch.code} (${batch.laundryName}) secara permanen?`)) {
        batches = batches.filter(b => b.id !== id);
        Storage.saveBatches(batches);
        renderTicketList();
        renderVerifySelect();
        renderDashboard();
        showToast('Batch dihapus.');
      }
    }
  });

  // ==================================================
  // VERIFY TAB
  // ==================================================

  function renderVerifySelect() {
    const sorted = [...batches].sort((a, b) => b.createdAt - a.createdAt);
    els.verifySelect.innerHTML = '<option value="">— Pilih batch —</option>' +
      sorted.map(b => `<option value="${b.id}">${b.code} — ${Utils.escapeHtml(b.laundryName)} (${Utils.statusLabel(b.status)})</option>`).join('');
    els.verifyEmpty.hidden = batches.length > 0;
    if (activeVerifyId && !batches.some(b => b.id === activeVerifyId)) {
      activeVerifyId = '';
    }
    els.verifySelect.value = activeVerifyId;
  }

  els.verifySelect.addEventListener('change', () => {
    activeVerifyId = els.verifySelect.value;
    renderVerifyDetail();
  });

  function currentVerifyBatch() {
    return batches.find(b => b.id === activeVerifyId) || null;
  }

  function renderVerifyDetail() {
    const batch = currentVerifyBatch();
    if (!batch) { els.verifyDetail.hidden = true; return; }
    els.verifyDetail.hidden = false;

    els.verifyTitle.textContent = `${batch.code} — ${batch.laundryName}`;
    els.verifyStatusStamp.textContent = Utils.statusLabel(batch.status);
    els.verifyStatusStamp.className = `stamp stamp-${batch.status}`;

    const editable = batch.status === 'diproses';

    // after-photo
    photoAfterDraft = batch.photoAfter;
    if (batch.photoAfter) {
      els.photoAfterImg.src = batch.photoAfter;
      els.photoAfterEmpty.hidden = true;
      els.photoAfterPreview.hidden = false;
    } else {
      els.photoAfterEmpty.hidden = false;
      els.photoAfterPreview.hidden = true;
    }
    els.photoAfterDrop.style.pointerEvents = editable ? 'auto' : 'none';
    els.photoAfterDrop.style.opacity = editable ? '1' : '0.6';

    if (batch.photoBefore && batch.photoAfter) {
      els.photoCompare.hidden = false;
      els.compareBeforeImg.src = batch.photoBefore;
      els.compareAfterImg.src = batch.photoAfter;
    } else {
      els.photoCompare.hidden = true;
    }

    renderChecklist(batch, editable);

    els.btnCheckAll.hidden = !editable;
    els.btnFinishVerify.hidden = !editable;

    if (!editable) {
      const missing = batch.items.filter(i => !i.checked);
      if (missing.length > 0) {
        els.missingBanner.hidden = false;
        els.missingBanner.textContent = `⚠ ${missing.length} barang belum kembali: ${missing.map(i => i.name).join(', ')}`;
      } else {
        els.missingBanner.hidden = false;
        els.missingBanner.textContent = `✓ Diverifikasi lengkap pada ${new Date(batch.completedAt).toLocaleDateString('id-ID')}.`;
      }
    } else {
      els.missingBanner.hidden = true;
    }
  }

  function renderChecklist(batch, editable) {
    const checkedCount = batch.items.filter(i => i.checked).length;
    els.checklistProgress.textContent = `${checkedCount} / ${batch.items.length} dicentang`;
    els.checklist.innerHTML = '';
    batch.items.forEach(item => {
      const li = document.createElement('li');
      li.className = item.checked ? 'checked' : (!editable ? 'missing' : '');
      li.innerHTML = `
        <input type="checkbox" data-id="${item.id}" ${item.checked ? 'checked' : ''} ${editable ? '' : 'disabled'}>
        <span class="item-name">${Utils.escapeHtml(item.name)}</span>
        <span class="tag-pill">${Utils.tagLabel(item.tag)}</span>
      `;
      els.checklist.appendChild(li);
    });
  }

  els.checklist.addEventListener('change', (e) => {
    const cb = e.target.closest('input[type="checkbox"]');
    if (!cb) return;
    const batch = currentVerifyBatch();
    if (!batch) return;
    const item = batch.items.find(i => i.id === cb.dataset.id);
    if (item) item.checked = cb.checked;
    Storage.saveBatches(batches);
    renderChecklist(batch, batch.status === 'diproses');
  });

  els.btnCheckAll.addEventListener('click', () => {
    const batch = currentVerifyBatch();
    if (!batch) return;
    batch.items.forEach(i => { i.checked = true; });
    Storage.saveBatches(batches);
    renderChecklist(batch, true);
  });

  els.btnFinishVerify.addEventListener('click', () => {
    const batch = currentVerifyBatch();
    if (!batch) return;
    const missing = batch.items.filter(i => !i.checked);
    batch.status = missing.length > 0 ? 'selesai_ada_hilang' : 'selesai_lengkap';
    batch.completedAt = Date.now();
    Storage.saveBatches(batches);
    renderVerifyDetail();
    renderVerifySelect();
    els.verifySelect.value = batch.id;
    renderTicketList();
    renderDashboard();
    showToast(missing.length > 0
      ? `Verifikasi selesai — ${missing.length} barang hilang.`
      : 'Verifikasi selesai — semua barang lengkap.');
  });

  setupPhotoDrop(els.photoAfterDrop, els.photoAfterInput, els.photoAfterEmpty,
    els.photoAfterPreview, els.photoAfterImg, els.photoAfterRemove,
    (dataUrl) => {
      photoAfterDraft = dataUrl;
      const batch = currentVerifyBatch();
      if (batch) { batch.photoAfter = dataUrl; Storage.saveBatches(batches); renderVerifyDetail(); }
    },
    () => {
      photoAfterDraft = null;
      const batch = currentVerifyBatch();
      if (batch) { batch.photoAfter = null; Storage.saveBatches(batches); }
    });

  // ==================================================
  // DASHBOARD
  // ==================================================

  function renderDashboard() {
    const activeBatches = batches.filter(b => b.status === 'diproses');
    const allItems = batches.flatMap(b => b.items);
    const returnedItems = allItems.filter(i => i.checked);
    const missingBatches = batches.filter(b => b.status === 'selesai_ada_hilang');
    const missingItemCount = missingBatches.reduce((sum, b) => sum + b.items.filter(i => !i.checked).length, 0);

    const stats = [
      { label: 'Batch diproses', value: activeBatches.length, cls: 'stat-brass' },
      { label: 'Total barang masuk', value: allItems.length, cls: '' },
      { label: 'Barang sudah kembali', value: returnedItems.length, cls: 'stat-teal' },
      { label: 'Barang hilang', value: missingItemCount, cls: 'stat-coral' }
    ];
    els.statGrid.innerHTML = stats.map(s => `
      <div class="stat-card ${s.cls}">
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `).join('');

    // missing list
    els.missingList.innerHTML = '';
    let missingRows = 0;
    missingBatches.forEach(b => {
      b.items.filter(i => !i.checked).forEach(i => {
        missingRows++;
        const li = document.createElement('li');
        li.innerHTML = `<span class="item-name">${Utils.escapeHtml(i.name)}</span><span>${b.code} · ${Utils.escapeHtml(b.laundryName)}</span>`;
        els.missingList.appendChild(li);
      });
    });
    els.missingListEmpty.hidden = missingRows > 0;

    // expiry list
    const resolved = batches
      .filter(b => (b.status === 'selesai_lengkap' || b.status === 'selesai_ada_hilang') && b.completedAt)
      .map(b => ({ b, daysLeft: Math.max(0, Math.ceil(((b.completedAt + settings.retentionDays * 86400000) - Date.now()) / 86400000)) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    els.expiryList.innerHTML = '';
    resolved.forEach(({ b, daysLeft }) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="item-name">${b.code} · ${Utils.escapeHtml(b.laundryName)}</span><span>Terhapus dalam ${daysLeft} hari</span>`;
      els.expiryList.appendChild(li);
    });
    els.expiryListEmpty.hidden = resolved.length > 0;
  }

  // ==================================================
  // DATA TAB
  // ==================================================

  els.retention.addEventListener('change', () => {
    let v = parseInt(els.retention.value, 10);
    if (isNaN(v) || v < 1) v = 7;
    settings.retentionDays = v;
    Storage.saveSettings(settings);
    renderTicketList();
    renderDashboard();
    showToast('Pengaturan disimpan.');
  });

  els.btnExport.addEventListener('click', () => {
    Storage.exportData();
    showToast('File backup diunduh.');
  });

  els.fImport.addEventListener('change', () => {
    const file = els.fImport.files[0];
    if (!file) return;
    if (!confirm('Impor akan menimpa semua data yang ada saat ini. Lanjutkan?')) {
      els.fImport.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = Storage.importData(reader.result);
        batches = Storage.loadBatches();
        settings = Storage.loadSettings();
        els.retention.value = settings.retentionDays;
        renderTicketList();
        renderVerifySelect();
        renderDashboard();
        showToast(`${count} batch berhasil diimpor.`);
      } catch (err) {
        showToast('Gagal mengimpor: ' + err.message);
      }
      els.fImport.value = '';
    };
    reader.readAsText(file);
  });

  els.btnClearAll.addEventListener('click', () => {
    if (!confirm('Yakin ingin menghapus SEMUA data laundry secara permanen? Tindakan ini tidak bisa dibatalkan.')) return;
    Storage.clearAll();
    batches = [];
    settings = { retentionDays: 7 };
    activeVerifyId = '';
    els.retention.value = 7;
    renderTicketList();
    renderVerifySelect();
    renderVerifyDetail();
    renderDashboard();
    showToast('Semua data telah dihapus.');
  });

  // ==================================================
  // INIT
  // ==================================================

  function init() {
    batches = Storage.loadBatches();
    settings = Storage.loadSettings();
    els.retention.value = settings.retentionDays;

    const { kept, removed } = Storage.runAutoCleanup(batches, settings.retentionDays);
    if (removed > 0) {
      batches = kept;
      Storage.saveBatches(batches);
    }

    els.dateIn.value = Utils.todayISO();
    renderDraftItems();
    renderTicketList();
    renderVerifySelect();
    renderVerifyDetail();
    renderDashboard();

    if (removed > 0) {
      setTimeout(() => showToast(`${removed} batch lama dihapus otomatis.`), 400);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

// app.js — application state, rendering, and event wiring.

(function () {
  'use strict';

  // ---------- state ----------
  let batches = [];
  let settings = { retentionDays: 7 };
  let draftItems = [];
  let currentDraftPhoto = null;
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

    itemName: el('f-item-name'),
    itemTag: el('f-item-tag'),
    itemPhotoInput: el('f-item-photo'),
    lblItemPhoto: el('lbl-item-photo'),
    photoBtnText: el('photo-btn-text'),
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
    imageModal: el('image-modal'),
    modalImg: el('modal-img'),
    modalClose: el('modal-close')
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
  // IMAGE ZOOM MODAL
  // ==================================================
  
  // Menggunakan event delegation pada body agar semua gambar (termasuk yang baru ditambah) bisa diklik
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('item-thumb')) {
      els.modalImg.src = e.target.src;
      els.imageModal.hidden = false;
    }
  });

  // Tutup saat tombol (X) diklik
  els.modalClose.addEventListener('click', () => {
    els.imageModal.hidden = true;
  });

  // Tutup saat area gelap di luar gambar diklik
  els.imageModal.addEventListener('click', (e) => {
    if (e.target === els.imageModal) {
      els.imageModal.hidden = true;
    }
  });

  // ==================================================
  // BATCH FORM (1 Item 1 Photo)
  // ==================================================

  // Handle Photo Selection
  els.itemPhotoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    els.photoBtnText.textContent = '...';
    try {
      currentDraftPhoto = await Utils.compressImage(file, 600, 0.7); // Compress to smaller thumbnail size
      els.lblItemPhoto.style.borderColor = 'var(--teal)';
      els.lblItemPhoto.style.color = 'var(--teal)';
      els.photoBtnText.textContent = '✓ OK';
    } catch (err) {
      showToast('Failed to process photo: ' + err.message);
      els.photoBtnText.textContent = 'Photo';
    }
  });

  function renderDraftItems() {
    els.itemList.innerHTML = '';
    els.itemsCount.textContent = `${draftItems.length} items`;
    els.itemListEmpty.hidden = draftItems.length > 0;
    
    draftItems.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `
        <img src="${item.photo}" class="item-thumb" alt="${item.name}">
        <span class="item-name">${Utils.escapeHtml(item.name)}</span>
        <span class="tag-pill">${Utils.tagLabel(item.tag)}</span>
        <button type="button" class="item-remove" data-id="${item.id}" aria-label="Remove item">✕</button>
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
    if (!name) { 
      els.itemName.focus(); 
      return; 
    }
    if (!currentDraftPhoto) {
      showToast('Please add a photo for this item.');
      return;
    }

    draftItems.push({ 
      id: Utils.uid('item'), 
      name, 
      tag: els.itemTag.value, 
      photo: currentDraftPhoto,
      checked: false 
    });
    
    // Reset inputs
    els.itemName.value = '';
    currentDraftPhoto = null;
    els.itemPhotoInput.value = '';
    els.photoBtnText.textContent = 'Photo';
    els.lblItemPhoto.style.borderColor = '';
    els.lblItemPhoto.style.color = '';
    
    els.itemName.focus();
    renderDraftItems();
  }

  els.itemList.addEventListener('click', (e) => {
    const btn = e.target.closest('.item-remove');
    if (!btn) return;
    draftItems = draftItems.filter(i => i.id !== btn.dataset.id);
    renderDraftItems();
  });

  // Handle Main Form Submission
  els.batchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const laundryName = els.laundryName.value.trim();
    if (!laundryName) { showToast('Enter the laundry name first.'); els.laundryName.focus(); return; }
    if (!els.dateIn.value) { showToast('Enter the date in.'); els.dateIn.focus(); return; }
    if (draftItems.length === 0) { showToast('Add at least 1 item.'); els.itemName.focus(); return; }

    const batch = {
      id: Utils.uid('batch'),
      code: Storage.nextCode(),
      laundryName,
      dateIn: els.dateIn.value,
      estimatedDone: els.dateEst.value || '',
      items: draftItems.map(i => ({ ...i, checked: false })),
      status: 'processing',
      createdAt: Date.now(),
      completedAt: null,
      notes: els.notes.value.trim()
    };

    batches.unshift(batch);
    Storage.saveBatches(batches);
    resetBatchForm();
    renderTicketList();
    renderVerifySelect();
    showToast(`Batch ${batch.code} saved.`);
  });

  function resetBatchForm() {
    els.batchForm.reset();
    els.dateIn.value = Utils.todayISO();
    draftItems = [];
    currentDraftPhoto = null;
    els.photoBtnText.textContent = 'Photo';
    els.lblItemPhoto.style.borderColor = '';
    els.lblItemPhoto.style.color = '';
    renderDraftItems();
  }

  // ==================================================
  // TICKET LIST (Batches Tab)
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
      const isResolved = b.status === 'completed' || b.status === 'missing_items';
      if (isResolved && b.completedAt) {
        const deleteAt = b.completedAt + settings.retentionDays * 86400000;
        const daysLeft = Math.max(0, Math.ceil((deleteAt - Date.now()) / 86400000));
        expiryHtml = `<span class="ticket-expiry">Auto-deletes in ${daysLeft} days</span>`;
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
            <span class="ticket-meta"><span>${b.items.length} items</span></span>
          </div>
          <div class="ticket-meta">
            <span>In: ${Utils.formatDate(b.dateIn)}</span>
            <span>Est: ${b.estimatedDone ? Utils.formatDate(b.estimatedDone) : '—'}</span>
            <span>Returned: ${returned}/${b.items.length}</span>
          </div>
          <div class="ticket-tags">
            ${tagSet.map(t => `<span class="tag-pill">${Utils.tagLabel(t)}</span>`).join('')}
          </div>
          ${expiryHtml}
          <div class="ticket-actions">
            <button class="btn btn-secondary" data-action="verify" data-id="${b.id}">
              ${b.status === 'processing' ? 'Verify Items' : 'View Details'}
            </button>
            <button class="btn btn-ghost" data-action="delete" data-id="${b.id}">Delete</button>
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
      if (batch && confirm(`Permanently delete batch ${batch.code} (${batch.laundryName})?`)) {
        batches = batches.filter(b => b.id !== id);
        Storage.saveBatches(batches);
        renderTicketList();
        renderVerifySelect();
        renderDashboard();
        showToast('Batch deleted.');
      }
    }
  });

  // ==================================================
  // VERIFY TAB
  // ==================================================

  function renderVerifySelect() {
    const sorted = [...batches].sort((a, b) => b.createdAt - a.createdAt);
    els.verifySelect.innerHTML = '<option value="">— Select a batch —</option>' +
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

    const editable = batch.status === 'processing';
    renderChecklist(batch, editable);

    els.btnCheckAll.hidden = !editable;
    els.btnFinishVerify.hidden = !editable;

    if (!editable) {
      const missing = batch.items.filter(i => !i.checked);
      if (missing.length > 0) {
        els.missingBanner.hidden = false;
        els.missingBanner.textContent = `⚠ ${missing.length} items still missing: ${missing.map(i => i.name).join(', ')}`;
      } else {
        els.missingBanner.hidden = false;
        els.missingBanner.textContent = `✓ Fully verified on ${new Date(batch.completedAt).toLocaleDateString('en-US')}.`;
      }
    } else {
      els.missingBanner.hidden = true;
    }
  }

  function renderChecklist(batch, editable) {
    const checkedCount = batch.items.filter(i => i.checked).length;
    els.checklistProgress.textContent = `${checkedCount} / ${batch.items.length} checked`;
    els.checklist.innerHTML = '';
    
    batch.items.forEach(item => {
      const li = document.createElement('li');
      li.className = item.checked ? 'checked' : (!editable ? 'missing' : '');
      li.innerHTML = `
        <input type="checkbox" data-id="${item.id}" ${item.checked ? 'checked' : ''} ${editable ? '' : 'disabled'}>
        <img src="${item.photo}" class="item-thumb" alt="${item.name}">
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
    renderChecklist(batch, batch.status === 'processing');
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
    batch.status = missing.length > 0 ? 'missing_items' : 'completed';
    batch.completedAt = Date.now();
    Storage.saveBatches(batches);
    
    renderVerifyDetail();
    renderVerifySelect();
    els.verifySelect.value = batch.id;
    renderTicketList();
    renderDashboard();
    
    showToast(missing.length > 0
      ? `Verification done — ${missing.length} items missing.`
      : 'Verification done — all items returned.');
  });

  // ==================================================
  // DASHBOARD
  // ==================================================

  function renderDashboard() {
    const activeBatches = batches.filter(b => b.status === 'processing');
    const allItems = batches.flatMap(b => b.items);
    const returnedItems = allItems.filter(i => i.checked);
    const missingBatches = batches.filter(b => b.status === 'missing_items');
    const missingItemCount = missingBatches.reduce((sum, b) => sum + b.items.filter(i => !i.checked).length, 0);

    const stats = [
      { label: 'Processing Batches', value: activeBatches.length, cls: 'stat-brass' },
      { label: 'Total Items In', value: allItems.length, cls: '' },
      { label: 'Items Returned', value: returnedItems.length, cls: 'stat-teal' },
      { label: 'Missing Items', value: missingItemCount, cls: 'stat-coral' }
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
      .filter(b => (b.status === 'completed' || b.status === 'missing_items') && b.completedAt)
      .map(b => ({ b, daysLeft: Math.max(0, Math.ceil(((b.completedAt + settings.retentionDays * 86400000) - Date.now()) / 86400000)) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    els.expiryList.innerHTML = '';
    resolved.forEach(({ b, daysLeft }) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="item-name">${b.code} · ${Utils.escapeHtml(b.laundryName)}</span><span>Deletes in ${daysLeft} days</span>`;
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
    showToast('Settings saved.');
  });

  els.btnExport.addEventListener('click', () => {
    Storage.exportData();
    showToast('Backup file downloaded.');
  });

  els.fImport.addEventListener('change', () => {
    const file = els.fImport.files[0];
    if (!file) return;
    if (!confirm('Importing will overwrite all current data. Continue?')) {
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
        showToast(`${count} batches successfully imported.`);
      } catch (err) {
        showToast('Failed to import: ' + err.message);
      }
      els.fImport.value = '';
    };
    reader.readAsText(file);
  });

  els.btnClearAll.addEventListener('click', () => {
    if (!confirm('Are you sure you want to permanently wipe ALL laundry data? This cannot be undone.')) return;
    Storage.clearAll();
    batches = [];
    settings = { retentionDays: 7 };
    activeVerifyId = '';
    els.retention.value = 7;
    renderTicketList();
    renderVerifySelect();
    renderVerifyDetail();
    renderDashboard();
    showToast('All data has been cleared.');
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
      setTimeout(() => showToast(`${removed} old batches were auto-deleted.`), 400);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

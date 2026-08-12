// utils.js — small stateless helpers shared across the app

const Utils = (() => {

  function uid(prefix) {
    const rand = Math.random().toString(36).slice(2, 9);
    return `${prefix}_${Date.now().toString(36)}${rand}`;
  }

  function todayISO() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mi = parseInt(m, 10) - 1;
    if (mi < 0 || mi > 11 || !d) return iso;
    return `${parseInt(d, 10)} ${months[mi]} ${y}`;
  }

  function daysBetween(a, b) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((b - a) / msPerDay);
  }

  function tagLabel(tag) {
    const map = {
      shirt: 'Shirt', t_shirt: 'T-Shirt', pants: 'Pants', 
      underwear: 'Underwear', jacket: 'Jacket', bedsheet: 'Bed Sheet',
      towel: 'Towel', socks: 'Socks', other: 'Other'
    };
    return map[tag] || tag;
  }

  function statusLabel(status) {
    const map = {
      processing: 'Processing',
      completed: 'Completed',
      missing_items: 'Missing Items'
    };
    return map[status] || status;
  }

  function compressImage(file, maxDim = 900, quality = 0.62) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else if (height >= width && height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  return { uid, todayISO, formatDate, daysBetween, tagLabel, statusLabel, compressImage, escapeHtml };
})();

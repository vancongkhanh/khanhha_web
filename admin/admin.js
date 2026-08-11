/* =====================================================================
   ADMIN — Cửa hàng Khánh Hà
   Nối trang quản trị (mockup) với Firebase thật: Auth, Firestore, Storage.
   ===================================================================== */

import { db, auth, storage } from '../assets/js/firebase-init.js';
import {
  collection, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut,
  setPersistence, browserLocalPersistence, browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  ref, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js';

// UID các tài khoản được phép vào trang quản trị — thêm UID thứ 2 vào đây
// khi tạo xong tài khoản cho người còn lại (nhớ cập nhật cả firestore.rules
// và storage.rules cho khớp).
var ADMIN_UIDS = ['BxRGkox6sYZhwSM7OOjqu42J9bH2'];

var STORAGE_BUCKET = 'khanhha-web.firebasestorage.app';

/* =======================================================================
   DỮ LIỆU TRẠNG THÁI — nạp từ Firestore, không còn dữ liệu mẫu viết cứng
   ======================================================================= */
var categoriesCache = [];
var productsCache = [];
var messagesCache = [];
var settingsCache = null;
var appStarted = false;

var CATEGORY_ICONS = {
  pot: '<path d="M4 9h16v2a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7V9Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
  socket: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 11h16"/>',
  shelf: '<rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="14" width="16" height="6" rx="1"/>',
  bottle: '<path d="M6 4h12l-1 16H7L6 4Z"/><path d="M9 9h6"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  awning: '<path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13h16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3Z"/>',
  box: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  lightbulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3Z"/>',
  shirt: '<path d="M8 4 4 7l2 3 2-1v10h8V9l2 1 2-3-4-3-2 2h-4L8 4Z"/>',
  scissors: '<circle cx="7" cy="6" r="2.5"/><circle cx="7" cy="18" r="2.5"/><path d="M8.6 7.6 20 18"/><path d="M20 6 8.6 16.4"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 9h16v4H4z"/><path d="M12 9v11"/><path d="M12 9c-1-3-5-4-5-1.5S9 9 12 9Z"/><path d="M12 9c1-3 5-4 5-1.5S15 9 12 9Z"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z"/>',
  star: '<path d="m12 3 2.6 5.8 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 19.9l1.4-6.2L3 9.4l6.4-.6L12 3Z"/>',
  heart: '<path d="M12 20.5S3.5 15 3.5 8.8A4.3 4.3 0 0 1 12 6.5a4.3 4.3 0 0 1 8.5 2.3C20.5 15 12 20.5 12 20.5Z"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  truck: '<rect x="2" y="8" width="12" height="9" rx="1"/><path d="M14 11h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
  umbrella: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z"/><path d="M12 12v7a2 2 0 0 1-4 0"/>',
  leaf: '<path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16Z"/><path d="M4 20 14 10"/>',
  fan: '<circle cx="12" cy="12" r="1.6"/><path d="M12 12c0-4 2-7 5-7s3 4-1 6"/><path d="M12 12c-4 0-7-2-7-5s4-3 6 1"/><path d="M12 12c0 4-2 7-5 7s-3-4 1-6"/><path d="M12 12c4 0 7 2 7 5s-4 3-6-1"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
  bed: '<path d="M3 19v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 15h18"/><path d="M7 12V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/>',
  basket: '<path d="M4 9h16l-2 10H6L4 9Z"/><path d="M4 9 7 4h10l3 5"/><path d="M9 13v3M12 13v3M15 13v3"/>'
};

var THUMB_COLORS = ['var(--pine)', 'var(--copper)', '#8A4E27', 'var(--pine-light)'];

/* =======================================================================
   HÀM TIỆN ÍCH
   ======================================================================= */

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function formatVND(n) { return Number(n || 0).toLocaleString('vi-VN') + '₫'; }

function removeDiacritics(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function slugify(str) {
  return removeDiacritics(str)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

function uniqueCategorySlug(name) {
  var base = slugify(name) || 'danh-muc';
  var slugCandidate = base;
  var i = 2;
  while (categoriesCache.some(function (c) { return c.slug === slugCandidate; })) {
    slugCandidate = base + '-' + i;
    i++;
  }
  return slugCandidate;
}

function storagePathToUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  return 'https://firebasestorage.googleapis.com/v0/b/' + STORAGE_BUCKET + '/o/' + encodeURIComponent(path) + '?alt=media';
}

function categoryName(slug) {
  var c = categoriesCache.find(function (x) { return x.slug === slug; });
  return c ? c.name : slug;
}

function categoryIconKey(slug) {
  var c = categoriesCache.find(function (x) { return x.slug === slug; });
  return c && CATEGORY_ICONS[c.icon] ? c.icon : 'pot';
}

function formatRelativeTime(ts) {
  if (!ts || typeof ts.toDate !== 'function') return 'Vừa xong';
  var diffMs = Date.now() - ts.toDate().getTime();
  var diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return diffMin + ' phút trước';
  var diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return diffHour + ' giờ trước';
  var diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Hôm qua';
  if (diffDay < 7) return diffDay + ' ngày trước';
  return ts.toDate().toLocaleDateString('vi-VN');
}

function closeXIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>';
}
function editIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
}
function trashIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
}

/* =======================================================================
   ĐĂNG NHẬP / ĐĂNG XUẤT
   ======================================================================= */

function setAppVisible(visible) {
  document.getElementById('appSidebar').style.display = visible ? '' : 'none';
  document.getElementById('appMain').style.display = visible ? '' : 'none';
  document.getElementById('loginScreen').classList.toggle('open', !visible);
}

onAuthStateChanged(auth, function (user) {
  var loginError = document.getElementById('loginError');
  if (user && ADMIN_UIDS.indexOf(user.uid) !== -1) {
    loginError.textContent = '';
    setAppVisible(true);
    document.getElementById('topbarUserEmail').textContent = user.email || '';
    startApp();
  } else {
    if (user) {
      loginError.textContent = 'Tài khoản này không có quyền quản trị.';
      signOut(auth);
    }
    setAppVisible(false);
  }
});

var REMEMBER_EMAIL_KEY = 'khanhha_admin_email';

var savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
if (savedEmail) {
  document.getElementById('login-email').value = savedEmail;
  document.getElementById('login-remember').checked = true;
}

document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var loginError = document.getElementById('loginError');
  loginError.textContent = '';
  var email = document.getElementById('login-email').value.trim();
  var password = document.getElementById('login-password').value;
  var remember = document.getElementById('login-remember').checked;

  setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
    .then(function () { return signInWithEmailAndPassword(auth, email, password); })
    .then(function () {
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    })
    .catch(function () {
      loginError.textContent = 'Sai email hoặc mật khẩu.';
    });
});

document.getElementById('passwordToggleBtn').addEventListener('click', function () {
  var input = document.getElementById('login-password');
  var showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  this.classList.toggle('showing', !showing);
  this.setAttribute('aria-label', showing ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
});

document.getElementById('logoutBtn').addEventListener('click', function () {
  signOut(auth);
});

function startApp() {
  if (appStarted) return;
  appStarted = true;
  listenCategories();
  listenProducts();
  listenMessages();
  loadSettings();
}

/* =======================================================================
   LẮNG NGHE DỮ LIỆU FIRESTORE (real-time)
   ======================================================================= */

function listenCategories() {
  onSnapshot(query(collection(db, 'categories'), orderBy('order')), function (snap) {
    categoriesCache = snap.docs.map(function (d) { return d.data(); });
    renderCategories();
    populateCategoryFilterOptions();
    renderProducts();
    updateDashboardStats();
  }, function (err) { console.error('Lỗi tải danh mục:', err); showToast('Không tải được danh mục'); });
}

function listenProducts() {
  onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), function (snap) {
    productsCache = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    renderProducts();
    renderCategories();
    updateDashboardStats();
  }, function (err) { console.error('Lỗi tải sản phẩm:', err); showToast('Không tải được sản phẩm'); });
}

function listenMessages() {
  onSnapshot(query(collection(db, 'messages'), orderBy('createdAt', 'desc')), function (snap) {
    messagesCache = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    renderMessages();
    renderRecentMessages();
    updateDashboardStats();
  }, function (err) { console.error('Lỗi tải tin nhắn:', err); showToast('Không tải được hộp thư'); });
}

/* =======================================================================
   ĐIỀU HƯỚNG TRANG (sidebar) — giữ nguyên logic gốc của mockup
   ======================================================================= */

var pageTitles = {
  'dashboard': 'Tổng quan',
  'products': 'Sản phẩm',
  'categories': 'Danh mục',
  'messages': 'Hộp thư liên hệ',
  'settings-appearance': 'Cài đặt — Giao diện',
  'settings-store': 'Cài đặt — Thông tin cửa hàng',
  'settings-links': 'Cài đặt — Liên kết'
};

function showPage(key) {
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  var target = document.getElementById('page-' + (key.indexOf('settings-') === 0 ? 'settings-appearance' : key));
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item, .nav-sub-item').forEach(function (el) { el.classList.remove('active'); });
  var navEl = document.querySelector('[data-page="' + key + '"]');
  if (navEl) navEl.classList.add('active');

  if (key.indexOf('settings-') === 0) {
    var settingsKey = key.replace('settings-', '');
    document.querySelectorAll('.settings-tab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('.settings-panel').forEach(function (p) { p.classList.remove('active'); });
    document.querySelector('[data-settings="' + settingsKey + '"]').classList.add('active');
    document.getElementById('settings-' + settingsKey).classList.add('active');
  }

  document.getElementById('pageTitle').textContent = pageTitles[key];
}

document.querySelectorAll('.nav-item, .nav-sub-item').forEach(function (el) {
  el.addEventListener('click', function () { showPage(el.dataset.page); });
});

document.querySelectorAll('.settings-tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.settings-tab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('.settings-panel').forEach(function (p) { p.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('settings-' + tab.dataset.settings).classList.add('active');

    document.querySelectorAll('.nav-sub-item').forEach(function (el) { el.classList.remove('active'); });
    document.querySelector('[data-page="settings-' + tab.dataset.settings + '"]').classList.add('active');
    document.getElementById('pageTitle').textContent = pageTitles['settings-' + tab.dataset.settings];
  });
});

/* =======================================================================
   SẢN PHẨM
   ======================================================================= */

var productFilters = { search: '', category: '', stock: '', featured: '' };

function applyProductFilters(list) {
  return list.filter(function (p) {
    if (productFilters.search && removeDiacritics(p.name).indexOf(productFilters.search) === -1) return false;
    if (productFilters.category && p.category !== productFilters.category) return false;
    if (productFilters.stock === 'in' && !p.stock) return false;
    if (productFilters.stock === 'out' && p.stock) return false;
    if (productFilters.featured === 'yes' && !p.isFeatured) return false;
    if (productFilters.featured === 'no' && p.isFeatured) return false;
    return true;
  });
}

function populateCategoryFilterOptions() {
  var sel = document.getElementById('pfilter-category');
  if (!sel) return;
  var current = sel.value;
  sel.innerHTML = '<option value="">Tất cả danh mục</option>' + categoriesCache.map(function (c) {
    return '<option value="' + c.slug + '">' + escapeHtml(c.name) + '</option>';
  }).join('');
  sel.value = current;
}

var productPage = 1;
var productPageSize = 10;

function renderProductsPagination(totalItems) {
  var container = document.getElementById('productsPagination');
  if (!container) return;
  var totalPages = Math.max(1, Math.ceil(totalItems / productPageSize));
  if (productPage > totalPages) productPage = totalPages;
  if (productPage < 1) productPage = 1;
  container.innerHTML =
    '<button class="page-btn" ' + (productPage <= 1 ? 'disabled' : '') + ' onclick="adminGoToProductPage(' + (productPage - 1) + ')">‹ Trước</button>' +
    '<span class="page-info">Trang ' + productPage + ' / ' + totalPages + '</span>' +
    '<button class="page-btn" ' + (productPage >= totalPages ? 'disabled' : '') + ' onclick="adminGoToProductPage(' + (productPage + 1) + ')">Sau ›</button>';
}

function goToProductPage(page) {
  productPage = page;
  renderProducts();
}

function renderProducts() {
  var tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  var outOfStockTotal = productsCache.filter(function (p) { return !p.stock; }).length;
  var filtered = applyProductFilters(productsCache);

  var subtitle = document.getElementById('productsSubtitle');
  if (subtitle) {
    subtitle.textContent = filtered.length + ' / ' + productsCache.length + ' sản phẩm · ' + outOfStockTotal + ' đang hết hàng';
  }

  renderProductsPagination(filtered.length);

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6"><p class="hint" style="padding:20px 0;text-align:center;">Không có sản phẩm khớp bộ lọc.</p></td></tr>';
    return;
  }

  var startIdx = (productPage - 1) * productPageSize;
  var pageItems = filtered.slice(startIdx, startIdx + productPageSize);

  tbody.innerHTML = pageItems.map(function (p, i) {
    var color = THUMB_COLORS[i % THUMB_COLORS.length];
    var hasImage = p.images && p.images.length > 0;
    var thumbStyle = hasImage
      ? "background-image:url('" + storagePathToUrl(p.images[0]) + "');background-size:cover;background-position:center;"
      : 'background:' + color;
    var iconSvg = hasImage ? '' : '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5">' + (CATEGORY_ICONS[categoryIconKey(p.category)] || '') + '</svg>';
    return '<tr>' +
      '<td><div class="cell-name"><div class="prod-thumb-sm" style="' + thumbStyle + '">' + iconSvg + '</div>' + escapeHtml(p.name) + '</div></td>' +
      '<td>' + escapeHtml(categoryName(p.category)) + '</td>' +
      '<td>' + formatVND(p.price) + '</td>' +
      '<td><label class="switch"><input type="checkbox" ' + (p.stock ? 'checked' : '') + ' onchange="adminToggleProductField(\'' + p.id + '\',\'stock\',this.checked)"><span class="slider"></span></label></td>' +
      '<td><label class="switch"><input type="checkbox" ' + (p.isFeatured ? 'checked' : '') + ' onchange="adminToggleProductField(\'' + p.id + '\',\'featured\',this.checked)"><span class="slider"></span></label></td>' +
      '<td><div class="row-actions">' +
      '<button class="icon-btn" title="Sửa" onclick="adminOpenProductModal(\'edit\',\'' + p.id + '\')">' + editIcon() + '</button>' +
      '<button class="icon-btn" title="Xoá" onclick="adminOpenDeleteConfirm(\'product\',\'' + p.id + '\')">' + trashIcon() + '</button>' +
      '</div></td></tr>';
  }).join('');
}

document.getElementById('pfilter-search').addEventListener('input', function () {
  productFilters.search = removeDiacritics(this.value.trim());
  productPage = 1;
  renderProducts();
});
document.getElementById('pfilter-category').addEventListener('change', function () {
  productFilters.category = this.value;
  productPage = 1;
  renderProducts();
});
document.getElementById('pfilter-stock').addEventListener('change', function () {
  productFilters.stock = this.value;
  productPage = 1;
  renderProducts();
});
document.getElementById('pfilter-featured').addEventListener('change', function () {
  productFilters.featured = this.value;
  productPage = 1;
  renderProducts();
});
document.getElementById('pfilter-pagesize').addEventListener('change', function () {
  productPageSize = Number(this.value) || 10;
  productPage = 1;
  renderProducts();
});

function toggleProductField(id, field, value) {
  var firestoreField = field === 'featured' ? 'isFeatured' : 'stock';
  var payload = { updatedAt: serverTimestamp() };
  payload[firestoreField] = value;
  updateDoc(doc(db, 'products', id), payload).then(function () {
    showToast(field === 'stock' ? 'Đã cập nhật tình trạng hàng' : 'Đã cập nhật hiển thị "Bán chạy"');
  }).catch(function (err) {
    console.error(err);
    showToast('Cập nhật thất bại');
  });
}

/* ---------- Modal Thêm/Sửa sản phẩm ---------- */

var modalProductImages = [];

function openProductModal(mode, id) {
  var product = mode === 'edit' ? productsCache.find(function (p) { return p.id === id; }) : null;
  var title = mode === 'edit' ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới';
  var catOptions = categoriesCache.map(function (c) {
    var sel = product && product.category === c.slug ? 'selected' : '';
    return '<option value="' + c.slug + '" ' + sel + '>' + escapeHtml(c.name) + '</option>';
  }).join('');

  modalProductImages = product ? (product.images || []).slice() : [];

  var panel = document.getElementById('modalPanel');
  panel.className = 'modal-panel';
  panel.innerHTML =
    '<div class="modal-head"><h3>' + title + '</h3><button class="modal-close" onclick="adminCloseModal()">' + closeXIcon() + '</button></div>' +
    '<div class="modal-body"><div class="form-grid">' +
    '<div class="form-field full"><label>Tên sản phẩm</label><input id="pf-name" value="' + escapeHtml(product ? product.name : '') + '" placeholder="Ví dụ: Bộ nồi inox 3 đáy 5 món"></div>' +
    '<div class="form-field"><label>Danh mục</label><select id="pf-category" style="padding:10px 12px;border-radius:8px;border:1.5px solid var(--border);font-size:13.5px;">' + catOptions + '</select></div>' +
    '<div class="form-field"><label>Giá bán (₫)</label><input id="pf-price" type="text" inputmode="numeric" value="' + numToInputStr(product ? product.price : '') + '" placeholder="890.000"></div>' +
    '<div class="form-field"><label>Giá gốc (nếu giảm giá)</label><input id="pf-oldprice" type="text" inputmode="numeric" value="' + numToInputStr(product && product.oldPrice ? product.oldPrice : '') + '" placeholder="Để trống nếu không giảm giá"></div>' +
    '<div class="form-field"><label>Trạng thái</label><div style="display:flex;gap:18px;padding-top:8px;">' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:500;"><input type="checkbox" id="pf-stock" ' + (!product || product.stock ? 'checked' : '') + '> Còn hàng</label>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:500;"><input type="checkbox" id="pf-featured" ' + (product && product.isFeatured ? 'checked' : '') + '> Bán chạy</label>' +
    '</div></div>' +
    '<div class="form-field full"><label>Mô tả</label><textarea id="pf-desc" placeholder="Mô tả ngắn về sản phẩm...">' + escapeHtml(product && product.description ? product.description : '') + '</textarea></div>' +
    '<div class="form-field full"><label>Ảnh sản phẩm</label>' +
    '<div class="image-dropzone" id="pf-image-drop" onclick="document.getElementById(\'pf-image-file\').click()" ' +
    'ondragover="event.preventDefault();this.classList.add(\'drag-over\')" ' +
    'ondragleave="this.classList.remove(\'drag-over\')" ' +
    'ondrop="adminHandleProductImageDrop(event)">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>' +
    '<span>Kéo ảnh vào đây hoặc bấm để chọn</span></div>' +
    '<div class="image-thumb-row" id="pf-image-row"></div>' +
    '<p class="hint" style="margin-top:6px;">Tối đa 4 ảnh, tự động nén trước khi tải lên.</p></div>' +
    '</div></div>' +
    '<div class="modal-foot"><button class="btn btn-outline" onclick="adminCloseModal()">Huỷ</button><button class="btn btn-primary" onclick="adminSaveProduct(' + (product ? "'" + product.id + "'" : 'null') + ')">Lưu sản phẩm</button></div>';

  renderProductImageSlots();
  formatNumberInput(document.getElementById('pf-price'));
  formatNumberInput(document.getElementById('pf-oldprice'));
  openModal();
}

function numToInputStr(n) {
  return n ? Number(n).toLocaleString('vi-VN') : '';
}

function parseFormattedNumber(str) {
  return Number(String(str || '').replace(/[^\d]/g, '')) || 0;
}

function formatNumberInput(el) {
  if (!el) return;
  el.addEventListener('input', function () {
    var raw = this.value.replace(/[^\d]/g, '');
    this.value = raw ? Number(raw).toLocaleString('vi-VN') : '';
  });
}

function renderProductImageSlots() {
  var thumbRow = document.getElementById('pf-image-row');
  var dropzone = document.getElementById('pf-image-drop');
  if (!thumbRow) return;

  thumbRow.innerHTML = modalProductImages.map(function (url, idx) {
    return '<div class="image-slot" style="background-image:url(\'' + storagePathToUrl(url) + '\');background-size:cover;background-position:center;">' +
      '<div class="remove" onclick="adminRemoveProductImage(' + idx + ')">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></div></div>';
  }).join('');

  if (dropzone) {
    var reachedMax = modalProductImages.length >= 4;
    dropzone.classList.toggle('disabled', reachedMax);
    var label = dropzone.querySelector('span');
    if (label) {
      label.textContent = reachedMax
        ? 'Đã đạt tối đa 4 ảnh — xoá bớt để thêm ảnh khác'
        : 'Kéo ảnh vào đây hoặc bấm để chọn';
    }
  }
}

function uploadProductImageFile(file) {
  if (modalProductImages.length >= 4) { showToast('Tối đa 4 ảnh mỗi sản phẩm'); return; }
  if (!file || file.type.indexOf('image/') !== 0) { showToast('Vui lòng chọn file ảnh'); return; }
  showToast('Đang tải ảnh lên...');
  uploadToStorage('products', file).then(function (url) {
    modalProductImages.push(url);
    renderProductImageSlots();
    showToast('Đã tải ảnh lên');
  }).catch(function (err) {
    console.error(err);
    showToast('Tải ảnh thất bại, thử lại');
  });
}

function handleProductImageDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  var file = e.dataTransfer.files && e.dataTransfer.files[0];
  uploadProductImageFile(file);
}

function removeProductImage(idx) {
  modalProductImages.splice(idx, 1);
  renderProductImageSlots();
}

function compressImageFile(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var maxW = 1000;
      var scale = Math.min(1, maxW / img.width);
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob); else reject(new Error('Không nén được ảnh'));
      }, 'image/jpeg', 0.82);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

function uploadToStorage(pathPrefix, file) {
  return compressImageFile(file).then(function (blob) {
    var path = pathPrefix + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    var storageRef = ref(storage, path);
    return uploadBytes(storageRef, blob).then(function () { return getDownloadURL(storageRef); });
  });
}

document.getElementById('pf-image-file').addEventListener('change', function (e) {
  var file = e.target.files[0];
  e.target.value = '';
  uploadProductImageFile(file);
});

function saveProduct(id) {
  var name = document.getElementById('pf-name').value.trim();
  if (!name) { showToast('Vui lòng nhập tên sản phẩm'); return; }

  var data = {
    name: name,
    category: document.getElementById('pf-category').value,
    price: parseFormattedNumber(document.getElementById('pf-price').value),
    oldPrice: document.getElementById('pf-oldprice').value ? parseFormattedNumber(document.getElementById('pf-oldprice').value) : null,
    stock: document.getElementById('pf-stock').checked,
    isFeatured: document.getElementById('pf-featured').checked,
    description: document.getElementById('pf-desc').value.trim(),
    images: modalProductImages,
    updatedAt: serverTimestamp()
  };

  var promise;
  if (id) {
    promise = updateDoc(doc(db, 'products', id), data);
  } else {
    data.slug = slugify(name);
    data.isActive = true;
    data.createdAt = serverTimestamp();
    promise = addDoc(collection(db, 'products'), data);
  }

  promise.then(function () {
    showToast(id ? 'Đã lưu thay đổi sản phẩm' : 'Đã thêm sản phẩm mới');
    closeModal();
  }).catch(function (err) {
    console.error(err);
    showToast('Lưu sản phẩm thất bại');
  });
}

/* =======================================================================
   DANH MỤC
   ======================================================================= */

function renderCategories() {
  var grid = document.getElementById('categoriesGrid');
  if (!grid) return;
  var html = categoriesCache.map(function (c) {
    var count = productsCache.filter(function (p) { return p.category === c.slug; }).length;
    return '<div class="card cat-admin-card">' +
      '<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6">' + (CATEGORY_ICONS[c.icon] || CATEGORY_ICONS.pot) + '</svg></div>' +
      '<div class="info"><div class="name">' + escapeHtml(c.name) + '</div><div class="count">' + count + ' sản phẩm</div></div>' +
      '<button class="icon-btn" title="Sửa" onclick="adminOpenCategoryModal(\'edit\',\'' + c.slug + '\')">' + editIcon() + '</button>' +
      '<button class="icon-btn" title="Xoá" onclick="adminOpenDeleteConfirm(\'category\',\'' + c.slug + '\')">' + trashIcon() + '</button>' +
      '</div>';
  }).join('');
  html += '<div class="cat-admin-card add-new" onclick="adminOpenCategoryModal(\'add\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M12 5v14M5 12h14"/></svg>Thêm danh mục</div>';
  grid.innerHTML = html;
}

function openCategoryModal(mode, slug) {
  var cat = mode === 'edit' ? categoriesCache.find(function (c) { return c.slug === slug; }) : null;
  var title = mode === 'edit' ? 'Sửa danh mục' : 'Thêm danh mục mới';
  var iconOptions = Object.keys(CATEGORY_ICONS).map(function (key) {
    var sel = (cat ? cat.icon === key : key === 'pot') ? 'selected' : '';
    return '<div class="icon-option ' + sel + '" data-icon="' + key + '" onclick="adminSelectIconOption(this)"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6">' + CATEGORY_ICONS[key] + '</svg></div>';
  }).join('');

  var panel = document.getElementById('modalPanel');
  panel.className = 'modal-panel modal-sm';
  panel.innerHTML =
    '<div class="modal-head"><h3>' + title + '</h3><button class="modal-close" onclick="adminCloseModal()">' + closeXIcon() + '</button></div>' +
    '<div class="modal-body"><div class="form-grid">' +
    '<div class="form-field full"><label>Tên danh mục</label><input id="cf-name" value="' + escapeHtml(cat ? cat.name : '') + '" placeholder="Ví dụ: Đồ dùng nhà bếp"></div>' +
    '<div class="form-field full"><label>Thứ tự hiển thị</label><input id="cf-order" type="number" value="' + (cat ? cat.order : (categoriesCache.length + 1)) + '"></div>' +
    '<div class="form-field full"><label>Chọn icon</label><div class="icon-picker" id="iconPicker">' + iconOptions + '</div></div>' +
    '</div></div>' +
    '<div class="modal-foot"><button class="btn btn-outline" onclick="adminCloseModal()">Huỷ</button><button class="btn btn-primary" onclick="adminSaveCategory(' + (cat ? "'" + cat.slug + "'" : 'null') + ')">Lưu danh mục</button></div>';

  openModal();
}

function selectIconOption(el) {
  document.querySelectorAll('#iconPicker .icon-option').forEach(function (o) { o.classList.remove('selected'); });
  el.classList.add('selected');
}

function saveCategory(slug) {
  var name = document.getElementById('cf-name').value.trim();
  if (!name) { showToast('Vui lòng nhập tên danh mục'); return; }
  var order = Number(document.getElementById('cf-order').value) || 1;
  var iconEl = document.querySelector('#iconPicker .icon-option.selected');
  var icon = iconEl ? iconEl.dataset.icon : 'pot';

  var promise;
  if (slug) {
    promise = updateDoc(doc(db, 'categories', slug), { name: name, order: order, icon: icon });
  } else {
    var newSlug = uniqueCategorySlug(name);
    promise = setDoc(doc(db, 'categories', newSlug), { slug: newSlug, name: name, order: order, icon: icon });
  }

  promise.then(function () {
    showToast(slug ? 'Đã lưu thay đổi danh mục' : 'Đã thêm danh mục mới');
    closeModal();
  }).catch(function (err) {
    console.error(err);
    showToast('Lưu danh mục thất bại');
  });
}

/* =======================================================================
   XOÁ (sản phẩm / danh mục)
   ======================================================================= */

var DELETE_TYPE_LABELS = { product: 'sản phẩm', category: 'danh mục', message: 'tin nhắn' };

function openDeleteConfirm(type, id) {
  var name = '', productCount = 0;
  if (type === 'product') {
    var p = productsCache.find(function (x) { return x.id === id; });
    name = p ? p.name : '';
  } else if (type === 'category') {
    var c = categoriesCache.find(function (x) { return x.slug === id; });
    name = c ? c.name : '';
    productCount = productsCache.filter(function (x) { return x.category === id; }).length;
  } else if (type === 'message') {
    var m = messagesCache.find(function (x) { return x.id === id; });
    name = m ? (m.name + ' — ' + m.content.slice(0, 60) + (m.content.length > 60 ? '…' : '')) : '';
  }

  var deleteBtn = productCount > 0
    ? '<button class="btn" disabled style="background:var(--warn);color:#fff;opacity:.4;cursor:not-allowed;">Xoá</button>'
    : '<button class="btn" style="background:var(--warn);color:#fff;" onclick="adminConfirmDelete(\'' + type + '\',\'' + id + '\')">Xoá</button>';

  var panel = document.getElementById('modalPanel');
  panel.className = 'modal-panel modal-sm';
  panel.innerHTML =
    '<div class="modal-head"><h3>Xoá ' + DELETE_TYPE_LABELS[type] + '?</h3><button class="modal-close" onclick="adminCloseModal()">' + closeXIcon() + '</button></div>' +
    '<div class="modal-body">' +
    '<p style="font-size:14px;margin-bottom:14px;">Bạn có chắc muốn xoá <strong>"' + escapeHtml(name) + '"</strong>? Hành động này không thể hoàn tác.</p>' +
    (productCount > 0
      ? '<div class="delete-warning"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg><span>Danh mục này đang có ' + productCount + ' sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước khi xoá.</span></div>'
      : '') +
    '</div>' +
    '<div class="modal-foot"><button class="btn btn-outline" onclick="adminCloseModal()">Huỷ</button>' + deleteBtn + '</div>';

  openModal();
}

function confirmDelete(type, id) {
  var collectionName = type === 'product' ? 'products' : (type === 'category' ? 'categories' : 'messages');
  deleteDoc(doc(db, collectionName, id)).then(function () {
    showToast('Đã xoá ' + DELETE_TYPE_LABELS[type]);
    closeModal();
    closeDrawer();
  }).catch(function (err) {
    console.error(err);
    showToast('Xoá thất bại');
  });
}

/* =======================================================================
   HỘP THƯ
   ======================================================================= */

var messagePage = 1;
var messagePageSize = 10;

function renderMessagesPagination(totalItems) {
  var container = document.getElementById('messagesPagination');
  if (!container) return;
  var totalPages = Math.max(1, Math.ceil(totalItems / messagePageSize));
  if (messagePage > totalPages) messagePage = totalPages;
  if (messagePage < 1) messagePage = 1;
  container.innerHTML =
    '<button class="page-btn" ' + (messagePage <= 1 ? 'disabled' : '') + ' onclick="adminGoToMessagePage(' + (messagePage - 1) + ')">‹ Trước</button>' +
    '<span class="page-info">Trang ' + messagePage + ' / ' + totalPages + '</span>' +
    '<button class="page-btn" ' + (messagePage >= totalPages ? 'disabled' : '') + ' onclick="adminGoToMessagePage(' + (messagePage + 1) + ')">Sau ›</button>';
}

function goToMessagePage(page) {
  messagePage = page;
  renderMessages();
}

function renderMessages() {
  var list = document.getElementById('messagesList');
  if (!list) return;

  renderMessagesPagination(messagesCache.length);

  var startIdx = (messagePage - 1) * messagePageSize;
  var pageItems = messagesCache.slice(startIdx, startIdx + messagePageSize);

  list.innerHTML = pageItems.map(function (m) {
    var badgeClass = m.status === 'moi' ? 'badge-warn' : 'badge-ok';
    var badgeLabel = m.status === 'moi' ? 'Mới' : 'Đã liên hệ';
    var phoneDigits = (m.phone || '').replace(/[^0-9+]/g, '');
    var telHref = 'tel:' + phoneDigits;
    var zaloHref = 'https://zalo.me/' + phoneDigits;
    var imageTag = m.imageUrl ? ' <span title="Có ảnh đính kèm">📷</span>' : '';
    return '<div class="msg-item clickable-row" onclick="adminOpenMessageDetail(\'' + m.id + '\')">' +
      '<div class="msg-avatar">' + escapeHtml((m.name || '?').charAt(0)) + '</div>' +
      '<div class="msg-body">' +
      '<div class="msg-top"><span class="name">' + escapeHtml(m.name) + ' — ' + escapeHtml(m.phone) + '</span><span class="time">' + formatRelativeTime(m.createdAt) + '</span></div>' +
      '<div class="msg-content">' + escapeHtml(m.content) + imageTag + '</div>' +
      '<div class="msg-actions">' +
      '<span class="badge ' + badgeClass + '">' + badgeLabel + '</span>' +
      '<a class="btn btn-outline btn-sm" href="' + telHref + '" onclick="event.stopPropagation()">📞 Gọi ngay</a>' +
      '<a class="btn btn-outline btn-sm" href="' + zaloHref + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬 Nhắn Zalo</a>' +
      '<span class="btn-ghost btn-sm">Xem chi tiết →</span>' +
      '<button class="icon-btn" title="Xoá tin nhắn" onclick="event.stopPropagation();adminOpenDeleteConfirm(\'message\',\'' + m.id + '\')">' + trashIcon() + '</button>' +
      '</div></div></div>';
  }).join('') || '<p class="hint" style="padding:20px;">Chưa có tin nhắn nào.</p>';
}

document.getElementById('mfilter-pagesize').addEventListener('change', function () {
  messagePageSize = Number(this.value) || 10;
  messagePage = 1;
  renderMessages();
});

function renderRecentMessages() {
  var list = document.getElementById('recentMessagesList');
  if (!list) return;
  list.innerHTML = messagesCache.slice(0, 2).map(function (m) {
    return '<div class="msg-item">' +
      '<div class="msg-avatar">' + escapeHtml((m.name || '?').charAt(0)) + '</div>' +
      '<div class="msg-body">' +
      '<div class="msg-top"><span class="name">' + escapeHtml(m.name) + '</span><span class="time">' + formatRelativeTime(m.createdAt) + '</span></div>' +
      '<div class="msg-content">' + escapeHtml(m.content) + '</div>' +
      '</div></div>';
  }).join('') || '<p class="hint">Chưa có tin nhắn nào.</p>';
}

function openMessageDetail(id) {
  var m = messagesCache.find(function (x) { return x.id === id; });
  if (!m) return;
  var phoneDigits = (m.phone || '').replace(/[^0-9+]/g, '');
  var telHref = 'tel:' + phoneDigits;
  var zaloHref = 'https://zalo.me/' + phoneDigits;

  var panel = document.getElementById('drawerPanel');
  panel.innerHTML =
    '<div class="drawer-head"><h3 style="font-size:16px;">Chi tiết tin nhắn</h3><button class="modal-close" onclick="adminCloseDrawer()">' + closeXIcon() + '</button></div>' +
    '<div class="drawer-body">' +
    '<div class="detail-row"><span>Khách hàng</span><span>' + escapeHtml(m.name) + '</span></div>' +
    '<div class="detail-row"><span>Số điện thoại</span><span>' + escapeHtml(m.phone) + '</span></div>' +
    '<div class="detail-row"><span>Thời gian gửi</span><span>' + formatRelativeTime(m.createdAt) + '</span></div>' +
    '<div style="margin-top:16px;"><label style="font-size:12.5px;font-weight:600;">Nội dung khách gửi</label><p style="font-size:14px;margin-top:6px;line-height:1.6;">' + escapeHtml(m.content) + '</p></div>' +
    (m.imageUrl
      ? '<div style="margin-top:16px;"><label style="font-size:12.5px;font-weight:600;">Ảnh khách gửi kèm</label>' +
        '<a href="' + m.imageUrl + '" target="_blank" rel="noopener"><img src="' + m.imageUrl + '" alt="Ảnh khách gửi" style="width:100%;max-height:260px;object-fit:cover;border-radius:10px;margin-top:6px;display:block;"></a></div>'
      : '') +
    '<div style="margin-top:18px;"><label style="font-size:12.5px;font-weight:600;">Trạng thái</label><div class="status-select">' +
    '<div class="status-opt ' + (m.status === 'moi' ? 'selected new' : '') + '" onclick="adminSetMessageStatus(\'' + m.id + '\',\'moi\')">Mới</div>' +
    '<div class="status-opt ' + (m.status === 'da_lien_he' ? 'selected done' : '') + '" onclick="adminSetMessageStatus(\'' + m.id + '\',\'da_lien_he\')">Đã liên hệ</div>' +
    '</div></div>' +
    '<div style="margin-top:14px;"><label style="font-size:12.5px;font-weight:600;">Ghi chú nội bộ (khách không thấy)</label>' +
    '<textarea id="msg-note" style="width:100%;margin-top:6px;padding:10px 12px;border-radius:8px;border:1.5px solid var(--border);font-size:13.5px;min-height:80px;">' + escapeHtml(m.note || '') + '</textarea>' +
    '<button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="adminSaveMessageNote(\'' + m.id + '\')">Lưu ghi chú</button></div>' +
    '</div>' +
    '<div class="drawer-foot">' +
    '<a class="btn btn-outline" style="flex:1;text-align:center;" href="' + telHref + '">📞 Gọi ngay</a>' +
    '<a class="btn btn-primary" style="flex:1;text-align:center;" href="' + zaloHref + '" target="_blank" rel="noopener">💬 Nhắn Zalo</a>' +
    '<button class="icon-btn" title="Xoá tin nhắn" onclick="adminOpenDeleteConfirm(\'message\',\'' + m.id + '\')">' + trashIcon() + '</button>' +
    '</div>';

  document.getElementById('drawerOverlay').classList.add('open');
}

function closeDrawer() { document.getElementById('drawerOverlay').classList.remove('open'); }
document.getElementById('drawerOverlay').addEventListener('click', function (e) { if (e.target === this) closeDrawer(); });

function setMessageStatus(id, status) {
  updateDoc(doc(db, 'messages', id), { status: status }).then(function () {
    openMessageDetail(id);
    showToast(status === 'moi' ? 'Đã đánh dấu Mới' : 'Đã đánh dấu Đã liên hệ');
  }).catch(function (err) {
    console.error(err);
    showToast('Cập nhật thất bại');
  });
}

function saveMessageNote(id) {
  var note = document.getElementById('msg-note').value;
  updateDoc(doc(db, 'messages', id), { note: note }).then(function () {
    showToast('Đã lưu ghi chú');
  }).catch(function (err) {
    console.error(err);
    showToast('Lưu ghi chú thất bại');
  });
}

/* =======================================================================
   TỔNG QUAN
   ======================================================================= */

function updateDashboardStats() {
  var els = document.querySelectorAll('#page-dashboard .stat-card .value');
  if (els.length >= 4) {
    els[0].textContent = productsCache.length;
    els[1].textContent = productsCache.filter(function (p) { return !p.stock; }).length;
    els[2].textContent = categoriesCache.length;
    els[3].textContent = messagesCache.filter(function (m) { return m.status === 'moi'; }).length;
  }
  var newMessagesCount = messagesCache.filter(function (m) { return m.status === 'moi'; }).length;
  var navProducts = document.getElementById('navCountProducts');
  var navCategories = document.getElementById('navCountCategories');
  var navMessages = document.getElementById('navCountMessages');
  if (navProducts) navProducts.textContent = productsCache.length;
  if (navCategories) navCategories.textContent = categoriesCache.length;
  if (navMessages) navMessages.textContent = newMessagesCount;
}

/* =======================================================================
   MODAL DÙNG CHUNG
   ======================================================================= */

function openModal() { document.getElementById('modalOverlay').classList.add('open'); }
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
document.getElementById('modalOverlay').addEventListener('click', function (e) { if (e.target === this) closeModal(); });

/* =======================================================================
   CÀI ĐẶT (settings/main)
   ======================================================================= */

function loadSettings() {
  getDoc(doc(db, 'settings', 'main')).then(function (snap) {
    settingsCache = snap.exists() ? snap.data() : {};
    populateSettingsForms(settingsCache);
  }).catch(function (err) {
    console.error('Lỗi tải cài đặt:', err);
    showToast('Không tải được cài đặt');
  });
}

function populateSettingsForms(s) {
  var appearance = s.appearance || {};
  var hero = appearance.hero || {};
  var store = s.store || {};
  var links = s.links || {};
  var zaloOA = links.zaloOA || {};

  if (appearance.logo) document.getElementById('settingsLogoPreview').src = storagePathToUrl(appearance.logo);
  document.getElementById('set-storeName').value = appearance.storeName || '';
  document.getElementById('set-tagline').value = appearance.tagline || '';
  document.getElementById('set-heroBadge').value = hero.badge || '';
  document.getElementById('set-heroTitle1').value = hero.titleLine1 || '';
  document.getElementById('set-heroHighlight').value = hero.titleHighlight || '';
  document.getElementById('set-heroTitle2').value = hero.titleLine2 || '';
  document.getElementById('set-heroDesc').value = hero.description || '';
  document.getElementById('set-featuredLimit').value = appearance.featuredLimit || 8;

  document.getElementById('set-address').value = store.address || '';
  document.getElementById('set-addressNote').value = store.addressNote || '';
  document.getElementById('set-hoursWeekday').value = store.hoursWeekday || '';
  document.getElementById('set-hoursSunday').value = store.hoursSunday || '';
  document.getElementById('set-hotline').value = store.hotlineLabel || '';
  document.getElementById('set-showShipping').checked = !!store.showShippingBanner;
  document.getElementById('set-showShippingLabel').textContent = store.showShippingBanner ? 'Đang bật' : 'Đang tắt';

  document.getElementById('set-facebook').value = links.facebook || '';
  document.getElementById('set-messenger').value = links.messenger || '';
  document.getElementById('set-zaloPersonal').value = links.zaloPersonal || '';
  document.getElementById('set-zaloOaId').value = zaloOA.oaId || '';
  document.getElementById('set-zaloDomain').value = zaloOA.domain || '';
  document.getElementById('set-mapsEmbed').value = links.googleMapsEmbed || '';
}

function cancelSettings(section) {
  if (!settingsCache) return;
  populateSettingsForms(settingsCache);
  showToast('Đã huỷ thay đổi');
}

var pendingLogoUrl = null;

document.getElementById('logoFileInput').addEventListener('change', function (e) {
  var file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  showToast('Đang tải logo lên...');
  uploadToStorage('branding', file).then(function (url) {
    pendingLogoUrl = url;
    document.getElementById('settingsLogoPreview').src = url;
    showToast('Đã tải logo lên — nhớ bấm Lưu thay đổi');
  }).catch(function (err) {
    console.error(err);
    showToast('Tải logo thất bại');
  });
});

function deriveMessengerLink(fbUrl) {
  if (!fbUrl) return '';
  try {
    var u = new URL(fbUrl);
    var id = u.searchParams.get('id');
    if (id) return 'https://m.me/' + id;
    var path = u.pathname.replace(/^\/|\/$/g, '');
    if (path) return 'https://m.me/' + path;
  } catch (e) { /* URL không hợp lệ — bỏ qua */ }
  return '';
}

document.getElementById('set-facebook').addEventListener('input', function () {
  document.getElementById('set-messenger').value = deriveMessengerLink(this.value);
});

document.getElementById('set-showShipping').addEventListener('change', function () {
  document.getElementById('set-showShippingLabel').textContent = this.checked ? 'Đang bật' : 'Đang tắt';
});

function saveSettingsAppearance() {
  var appearance = {
    logo: pendingLogoUrl || (settingsCache && settingsCache.appearance && settingsCache.appearance.logo) || '',
    storeName: document.getElementById('set-storeName').value.trim(),
    tagline: document.getElementById('set-tagline').value.trim(),
    hero: {
      badge: document.getElementById('set-heroBadge').value.trim(),
      titleLine1: document.getElementById('set-heroTitle1').value.trim(),
      titleHighlight: document.getElementById('set-heroHighlight').value.trim(),
      titleLine2: document.getElementById('set-heroTitle2').value.trim(),
      description: document.getElementById('set-heroDesc').value.trim()
    },
    featuredLimit: Number(document.getElementById('set-featuredLimit').value) || 8
  };
  updateDoc(doc(db, 'settings', 'main'), { appearance: appearance }).then(function () {
    settingsCache = Object.assign({}, settingsCache, { appearance: appearance });
    pendingLogoUrl = null;
    showToast('Đã lưu Giao diện');
  }).catch(function (err) { console.error(err); showToast('Lưu thất bại'); });
}

function saveSettingsStore() {
  var store = {
    address: document.getElementById('set-address').value.trim(),
    addressNote: document.getElementById('set-addressNote').value.trim(),
    hoursWeekday: document.getElementById('set-hoursWeekday').value.trim(),
    hoursSunday: document.getElementById('set-hoursSunday').value.trim(),
    phoneHref: 'tel:' + document.getElementById('set-hotline').value.replace(/[^0-9+]/g, ''),
    hotlineLabel: document.getElementById('set-hotline').value.trim(),
    showShippingBanner: document.getElementById('set-showShipping').checked
  };
  updateDoc(doc(db, 'settings', 'main'), { store: store }).then(function () {
    settingsCache = Object.assign({}, settingsCache, { store: store });
    showToast('Đã lưu Thông tin cửa hàng');
  }).catch(function (err) { console.error(err); showToast('Lưu thất bại'); });
}

function saveSettingsLinks() {
  var links = {
    facebook: document.getElementById('set-facebook').value.trim(),
    messenger: document.getElementById('set-messenger').value.trim(),
    zaloPersonal: document.getElementById('set-zaloPersonal').value.trim(),
    zaloOA: {
      oaId: document.getElementById('set-zaloOaId').value.trim(),
      domain: document.getElementById('set-zaloDomain').value.trim()
    },
    googleMapsEmbed: document.getElementById('set-mapsEmbed').value.trim()
  };
  updateDoc(doc(db, 'settings', 'main'), { links: links }).then(function () {
    settingsCache = Object.assign({}, settingsCache, { links: links });
    showToast('Đã lưu Liên kết');
  }).catch(function (err) { console.error(err); showToast('Lưu thất bại'); });
}

/* =======================================================================
   TOAST
   ======================================================================= */

var toastTimer;
function showToast(text) {
  var el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
}

/* =======================================================================
   GẮN HÀM VÀO window — để các onclick="..." sinh ra trong HTML gọi được
   (module scope không tự động lộ ra global như script thường)
   ======================================================================= */

window.adminOpenProductModal = openProductModal;
window.adminSaveProduct = saveProduct;
window.adminToggleProductField = toggleProductField;
window.adminGoToProductPage = goToProductPage;
window.adminGoToMessagePage = goToMessagePage;
window.adminRemoveProductImage = removeProductImage;
window.adminHandleProductImageDrop = handleProductImageDrop;
window.adminOpenCategoryModal = openCategoryModal;
window.adminSelectIconOption = selectIconOption;
window.adminSaveCategory = saveCategory;
window.adminOpenDeleteConfirm = openDeleteConfirm;
window.adminConfirmDelete = confirmDelete;
window.adminCloseModal = closeModal;
window.adminOpenMessageDetail = openMessageDetail;
window.adminCloseDrawer = closeDrawer;
window.adminSetMessageStatus = setMessageStatus;
window.adminSaveMessageNote = saveMessageNote;
window.showPage = showPage;
window.saveSettingsAppearance = saveSettingsAppearance;
window.saveSettingsStore = saveSettingsStore;
window.saveSettingsLinks = saveSettingsLinks;
window.cancelSettings = cancelSettings;

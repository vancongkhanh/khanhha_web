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
import {
  getMessaging, getToken, onMessage, isSupported as isMessagingSupported
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js';

// UID các tài khoản được phép vào trang quản trị — thêm UID thứ 2 vào đây
// khi tạo xong tài khoản cho người còn lại (nhớ cập nhật cả firestore.rules
// và storage.rules cho khớp).
var ADMIN_UIDS = ['BxRGkox6sYZhwSM7OOjqu42J9bH2'];
var currentAdminUid = null;

var STORAGE_BUCKET = 'khanhha-web.firebasestorage.app';

/* =======================================================================
   DỮ LIỆU TRẠNG THÁI — nạp từ Firestore, không còn dữ liệu mẫu viết cứng
   ======================================================================= */
var categoriesCache = [];
var productsCache = [];
var messagesCache = [];
var chatSessionsCache = [];
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

/**
 * Thoát HTML rồi biến các URL dạng chữ thường (http/https) trong nội dung
 * tin nhắn thành link bấm được, mở tab mới — dùng cho nội dung khách gửi
 * qua form Liên hệ (thường kèm link sản phẩm khách đang hỏi).
 */
function linkifyText(str) {
  var escaped = escapeHtml(str);
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, function (url) {
    var trailing = '';
    var trailingMatch = url.match(/[.,;:)\]]+$/);
    if (trailingMatch) {
      trailing = trailingMatch[0];
      url = url.slice(0, -trailing.length);
    }
    return '<a href="' + url + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + url + '</a>' + trailing;
  });
}

function formatVND(n) { return Number(n || 0).toLocaleString('vi-VN') + '₫'; }

/**
 * Nội dung tin nhắn từ nút "Gửi tin nhắn" ở trang chi tiết sản phẩm luôn
 * kèm link dạng san-pham-chi-tiet.html?id=XXX — bóc ra id để bật popup
 * xem nhanh thông tin sản phẩm ngay trong Hộp thư.
 */
function extractProductIdFromContent(content) {
  var match = String(content || '').match(/san-pham-chi-tiet\.html\?id=([^\s&"'<]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Danh sách ảnh đính kèm của 1 tin nhắn. Hiện tại form Liên hệ chỉ cho gửi
 * 1 ảnh (field imageUrl), nhưng đọc thêm field images (mảng) nếu sau này
 * mở rộng cho gửi nhiều ảnh — không cần sửa lại nơi hiển thị.
 */
function messageImageList(m) {
  if (m.images && m.images.length) return m.images;
  if (m.imageUrl) return [m.imageUrl];
  return [];
}

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
    currentAdminUid = user.uid;
    loginError.textContent = '';
    setAppVisible(true);
    document.getElementById('topbarUserEmail').textContent = user.email || '';
    showAppLoading();
    startApp();
  } else {
    currentAdminUid = null;
    if (user) {
      loginError.textContent = 'Tài khoản này không có quyền quản trị.';
      signOut(auth);
    }
    setAppVisible(false);
    hideAppLoading();
  }
});

function showAppLoading() {
  var el = document.getElementById('appLoading');
  if (el) el.classList.add('open');
}
function hideAppLoading() {
  var el = document.getElementById('appLoading');
  if (el) el.classList.remove('open');
}

var REMEMBER_EMAIL_KEY = 'khanhha_admin_email';

var savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
if (savedEmail) {
  document.getElementById('login-email').value = savedEmail;
  document.getElementById('login-remember').checked = true;
}

document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var loginError = document.getElementById('loginError');
  var submitBtn = document.getElementById('loginSubmitBtn');
  loginError.textContent = '';
  var email = document.getElementById('login-email').value.trim();
  var password = document.getElementById('login-password').value;
  var remember = document.getElementById('login-remember').checked;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang đăng nhập...';

  setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
    .then(function () { return signInWithEmailAndPassword(auth, email, password); })
    .then(function () {
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    })
    .catch(function () {
      loginError.textContent = 'Sai email hoặc mật khẩu.';
    })
    .finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Đăng nhập';
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
  if (appStarted) {
    hideAppLoading();
    return;
  }
  appStarted = true;
  listenAdminDevices();
  initPushNotifications();
  Promise.all([
    listenCategories(),
    listenProducts(),
    listenMessages(),
    listenChatSessions(),
    loadSettings()
  ]).then(function () {
    hideAppLoading();
    handleNotificationDeepLink();
  });
}

/**
 * Bấm vào thông báo push (?messageId=... trong URL khi mở/điều hướng từ
 * service worker) -> mở luôn khung chi tiết đúng tin nhắn đó.
 */
function handleNotificationDeepLink() {
  var params = new URLSearchParams(window.location.search);
  var messageId = params.get('messageId');
  if (!messageId) return;
  goToMessageDetail(messageId);
  params.delete('messageId');
  var rest = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (rest ? '?' + rest : ''));
}

/* =======================================================================
   LẮNG NGHE DỮ LIỆU FIRESTORE (real-time)
   ======================================================================= */

function listenCategories() {
  return new Promise(function (resolveFirstLoad) {
    var firstLoad = true;
    onSnapshot(query(collection(db, 'categories'), orderBy('order')), function (snap) {
      categoriesCache = snap.docs.map(function (d) { return d.data(); });
      renderCategories();
      populateCategoryFilterOptions();
      renderProducts();
      updateDashboardStats();
      if (firstLoad) { firstLoad = false; resolveFirstLoad(); }
    }, function (err) {
      console.error('Lỗi tải danh mục:', err);
      showToast('Không tải được danh mục');
      if (firstLoad) { firstLoad = false; resolveFirstLoad(); }
    });
  });
}

function listenProducts() {
  return new Promise(function (resolveFirstLoad) {
    var firstLoad = true;
    onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), function (snap) {
      productsCache = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      renderProducts();
      renderCategories();
      updateDashboardStats();
      if (firstLoad) { firstLoad = false; resolveFirstLoad(); }
    }, function (err) {
      console.error('Lỗi tải sản phẩm:', err);
      showToast('Không tải được sản phẩm');
      if (firstLoad) { firstLoad = false; resolveFirstLoad(); }
    });
  });
}

function listenMessages() {
  return new Promise(function (resolveFirstLoad) {
    var firstLoad = true;
    onSnapshot(query(collection(db, 'messages'), orderBy('createdAt', 'desc')), function (snap) {
      messagesCache = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      renderMessages();
      renderRecentMessages();
      updateDashboardStats();
      updateNotifyBadge();
      renderNotifyDropdown();
      if (firstLoad) { firstLoad = false; resolveFirstLoad(); }
    }, function (err) {
      console.error('Lỗi tải tin nhắn:', err);
      showToast('Không tải được hộp thư');
      if (firstLoad) { firstLoad = false; resolveFirstLoad(); }
    });
  });
}

function listenChatSessions() {
  return new Promise(function (resolveFirstLoad) {
    var firstLoad = true;
    onSnapshot(query(collection(db, 'chatSessions'), orderBy('updatedAt', 'desc')), function (snap) {
      chatSessionsCache = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      renderChatSessions();
      renderChatbotNoResultsSummary();
      updateDashboardStats();
      var navCount = document.getElementById('navCountChatSessions');
      if (navCount) navCount.textContent = chatSessionsCache.length;
      if (firstLoad) { firstLoad = false; resolveFirstLoad(); }
    }, function (err) {
      console.error('Lỗi tải phiên chatbot:', err);
      if (firstLoad) { firstLoad = false; resolveFirstLoad(); }
    });
  });
}

/* =======================================================================
   ĐIỀU HƯỚNG TRANG (sidebar) — giữ nguyên logic gốc của mockup
   ======================================================================= */

var pageTitles = {
  'dashboard': 'Tổng quan',
  'products': 'Sản phẩm',
  'categories': 'Danh mục',
  'messages': 'Hộp thư liên hệ',
  'chatbot': 'Chatbot',
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

function closeMobileSidebar() {
  var sidebarEl = document.getElementById('appSidebar');
  var backdrop = document.getElementById('sidebarBackdrop');
  if (sidebarEl) sidebarEl.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

function openMobileSidebar() {
  var sidebarEl = document.getElementById('appSidebar');
  var backdrop = document.getElementById('sidebarBackdrop');
  if (sidebarEl) sidebarEl.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
}

var mobileMenuToggle = document.getElementById('mobileMenuToggle');
if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', function () {
    var sidebarEl = document.getElementById('appSidebar');
    if (sidebarEl && sidebarEl.classList.contains('open')) closeMobileSidebar();
    else openMobileSidebar();
  });
}

var sidebarBackdropEl = document.getElementById('sidebarBackdrop');
if (sidebarBackdropEl) {
  sidebarBackdropEl.addEventListener('click', closeMobileSidebar);
}

document.querySelectorAll('.nav-item, .nav-sub-item').forEach(function (el) {
  el.addEventListener('click', function () {
    showPage(el.dataset.page);
    closeMobileSidebar();
  });
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
      '<td data-label="Sản phẩm"><div class="cell-name"><div class="prod-thumb-sm" style="' + thumbStyle + '">' + iconSvg + '</div>' + escapeHtml(p.name) + '</div></td>' +
      '<td data-label="Danh mục">' + escapeHtml(categoryName(p.category)) + '</td>' +
      '<td data-label="Giá">' + formatVND(p.price) + '</td>' +
      '<td data-label="Còn hàng"><label class="switch"><input type="checkbox" ' + (p.stock ? 'checked' : '') + ' onchange="adminToggleProductField(\'' + p.id + '\',\'stock\',this.checked)"><span class="slider"></span></label></td>' +
      '<td data-label="Bán chạy"><label class="switch"><input type="checkbox" ' + (p.isFeatured ? 'checked' : '') + ' onchange="adminToggleProductField(\'' + p.id + '\',\'featured\',this.checked)"><span class="slider"></span></label></td>' +
      '<td data-label="Thao tác"><div class="row-actions">' +
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

function goToOutOfStock() {
  showPage('products');
  productFilters.stock = 'out';
  document.getElementById('pfilter-stock').value = 'out';
  productPage = 1;
  renderProducts();
}
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
  showToast('Đang cập nhật...');
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
    '<div class="modal-foot"><button class="btn btn-outline" onclick="adminCloseModal()">Huỷ</button><button class="btn btn-primary" id="pf-save-btn" onclick="adminSaveProduct(' + (product ? "'" + product.id + "'" : 'null') + ',this)">Lưu sản phẩm</button></div>';

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

function uploadProductImageFile(file, silent) {
  if (modalProductImages.length >= 4) { showToast('Tối đa 4 ảnh mỗi sản phẩm'); return Promise.resolve(); }
  if (!file || file.type.indexOf('image/') !== 0) { showToast('Vui lòng chọn file ảnh'); return Promise.resolve(); }
  if (!silent) showToast('Đang tải ảnh lên...');
  return uploadToStorage('products', file).then(function (url) {
    modalProductImages.push(url);
    renderProductImageSlots();
    if (!silent) showToast('Đã tải ảnh lên');
  }).catch(function (err) {
    console.error(err);
    showToast('Tải ảnh thất bại, thử lại');
  });
}

/**
 * Kéo-thả hoặc chọn cùng lúc nhiều ảnh — tải TUẦN TỰ từng ảnh một (chờ ảnh
 * trước xong mới tải ảnh sau) để luôn tôn trọng đúng giới hạn 4 ảnh/sản
 * phẩm. Trước đây chỉ lấy files[0] nên kéo nhiều ảnh chỉ thêm được 1 ảnh.
 */
function uploadProductImageFiles(fileList) {
  var files = Array.prototype.slice.call(fileList || []);
  if (!files.length) return;
  var multi = files.length > 1;
  if (multi) showToast('Đang tải ' + files.length + ' ảnh lên...');
  files.reduce(function (chain, file) {
    return chain.then(function () { return uploadProductImageFile(file, multi); });
  }, Promise.resolve()).then(function () {
    if (multi) showToast('Đã tải ảnh lên');
  });
}

function handleProductImageDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  uploadProductImageFiles(e.dataTransfer.files);
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
  var files = e.target.files;
  e.target.value = '';
  uploadProductImageFiles(files);
});

function saveProduct(id, btn) {
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

  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  promise.then(function () {
    showToast(id ? 'Đã lưu thay đổi sản phẩm' : 'Đã thêm sản phẩm mới');
    closeModal();
  }).catch(function (err) {
    console.error(err);
    showToast('Lưu sản phẩm thất bại');
    if (btn) { btn.disabled = false; btn.textContent = 'Lưu sản phẩm'; }
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
    '<div class="modal-foot"><button class="btn btn-outline" onclick="adminCloseModal()">Huỷ</button><button class="btn btn-primary" onclick="adminSaveCategory(' + (cat ? "'" + cat.slug + "'" : 'null') + ',this)">Lưu danh mục</button></div>';

  openModal();
}

function selectIconOption(el) {
  document.querySelectorAll('#iconPicker .icon-option').forEach(function (o) { o.classList.remove('selected'); });
  el.classList.add('selected');
}

function saveCategory(slug, btn) {
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

  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  promise.then(function () {
    showToast(slug ? 'Đã lưu thay đổi danh mục' : 'Đã thêm danh mục mới');
    closeModal();
  }).catch(function (err) {
    console.error(err);
    showToast('Lưu danh mục thất bại');
    if (btn) { btn.disabled = false; btn.textContent = 'Lưu danh mục'; }
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
    : '<button class="btn" style="background:var(--warn);color:#fff;" onclick="adminConfirmDelete(\'' + type + '\',\'' + id + '\',this)">Xoá</button>';

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

function confirmDelete(type, id, btn) {
  var collectionName = type === 'product' ? 'products' : (type === 'category' ? 'categories' : 'messages');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang xoá...'; }
  deleteDoc(doc(db, collectionName, id)).then(function () {
    showToast('Đã xoá ' + DELETE_TYPE_LABELS[type]);
    closeModal();
    closeDrawer();
  }).catch(function (err) {
    console.error(err);
    showToast('Xoá thất bại');
    if (btn) { btn.disabled = false; btn.textContent = 'Xoá'; }
  });
}

/* =======================================================================
   HỘP THƯ
   ======================================================================= */

var messagePage = 1;
var messagePageSize = 10;
var messageFilters = { status: '' };

function applyMessageFilters(list) {
  return list.filter(function (m) {
    if (messageFilters.status && m.status !== messageFilters.status) return false;
    return true;
  });
}

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

  var filtered = applyMessageFilters(messagesCache);
  renderMessagesPagination(filtered.length);

  if (!filtered.length) {
    var emptyMsg = messageFilters.status ? 'Không có tin nhắn khớp bộ lọc.' : 'Chưa có tin nhắn nào.';
    list.innerHTML = '<p class="hint" style="padding:20px;">' + emptyMsg + '</p>';
    return;
  }

  var startIdx = (messagePage - 1) * messagePageSize;
  var pageItems = filtered.slice(startIdx, startIdx + messagePageSize);

  list.innerHTML = pageItems.map(function (m) {
    var badgeClass = m.status === 'moi' ? 'badge-warn' : 'badge-ok';
    var badgeLabel = m.status === 'moi' ? 'Mới' : 'Đã liên hệ';
    var phoneDigits = (m.phone || '').replace(/[^0-9+]/g, '');
    var telHref = 'tel:' + phoneDigits;
    var zaloHref = 'https://zalo.me/' + phoneDigits;
    var imageTag = m.imageUrl ? ' <span title="Có ảnh đính kèm">📷</span>' : '';
    var isUnread = !m.read;
    var unreadDot = isUnread ? '<span class="unread-dot" title="Chưa đọc"></span>' : '';
    return '<div class="msg-item clickable-row' + (isUnread ? ' msg-unread' : ' msg-read') + '" onclick="adminOpenMessageDetail(\'' + m.id + '\')">' +
      '<div class="msg-avatar">' + escapeHtml((m.name || '?').charAt(0)) + '</div>' +
      '<div class="msg-body">' +
      '<div class="msg-top"><span class="name">' + unreadDot + escapeHtml(m.name) + ' — ' + escapeHtml(m.phone) + '</span><span class="time">' + formatRelativeTime(m.createdAt) + '</span></div>' +
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

document.getElementById('mfilter-status').addEventListener('change', function () {
  messageFilters.status = this.value;
  messagePage = 1;
  renderMessages();
});

function goToNewMessages() {
  showPage('messages');
  messageFilters.status = 'moi';
  document.getElementById('mfilter-status').value = 'moi';
  messagePage = 1;
  renderMessages();
}

var dashboardMsgPage = 1;
var dashboardMsgPageSize = 10;

function renderDashboardMessagesPagination(totalItems) {
  var container = document.getElementById('recentMessagesPagination');
  if (!container) return;
  var totalPages = Math.max(1, Math.ceil(totalItems / dashboardMsgPageSize));
  if (dashboardMsgPage > totalPages) dashboardMsgPage = totalPages;
  if (dashboardMsgPage < 1) dashboardMsgPage = 1;
  container.innerHTML =
    '<button class="page-btn" ' + (dashboardMsgPage <= 1 ? 'disabled' : '') + ' onclick="adminGoToDashboardMsgPage(' + (dashboardMsgPage - 1) + ')">‹ Trước</button>' +
    '<span class="page-info">Trang ' + dashboardMsgPage + ' / ' + totalPages + '</span>' +
    '<button class="page-btn" ' + (dashboardMsgPage >= totalPages ? 'disabled' : '') + ' onclick="adminGoToDashboardMsgPage(' + (dashboardMsgPage + 1) + ')">Sau ›</button>';
}

function goToDashboardMsgPage(page) {
  dashboardMsgPage = page;
  renderRecentMessages();
}

function renderRecentMessages() {
  var list = document.getElementById('recentMessagesList');
  if (!list) return;

  var newMessages = messagesCache.filter(function (m) { return m.status === 'moi'; });
  renderDashboardMessagesPagination(newMessages.length);

  if (!newMessages.length) {
    list.innerHTML = '<p class="hint">Chưa có tin nhắn mới nào.</p>';
    return;
  }

  var startIdx = (dashboardMsgPage - 1) * dashboardMsgPageSize;
  var pageItems = newMessages.slice(startIdx, startIdx + dashboardMsgPageSize);

  list.innerHTML = pageItems.map(function (m) {
    return '<div class="msg-item clickable-row" onclick="adminGoToMessageDetail(\'' + m.id + '\')">' +
      '<div class="msg-avatar">' + escapeHtml((m.name || '?').charAt(0)) + '</div>' +
      '<div class="msg-body">' +
      '<div class="msg-top"><span class="name">' + escapeHtml(m.name) + '</span><span class="time">' + formatRelativeTime(m.createdAt) + '</span></div>' +
      '<div class="msg-content">' + escapeHtml(m.content) + '</div>' +
      '</div></div>';
  }).join('');
}

document.getElementById('dfilter-pagesize').addEventListener('change', function () {
  dashboardMsgPageSize = Number(this.value) || 10;
  dashboardMsgPage = 1;
  renderRecentMessages();
});

/* =======================================================================
   CHATBOT — danh sách phiên chat ghi lại từ widget trên web khách
   (collection "chatSessions"), xem lại trong Admin để biết khách đang
   hỏi gì, tìm sản phẩm gì mà chưa có kết quả.
   ======================================================================= */

var CHAT_EVENT_TARGET_LABELS = { zalo: 'Mở Zalo', facebook: 'Mở Facebook', maps: 'Xem bản đồ', contact_form: 'Mở form liên hệ' };

function formatChatEvent(event) {
  switch (event.type) {
    case 'menu_click': return '👉 Chọn: ' + event.label;
    case 'search':
      return event.resultsCount > 0
        ? '🔎 Tìm "' + event.query + '" — ' + event.resultsCount + ' kết quả'
        : '🔎 Tìm "' + event.query + '" — không có kết quả';
    case 'category_click': return '📂 Xem danh mục: ' + categoryName(event.category);
    case 'product_click': return '📦 Xem sản phẩm: ' + event.productName;
    case 'external_click': return '↗️ ' + (CHAT_EVENT_TARGET_LABELS[event.target] || event.target);
    default: return event.type;
  }
}

function formatChatEventTime(isoString) {
  var d = isoString ? new Date(isoString) : null;
  if (!d || isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

var chatSessionPage = 1;
var chatSessionPageSize = 10;

function renderChatSessionsPagination(totalItems) {
  var container = document.getElementById('chatSessionsPagination');
  if (!container) return;
  var totalPages = Math.max(1, Math.ceil(totalItems / chatSessionPageSize));
  if (chatSessionPage > totalPages) chatSessionPage = totalPages;
  if (chatSessionPage < 1) chatSessionPage = 1;
  container.innerHTML =
    '<button class="page-btn" ' + (chatSessionPage <= 1 ? 'disabled' : '') + ' onclick="adminGoToChatSessionPage(' + (chatSessionPage - 1) + ')">‹ Trước</button>' +
    '<span class="page-info">Trang ' + chatSessionPage + ' / ' + totalPages + '</span>' +
    '<button class="page-btn" ' + (chatSessionPage >= totalPages ? 'disabled' : '') + ' onclick="adminGoToChatSessionPage(' + (chatSessionPage + 1) + ')">Sau ›</button>';
}

function goToChatSessionPage(page) {
  chatSessionPage = page;
  renderChatSessions();
}

function renderChatSessions() {
  var list = document.getElementById('chatSessionsList');
  if (!list) return;

  renderChatSessionsPagination(chatSessionsCache.length);

  if (!chatSessionsCache.length) {
    list.innerHTML = '<p class="hint" style="padding:20px;">Chưa có phiên chat nào.</p>';
    return;
  }

  var startIdx = (chatSessionPage - 1) * chatSessionPageSize;
  var pageItems = chatSessionsCache.slice(startIdx, startIdx + chatSessionPageSize);

  list.innerHTML = pageItems.map(function (s) {
    var events = s.events || [];
    var lastEvent = events.length ? events[events.length - 1] : null;
    var summary = lastEvent ? formatChatEvent(lastEvent) : 'Chưa có hoạt động';
    return '<div class="msg-item clickable-row" onclick="adminOpenChatSessionDetail(\'' + s.id + '\')">' +
      '<div class="msg-avatar">💬</div>' +
      '<div class="msg-body">' +
      '<div class="msg-top"><span class="name">Khách #' + escapeHtml(s.id.slice(-6)) + ' · ' + events.length + ' hoạt động</span><span class="time">' + formatRelativeTime(s.updatedAt) + '</span></div>' +
      '<div class="msg-content">' + escapeHtml(summary) + '</div>' +
      '</div></div>';
  }).join('');
}

document.getElementById('csfilter-pagesize').addEventListener('change', function () {
  chatSessionPageSize = Number(this.value) || 10;
  chatSessionPage = 1;
  renderChatSessions();
});

/**
 * Gộp toàn bộ sự kiện "search, 0 kết quả" trong mọi phiên chat lại, đếm
 * theo từ khoá — giúp chủ shop thấy khách đang cần sản phẩm gì mà web
 * chưa có/chưa đăng ảnh.
 */
function renderChatbotNoResultsSummary() {
  var container = document.getElementById('chatbotNoResultsSummary');
  if (!container) return;

  var counts = {};
  chatSessionsCache.forEach(function (s) {
    (s.events || []).forEach(function (ev) {
      if (ev.type !== 'search' || ev.resultsCount !== 0 || !ev.query) return;
      var key = removeDiacritics(ev.query.trim());
      if (!key) return;
      if (!counts[key]) counts[key] = { label: ev.query.trim(), count: 0 };
      counts[key].count++;
    });
  });

  var list = Object.keys(counts).map(function (k) { return counts[k]; })
    .sort(function (a, b) { return b.count - a.count; })
    .slice(0, 15);

  if (!list.length) {
    container.innerHTML = '<p class="hint">Chưa có từ khoá nào tìm không ra kết quả.</p>';
    return;
  }

  container.innerHTML = list.map(function (item) {
    return '<span class="chatbot-nores-tag">' + escapeHtml(item.label) + '<span class="count">' + item.count + '</span></span>';
  }).join('');
}

function openChatSessionDetail(id) {
  var s = chatSessionsCache.find(function (x) { return x.id === id; });
  if (!s) return;
  var events = s.events || [];

  var eventsHtml = events.length
    ? events.map(function (ev) {
        return '<div class="detail-row" style="align-items:flex-start;"><span style="flex:1;">' + escapeHtml(formatChatEvent(ev)) + '</span>' +
          '<span style="font-size:11.5px;color:var(--muted);white-space:nowrap;">' + formatChatEventTime(ev.at) + '</span></div>';
      }).join('')
    : '<p class="hint">Chưa có hoạt động nào.</p>';

  var panel = document.getElementById('drawerPanel');
  panel.innerHTML =
    '<div class="drawer-head"><h3 style="font-size:16px;">Phiên chat #' + escapeHtml(s.id.slice(-6)) + '</h3><button class="modal-close" onclick="adminCloseDrawer()">' + closeXIcon() + '</button></div>' +
    '<div class="drawer-body">' +
    '<div class="detail-row"><span>Bắt đầu</span><span>' + formatRelativeTime(s.startedAt) + '</span></div>' +
    '<div class="detail-row"><span>Hoạt động gần nhất</span><span>' + formatRelativeTime(s.updatedAt) + '</span></div>' +
    '<div style="margin-top:16px;"><label style="font-size:12.5px;font-weight:600;">Diễn biến (' + events.length + ')</label>' +
    '<div style="margin-top:6px;">' + eventsHtml + '</div></div>' +
    '</div>';

  document.getElementById('drawerOverlay').classList.add('open');
}

/**
 * Bấm 1 tin nhắn ở khối "Tin nhắn gần đây" trên Tổng quan -> chuyển sang
 * trang Hộp thư và mở luôn khung chi tiết của đúng tin nhắn đó.
 */
function goToMessageDetail(id) {
  showPage('messages');
  openMessageDetail(id);
}

function openMessageDetail(id) {
  var m = messagesCache.find(function (x) { return x.id === id; });
  if (!m) return;

  if (!m.read) {
    updateDoc(doc(db, 'messages', id), { read: true, readBy: currentAdminUid }).catch(function (err) {
      console.error('Không đánh dấu đã đọc được:', err);
    });
  }

  var phoneDigits = (m.phone || '').replace(/[^0-9+]/g, '');
  var telHref = 'tel:' + phoneDigits;
  var zaloHref = 'https://zalo.me/' + phoneDigits;
  var linkedProductId = extractProductIdFromContent(m.content);
  var productInfoBtnHtml = linkedProductId
    ? '<button type="button" class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="event.stopPropagation();adminOpenProductInfo(\'' + linkedProductId + '\')">🔎 Xem thông tin sản phẩm</button>'
    : '';
  var msgImages = messageImageList(m);
  var attachHtml = msgImages.length
    ? '<div style="margin-top:16px;"><label style="font-size:12.5px;font-weight:600;">Ảnh khách gửi kèm</label><div class="msg-attach-row">' +
      msgImages.map(function (url, i) {
        return '<img class="msg-attach-thumb" src="' + url + '" alt="Ảnh khách gửi" onclick="adminOpenMessageImage(\'' + m.id + '\',' + i + ')">';
      }).join('') + '</div></div>'
    : '';

  var panel = document.getElementById('drawerPanel');
  panel.innerHTML =
    '<div class="drawer-head"><h3 style="font-size:16px;">Chi tiết tin nhắn</h3><button class="modal-close" onclick="adminCloseDrawer()">' + closeXIcon() + '</button></div>' +
    '<div class="drawer-body">' +
    '<div class="detail-row"><span>Khách hàng</span><span>' + escapeHtml(m.name) + '</span></div>' +
    '<div class="detail-row"><span>Số điện thoại</span><span>' + escapeHtml(m.phone) + '</span></div>' +
    '<div class="detail-row"><span>Thời gian gửi</span><span>' + formatRelativeTime(m.createdAt) + '</span></div>' +
    '<div style="margin-top:16px;"><label style="font-size:12.5px;font-weight:600;">Nội dung khách gửi</label><p style="font-size:14px;margin-top:6px;line-height:1.6;white-space:pre-line;word-break:break-word;">' + linkifyText(m.content) + '</p>' + productInfoBtnHtml + '</div>' +
    attachHtml +
    '<div style="margin-top:18px;"><label style="font-size:12.5px;font-weight:600;">Trạng thái</label><div class="status-select">' +
    '<div class="status-opt ' + (m.status === 'moi' ? 'selected new' : '') + '" onclick="adminSetMessageStatus(\'' + m.id + '\',\'moi\')">Mới</div>' +
    '<div class="status-opt ' + (m.status === 'da_lien_he' ? 'selected done' : '') + '" onclick="adminSetMessageStatus(\'' + m.id + '\',\'da_lien_he\')">Đã liên hệ</div>' +
    '</div></div>' +
    '<div style="margin-top:14px;"><label style="font-size:12.5px;font-weight:600;">Ghi chú nội bộ (khách không thấy)</label>' +
    '<textarea id="msg-note" style="width:100%;margin-top:6px;padding:10px 12px;border-radius:8px;border:1.5px solid var(--border);font-size:13.5px;min-height:80px;">' + escapeHtml(m.note || '') + '</textarea>' +
    '<button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="adminSaveMessageNote(\'' + m.id + '\',this)">Lưu ghi chú</button></div>' +
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

/**
 * Popup xem nhanh toàn bộ thông tin 1 sản phẩm — mở từ nút "Xem thông tin
 * sản phẩm" trong Chi tiết tin nhắn, để xem trước khi trả lời khách.
 * Nổi trên cả drawer (z-index riêng, xem #productInfoOverlay trong index.html).
 */
var pinfoImages = [];
var pinfoIndex = 0;

function openProductInfoModal(id) {
  var product = productsCache.find(function (p) { return p.id === id; });
  var panel = document.getElementById('productInfoPanel');

  if (!product) {
    panel.innerHTML =
      '<div class="modal-head"><h3>Thông tin sản phẩm</h3><button class="modal-close" onclick="adminCloseProductInfo()">' + closeXIcon() + '</button></div>' +
      '<div class="modal-body"><p class="hint">Không tìm thấy sản phẩm này — có thể đã bị xoá.</p></div>';
    document.getElementById('productInfoOverlay').classList.add('open');
    return;
  }

  pinfoImages = (product.images || []).map(storagePathToUrl);
  pinfoIndex = 0;

  var pinfoNavHtml = pinfoImages.length > 1
    ? '<button type="button" class="pinfo-nav prev" onclick="event.stopPropagation();adminPinfoPrev()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
      '<button type="button" class="pinfo-nav next" onclick="event.stopPropagation();adminPinfoNext()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
      '<span class="pinfo-counter" id="pinfoCounter"></span>'
    : '';

  var priceHtml = '<div class="pinfo-price"><span class="now">' + formatVND(product.price) + '</span>';
  if (product.oldPrice) {
    var pct = Math.round((product.oldPrice - product.price) / product.oldPrice * 100);
    priceHtml += '<span class="old">' + formatVND(product.oldPrice) + '</span><span class="pct">-' + pct + '%</span>';
  }
  priceHtml += '</div>';

  panel.innerHTML =
    '<div class="modal-head"><h3>Thông tin sản phẩm</h3><button class="modal-close" onclick="adminCloseProductInfo()">' + closeXIcon() + '</button></div>' +
    '<div class="modal-body">' +
    '<div class="pinfo-thumb" id="pinfoThumb">' + pinfoNavHtml + '</div>' +
    '<div class="detail-row"><span>Tên sản phẩm</span><span>' + escapeHtml(product.name) + '</span></div>' +
    '<div class="detail-row"><span>Danh mục</span><span>' + escapeHtml(categoryName(product.category)) + '</span></div>' +
    '<div class="detail-row"><span>Giá</span>' + priceHtml + '</div>' +
    '<div class="detail-row"><span>Tình trạng</span><span>' + (product.stock === false ? 'Hết hàng' : 'Còn hàng') + '</span></div>' +
    '<div class="detail-row"><span>Bán chạy</span><span>' + (product.isFeatured ? 'Có' : 'Không') + '</span></div>' +
    '<div class="detail-row"><span>Hiển thị trên web</span><span>' + (product.isActive === false ? 'Đã ẩn' : 'Đang hiển thị') + '</span></div>' +
    (product.description
      ? '<div style="margin-top:14px;"><label style="font-size:12.5px;font-weight:600;">Mô tả</label><p style="font-size:13.5px;margin-top:6px;line-height:1.6;white-space:pre-line;">' + escapeHtml(product.description) + '</p></div>'
      : '') +
    '</div>' +
    '<div class="modal-foot"><button class="btn btn-primary" onclick="adminCloseProductInfo()">Đóng</button></div>';

  document.getElementById('productInfoOverlay').classList.add('open');
  renderPinfoImage();
}

/**
 * Vẽ lại ảnh hiện tại + số đếm trong popup thông tin sản phẩm, dùng khi
 * mở popup lần đầu và mỗi lần bấm mũi tên chuyển ảnh.
 */
function renderPinfoImage() {
  var thumb = document.getElementById('pinfoThumb');
  if (!thumb) return;
  thumb.style.backgroundImage = pinfoImages.length ? "url('" + pinfoImages[pinfoIndex] + "')" : '';
  var counter = document.getElementById('pinfoCounter');
  if (counter) counter.textContent = (pinfoIndex + 1) + ' / ' + pinfoImages.length;
}

function pinfoPrev() { pinfoIndex = (pinfoIndex - 1 + pinfoImages.length) % pinfoImages.length; renderPinfoImage(); }
function pinfoNext() { pinfoIndex = (pinfoIndex + 1) % pinfoImages.length; renderPinfoImage(); }

function closeProductInfoModal() { document.getElementById('productInfoOverlay').classList.remove('open'); }
document.getElementById('productInfoOverlay').addEventListener('click', function (e) { if (e.target === this) closeProductInfoModal(); });

/**
 * Lightbox xem ảnh khách gửi kèm tin nhắn — thu nhỏ thumbnail trong Chi
 * tiết tin nhắn, bấm vào mở popup ảnh lớn, có mũi tên chuyển ảnh khi
 * tin nhắn có nhiều hơn 1 ảnh (xem messageImageList()).
 */
var lightboxImages = [];
var lightboxIndex = 0;

function openMessageImageLightbox(messageId, startIndex) {
  var m = messagesCache.find(function (x) { return x.id === messageId; });
  if (!m) return;
  var images = messageImageList(m);
  if (!images.length) return;
  lightboxImages = images;
  lightboxIndex = startIndex || 0;
  renderLightbox();
  document.getElementById('imgLightboxOverlay').classList.add('open');
}

function renderLightbox() {
  document.getElementById('imgLightboxImage').src = lightboxImages[lightboxIndex];
  var showNav = lightboxImages.length > 1;
  document.getElementById('imgLightboxPrev').style.display = showNav ? 'flex' : 'none';
  document.getElementById('imgLightboxNext').style.display = showNav ? 'flex' : 'none';
  document.getElementById('imgLightboxCounter').textContent = showNav ? (lightboxIndex + 1) + ' / ' + lightboxImages.length : '';
}

function lightboxPrev() { lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length; renderLightbox(); }
function lightboxNext() { lightboxIndex = (lightboxIndex + 1) % lightboxImages.length; renderLightbox(); }
function closeImageLightbox() { document.getElementById('imgLightboxOverlay').classList.remove('open'); }

document.getElementById('imgLightboxOverlay').addEventListener('click', function (e) { if (e.target === this) closeImageLightbox(); });
document.addEventListener('keydown', function (e) {
  if (document.getElementById('imgLightboxOverlay').classList.contains('open')) {
    if (e.key === 'Escape') closeImageLightbox();
    else if (e.key === 'ArrowLeft') lightboxPrev();
    else if (e.key === 'ArrowRight') lightboxNext();
    return;
  }
  if (document.getElementById('productInfoOverlay').classList.contains('open') && pinfoImages.length > 1) {
    if (e.key === 'ArrowLeft') pinfoPrev();
    else if (e.key === 'ArrowRight') pinfoNext();
  }
});

function setMessageStatus(id, status) {
  showToast('Đang cập nhật...');
  updateDoc(doc(db, 'messages', id), { status: status }).then(function () {
    openMessageDetail(id);
    showToast(status === 'moi' ? 'Đã đánh dấu Mới' : 'Đã đánh dấu Đã liên hệ');
  }).catch(function (err) {
    console.error(err);
    showToast('Cập nhật thất bại');
  });
}

function saveMessageNote(id, btn) {
  var note = document.getElementById('msg-note').value;
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  updateDoc(doc(db, 'messages', id), { note: note }).then(function () {
    showToast('Đã lưu ghi chú');
  }).catch(function (err) {
    console.error(err);
    showToast('Lưu ghi chú thất bại');
  }).finally(function () {
    if (btn) { btn.disabled = false; btn.textContent = 'Lưu ghi chú'; }
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
  var statChatSessions = document.getElementById('statChatSessions');
  if (statChatSessions) statChatSessions.textContent = chatSessionsCache.length;
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
  return getDoc(doc(db, 'settings', 'main')).then(function (snap) {
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
  document.getElementById('set-priceDisplayMode').value = appearance.priceDisplayMode || 'show';
  heroSlidesDraft = (appearance.heroSlides || []).map(function (s) { return Object.assign({}, s); });
  renderHeroSlidesEditor();

  spacesDraft = (appearance.spaces && appearance.spaces.length ? appearance.spaces : DEFAULT_SPACES)
    .map(function (sp) { return Object.assign({}, sp, { bullets: (sp.bullets || []).slice(), images: (sp.images || []).slice() }); });
  renderSpacesEditor();

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

/* =======================================================================
   ẢNH BANNER TRANG CHỦ (slideshow, nhiều ảnh)
   ======================================================================= */

var heroSlidesDraft = [];
var HERO_SLIDES_MAX = 8;

function renderHeroSlidesEditor() {
  var list = document.getElementById('hero-slides-list');
  var dropzone = document.getElementById('hero-image-drop');
  if (!list) return;

  list.innerHTML = heroSlidesDraft.map(function (s, idx) {
    return '<div class="hero-slide-item">' +
      '<div class="thumb" style="background-image:url(\'' + storagePathToUrl(s.image) + '\')"></div>' +
      '<input type="text" placeholder="Chú thích (không bắt buộc)" value="' + escapeHtml(s.caption || '') + '" oninput="adminUpdateHeroCaption(' + idx + ',this.value)">' +
      '<button type="button" class="icon-btn" title="Xoá ảnh" onclick="adminRemoveHeroSlide(' + idx + ')">' + trashIcon() + '</button>' +
      '</div>';
  }).join('');

  if (dropzone) {
    var reachedMax = heroSlidesDraft.length >= HERO_SLIDES_MAX;
    dropzone.classList.toggle('disabled', reachedMax);
    var label = dropzone.querySelector('span');
    if (label) {
      label.textContent = reachedMax
        ? 'Đã đạt tối đa ' + HERO_SLIDES_MAX + ' ảnh — xoá bớt để thêm ảnh khác'
        : 'Kéo ảnh vào đây hoặc bấm để chọn — có thể chọn nhiều ảnh cùng lúc';
    }
  }
}

function updateHeroCaption(idx, value) {
  if (heroSlidesDraft[idx]) heroSlidesDraft[idx].caption = value;
}

function removeHeroSlide(idx) {
  heroSlidesDraft.splice(idx, 1);
  renderHeroSlidesEditor();
}

function uploadHeroImageFile(file) {
  if (heroSlidesDraft.length >= HERO_SLIDES_MAX) { showToast('Tối đa ' + HERO_SLIDES_MAX + ' ảnh banner'); return; }
  if (!file || file.type.indexOf('image/') !== 0) { showToast('Vui lòng chọn file ảnh'); return; }
  showToast('Đang tải ảnh lên...');
  uploadToStorage('branding', file).then(function (url) {
    heroSlidesDraft.push({ image: url, caption: '' });
    renderHeroSlidesEditor();
    showToast('Đã tải ảnh lên — nhớ bấm Lưu thay đổi');
  }).catch(function (err) {
    console.error(err);
    showToast('Tải ảnh thất bại, thử lại');
  });
}

function handleHeroImageDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  var files = e.dataTransfer.files;
  if (!files || !files.length) return;
  Array.prototype.forEach.call(files, uploadHeroImageFile);
}

document.getElementById('hero-image-file').addEventListener('change', function (e) {
  var files = e.target.files;
  var fileList = files ? Array.prototype.slice.call(files) : [];
  e.target.value = '';
  fileList.forEach(uploadHeroImageFile);
});

/* =======================================================================
   MỤC "GỢI Ý KHÔNG GIAN" (danh sách khu vực trên trang chủ)
   ======================================================================= */

var spacesDraft = [];

var DEFAULT_SPACES = [
  {
    id: 'bep', tabLabel: 'Góc bếp', title: 'Góc bếp gọn gàng, đủ đầy',
    description: 'Bộ nồi inox, kệ treo và hộp đựng gia vị giúp bếp nhà bạn ngăn nắp mà vẫn tiện lấy đồ mỗi ngày.',
    bullets: ['Bộ nồi inox 3 đáy', 'Kệ gia vị treo tường', 'Ống đũa & giá úp chén inox'],
    ctaText: 'Xem sản phẩm góc bếp', ctaLink: 'san-pham.html?cat=bep', images: []
  },
  {
    id: 'phongkhach', tabLabel: 'Phòng khách', title: 'Phòng khách ấm cúng',
    description: 'Tủ nhựa nhiều tầng và móc treo gọn giúp phòng khách luôn sạch sẽ, đón khách bất cứ lúc nào.',
    bullets: ['Tủ nhựa 4–5 tầng', 'Cây móc treo đa năng', 'Ghế nhựa xếp gọn'],
    ctaText: 'Xem sản phẩm phòng khách', ctaLink: 'san-pham.html?cat=nhua', images: []
  },
  {
    id: 'bancong', tabLabel: 'Ban công & ngoài trời', title: 'Ban công & ngoài trời thoáng mát',
    description: 'Sào phơi inox, ghế xếp và bàn nhỏ gọn chịu nắng, chịu gió — hợp với khí hậu biển Phan Thiết.',
    bullets: ['Sào phơi inox 304', 'Ghế xếp gọn ngoài trời', 'Bàn nhựa mini đa năng'],
    ctaText: 'Xem sản phẩm ngoài trời', ctaLink: 'san-pham.html?cat=ngoaitroi', images: []
  }
];

function slugifySpaceId(label, usedIds) {
  var base = removeDiacritics(label || 'khu-vuc').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'khu-vuc';
  var id = base, n = 2;
  while (usedIds.indexOf(id) !== -1) { id = base + '-' + n; n++; }
  return id;
}

function upDownIcon(dir) {
  return dir < 0
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>';
}

function renderSpacesEditor() {
  var container = document.getElementById('spaces-list');
  if (!container) return;

  container.innerHTML = spacesDraft.map(function (sp, idx) {
    var bulletsHtml = (sp.bullets || []).map(function (b, bi) {
      return '<div class="space-bullet-row">' +
        '<input type="text" value="' + escapeHtml(b) + '" oninput="adminUpdateSpaceBullet(' + idx + ',' + bi + ',this.value)">' +
        '<button type="button" class="icon-btn" title="Xoá dòng" onclick="adminRemoveSpaceBullet(' + idx + ',' + bi + ')">' + trashIcon() + '</button>' +
        '</div>';
    }).join('');

    var imagesHtml = (sp.images || []).map(function (img, ii) {
      return '<div class="hero-slide-item">' +
        '<div class="thumb" style="background-image:url(\'' + storagePathToUrl(img) + '\')"></div>' +
        '<span class="hint" style="flex:1;">Ảnh ' + (ii + 1) + '</span>' +
        '<button type="button" class="icon-btn" title="Xoá ảnh" onclick="adminRemoveSpaceImage(' + idx + ',' + ii + ')">' + trashIcon() + '</button>' +
        '</div>';
    }).join('');

    return '<div class="space-item">' +
      '<div class="space-item-head">' +
        '<strong>Khu vực ' + (idx + 1) + (sp.tabLabel ? ' — ' + escapeHtml(sp.tabLabel) : '') + '</strong>' +
        '<div class="space-item-actions">' +
          '<button type="button" class="icon-btn" title="Chuyển lên"' + (idx === 0 ? ' disabled' : '') + ' onclick="adminMoveSpace(' + idx + ',-1)">' + upDownIcon(-1) + '</button>' +
          '<button type="button" class="icon-btn" title="Chuyển xuống"' + (idx === spacesDraft.length - 1 ? ' disabled' : '') + ' onclick="adminMoveSpace(' + idx + ',1)">' + upDownIcon(1) + '</button>' +
          '<button type="button" class="icon-btn" title="Xoá khu vực" onclick="adminRemoveSpace(' + idx + ')">' + trashIcon() + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="form-grid" style="margin-top:10px;">' +
        '<div class="form-field"><label>Tên tab</label><input type="text" value="' + escapeHtml(sp.tabLabel || '') + '" oninput="adminUpdateSpaceField(' + idx + ',\'tabLabel\',this.value)"></div>' +
        '<div class="form-field"><label>Tiêu đề</label><input type="text" value="' + escapeHtml(sp.title || '') + '" oninput="adminUpdateSpaceField(' + idx + ',\'title\',this.value)"></div>' +
        '<div class="form-field full"><label>Mô tả</label><textarea oninput="adminUpdateSpaceField(' + idx + ',\'description\',this.value)">' + escapeHtml(sp.description || '') + '</textarea></div>' +
        '<div class="form-field"><label>Chữ trên nút</label><input type="text" value="' + escapeHtml(sp.ctaText || '') + '" oninput="adminUpdateSpaceField(' + idx + ',\'ctaText\',this.value)"></div>' +
        '<div class="form-field"><label>Đường dẫn khi bấm nút</label><input type="text" value="' + escapeHtml(sp.ctaLink || '') + '" oninput="adminUpdateSpaceField(' + idx + ',\'ctaLink\',this.value)"></div>' +
        '<div class="form-field full">' +
          '<label>Danh sách gạch đầu dòng</label>' +
          '<div class="space-bullets">' + bulletsHtml + '</div>' +
          '<button type="button" class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="adminAddSpaceBullet(' + idx + ')">+ Thêm dòng</button>' +
        '</div>' +
        '<div class="form-field full">' +
          '<label>Ảnh cho khu vực này</label>' +
          '<div class="image-dropzone" id="space-image-drop-' + idx + '" onclick="document.getElementById(\'space-image-file-' + idx + '\').click()" ' +
            'ondragover="event.preventDefault();this.classList.add(\'drag-over\')" ondragleave="this.classList.remove(\'drag-over\')" ' +
            'ondrop="adminHandleSpaceImageDrop(event,' + idx + ')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>' +
            '<span>Kéo ảnh vào đây hoặc bấm để chọn — có thể chọn nhiều ảnh</span>' +
          '</div>' +
          '<input type="file" id="space-image-file-' + idx + '" accept="image/*" multiple style="display:none;">' +
          '<div class="hero-slides-list">' + imagesHtml + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  spacesDraft.forEach(function (sp, idx) {
    var input = document.getElementById('space-image-file-' + idx);
    if (!input) return;
    input.addEventListener('change', function (e) {
      var files = e.target.files;
      var fileList = files ? Array.prototype.slice.call(files) : [];
      e.target.value = '';
      fileList.forEach(function (f) { uploadSpaceImageFile(idx, f); });
    });
  });
}

function updateSpaceField(idx, field, value) {
  if (spacesDraft[idx]) spacesDraft[idx][field] = value;
  if (field === 'tabLabel') {
    var head = document.querySelectorAll('.space-item-head strong')[idx];
    if (head) head.textContent = 'Khu vực ' + (idx + 1) + (value ? ' — ' + value : '');
  }
}

function addSpace() {
  var usedIds = spacesDraft.map(function (s) { return s.id; });
  spacesDraft.push({
    id: slugifySpaceId('khu vuc moi', usedIds), tabLabel: 'Khu vực mới', title: '', description: '',
    bullets: [], ctaText: '', ctaLink: '', images: []
  });
  renderSpacesEditor();
}

function removeSpace(idx) {
  if (!confirm('Xoá khu vực này khỏi mục "Gợi ý không gian"?')) return;
  spacesDraft.splice(idx, 1);
  renderSpacesEditor();
}

function moveSpace(idx, dir) {
  var target = idx + dir;
  if (target < 0 || target >= spacesDraft.length) return;
  var tmp = spacesDraft[idx];
  spacesDraft[idx] = spacesDraft[target];
  spacesDraft[target] = tmp;
  renderSpacesEditor();
}

function addSpaceBullet(idx) {
  if (!spacesDraft[idx]) return;
  spacesDraft[idx].bullets = spacesDraft[idx].bullets || [];
  spacesDraft[idx].bullets.push('');
  renderSpacesEditor();
}

function updateSpaceBullet(idx, bi, value) {
  if (spacesDraft[idx] && spacesDraft[idx].bullets) spacesDraft[idx].bullets[bi] = value;
}

function removeSpaceBullet(idx, bi) {
  if (spacesDraft[idx] && spacesDraft[idx].bullets) {
    spacesDraft[idx].bullets.splice(bi, 1);
    renderSpacesEditor();
  }
}

function uploadSpaceImageFile(idx, file) {
  if (!file || file.type.indexOf('image/') !== 0) { showToast('Vui lòng chọn file ảnh'); return; }
  if (!spacesDraft[idx]) return;
  showToast('Đang tải ảnh lên...');
  uploadToStorage('branding', file).then(function (url) {
    spacesDraft[idx].images = spacesDraft[idx].images || [];
    spacesDraft[idx].images.push(url);
    renderSpacesEditor();
    showToast('Đã tải ảnh lên — nhớ bấm Lưu thay đổi');
  }).catch(function (err) {
    console.error(err);
    showToast('Tải ảnh thất bại, thử lại');
  });
}

function removeSpaceImage(idx, ii) {
  if (spacesDraft[idx] && spacesDraft[idx].images) {
    spacesDraft[idx].images.splice(ii, 1);
    renderSpacesEditor();
  }
}

function handleSpaceImageDrop(e, idx) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  var files = e.dataTransfer.files;
  if (!files || !files.length) return;
  Array.prototype.forEach.call(files, function (f) { uploadSpaceImageFile(idx, f); });
}

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

function saveSettingsAppearance(btn) {
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
    featuredLimit: Number(document.getElementById('set-featuredLimit').value) || 8,
    priceDisplayMode: document.getElementById('set-priceDisplayMode').value || 'show',
    heroSlides: heroSlidesDraft,
    spaces: spacesDraft.map(function (sp) {
      return Object.assign({}, sp, { bullets: (sp.bullets || []).filter(function (b) { return b.trim(); }) });
    })
  };
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  updateDoc(doc(db, 'settings', 'main'), { appearance: appearance }).then(function () {
    settingsCache = Object.assign({}, settingsCache, { appearance: appearance });
    pendingLogoUrl = null;
    showToast('Đã lưu Giao diện');
  }).catch(function (err) { console.error(err); showToast('Lưu thất bại'); })
    .finally(function () { if (btn) { btn.disabled = false; btn.textContent = 'Lưu thay đổi'; } });
}

function saveSettingsStore(btn) {
  var store = {
    address: document.getElementById('set-address').value.trim(),
    addressNote: document.getElementById('set-addressNote').value.trim(),
    hoursWeekday: document.getElementById('set-hoursWeekday').value.trim(),
    hoursSunday: document.getElementById('set-hoursSunday').value.trim(),
    phoneHref: 'tel:' + document.getElementById('set-hotline').value.replace(/[^0-9+]/g, ''),
    hotlineLabel: document.getElementById('set-hotline').value.trim(),
    showShippingBanner: document.getElementById('set-showShipping').checked
  };
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  updateDoc(doc(db, 'settings', 'main'), { store: store }).then(function () {
    settingsCache = Object.assign({}, settingsCache, { store: store });
    showToast('Đã lưu Thông tin cửa hàng');
  }).catch(function (err) { console.error(err); showToast('Lưu thất bại'); })
    .finally(function () { if (btn) { btn.disabled = false; btn.textContent = 'Lưu thay đổi'; } });
}

function saveSettingsLinks(btn) {
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
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  updateDoc(doc(db, 'settings', 'main'), { links: links }).then(function () {
    settingsCache = Object.assign({}, settingsCache, { links: links });
    showToast('Đã lưu Liên kết');
  }).catch(function (err) { console.error(err); showToast('Lưu thất bại'); })
    .finally(function () { if (btn) { btn.disabled = false; btn.textContent = 'Lưu thay đổi'; } });
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
   THÔNG BÁO ĐẨY (FCM) — báo tin nhắn mới ngay cả khi admin đã đóng tab,
   yêu cầu đã cài trang admin như PWA trên iPhone (xem admin/manifest.json
   + admin/firebase-messaging-sw.js). Cloud Function gửi thông báo nằm ở
   functions/index.js — không nằm trong file này.
   ======================================================================= */

// ĐIỀN VAPID KEY THẬT VÀO ĐÂY trước khi tính năng này hoạt động được:
// Firebase Console → Project Settings → Cloud Messaging → Web
// configuration → Generate key pair → dán chuỗi key vào đây.
// Để trống thì phần còn lại của trang vẫn chạy bình thường, chỉ riêng
// thông báo đẩy sẽ báo lỗi rõ trong console thay vì âm thầm không chạy.
var FCM_VAPID_KEY = 'BI805UpmMbfwR2q6Js7QPqdgja-AYKUWgUqOc75fVyN8CLLSwS2kUFc9CxU73lmtSD_JeASZdmyZ1ZOclLRWvmY';

var NOTIFY_DEVICE_ID_KEY = 'khanhha_admin_device_id';
var NOTIFY_DISMISSED_KEY = 'khanhha_admin_notify_dismissed';

var fcmMessaging = null;
var adminDevicesCache = [];

function initPushNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

  isMessagingSupported().then(function (supported) {
    if (!supported) {
      console.warn('Trình duyệt này không hỗ trợ Firebase Messaging (bình thường với 1 số trình duyệt/chế độ riêng tư).');
      return;
    }
    fcmMessaging = getMessaging();

    onMessage(fcmMessaging, function (payload) {
      var data = payload.data || {};
      showToast((data.title || 'Có tin nhắn mới') + (data.body ? ' — ' + data.body : ''));
      playNotifySound();
      updateNotifyBadge();
    });

    if (Notification.permission === 'granted') {
      registerPushDevice();
    } else if (Notification.permission === 'default') {
      var dismissed = false;
      try { dismissed = localStorage.getItem(NOTIFY_DISMISSED_KEY) === '1'; } catch (e) { /* ignore */ }
      if (!dismissed) document.getElementById('notifyPromptOverlay').classList.add('open');
    }
  }).catch(function (err) {
    console.warn('Không kiểm tra được hỗ trợ Firebase Messaging:', err);
  });
}

function dismissNotifyPrompt() {
  document.getElementById('notifyPromptOverlay').classList.remove('open');
  try { localStorage.setItem(NOTIFY_DISMISSED_KEY, '1'); } catch (e) { /* ignore */ }
}

function enableNotifications(btnEl) {
  var btn = btnEl || document.getElementById('notifyEnableBtn');
  var originalText = btn ? btn.textContent : '';

  if (!('Notification' in window)) {
    showToast('Trình duyệt không hỗ trợ — trên iPhone cần mở app đã "Thêm vào MH chính", không mở qua Safari thường.');
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Đang bật...'; }

  Notification.requestPermission().then(function (permission) {
    document.getElementById('notifyPromptOverlay').classList.remove('open');
    if (permission === 'granted') {
      try { localStorage.removeItem(NOTIFY_DISMISSED_KEY); } catch (e) { /* ignore */ }
      registerPushDevice();
      showToast('Đã bật thông báo cho thiết bị này');
    } else {
      try { localStorage.setItem(NOTIFY_DISMISSED_KEY, '1'); } catch (e) { /* ignore */ }
      showToast('Bạn đã từ chối quyền thông báo');
    }
  }).catch(function (err) {
    console.error('Xin quyền thông báo thất bại:', err);
    showToast('Không bật được thông báo, thử lại sau');
  }).finally(function () {
    if (btn) { btn.disabled = false; btn.textContent = originalText; }
  });
}

function registerPushDevice() {
  if (!fcmMessaging) return;
  if (!FCM_VAPID_KEY) {
    console.warn('Chưa cấu hình FCM_VAPID_KEY trong admin.js — xem hướng dẫn ở đầu phần "THÔNG BÁO ĐẨY".');
    return;
  }

  navigator.serviceWorker.register('firebase-messaging-sw.js').then(function (registration) {
    return getToken(fcmMessaging, { vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: registration });
  }).then(function (token) {
    if (token) saveDeviceToken(token);
  }).catch(function (err) {
    console.error('Không lấy được FCM token:', err);
  });
}

function detectPlatform() {
  var ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'web';
}

function defaultDeviceLabel(platform) {
  if (platform === 'ios') return /ipad/i.test(navigator.userAgent) ? 'iPad' : 'iPhone';
  if (platform === 'android') return 'Điện thoại Android';
  return 'Trình duyệt web';
}

function saveDeviceToken(token) {
  var platform = detectPlatform();
  var basePayload = { adminId: currentAdminUid, token: token, platform: platform, lastActiveAt: serverTimestamp() };

  var deviceDocId = null;
  try { deviceDocId = localStorage.getItem(NOTIFY_DEVICE_ID_KEY); } catch (e) { /* ignore */ }

  if (deviceDocId) {
    updateDoc(doc(db, 'adminDevices', deviceDocId), basePayload).catch(function () {
      // Document cũ có thể đã bị Cloud Function tự dọn (token hỏng) -> tạo lại mới.
      try { localStorage.removeItem(NOTIFY_DEVICE_ID_KEY); } catch (e2) { /* ignore */ }
      createDeviceDoc(basePayload, platform);
    });
  } else {
    createDeviceDoc(basePayload, platform);
  }
}

function createDeviceDoc(basePayload, platform) {
  var fullPayload = Object.assign({}, basePayload, {
    deviceLabel: defaultDeviceLabel(platform),
    createdAt: serverTimestamp()
  });
  addDoc(collection(db, 'adminDevices'), fullPayload).then(function (docRef) {
    try { localStorage.setItem(NOTIFY_DEVICE_ID_KEY, docRef.id); } catch (e) { /* ignore */ }
    // onSnapshot của listenAdminDevices() có thể đã vẽ lại khung chuông
    // NGAY khi document mới xuất hiện — tức là trước khi dòng lưu
    // localStorage phía trên kịp chạy xong — nên vẽ lại thêm 1 lần nữa ở
    // đây để nút "Bật thông báo" biến mất đúng lúc.
    renderNotifyDropdown();
  }).catch(function (err) {
    console.error('Không lưu được thiết bị nhận thông báo:', err);
  });
}

function listenAdminDevices() {
  onSnapshot(collection(db, 'adminDevices'), function (snap) {
    adminDevicesCache = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    renderNotifyDropdown();
  }, function (err) {
    console.error('Không tải được danh sách thiết bị:', err);
  });
}

var notifySoundCtx = null;
function playNotifySound() {
  try {
    if (!notifySoundCtx) notifySoundCtx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = notifySoundCtx.createOscillator();
    var gain = notifySoundCtx.createGain();
    osc.connect(gain);
    gain.connect(notifySoundCtx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, notifySoundCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, notifySoundCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, notifySoundCtx.currentTime + 0.35);
    osc.start();
    osc.stop(notifySoundCtx.currentTime + 0.35);
  } catch (e) { /* Trình duyệt chặn âm thanh nếu chưa có tương tác — bỏ qua */ }
}

/**
 * Cập nhật badge đỏ trên icon chuông + tiêu đề tab trình duyệt theo số
 * tin nhắn có read == false — gọi lại mỗi khi messagesCache thay đổi.
 */
function updateNotifyBadge() {
  var unread = messagesCache.filter(function (m) { return !m.read; }).length;
  var badge = document.getElementById('notifyBadge');
  if (badge) {
    badge.textContent = unread > 99 ? '99+' : unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
  document.title = unread > 0 ? '(' + unread + ') Khánh Hà Admin' : 'Khánh Hà Admin';
}

function toggleNotifyDropdown() {
  var dropdown = document.getElementById('notifyDropdown');
  dropdown.classList.toggle('open');
  if (dropdown.classList.contains('open')) renderNotifyDropdown();
}

function renderNotifyDropdown() {
  var body = document.getElementById('notifyDropdownBody');
  if (!body) return;

  var unreadCount = messagesCache.filter(function (m) { return !m.read; }).length;
  var currentDeviceId = null;
  try { currentDeviceId = localStorage.getItem(NOTIFY_DEVICE_ID_KEY); } catch (e) { /* ignore */ }
  var thisDeviceRegistered = currentDeviceId && adminDevicesCache.some(function (d) { return d.id === currentDeviceId; });

  var html = '<div class="notify-row"><span>Tin nhắn chưa đọc</span><strong>' + unreadCount + '</strong></div>';

  if (adminDevicesCache.length) {
    html += '<div style="margin-top:8px;">' + adminDevicesCache.map(function (d) {
      var platformLabel = d.platform === 'ios' ? 'iOS' : (d.platform === 'android' ? 'Android' : 'Web');
      return '<div class="notify-device-item">' +
        '<input type="text" value="' + escapeHtml(d.deviceLabel || '') + '" onchange="adminRenameDevice(\'' + d.id + '\', this.value)">' +
        '<span class="platform">' + platformLabel + '</span>' +
        '<button class="icon-btn" title="Gỡ thiết bị" onclick="adminRemoveDevice(\'' + d.id + '\')">' + trashIcon() + '</button>' +
        '</div>';
    }).join('') + '</div>';
  } else {
    html += '<p class="hint" style="margin-top:8px;">Chưa có thiết bị nào bật thông báo.</p>';
  }

  if (!thisDeviceRegistered) {
    html += '<button type="button" class="btn btn-primary notify-enable-btn" onclick="adminEnableNotifications(this)">🔔 Bật thông báo trên thiết bị này</button>';
  }

  body.innerHTML = html;
}

function renameDevice(id, label) {
  var trimmed = (label || '').trim();
  if (!trimmed) return;
  updateDoc(doc(db, 'adminDevices', id), { deviceLabel: trimmed }).then(function () {
    showToast('Đã đổi tên thiết bị');
  }).catch(function (err) {
    console.error(err);
    showToast('Đổi tên thất bại');
  });
}

function removeDevice(id) {
  deleteDoc(doc(db, 'adminDevices', id)).then(function () {
    try {
      if (localStorage.getItem(NOTIFY_DEVICE_ID_KEY) === id) localStorage.removeItem(NOTIFY_DEVICE_ID_KEY);
    } catch (e) { /* ignore */ }
    showToast('Đã gỡ thiết bị — sẽ không nhận thông báo nữa');
  }).catch(function (err) {
    console.error(err);
    showToast('Gỡ thiết bị thất bại');
  });
}

var notifyBellBtnEl = document.getElementById('notifyBellBtn');
if (notifyBellBtnEl) {
  notifyBellBtnEl.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleNotifyDropdown();
  });
  document.addEventListener('click', function (e) {
    var dropdown = document.getElementById('notifyDropdown');
    if (dropdown && dropdown.classList.contains('open') && !dropdown.contains(e.target) && e.target !== notifyBellBtnEl) {
      dropdown.classList.remove('open');
    }
  });
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
window.adminGoToDashboardMsgPage = goToDashboardMsgPage;
window.adminRemoveProductImage = removeProductImage;
window.adminHandleProductImageDrop = handleProductImageDrop;
window.adminUpdateHeroCaption = updateHeroCaption;
window.adminRemoveHeroSlide = removeHeroSlide;
window.adminHandleHeroImageDrop = handleHeroImageDrop;
window.adminAddSpace = addSpace;
window.adminRemoveSpace = removeSpace;
window.adminMoveSpace = moveSpace;
window.adminUpdateSpaceField = updateSpaceField;
window.adminAddSpaceBullet = addSpaceBullet;
window.adminUpdateSpaceBullet = updateSpaceBullet;
window.adminRemoveSpaceBullet = removeSpaceBullet;
window.adminHandleSpaceImageDrop = handleSpaceImageDrop;
window.adminRemoveSpaceImage = removeSpaceImage;
window.adminOpenCategoryModal = openCategoryModal;
window.adminSelectIconOption = selectIconOption;
window.adminSaveCategory = saveCategory;
window.adminOpenDeleteConfirm = openDeleteConfirm;
window.adminConfirmDelete = confirmDelete;
window.adminCloseModal = closeModal;
window.adminOpenMessageDetail = openMessageDetail;
window.adminGoToChatSessionPage = goToChatSessionPage;
window.adminOpenChatSessionDetail = openChatSessionDetail;
window.adminDismissNotifyPrompt = dismissNotifyPrompt;
window.adminEnableNotifications = enableNotifications;
window.adminRenameDevice = renameDevice;
window.adminRemoveDevice = removeDevice;
window.adminCloseDrawer = closeDrawer;
window.adminSetMessageStatus = setMessageStatus;
window.adminSaveMessageNote = saveMessageNote;
window.showPage = showPage;
window.adminGoToOutOfStock = goToOutOfStock;
window.adminGoToNewMessages = goToNewMessages;
window.adminGoToMessageDetail = goToMessageDetail;
window.adminOpenProductInfo = openProductInfoModal;
window.adminPinfoPrev = pinfoPrev;
window.adminPinfoNext = pinfoNext;
window.adminCloseProductInfo = closeProductInfoModal;
window.adminOpenMessageImage = openMessageImageLightbox;
window.adminCloseImageLightbox = closeImageLightbox;
window.adminLightboxPrev = lightboxPrev;
window.adminLightboxNext = lightboxNext;
window.saveSettingsAppearance = saveSettingsAppearance;
window.saveSettingsStore = saveSettingsStore;
window.saveSettingsLinks = saveSettingsLinks;
window.cancelSettings = cancelSettings;

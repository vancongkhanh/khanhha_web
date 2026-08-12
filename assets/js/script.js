/* =====================================================================
   CỬA HÀNG KHÁNH HÀ — SCRIPT DÙNG CHUNG
   Dùng chung cho index.html, san-pham.html, facebook.html, lien-he.html.
   Mỗi hàm tự kiểm tra phần tử có tồn tại trên trang hay không trước khi
   gắn sự kiện, nên có thể nhúng an toàn ở mọi trang.

   ES module (nạp bằng <script type="module">) — dùng Firestore để đọc
   cấu hình cửa hàng, danh mục, sản phẩm và ghi tin nhắn liên hệ.
   ===================================================================== */

import { db, storage } from './firebase-init.js';
import {
  collection, getDocs, getDoc, doc, query, where, orderBy, addDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import {
  ref, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js';

/* ---------------------------------------------------------------------
   SITE_CONFIG — toàn bộ nội dung có thể thay đổi của website. Giá trị
   dưới đây chỉ là "mặc định dự phòng" để trang vẫn hiển thị được ngay
   cả khi chưa tải xong (hoặc không tải được) dữ liệu từ Firestore.
   Ngay khi loadSiteConfig() tải xong document settings/main, SITE_CONFIG
   sẽ được thay bằng dữ liệu thật và applySiteConfig() chạy lại.

   Mọi phần tử HTML có thuộc tính data-config="đường.dẫn.field" sẽ tự
   được điền nội dung từ đây khi trang tải xong — không cần sửa HTML
   ở nhiều nơi mỗi khi đổi thông tin.
   --------------------------------------------------------------------- */
var SITE_CONFIG = {
  appearance: {
    logo: 'assets/img/logo.png',
    storeName: 'Khánh Hà',
    tagline: 'Đồ gia dụng Phan Thiết',
    hero: {
      badge: '📍 Từ Phan Thiết, cho mọi nhà',
      titleLine1: 'Tiện nghi mỗi ngày,',
      titleHighlight: 'ấm áp',
      titleLine2: 'mỗi góc nhà',
      description: 'Khánh Hà chọn lọc đồ bếp, đồ điện gia dụng, kệ tủ inox và đồ nhựa bền chắc — mang sự gọn gàng, tiện lợi đến từng gia đình ở Phan Thiết.'
    },
    priceDisplayMode: 'show'
  },
  store: {
    address: 'Km 3, xã Hàm Liêm, tỉnh Lâm Đồng',
    addressNote: '(gần ngã ba Hàm Liêm, gần KCN Phan Thiết)',
    hoursWeekday: 'Thứ 2 – Thứ 7: 7:30 – 18:00',
    hoursSunday: 'Chủ nhật: 7:30 – 12:00',
    phoneHref: 'tel:0898999039',
    hotlineLabel: 'Hotline / Zalo: 0898 999 039'
  },
  links: {
    facebook: 'https://www.facebook.com/profile.php?id=61556893695042',
    messenger: 'https://m.me/61556893695042',
    zaloPersonal: 'https://zalo.me/0898999039',
    zaloOA: {
      oaId: '',
      domain: ''
    },
    googleMapsEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4661.718322375183!2d108.1030879757629!3d10.958275789201759!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3176830048081adf%3A0x36fb8c27aec15da1!2zQ-G7rWEgaMOgbmcgS2jDoW5oIEjDoA!5e1!3m2!1svi!2s!4v1786422811102!5m2!1svi!2s'
  }
};

/**
 * Đọc 1 giá trị lồng nhau trong SITE_CONFIG theo đường dẫn dạng "a.b.c".
 */
function getConfigValue(path) {
  return path.split('.').reduce(function (obj, key) {
    return obj ? obj[key] : undefined;
  }, SITE_CONFIG);
}

/**
 * Quét toàn trang, tìm mọi phần tử có data-config và điền nội dung
 * tương ứng từ SITE_CONFIG — dùng data-config-attr để điền vào 1
 * thuộc tính cụ thể (href, src, data-href...) thay vì nội dung chữ.
 */
function applySiteConfig() {
  document.querySelectorAll('[data-config]').forEach(function (el) {
    var value = getConfigValue(el.getAttribute('data-config'));
    if (value === undefined || value === '') return;

    var attr = el.getAttribute('data-config-attr');
    if (attr) {
      el.setAttribute(attr, value);
    } else {
      el.textContent = value;
    }
  });

  // Facebook Page Plugin đã render thành iframe trước đó thì cần yêu cầu
  // Facebook SDK dựng lại nếu link trang vừa được cấu hình lại.
  if (window.FB && window.FB.XFBML) {
    window.FB.XFBML.parse();
  }
}

/**
 * Tải document settings/main từ Firestore, thay thế SITE_CONFIG mặc định
 * bằng dữ liệu thật do chủ shop tự chỉnh trong trang Admin.
 */
function loadSiteConfig() {
  return (async function () {
    try {
      var snap = await getDoc(doc(db, 'settings', 'main'));
      if (snap.exists()) {
        SITE_CONFIG = snap.data();
        if (SITE_CONFIG.appearance && SITE_CONFIG.appearance.logo) {
          SITE_CONFIG.appearance.logo = storagePathToUrl(SITE_CONFIG.appearance.logo);
        }
        applySiteConfig();
        initZaloFollow();
        initHeroSlideshow();
        refreshSpacesSection();
      }
    } catch (err) {
      console.error('Không tải được cấu hình cửa hàng:', err);
    }
    return SITE_CONFIG;
  })();
}

document.addEventListener('DOMContentLoaded', function () {
  applySiteConfig();
  initMobileNav();
  initHeaderSearch();
  initHeroSlideshow();
  refreshSpacesSection();
  initZaloFollow();
  initContactForm();
  var configPromise = loadSiteConfig();
  initHomepageData(configPromise);
  initProductsPageData();
  initProductDetailPage();
});

/**
 * Khung "Quan tâm Zalo OA" ở trang chủ.
 * Nếu SITE_CONFIG.links.zaloOA.oaId chưa được điền, hiện tạm nút nhắn
 * Zalo cá nhân thay thế, để mục này luôn có nội dung hữu ích cho khách.
 */
function initZaloFollow() {
  var box = document.getElementById('zaloFollowBox');
  if (!box) return;

  var zaloOA = (SITE_CONFIG.links && SITE_CONFIG.links.zaloOA) || {};

  if (zaloOA.oaId) {
    var params = new URLSearchParams({
      oaid: zaloOA.oaId,
      width: '260',
      height: '340',
      cover: 'yes',
      article: '0',
      color: 'yes',
      domain: zaloOA.domain || '',
      android: 'true',
      ios: 'true'
    });
    box.innerHTML = '';
    var iframe = document.createElement('iframe');
    iframe.src = 'https://sp.zalo.me/plugins/follow?' + params.toString();
    iframe.width = '260';
    iframe.height = '340';
    iframe.style.overflow = 'hidden';
    box.appendChild(iframe);
  } else {
    box.innerHTML =
      '<div class="zalo-follow-fallback">' +
      '<p>Kênh Zalo OA chính thức sắp ra mắt. Hiện tại bạn có thể nhắn Zalo trực tiếp cho Khánh Hà:</p>' +
      '<a class="btn" style="background:var(--pine);color:#fff;" href="' + (SITE_CONFIG.links ? SITE_CONFIG.links.zaloPersonal : '#') + '" target="_blank" rel="noopener">Nhắn Zalo ngay</a>' +
      '</div>';
  }
}

/**
 * Menu di động (hamburger) trong header — dùng ở tất cả các trang.
 */
function initMobileNav() {
  var navToggle = document.getElementById('navToggle');
  var mobileNav = document.getElementById('mobileNav');
  if (!navToggle || !mobileNav) return;

  navToggle.addEventListener('click', function () {
    mobileNav.classList.toggle('open');
  });
}

/**
 * Icon tìm kiếm trên menu — dùng ở tất cả các trang.
 * Bấm để mở ô nhập, gửi đi sẽ chuyển tới trang Sản phẩm kèm từ khoá (?q=...).
 */
function initHeaderSearch() {
  var toggle = document.getElementById('searchToggle');
  var box = document.getElementById('searchBox');
  if (!toggle || !box) return;

  toggle.addEventListener('click', function (e) {
    e.preventDefault();
    box.classList.toggle('open');
    if (box.classList.contains('open')) {
      var input = box.querySelector('input');
      if (input) input.focus();
    }
  });

  document.addEventListener('click', function (e) {
    if (!box.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
      box.classList.remove('open');
      var input = box.querySelector('input');
      if (input) input.blur();
    }
  });
}

/**
 * Bộ điều khiển slideshow dùng chung (hero + từng khu vực trong mục
 * "Gợi ý không gian"): dựng chấm điều hướng, tự chạy nếu có autoplayMs,
 * trả về {next, prev, destroy} để nút mũi tên bên ngoài gọi vào.
 */
function createSlideshow(wrap, dotsWrap, autoplayMs) {
  var slides = wrap.querySelectorAll('.slide');
  if (!slides.length) return null;

  var current = 0;
  var timer = null;

  if (dotsWrap) {
    dotsWrap.innerHTML = '';
    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'slide-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Xem ảnh ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); resetTimer(); });
      dotsWrap.appendChild(dot);
    });
  }

  function goTo(index) {
    slides[current].classList.remove('active');
    if (dotsWrap) dotsWrap.children[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dotsWrap) dotsWrap.children[current].classList.add('active');
  }

  function resetTimer() {
    if (!autoplayMs) return;
    clearInterval(timer);
    timer = setInterval(function () { goTo(current + 1); }, autoplayMs);
  }

  resetTimer();

  return {
    next: function () { goTo(current + 1); resetTimer(); },
    prev: function () { goTo(current - 1); resetTimer(); },
    destroy: function () { clearInterval(timer); }
  };
}

/**
 * Slideshow ở khối hero — chỉ có ở trang chủ. Tự chạy mỗi 4.5 giây,
 * có nút mũi tên và chấm điều hướng để bấm chuyển thủ công.
 */
/**
 * Dựng lại các slide từ SITE_CONFIG.appearance.heroSlides (nếu chủ shop đã
 * cấu hình trong Admin). Nếu chưa có dữ liệu, giữ nguyên các slide tĩnh
 * đã viết sẵn trong HTML làm phương án dự phòng.
 */
function renderHeroSlidesFromConfig(wrap) {
  var slidesData = SITE_CONFIG.appearance && SITE_CONFIG.appearance.heroSlides;
  if (!slidesData || !slidesData.length) return false;

  wrap.innerHTML = slidesData.map(function (s, i) {
    var captionHtml = s.caption ? '<span class="slide-caption">' + escapeHtml(s.caption) + '</span>' : '';
    return '<div class="slide' + (i === 0 ? ' active' : '') + '">' +
      '<div class="slide-photo"><img src="' + storagePathToUrl(s.image) + '" alt="' + escapeHtml(s.caption || '') + '"></div>' +
      captionHtml +
      '</div>';
  }).join('');
  return true;
}

var heroSlideState = null;

function initHeroSlideshow() {
  var wrap = document.getElementById('heroSlideshow');
  var dotsWrap = document.getElementById('slideDots');
  var prevBtn = document.getElementById('slidePrev');
  var nextBtn = document.getElementById('slideNext');
  if (!wrap) return;

  renderHeroSlidesFromConfig(wrap);
  if (heroSlideState) heroSlideState.destroy();
  heroSlideState = createSlideshow(wrap, dotsWrap, 4500);

  if (prevBtn && !prevBtn.dataset.wired) {
    prevBtn.dataset.wired = '1';
    prevBtn.addEventListener('click', function () { if (heroSlideState) heroSlideState.prev(); });
  }
  if (nextBtn && !nextBtn.dataset.wired) {
    nextBtn.dataset.wired = '1';
    nextBtn.addEventListener('click', function () { if (heroSlideState) heroSlideState.next(); });
  }
}

/**
 * Mục "Gợi ý không gian" (Góc bếp / Phòng khách / Ban công...) — chỉ có ở
 * trang chủ. Danh sách khu vực + nội dung + ảnh do chủ shop tự cấu hình
 * trong Admin (SITE_CONFIG.appearance.spaces). Nếu chưa cấu hình, giữ
 * nguyên các tab tĩnh đã viết sẵn trong HTML làm phương án dự phòng.
 */
var spaceSlideStates = [];

function renderSpacesFromConfig() {
  var spacesData = SITE_CONFIG.appearance && SITE_CONFIG.appearance.spaces;
  var section = document.getElementById('spaces');
  var tabsWrap = section ? section.querySelector('.tabs') : null;
  var wrap = section ? section.querySelector('.wrap') : null;
  if (!section || !tabsWrap || !wrap || !spacesData || !spacesData.length) return false;

  tabsWrap.innerHTML = spacesData.map(function (s, i) {
    return '<button type="button" class="tab-btn' + (i === 0 ? ' active' : '') + '" data-tab="' + escapeHtml(s.id || i) + '">' +
      escapeHtml(s.tabLabel || '') + '</button>';
  }).join('');

  wrap.querySelectorAll('.tab-panel').forEach(function (p) { p.remove(); });
  spaceSlideStates.forEach(function (st) { if (st) st.destroy(); });
  spaceSlideStates = [];

  spacesData.forEach(function (s, i) {
    var panel = document.createElement('div');
    panel.className = 'tab-panel' + (i === 0 ? ' active' : '');
    panel.id = 'tab-' + (s.id || i);

    var images = s.images || [];
    var slidesHtml = images.length
      ? images.map(function (img, idx) {
          return '<div class="slide' + (idx === 0 ? ' active' : '') + '"><div class="slide-photo"><img src="' + storagePathToUrl(img) + '" alt="' + escapeHtml(s.tabLabel || '') + '"></div></div>';
        }).join('')
      : '<div class="slide active"><div class="slide-photo" style="display:flex;align-items:center;justify-content:center;background:var(--pine);"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke="var(--copper-light)" style="width:64px;height:64px;"><path d="M4 16l4.5-6 4 5 3-3L20 16"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg></div></div>';

    var bulletsHtml = (s.bullets || []).filter(Boolean).map(function (b) {
      return '<li><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg> ' + escapeHtml(b) + '</li>';
    }).join('');

    var navHtml = images.length > 1
      ? '<button type="button" class="slide-nav prev" aria-label="Ảnh trước"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        '<button type="button" class="slide-nav next" aria-label="Ảnh sau"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>' +
        '<div class="slide-dots"></div>'
      : '';

    panel.innerHTML =
      '<div class="visual has-photo"><div class="slideshow">' + slidesHtml + '</div>' + navHtml + '</div>' +
      '<div class="info">' +
        '<h3>' + escapeHtml(s.title || '') + '</h3>' +
        (s.description ? '<p>' + escapeHtml(s.description) + '</p>' : '') +
        (bulletsHtml ? '<ul>' + bulletsHtml + '</ul>' : '') +
        (s.ctaLink ? '<a class="btn btn-outline" href="' + s.ctaLink + '">' + escapeHtml(s.ctaText || 'Xem sản phẩm') + '</a>' : '') +
      '</div>';

    wrap.appendChild(panel);

    if (images.length > 1) {
      var slideshow = panel.querySelector('.slideshow');
      var dots = panel.querySelector('.slide-dots');
      var prevBtn = panel.querySelector('.slide-nav.prev');
      var nextBtn = panel.querySelector('.slide-nav.next');
      var state = createSlideshow(slideshow, dots, 5000);
      spaceSlideStates.push(state);
      if (state) {
        prevBtn.addEventListener('click', function () { state.prev(); });
        nextBtn.addEventListener('click', function () { state.next(); });
      }
    }
  });

  return true;
}

/**
 * Gắn sự kiện chuyển tab cho mục "Gợi ý không gian" — gọi lại được nhiều
 * lần an toàn (mỗi lần renderSpacesFromConfig dựng lại nút, cần gắn lại).
 */
function initSpaceTabs() {
  var tabButtons = document.querySelectorAll('.tab-btn');
  if (!tabButtons.length) return;

  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      document.querySelectorAll('.tab-panel').forEach(function (p) {
        p.classList.remove('active');
      });
      btn.classList.add('active');
      var panel = document.getElementById('tab-' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
}

function refreshSpacesSection() {
  renderSpacesFromConfig();
  initSpaceTabs();
}

/**
 * Bộ lọc + tìm kiếm sản phẩm — chỉ có ở trang Sản phẩm (san-pham.html).
 * Danh mục và từ khoá tìm kiếm hoạt động cùng lúc (kết hợp AND).
 * Gọi lại hàm này SAU KHI các nút filter + thẻ sản phẩm đã được render
 * xong từ Firestore (xem initProductsPageData bên dưới).
 */
var PRODUCTS_PER_PAGE = 16;

function initProductFilter() {
  var filterButtons = document.querySelectorAll('.filter-btn');
  var searchInput = document.getElementById('productSearch');
  var cards = document.querySelectorAll('.prod-card');
  var grid = document.getElementById('productGrid');
  var paginationEl = document.getElementById('productPagination');
  if (!filterButtons.length && !searchInput) return;

  var params = new URLSearchParams(window.location.search);
  var catParam = params.get('cat');
  var currentCategory = 'all';
  var currentPage = 1;

  function applyFilters() {
    var query = searchInput ? removeDiacritics(searchInput.value.trim()) : '';
    var matches = [];

    cards.forEach(function (card) {
      var matchesCategory = currentCategory === 'all' || card.dataset.category === currentCategory;
      var nameEl = card.querySelector('h3');
      var name = nameEl ? removeDiacritics(nameEl.textContent) : '';
      var matchesQuery = !query || name.indexOf(query) !== -1;
      var isMatch = matchesCategory && matchesQuery;
      card.dataset.matches = isMatch ? '1' : '0';
      if (isMatch) matches.push(card);
    });

    var totalPages = Math.max(1, Math.ceil(matches.length / PRODUCTS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var startIdx = (currentPage - 1) * PRODUCTS_PER_PAGE;
    var pageSet = matches.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

    cards.forEach(function (card) {
      card.hidden = pageSet.indexOf(card) === -1;
    });

    renderPagination(matches.length, totalPages);
  }

  function renderPagination(totalItems, totalPages) {
    if (!paginationEl) return;
    if (totalItems <= PRODUCTS_PER_PAGE) {
      paginationEl.innerHTML = '';
      return;
    }
    paginationEl.innerHTML =
      '<button type="button" class="page-btn" id="pagePrevBtn">‹ Trước</button>' +
      '<span class="page-info">Trang ' + currentPage + ' / ' + totalPages + '</span>' +
      '<button type="button" class="page-btn" id="pageNextBtn">Sau ›</button>';

    var prevBtn = document.getElementById('pagePrevBtn');
    var nextBtn = document.getElementById('pageNextBtn');
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    prevBtn.addEventListener('click', function () { goToPage(currentPage - 1); });
    nextBtn.addEventListener('click', function () { goToPage(currentPage + 1); });
  }

  function goToPage(page) {
    currentPage = page;
    applyFilters();
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      currentCategory = btn.dataset.filter;
      currentPage = 1;
      applyFilters();
    });
  });

  // Nếu link dẫn tới có sẵn ?cat=... (bấm từ danh mục ở trang chủ) -> chọn đúng danh mục đó
  if (catParam) {
    var matchedBtn = document.querySelector('.filter-btn[data-filter="' + catParam + '"]');
    if (matchedBtn) {
      filterButtons.forEach(function (b) {
        b.classList.remove('active');
      });
      matchedBtn.classList.add('active');
      currentCategory = catParam;
    }
  }

  if (searchInput) {
    var q = params.get('q');
    if (q) searchInput.value = q;
    searchInput.addEventListener('input', function () {
      currentPage = 1;
      applyFilters();
    });
  }

  applyFilters();
}

/* =======================================================================
   DỮ LIỆU FIRESTORE — danh mục & sản phẩm
   ======================================================================= */

var CATEGORY_ICON_PATHS = {
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

var PROD_THUMB_COLORS = ['var(--pine)', 'var(--pine-light)', '#8A4E27', 'var(--copper)'];

// Bucket Firebase Storage của dự án — dùng để suy ra URL tải ảnh công khai
// từ path lưu trong Firestore (vd: "products/abc.jpg" -> URL đầy đủ).
var STORAGE_BUCKET = 'khanhha-web.firebasestorage.app';

function storagePathToUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  return 'https://firebasestorage.googleapis.com/v0/b/' + STORAGE_BUCKET + '/o/' + encodeURIComponent(path) + '?alt=media';
}

function categoryIconSvg(iconName, strokeWidth) {
  var inner = CATEGORY_ICON_PATHS[iconName] || CATEGORY_ICON_PATHS.pot;
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="' + (strokeWidth || 1.5) +
    '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function removeDiacritics(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function formatPrice(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫';
}

/**
 * Chế độ hiển thị giá do chủ shop cấu hình trong Admin: 'show' (hiện giá,
 * mặc định), 'contact' (ghi "Liên hệ" thay vì số), 'hidden' (không hiện gì).
 */
function getPriceDisplayMode() {
  return (SITE_CONFIG.appearance && SITE_CONFIG.appearance.priceDisplayMode) || 'show';
}

/**
 * Dựng HTML dòng giá cho 1 sản phẩm theo chế độ hiển thị hiện tại.
 * className dùng để giữ nguyên class CSS ở nơi gọi (price / detail-price).
 */
function renderPriceHtml(product, className) {
  var mode = getPriceDisplayMode();
  if (mode === 'hidden') return '';
  if (mode === 'contact') return '<div class="' + className + ' price-contact">Liên hệ giá</div>';
  var oldPriceHtml = product.oldPrice ? ' <span class="old">' + formatPrice(product.oldPrice) + '</span>' : '';
  return '<div class="' + className + '">' + formatPrice(product.price) + oldPriceHtml + '</div>';
}

async function fetchCategories() {
  var snap = await getDocs(query(collection(db, 'categories'), orderBy('order')));
  return snap.docs.map(function (d) { return d.data(); });
}

async function fetchProducts(opts) {
  opts = opts || {};
  var constraints = [where('isActive', '==', true)];
  if (opts.featuredOnly) constraints.push(where('isFeatured', '==', true));
  if (opts.category) constraints.push(where('category', '==', opts.category));
  var snap = await getDocs(query(collection(db, 'products'), ...constraints));
  return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
}

function renderCategoryGrid(container, categories) {
  if (!container) return;
  container.innerHTML = categories.map(function (c) {
    return '<a class="cat-card" href="san-pham.html?cat=' + encodeURIComponent(c.slug) + '">' +
      categoryIconSvg(c.icon, 1.6) +
      '<span>' + escapeHtml(c.name) + '</span></a>';
  }).join('');
}

function renderCategoryFilterBar(container, categories) {
  if (!container) return;
  var html = '<button class="filter-btn active" data-filter="all">Tất cả</button>';
  html += categories.map(function (c) {
    return '<button class="filter-btn" data-filter="' + escapeHtml(c.slug) + '">' + escapeHtml(c.name) + '</button>';
  }).join('');
  container.innerHTML = html;
}

function renderProductGrid(container, products, categories) {
  if (!container) return;

  if (!products.length) {
    container.innerHTML = '<p class="empty-state">Chưa có sản phẩm nào.</p>';
    return;
  }

  var catMap = {};
  categories.forEach(function (c) { catMap[c.slug] = c; });

  container.innerHTML = products.map(function (p, i) {
    var cat = catMap[p.category] || {};
    var hasImage = p.images && p.images.length > 0;
    var thumbStyle = hasImage
      ? "background-image:url('" + storagePathToUrl(p.images[0]) + "');background-size:cover;background-position:center;"
      : 'background:' + PROD_THUMB_COLORS[i % PROD_THUMB_COLORS.length] + ';';

    var badge = '';
    if (p.oldPrice && getPriceDisplayMode() === 'show') {
      var pct = Math.round((p.oldPrice - p.price) / p.oldPrice * 100);
      badge = '<span class="tag-sale">-' + pct + '%</span>';
    } else if (p.stock === false) {
      badge = '<span class="tag-outofstock">Hết hàng</span>';
    }

    var icon = hasImage ? '' : categoryIconSvg(cat.icon, 1.5);

    return '<a class="prod-card" href="san-pham-chi-tiet.html?id=' + encodeURIComponent(p.id) + '" data-category="' + escapeHtml(p.category) + '">' +
      '<div class="prod-thumb" style="' + thumbStyle + '">' + badge + icon + '</div>' +
      '<div class="prod-body"><span class="cat">' + escapeHtml(cat.name || '') + '</span>' +
      '<h3>' + escapeHtml(p.name) + '</h3>' +
      renderPriceHtml(p, 'price') + '</div>' +
      '</a>';
  }).join('');
}

/**
 * Trang chủ: danh mục (cat-grid) lấy từ categories, mục "Bán chạy" lấy
 * sản phẩm có isFeatured: true.
 */
async function initHomepageData(configPromise) {
  var catGrid = document.getElementById('categoryGrid');
  var featuredGrid = document.getElementById('featuredProductGrid');
  if (!catGrid && !featuredGrid) return;

  try {
    var results = await Promise.all([
      fetchCategories(),
      featuredGrid ? fetchProducts({ featuredOnly: true }) : Promise.resolve(null),
      configPromise || Promise.resolve(SITE_CONFIG)
    ]);
    var categories = results[0];
    var featured = results[1];
    var config = results[2];

    renderCategoryGrid(catGrid, categories);

    if (featuredGrid && featured) {
      var featuredLimit = (config && config.appearance && config.appearance.featuredLimit) || 8;
      featured.sort(function (a, b) {
        var at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        var bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      });
      renderProductGrid(featuredGrid, featured.slice(0, featuredLimit), categories);
    }
  } catch (err) {
    console.error('Không tải được dữ liệu trang chủ:', err);
  }
}

/**
 * Trang Sản phẩm: bộ lọc danh mục + lưới sản phẩm đều lấy từ Firestore.
 * Sau khi render xong DOM mới gọi initProductFilter() để gắn sự kiện lọc/tìm.
 */
async function initProductsPageData() {
  var grid = document.getElementById('productGrid');
  if (!grid) return;

  var filterBar = document.getElementById('categoryFilterBar');

  try {
    var results = await Promise.all([fetchCategories(), fetchProducts()]);
    var categories = results[0];
    var products = results[1];
    renderCategoryFilterBar(filterBar, categories);
    renderProductGrid(grid, products, categories);
  } catch (err) {
    console.error('Không tải được danh sách sản phẩm:', err);
    grid.innerHTML = '<p class="empty-state">Không tải được sản phẩm, vui lòng tải lại trang.</p>';
  }

  initProductFilter();
}

/* =======================================================================
   TRANG CHI TIẾT SẢN PHẨM (san-pham-chi-tiet.html?id=...)
   ======================================================================= */

async function initProductDetailPage() {
  var root = document.getElementById('productDetailRoot');
  if (!root) return;

  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
  if (!id) {
    root.innerHTML = '<p class="empty-state">Không tìm thấy sản phẩm.</p>';
    return;
  }

  try {
    var initial = await Promise.all([
      getDoc(doc(db, 'products', id)),
      fetchCategories()
    ]);
    var snap = initial[0];
    var categories = initial[1];

    if (!snap.exists() || snap.data().isActive === false) {
      root.innerHTML = '<p class="empty-state">Sản phẩm không tồn tại hoặc đã ngừng bán.</p>';
      return;
    }

    var product = Object.assign({ id: snap.id }, snap.data());
    var cat = categories.find(function (c) { return c.slug === product.category; }) || {};

    document.title = product.name + ' – Cửa hàng Khánh Hà';
    updateProductBreadcrumb(product, cat);
    renderProductDetail(root, product, cat);

    var sameCategoryProducts = await fetchProducts({ category: product.category });
    var related = sameCategoryProducts
      .filter(function (p) { return p.id !== product.id; })
      .slice(0, 4);

    var relatedSection = document.getElementById('relatedSection');
    var relatedGrid = document.getElementById('relatedProductGrid');
    if (related.length && relatedSection && relatedGrid) {
      renderProductGrid(relatedGrid, related, categories);
      relatedSection.style.display = '';
    }
  } catch (err) {
    console.error('Không tải được sản phẩm:', err);
    root.innerHTML = '<p class="empty-state">Có lỗi khi tải sản phẩm, vui lòng tải lại trang.</p>';
  }
}

function updateProductBreadcrumb(product, cat) {
  var el = document.getElementById('productBreadcrumb');
  if (!el) return;
  el.innerHTML = '<a href="index.html">Trang chủ</a> / <a href="san-pham.html">Sản phẩm</a> / ' +
    (cat.slug ? '<a href="san-pham.html?cat=' + encodeURIComponent(cat.slug) + '">' + escapeHtml(cat.name) + '</a> / ' : '') +
    '<span>' + escapeHtml(product.name) + '</span>';
}

/**
 * Sao chép văn bản vào clipboard — dùng Clipboard API khi có (context https),
 * dự phòng bằng textarea ẩn + execCommand cho trình duyệt cũ hơn.
 */
function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).catch(function () { return fallbackCopyText(text); });
  }
  return fallbackCopyText(text);
}

function fallbackCopyText(text) {
  return new Promise(function (resolve) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* vẫn mở Zalo bình thường dù copy lỗi */ }
    document.body.removeChild(ta);
    resolve();
  });
}

function renderProductDetail(root, product, cat) {
  var galleryImages = (product.images || []).map(storagePathToUrl);
  var hasImage = galleryImages.length > 0;
  var mainStyle = hasImage
    ? "background-image:url('" + galleryImages[0] + "');background-size:cover;background-position:center;"
    : 'background:' + PROD_THUMB_COLORS[0] + ';';
  var iconHtml = hasImage ? '' : categoryIconSvg(cat.icon, 1.3);

  var badge = '';
  if (product.oldPrice && getPriceDisplayMode() === 'show') {
    var pct = Math.round((product.oldPrice - product.price) / product.oldPrice * 100);
    badge = '<span class="tag-sale">-' + pct + '%</span>';
  } else if (product.stock === false) {
    badge = '<span class="tag-outofstock">Hết hàng</span>';
  }

  var thumbsHtml = galleryImages.length > 1
    ? '<div class="detail-gallery-thumbs" id="detailThumbs">' + galleryImages.map(function (url, i) {
        return '<div class="detail-thumb' + (i === 0 ? ' active' : '') + '" style="background-image:url(\'' + url + '\')" data-index="' + i + '"></div>';
      }).join('') + '</div>'
    : '';

  var stockHtml = product.stock === false
    ? '<span class="badge-stock out">Hết hàng</span>'
    : '<span class="badge-stock in">Còn hàng</span>';
  var descHtml = product.description ? escapeHtml(product.description) : 'Đang cập nhật mô tả cho sản phẩm này.';

  root.innerHTML =
    '<div class="detail-gallery">' +
      '<div class="detail-gallery-main" id="detailMainImage" style="' + mainStyle + '">' + badge + iconHtml + '</div>' +
      thumbsHtml +
    '</div>' +
    '<div class="detail-info">' +
      '<span class="cat">' + escapeHtml(cat.name || '') + '</span>' +
      '<h1>' + escapeHtml(product.name) + '</h1>' +
      stockHtml +
      renderPriceHtml(product, 'detail-price') +
      '<p class="detail-desc">' + descHtml + '</p>' +
      '<div class="detail-cta">' +
        '<a class="btn btn-primary" id="detailZaloBtn" href="' + (SITE_CONFIG.links.zaloPersonal || 'https://zalo.me/0898999039') + '" target="_blank" rel="noopener">Nhắn Zalo đặt hàng</a>' +
        '<a class="btn btn-outline" id="detailCallBtn" href="' + (SITE_CONFIG.store.phoneHref || 'tel:0898999039') + '">Gọi ngay</a>' +
      '</div>' +
    '</div>';

  if (galleryImages.length > 1) {
    document.querySelectorAll('#detailThumbs .detail-thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        document.querySelectorAll('#detailThumbs .detail-thumb').forEach(function (t) { t.classList.remove('active'); });
        thumb.classList.add('active');
        var idx = Number(thumb.dataset.index);
        document.getElementById('detailMainImage').style.backgroundImage = "url('" + galleryImages[idx] + "')";
      });
    });
  }

  var zaloBtn = document.getElementById('detailZaloBtn');
  if (zaloBtn) {
    zaloBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var mode = getPriceDisplayMode();
      var priceLine = mode === 'show' ? formatPrice(product.price) : (mode === 'contact' ? 'Liên hệ giá' : '');
      var lines = ['Tôi muốn hỏi mua sản phẩm:', product.name];
      if (priceLine) lines.push('Giá: ' + priceLine);
      lines.push(window.location.href);

      var zaloUrl = zaloBtn.href;
      var originalLabel = zaloBtn.textContent;
      copyTextToClipboard(lines.join('\n')).then(function () {
        zaloBtn.textContent = 'Đã sao chép — dán vào Zalo nhé!';
        window.open(zaloUrl, '_blank', 'noopener');
        setTimeout(function () { zaloBtn.textContent = originalLabel; }, 2500);
      });
    });
  }
}

/* =======================================================================
   FORM LIÊN HỆ — ghi thật vào collection "messages"
   ======================================================================= */

function compressContactImage(file) {
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
      }, 'image/jpeg', 0.8);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

function uploadContactImage(file) {
  return compressContactImage(file).then(function (blob) {
    var path = 'messages/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    var storageRef = ref(storage, path);
    return uploadBytes(storageRef, blob).then(function () { return getDownloadURL(storageRef); });
  });
}

function initContactForm() {
  var form = document.getElementById('contactForm');
  if (!form) return;

  var status = document.getElementById('contactFormStatus');
  var submitBtn = form.querySelector('button[type="submit"]');
  var imageInput = document.getElementById('contactImage');
  var imagePreviewName = document.getElementById('contactImagePreviewName');

  if (imageInput) {
    imageInput.addEventListener('change', function () {
      var file = imageInput.files[0];
      if (imagePreviewName) imagePreviewName.textContent = file ? 'Đã chọn: ' + file.name : '';
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('name').value.trim();
    var phone = document.getElementById('phone').value.trim();
    var content = document.getElementById('message').value.trim();

    if (!name || !phone || !content) {
      if (status) {
        status.textContent = 'Vui lòng nhập đầy đủ họ tên, số điện thoại và nội dung.';
        status.className = 'form-status error';
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    var imageFile = imageInput && imageInput.files[0] ? imageInput.files[0] : null;
    if (imageFile && status) {
      status.textContent = 'Đang gửi ảnh...';
      status.className = 'form-status';
    }

    var uploadPromise = imageFile ? uploadContactImage(imageFile) : Promise.resolve(null);

    uploadPromise.then(function (imageUrl) {
      var payload = {
        name: name,
        phone: phone,
        content: content,
        status: 'moi',
        note: '',
        createdAt: serverTimestamp()
      };
      if (imageUrl) payload.imageUrl = imageUrl;
      return addDoc(collection(db, 'messages'), payload);
    }).then(function () {
      form.reset();
      if (imagePreviewName) imagePreviewName.textContent = '';
      if (status) {
        status.textContent = 'Đã gửi, Khánh Hà sẽ liên hệ lại sớm.';
        status.className = 'form-status success';
      }
    }).catch(function (err) {
      console.error('Gửi tin nhắn thất bại:', err);
      if (status) {
        status.textContent = 'Có lỗi xảy ra, vui lòng thử lại hoặc nhắn Zalo trực tiếp.';
        status.className = 'form-status error';
      }
    }).finally(function () {
      if (submitBtn) submitBtn.disabled = false;
    });
  });
}

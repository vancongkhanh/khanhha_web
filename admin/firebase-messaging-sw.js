/* =====================================================================
   SERVICE WORKER — nhận push notification khi tab admin đã đóng.
   Đặt trong /admin/ nên phạm vi (scope) chỉ áp dụng cho trang admin,
   không ảnh hưởng gì tới website khách.

   Dùng SDK dạng "compat" (importScripts) vì service worker chạy ngoài
   ngữ cảnh module ES thông thường — đây là cách Firebase khuyến nghị
   cho firebase-messaging-sw.js.
   ===================================================================== */

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBhjgWQChh58f5AQE4bb7Aeh4uQDg4lmNo',
  authDomain: 'khanhha-web.firebaseapp.com',
  projectId: 'khanhha-web',
  storageBucket: 'khanhha-web.firebasestorage.app',
  messagingSenderId: '430510074863',
  appId: '1:430510074863:web:2fc0dfa891c15fe2bda41a'
});

var messaging = firebase.messaging();

// Cloud Function chỉ gửi "data" (không kèm "notification") để tránh trình
// duyệt tự hiện thông báo song song với đoạn showNotification() bên dưới
// (gây hiện 2 thông báo trùng nhau cho cùng 1 tin nhắn).
messaging.onBackgroundMessage(function (payload) {
  var data = payload.data || {};
  var title = data.title || 'Khánh Hà — Tin nhắn mới';
  var options = {
    body: data.body || '',
    icon: '../assets/img/icon-192.png',
    badge: '../assets/img/icon-192.png',
    data: { click_action: data.click_action || './index.html' }
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.click_action) || './index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf('/admin') !== -1 && 'focus' in client) {
          // Tab admin đang mở sẵn -> điều hướng luôn tới tin nhắn đó rồi focus,
          // thay vì chỉ focus vào trang đang hiển thị dở (không có messageId).
          if ('navigate' in client) {
            return client.navigate(url).then(function (navigated) {
              return (navigated || client).focus();
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

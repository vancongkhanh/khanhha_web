/* =====================================================================
   CLOUD FUNCTION — onNewMessageNotify
   Trigger khi có document mới trong collection "messages" (khách gửi
   qua form Liên hệ hoặc chatbot) -> gửi push notification tới toàn bộ
   thiết bị admin đã đăng ký trong "adminDevices".

   Yêu cầu gói Blaze (trả theo dùng) mới deploy được — xem hướng dẫn bàn
   giao trong dac-ta-thong-bao-admin.md.
   ===================================================================== */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const logger = require('firebase-functions/logger');

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// Các mã lỗi cho biết token đã hỏng hẳn (gỡ cài đặt, hết hạn, sai định
// dạng...) — chỉ dọn những trường hợp này, còn lỗi mạng/tạm thời thì giữ
// nguyên token để lần gửi sau vẫn thử lại.
const STALE_TOKEN_ERROR_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument'
];

exports.onNewMessageNotify = onDocumentCreated('messages/{messageId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const message = snap.data();
  const messageId = event.params.messageId;

  const devicesSnap = await db.collection('adminDevices').get();
  if (devicesSnap.empty) {
    logger.warn('Chưa có thiết bị admin nào đăng ký nhận thông báo — bỏ qua.');
    return;
  }

  const tokens = devicesSnap.docs.map((d) => d.data().token).filter(Boolean);
  if (!tokens.length) {
    logger.warn('Có document trong adminDevices nhưng không có token hợp lệ.');
    return;
  }

  const contentPreview = String(message.content || '').slice(0, 60);
  const body = `${message.name || 'Khách'}: ${contentPreview}`;

  // Chỉ gửi "data" (không kèm "notification") để trình duyệt không tự
  // hiện thông báo song song với đoạn showNotification() thủ công trong
  // admin/firebase-messaging-sw.js — tránh hiện trùng 2 thông báo.
  const response = await messaging.sendEachForMulticast({
    tokens,
    data: {
      title: 'Khánh Hà — Tin nhắn mới',
      body,
      messageId,
      click_action: '/admin/index.html?messageId=' + messageId
    }
  });

  const staleDocIds = [];
  response.responses.forEach((res, idx) => {
    if (!res.success && res.error && STALE_TOKEN_ERROR_CODES.indexOf(res.error.code) !== -1) {
      staleDocIds.push(devicesSnap.docs[idx].id);
    }
  });

  if (staleDocIds.length) {
    await Promise.all(staleDocIds.map((id) => db.collection('adminDevices').doc(id).delete()));
    logger.info(`Đã dọn ${staleDocIds.length} token hỏng khỏi adminDevices.`);
  }

  logger.info(`onNewMessageNotify: ${response.successCount} thành công, ${response.failureCount} thất bại (tổng ${tokens.length} thiết bị).`);
});

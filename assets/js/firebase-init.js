/* =====================================================================
   FIREBASE-INIT — khởi tạo Firebase app dùng chung cho toàn bộ site.
   Import module này (type="module") ở trang nào cần đọc/ghi Firestore,
   Storage hoặc dùng Authentication.
   ===================================================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBhjgWQChh58f5AQE4bb7Aeh4uQDg4lmNo",
  authDomain: "khanhha-web.firebaseapp.com",
  projectId: "khanhha-web",
  storageBucket: "khanhha-web.firebasestorage.app",
  messagingSenderId: "430510074863",
  appId: "1:430510074863:web:2fc0dfa891c15fe2bda41a"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

/* =====================================================================
   SEED SCRIPT — nạp dữ liệu mẫu (mục 4 đặc tả) vào Firestore.
   Chạy 1 lần lúc dựng nền test. Cần file serviceAccountKey.json cùng
   thư mục (tải từ Firebase Console → Project settings → Service accounts
   → Generate new private key). File này KHÔNG được commit (đã có trong
   .gitignore).

   Cách chạy:
     cd scripts
     npm install
     npm run seed
   ===================================================================== */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

const categories = [
  { slug: 'bep', name: 'Bếp & nấu ăn', icon: 'pot', order: 1 },
  { slug: 'dien', name: 'Điện gia dụng', icon: 'socket', order: 2 },
  { slug: 'inox', name: 'Inox – kệ & tủ', icon: 'shelf', order: 3 },
  { slug: 'nhua', name: 'Đồ nhựa gia đình', icon: 'bottle', order: 4 },
  { slug: 'tam', name: 'Phòng tắm', icon: 'clock', order: 5 },
  { slug: 'ngoaitroi', name: 'Ngoài trời', icon: 'awning', order: 6 },
];

const products = [
  { name: 'Bộ nồi inox 3 đáy 5 món', category: 'bep', price: 890000, oldPrice: 1120000, stock: true, isFeatured: true, isActive: true },
  { name: 'Chảo chống dính đáy từ 28cm', category: 'bep', price: 385000, oldPrice: null, stock: true, isFeatured: false, isActive: true },
  { name: 'Bộ hộp đựng gia vị inox 6 ngăn', category: 'bep', price: 245000, oldPrice: null, stock: true, isFeatured: false, isActive: true },
  { name: 'Nồi cơm điện tử 1.8L', category: 'dien', price: 750000, oldPrice: null, stock: true, isFeatured: true, isActive: true },
  { name: 'Bếp hồng ngoại đôi', category: 'dien', price: 890000, oldPrice: 990000, stock: true, isFeatured: false, isActive: true },
  { name: 'Máy xay đa năng 2 cối', category: 'dien', price: 560000, oldPrice: null, stock: false, isFeatured: false, isActive: true },
  { name: 'Kệ inox 3 tầng đa năng', category: 'inox', price: 620000, oldPrice: null, stock: true, isFeatured: true, isActive: true },
  { name: 'Sào phơi inox 304 chữ nhất', category: 'inox', price: 310000, oldPrice: null, stock: true, isFeatured: false, isActive: true },
  { name: 'Móc treo đa năng 6 chấu', category: 'inox', price: 95000, oldPrice: null, stock: true, isFeatured: false, isActive: true },
  { name: 'Tủ nhựa 4 tầng Deli Max', category: 'nhua', price: 1040000, oldPrice: 1220000, stock: true, isFeatured: true, isActive: true },
  { name: 'Ghế nhựa xếp gọn Hawaii', category: 'nhua', price: 185000, oldPrice: null, stock: true, isFeatured: false, isActive: true },
  { name: 'Thùng rác nhựa có nắp 20L', category: 'nhua', price: 135000, oldPrice: null, stock: true, isFeatured: false, isActive: true },
  { name: 'Kệ inox góc nhà tắm 3 tầng', category: 'tam', price: 275000, oldPrice: null, stock: true, isFeatured: false, isActive: true },
  { name: 'Vòi sen tăng áp cầm tay', category: 'tam', price: 420000, oldPrice: null, stock: false, isFeatured: false, isActive: true },
  { name: 'Ghế xếp lưới ban công', category: 'ngoaitroi', price: 210000, oldPrice: null, stock: true, isFeatured: false, isActive: true },
  { name: 'Bàn nhựa mini gấp gọn', category: 'ngoaitroi', price: 165000, oldPrice: null, stock: true, isFeatured: false, isActive: true },
];

const settingsMain = {
  appearance: {
    logo: 'branding/logo.png',
    storeName: 'Khánh Hà',
    tagline: 'Đồ gia dụng Phan Thiết',
    hero: {
      badge: '📍 Từ Phan Thiết, cho mọi nhà',
      titleLine1: 'Tiện nghi mỗi ngày,',
      titleHighlight: 'ấm áp',
      titleLine2: 'mỗi góc nhà',
      description: 'Khánh Hà chọn lọc đồ bếp, đồ điện gia dụng, kệ tủ inox và đồ nhựa bền chắc — mang sự gọn gàng, tiện lợi đến từng gia đình ở Phan Thiết.',
    },
  },
  store: {
    address: 'Km 3, xã Hàm Liêm, tỉnh Lâm Đồng',
    addressNote: '(gần khu vực Phan Thiết, gần ngã ba Hàm Liêm, gần KCN Phan Thiết)',
    hoursWeekday: 'Thứ 2 – Thứ 7: 7:30 – 18:00',
    hoursSunday: 'Chủ nhật: 7:30 – 12:00',
    phoneHref: 'tel:0898999039',
    hotlineLabel: 'Hotline / Zalo: 0898 999 039',
    showShippingBanner: false,
  },
  links: {
    facebook: 'https://www.facebook.com/profile.php?id=61556893695042',
    messenger: 'https://m.me/61556893695042',
    zaloPersonal: 'https://zalo.me/0898999039',
    zaloOA: { oaId: '', domain: '' },
    googleMapsEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4661.718322375183!2d108.1030879757629!3d10.958275789201759!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3176830048081adf%3A0x36fb8c27aec15da1!2zQ-G7rWEgaMOgbmcgS2jDoW5oIEjDoA!5e1!3m2!1svi!2s!4v1786422811102!5m2!1svi!2s',
  },
};

const messages = [
  { name: 'Chị Thư', phone: '090 111 22 33', content: 'Cho em hỏi bộ nồi inox 3 đáy còn hàng không ạ? Em ở gần KCN Phan Thiết.', status: 'moi', note: '' },
  { name: 'Anh Bình', phone: '098 222 33 44', content: 'Kệ inox 3 tầng giao về Hàm Liêm được không anh?', status: 'moi', note: '' },
  { name: 'Cô Sáu', phone: '090 555 66 77', content: 'Có bán bộ bàn ghế nhựa ngoài trời không con?', status: 'da_lien_he', note: 'Đã gọi lại, cô hẹn ghé cửa hàng xem trực tiếp cuối tuần.' },
];

async function seed() {
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  categories.forEach((cat) => {
    batch.set(db.collection('categories').doc(cat.slug), cat);
  });

  products.forEach((p) => {
    const ref = db.collection('products').doc();
    batch.set(ref, {
      ...p,
      slug: slugify(p.name),
      images: [],
      description: '',
      createdAt: now,
      updatedAt: now,
    });
  });

  batch.set(db.collection('settings').doc('main'), settingsMain);

  messages.forEach((m) => {
    const ref = db.collection('messages').doc();
    batch.set(ref, { ...m, createdAt: now });
  });

  await batch.commit();
  console.log(`Seed xong: ${categories.length} danh mục, ${products.length} sản phẩm, 1 settings, ${messages.length} tin nhắn.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed thất bại:', err);
    process.exit(1);
  });

# 📇 NFC Cards Platform

منصة كاملة لإدارة بطاقات NFC و QR Code الرقمية.

## 🚀 التشغيل السريع

```bash
# 1. تثبيت المكتبات
npm install

# 2. تشغيل الخادم
node server.js
```

ثم افتح المتصفح على: **http://localhost:3000/admin**

كلمة المرور الافتراضية: `admin123`

---

## ⚙️ الإعدادات (متغيرات البيئة)

| المتغير | الوصف | الافتراضي |
|---------|-------|-----------|
| `PORT` | رقم المنفذ | 3000 |
| `ADMIN_PASSWORD` | كلمة مرور الإدارة | admin123 |
| `BASE_URL` | رابط الموقع الرئيسي | http://localhost:3000 |
| `JWT_SECRET` | مفتاح التشفير | nfc-super-secret-key-2024 |

### مثال للإنتاج:
```bash
PORT=3000 BASE_URL=https://mydomain.com ADMIN_PASSWORD=MyStrongPass123 node server.js
```

---

## 📁 هيكل الملفات

```
nfc-platform/
├── server.js              # الخادم الرئيسي (Express)
├── data/
│   └── db.json            # قاعدة البيانات (JSON)
├── public/
│   ├── uploads/           # صور العملاء
│   ├── qrcodes/           # QR Codes المُنشأة
│   └── static/
│       ├── admin.html     # لوحة الإدارة
│       └── card.html      # صفحة العميل
└── package.json
```

---

## 🌐 الروابط

| الصفحة | الرابط |
|--------|--------|
| لوحة الإدارة | `/admin` |
| بطاقة عميل | `/card/{slug}` |
| API | `/api/...` |

---

## 🔧 للنشر على سيرفر (VPS)

```bash
# باستخدام PM2
npm install -g pm2
BASE_URL=https://mydomain.com ADMIN_PASSWORD=MyPass pm2 start server.js --name nfc-platform
pm2 save
pm2 startup
```

### Nginx config:
```nginx
server {
    listen 80;
    server_name mydomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /public/uploads {
        alias /path/to/nfc-platform/public/uploads;
    }
}
```

---

## 🏷️ NFC Tag Setup

1. أنشئ بطاقة عميل من لوحة الإدارة
2. انسخ الرابط: `https://mydomain.com/card/ahmed`
3. اكتب الرابط على NFC Tag باستخدام تطبيق مثل **NFC Tools** أو **TagWriter**
4. نوع السجل: `URI Record` 
5. القيمة: الرابط الكامل

---

## 📱 مميزات صفحة العميل

- ✅ تصميم متجاوب (موبايل + حاسوب)
- ✅ وضع داكن بالكامل
- ✅ تأثيرات انتقال ناعمة
- ✅ حفظ جهة الاتصال (vCard)
- ✅ زر اتصال مباشر
- ✅ زر مشاركة الصفحة
- ✅ جميع روابط التواصل الاجتماعي
- ✅ WhatsApp مع رقم مباشر

---

Made with ❤️ | NFC Cards Platform v1.0

# رَبط — داشبورد شبکهٔ خصوصی

مخزن: <https://github.com/Hosein21378/performance-server-tunneling>

پنل آزمایشی فارسی برای مدیریت یک هاب در ایران و چند نود خارجی، با ورود مبتنی بر گذرواژه. در وضعیت فعلی این پروژه **داشبورد و ثبت درخواست** است؛ تونل WireGuard را روی VPS نصب یا فعال نمی‌کند و داده‌های داشبورد نمایشی‌اند.

---

## نصب تک‌خطی روی سرور

روی سرور لینوکسی (Debian/Ubuntu یا Rocky/Alma/CentOS Stream/Fedora) اجرا کنید:

```bash
curl -fsSL https://raw.githubusercontent.com/Hosein21378/performance-server-tunneling/main/install.sh | sudo bash
```

اگر با کاربر `root` وارد شده‌اید و `sudo` ندارید:

```bash
curl -fsSL https://raw.githubusercontent.com/Hosein21378/performance-server-tunneling/main/install.sh | bash
```

اگر `raw.githubusercontent.com` روی سرور باز نمی‌شود (روی بعضی سرورهای داخل ایران رایج است)، از git استفاده کنید:

```bash
apt-get install -y git && rm -rf /tmp/rabt-src && git clone --depth 1 https://github.com/Hosein21378/performance-server-tunneling.git /tmp/rabt-src && sudo bash /tmp/rabt-src/install.sh
```

> در سرورهای خانوادهٔ RHEL به‌جای `apt-get install -y git` از `dnf install -y git` استفاده کنید.

### کارهایی که نصب‌کننده انجام می‌دهد

1. نصب پیش‌نیازها و PostgreSQL (بسته‌های نصب‌شدهٔ قبلی ارتقا داده نمی‌شوند)
2. نصب Node.js 22 در صورت نیاز، با **تأیید checksum از نوع SHA-256**
3. ساخت دیتابیس و کاربر اختصاصی با رمز تصادفی (ذخیره به‌صورت SCRAM، بدون دسترسی برای سایر کاربران)
4. دریافت کد از همین مخزن، `npm ci`، اعمال schema و build نسخهٔ production
5. ساخت `.env` با مجوز `600` شامل گذرواژهٔ تصادفی پنل و کلید امضای نشست
6. ساخت سرویس systemd به‌نام `rabt-panel` که با **کاربر سیستمی بدون دسترسی root** و sandboxing اجرا می‌شود و پس از ریبوت خودکار بالا می‌آید
7. بررسی `/api/health` و در پایان **چاپ آدرس پنل و گذرواژه**

خروجی پایان نصب:

```text
================================================================
  Rabt panel is installed and running.
----------------------------------------------------------------
  Panel URL : http://SERVER_IP:3000
  Password  : tv4a2fvytteoEtkyCzBX
----------------------------------------------------------------
```

> پیام‌های نصب‌کننده انگلیسی‌اند، چون بسیاری از ترمینال‌ها متن فارسی را به‌هم‌ریخته نمایش می‌دهند.

### اجرای دوباره = ارتقا

با اجرای دوبارهٔ همان دستور، آخرین نسخهٔ مخزن نصب می‌شود و **گذرواژهٔ قبلی حفظ می‌شود**.

---

## گذرواژهٔ پنل

- نمایش گذرواژه: `sudo grep ADMIN_PASSWORD /opt/rabt-panel/.env`
- تغییر گذرواژه: مقدار `ADMIN_PASSWORD` را در `/opt/rabt-panel/.env` عوض کنید و سپس `sudo systemctl restart rabt-panel` را بزنید. با این کار همهٔ نشست‌های باز باطل می‌شوند.
- تعیین گذرواژهٔ دلخواه هنگام نصب:

  ```bash
  curl -fsSL https://raw.githubusercontent.com/Hosein21378/performance-server-tunneling/main/install.sh | sudo ADMIN_PASSWORD='My.Strong-Pass2026' bash
  ```

  کاراکترهای مجاز: `A-Z a-z 0-9 . _ @ % + = : , -` با طول ۸ تا ۱۲۸ کاراکتر.

نشست ورود در کوکی `HttpOnly` با حداکثر ۱۲ ساعت اعتبار نگهداری می‌شود و پشت HTTPS پرچم `Secure` هم می‌گیرد. تلاش‌های ناموفق به‌ازای هر کلاینت و به‌صورت سراسری محدود شده‌اند.

---

## مدیریت سرورها از طریق پنل

پس از ورود به پنل، سرورهای شبکه را مدیریت می‌کنید:

1. **افزودن سرور:** دکمهٔ «سرور جدید» را بزنید، نام، کشور، شهر، نقش (هستهٔ ایران یا لبهٔ خارج) و آدرس Overlay را وارد کنید و ذخیره کنید. سرور در دیتابیس با وضعیت `offline` یا `pending` ثبت می‌شود.
2. **ویرایش / حذف:** هر سرور در لیست دارای دکمهٔ Edit و حذف است.
3. **تولید دستور انضمام یک‌خطی:** از بخش «افزودن سرور جدید» یک توکن یک‌بار مصرف بسازید. پنل یک دستور مانند این نمایش می‌دهد:

   ```bash
   curl -fsSL "https://پنل-شما/api/nodes/join?token=ТОКЕН" | sudo bash
   ```

   این دستور را روی سرور هدف (با دسترسی `sudo`) اجرا کنید. توکن ۱۵ دقیقه معتبر است و فقط **یکبار** قابل استفاده است؛ پس از اجرا، سرور در دیتابیس-panel با وضعیت `pending` ثبت می‌شود.

هیچ دیتای نمایشی/دیمو روی سرور وجود ندارد؛ شما به صورت دستی سرورها را اضافه می‌کنید.

## تنظیمات اختیاری نصب

تنظیمات را بعد از `sudo` بنویسید؛ برای مثال: `... | sudo APP_PORT=8080 bash`

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `APP_PORT` | `3000` | پورت پنل |
| `APP_HOST` | `0.0.0.0` | با `127.0.0.1` پنل فقط از طریق SSH tunnel یا reverse proxy در دسترس است |
| `ADMIN_PASSWORD` | تصادفی | گذرواژهٔ دلخواه پنل |
| `APP_DIR` | `/opt/rabt-panel` | مسیر نصب |
| `NPM_REGISTRY` | — | mirror مخزن npm، اگر `registry.npmjs.org` روی سرور در دسترس نیست |
| `NODE_MIRROR` | `https://nodejs.org/dist` | mirror دانلود Node.js |
| `RABT_BRANCH` | `main` | شاخهٔ git |

مثال برای سروری که به مخزن npm دسترسی ندارد:

```bash
curl -fsSL https://raw.githubusercontent.com/Hosein21378/performance-server-tunneling/main/install.sh | sudo NPM_REGISTRY=https://registry.npmmirror.com bash
```

---

## فایل‌هایی که باید در GitHub باشند

علاوه بر پوشهٔ `src/` و فایل‌های پیکربندی، این سه فایل هم باید در ریشهٔ مخزن باشند:

- `package-lock.json` — برای نصب دقیق و تکرارپذیر وابستگی‌ها با `npm ci`
- `.gitignore` — جلوی commit شدن `.env` و `node_modules` را می‌گیرد
- `.env.example` — نمونهٔ تنظیمات، بدون هیچ رمز واقعی

> فایل‌هایی که با نقطه شروع می‌شوند در macOS پنهان‌اند؛ در Finder با `Cmd + Shift + .` نمایش داده می‌شوند. فایل واقعی `.env` را هرگز آپلود نکنید.

---

## عیب‌یابی

| مشکل | راه‌حل |
|---|---|
| `Port 3000 is already used` | با `APP_PORT` پورت دیگری بدهید |
| خطا در `npm ci` یا `npm install` | با `NPM_REGISTRY` یک mirror در دسترس بدهید |
| دانلود Node.js ناموفق است | با `NODE_MIRROR` یک mirror دیگر بدهید |
| پنل از بیرون باز نمی‌شود | فایروال: `sudo ufw allow from YOUR.IP to any port 3000 proto tcp` |
| بررسی سرویس | `systemctl status rabt-panel` و `journalctl -u rabt-panel -n 100 --no-pager` |
| لاگ کامل نصب | `sudo cat /var/log/rabt-panel-install.log` |

نصب‌کننده پورتی را در فایروال باز نمی‌کند. فقط IP خودتان را مجاز کنید.

### حذف کامل

```bash
sudo systemctl disable --now rabt-panel
sudo rm -f /etc/systemd/system/rabt-panel.service && sudo systemctl daemon-reload
sudo rm -rf /opt/rabt-panel
sudo runuser -u postgres -- psql -c 'DROP DATABASE IF EXISTS rabt_panel' -c 'DROP ROLE IF EXISTS rabt'
sudo userdel rabt-panel
```

---

## نکات امنیتی

- پنل به‌صورت HTTP بالا می‌آید؛ برای استفادهٔ واقعی آن را پشت HTTPS قرار دهید و دسترسی را به IP خودتان محدود کنید، یا با `APP_HOST=127.0.0.1` فقط از طریق SSH tunnel باز کنید.
- `.env`، گذرواژه‌ها، کلیدهای خصوصی WireGuard و کلیدهای SSH را هرگز در GitHub قرار ندهید.
- فونت‌ها داخل خود پروژه‌اند و پنل هیچ درخواستی به سرویس‌های خارجی مثل Google Fonts نمی‌فرستد.
- تأخیر و سرعت به دیتاسنتر، مسیر اپراتورها، packet loss و peering وابسته‌اند و قابل تضمین نیستند.

---

## اجرای دستی (برای توسعه)

```bash
cp .env.example .env      # مقدارهای DATABASE_URL و ADMIN_PASSWORD را تنظیم کنید
npm ci
npx drizzle-kit push
npm run build && npm run start
```

## معماری و وضعیت فعلی

- الگوی پیشنهادی Hub-and-spoke است: هاب ایران و یک Peer جدا برای هر سرور خارجی.
- `POST /api/tunnels` فقط پس از ورود کار می‌کند و درخواست را با وضعیت `pending` در PostgreSQL ذخیره می‌کند؛ هیچ فرمانی روی سرورها اجرا نمی‌شود.
- اجرای واقعی نیازمند نصب WireGuard، تنظیم route/AllowedIPs، فایروال و مدیریت امن کلیدها روی VPSها است.

**فناوری:** Next.js App Router، TypeScript، PostgreSQL، Drizzle ORM

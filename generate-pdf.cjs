const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;color:#1a1a2e;line-height:1.6;background:#fff}
.page{page-break-after:always;padding:60px 50px;min-height:100vh;position:relative}
.page:last-child{page-break-after:avoid}
h1{font-size:2.4rem;font-weight:900;color:#003087;letter-spacing:2px}
h2{font-size:1.5rem;font-weight:800;color:#003087;margin:24px 0 12px;padding-bottom:8px;border-bottom:3px solid #003087}
h3{font-size:1.1rem;font-weight:700;color:#0050a0;margin:16px 0 8px}
p{margin:6px 0;font-size:0.9rem}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:0.82rem}
th{background:#003087;color:#fff;padding:10px 12px;text-align:left;font-weight:700}
td{padding:8px 12px;border-bottom:1px solid #e0e0e0}
tr:nth-child(even){background:#f5f7ff}
.badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:0.7rem;font-weight:700}
.badge-blue{background:#e8f0fe;color:#003087}
.badge-green{background:#e6f9ed;color:#00864e}
.badge-red{background:#fde8e8;color:#c0392b}
.badge-orange{background:#fff3e0;color:#e67e22}
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#003087 0%,#0050a0 50%,#0070d1 100%);color:#fff;min-height:100vh}
.cover h1{color:#fff;font-size:3.2rem;letter-spacing:6px;margin-bottom:8px}
.cover p{color:rgba(255,255,255,0.85);font-size:1rem;letter-spacing:3px}
.cover .ver{margin-top:40px;font-size:0.8rem;opacity:0.6;letter-spacing:4px}
.cover .logo{width:100px;height:100px;border:3px solid rgba(255,255,255,0.3);border-radius:24px;display:flex;align-items:center;justify-content:center;font-size:3rem;margin-bottom:24px;background:rgba(255,255,255,0.1)}
.stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
.stat-box{text-align:center;padding:16px;border-radius:12px;border:1px solid #e0e0e0}
.stat-box .num{font-size:1.8rem;font-weight:900;color:#003087}
.stat-box .lbl{font-size:0.65rem;color:#666;letter-spacing:1px;text-transform:uppercase;margin-top:4px}
.flow-box{background:#f5f7ff;border-radius:12px;padding:16px 20px;margin:8px 0;border-left:4px solid #003087}
.flow-box h4{color:#003087;margin-bottom:4px;font-size:0.9rem}
.flow-box p{font-size:0.8rem;color:#555}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.info-box{background:#f8f9ff;border-radius:12px;padding:16px;border:1px solid #e8ecf5}
.info-box h4{color:#003087;font-size:0.85rem;margin-bottom:8px}
.info-box ul{list-style:none;padding:0}
.info-box li{font-size:0.78rem;padding:4px 0;color:#333}
.info-box li:before{content:"✓ ";color:#00a651;font-weight:bold}
.footer-bar{position:absolute;bottom:20px;left:50px;right:50px;display:flex;justify-content:space-between;font-size:0.6rem;color:#999;border-top:1px solid #eee;padding-top:8px}
.receipt{background:#f8fff8;border:2px solid #00a651;border-radius:12px;padding:16px;margin:8px 0}
.receipt h4{color:#00a651;margin-bottom:8px}
.receipt p{font-size:0.8rem}
</style></head><body>

<!-- PAGE 1: COVER -->
<div class="page cover">
<div class="logo">🔒</div>
<h1>SIPENJARA</h1>
<p>SISTEM INFORMASI PEMASYARAKATAN</p>
<p style="margin-top:40px;font-size:1.8rem;font-weight:800;letter-spacing:1px">Pembuatan Reports</p>
<p style="margin-top:8px;font-size:0.9rem;opacity:0.7">Presentasi Fitur Laporan & Output Data Sistem</p>
<div class="ver">v5.0 • KEMENKUMHAM RI • ${new Date().toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})}</div>
</div>

<!-- PAGE 2: OVERVIEW -->
<div class="page">
<h2>1. Gambaran Umum Proyek</h2>
<p>SIPENJARA adalah aplikasi web full-stack untuk manajemen operasional lembaga pemasyarakatan berkeamanan tinggi (supermax prison).</p>
<table><thead><tr><th>Komponen</th><th>Teknologi</th><th>Keterangan</th></tr></thead><tbody>
<tr><td>Frontend</td><td>React + Vite</td><td>Single Page Application</td></tr>
<tr><td>Backend</td><td>Express.js</td><td>RESTful API</td></tr>
<tr><td>Database</td><td>SQLite</td><td>File-based, lightweight</td></tr>
<tr><td>Autentikasi</td><td>Google OAuth + OTP</td><td>Dual-role (Warden/Guard)</td></tr>
<tr><td>Pembayaran</td><td>Midtrans</td><td>GoPay, QRIS, VA, CC</td></tr>
</tbody></table>

<h3>Modul Sistem</h3>
<div class="stat-row">
<div class="stat-box"><div class="num">📊</div><div class="lbl">Dashboard</div></div>
<div class="stat-box"><div class="num">📋</div><div class="lbl">Data Napi</div></div>
<div class="stat-box"><div class="num">📞</div><div class="lbl">Telepon</div></div>
<div class="stat-box"><div class="num">💰</div><div class="lbl">Deposit</div></div>
</div>

<h3>Arsitektur Sistem</h3>
<div class="flow-box"><h4>User (Warden/Guard) → React Frontend → Express Backend → SQLite Database</h4>
<p>Integrasi: Google OAuth, Midtrans Payment Gateway, SMTP Email (OTP)</p></div>
<div class="footer-bar"><span>SIPENJARA v5.0 — Presentasi Reports</span><span>Halaman 1</span></div>
</div>

<!-- PAGE 3: JENIS REPORT -->
<div class="page">
<h2>2. Jenis-Jenis Report</h2>
<p>Sistem menghasilkan <strong>5 jenis report utama</strong> yang mencakup seluruh operasional lembaga pemasyarakatan:</p>
<table><thead><tr><th>No</th><th>Report</th><th>Format</th><th>Akses</th><th>Deskripsi</th></tr></thead><tbody>
<tr><td>1</td><td>📊 Dashboard Statistik</td><td>Visual (Cards)</td><td>Warden + Guard</td><td>Ringkasan real-time jumlah napi per kategori</td></tr>
<tr><td>2</td><td>🖨️ Dossier Tahanan</td><td>Print / PDF</td><td>Warden + Guard</td><td>Dokumen profil lengkap narapidana</td></tr>
<tr><td>3</td><td>📋 Tabel Data Napi</td><td>Tabel CRUD</td><td>Warden (full) / Guard (read)</td><td>Data master napi + search + filter</td></tr>
<tr><td>4</td><td>📋 Riwayat Transaksi</td><td>Tabel + Filter</td><td>Warden + Guard</td><td>Log semua transaksi keuangan</td></tr>
<tr><td>5</td><td>✅ Receipt Digital</td><td>Struk Inline</td><td>Warden + Guard</td><td>Struk setelah deposit/telepon berhasil</td></tr>
</tbody></table>

<h3>Dashboard Statistik Real-Time</h3>
<div class="stat-row">
<div class="stat-box" style="border-color:#c0392b"><div class="num" style="color:#c0392b">🚨</div><div class="lbl">Kelas Kakap (High-Risk)</div></div>
<div class="stat-box" style="border-color:#e67e22"><div class="num" style="color:#e67e22">🔒</div><div class="lbl">Di Isolasi</div></div>
<div class="stat-box" style="border-color:#f1c40f"><div class="num" style="color:#e67e22">⏳</div><div class="lbl">Transaksi Pending</div></div>
<div class="stat-box" style="border-color:#27ae60"><div class="num" style="color:#27ae60">✅</div><div class="lbl">Trusty Napi</div></div>
</div>
<p style="font-size:0.8rem;color:#666">Dashboard menampilkan jam real-time, tanggal Indonesia, log kejadian (8 notifikasi terakhir), serta aksi cepat Warden.</p>
<div class="footer-bar"><span>SIPENJARA v5.0 — Presentasi Reports</span><span>Halaman 2</span></div>
</div>

<!-- PAGE 4: DOSSIER -->
<div class="page">
<h2>3. Report: Dossier Tahanan (Cetak)</h2>
<p>Report paling lengkap — diakses melalui tombol <strong>"🖨️ DOSSIER"</strong> pada setiap kartu narapidana.</p>

<h3>Konten Dossier</h3>
<table><thead><tr><th>Bagian</th><th>Detail</th></tr></thead><tbody>
<tr><td>Kop Surat</td><td>NUSA KAMBANGAN SUPERMAX — Dossier Tahanan</td></tr>
<tr><td>Avatar</td><td>SVG avatar otomatis berdasarkan gender (L/P)</td></tr>
<tr><td>Header Profil</td><td>ID Napi, Alias, Klasifikasi Kejahatan, Tier, Lokasi Sel</td></tr>
<tr><td>Biodata Lengkap</td><td>Umur, JK, Pekerjaan, Gaji, Estimasi Bebas, Saldo E-Wallet</td></tr>
<tr><td>Catatan Kriminal</td><td>Deskripsi dan profil kejahatan narapidana</td></tr>
<tr><td>Tanda Tangan</td><td>Blok TTD Kepala Lembaga Pemasyarakatan + NIP</td></tr>
</tbody></table>

<h3>Implementasi Teknis</h3>
<div class="flow-box"><h4>CSS @media print + window.print()</h4>
<p>Dossier menggunakan class <code>.print-container</code> yang hanya tampil saat mode cetak. Layout terpisah dari tampilan layar untuk hasil cetak profesional.</p></div>

<h3>Alur Cetak Dossier</h3>
<div class="flow-box"><h4>1. Klik tombol "🖨️ DOSSIER"</h4><p>→ State activePrint diisi data napi, printType = 'dossier'</p></div>
<div class="flow-box"><h4>2. Render Print Container</h4><p>→ Komponen .print-container menampilkan layout dossier</p></div>
<div class="flow-box"><h4>3. setTimeout → window.print()</h4><p>→ Browser membuka dialog print (300ms delay untuk render)</p></div>
<div class="footer-bar"><span>SIPENJARA v5.0 — Presentasi Reports</span><span>Halaman 3</span></div>
</div>

<!-- PAGE 5: DEPOSIT & TELEPON -->
<div class="page">
<h2>4. Report: Receipt Digital</h2>
<p>Struk digital ditampilkan setelah setiap transaksi berhasil diproses.</p>

<div class="two-col">
<div class="receipt">
<h4>💰 Receipt Deposit</h4>
<p><strong>✅ Deposit Berhasil!</strong></p>
<p>ID Transaksi: <strong>DEP-54321</strong></p>
<p>Metode: <strong>Midtrans (GoPay)</strong></p>
<p>Saldo Sebelum: Rp 50.000</p>
<p>Saldo Sesudah: <strong style="color:#00a651">Rp 150.000</strong></p>
</div>
<div class="receipt">
<h4>📞 Receipt Telepon</h4>
<p><strong>✅ Booking Berhasil!</strong></p>
<p>Slot ID: <strong>TEL-98765</strong></p>
<p>Durasi: <strong>10 menit</strong></p>
<p>Biaya: Rp 25.000</p>
<p>Saldo Sesudah: <strong style="color:#00a651">Rp 125.000</strong></p>
</div>
</div>

<h3>Metode Deposit</h3>
<div class="two-col">
<div class="info-box"><h4>💳 Midtrans Payment</h4><ul>
<li>GoPay</li><li>QRIS</li><li>BCA / BNI / Mandiri / BRI VA</li><li>Kartu Kredit</li><li>Alfamart / Indomaret</li>
</ul></div>
<div class="info-box"><h4>📞 Opsi Telepon</h4><ul>
<li>Lokal 3 mnt — Rp 10.000</li><li>Lokal 5 mnt — Rp 15.000</li><li>Lokal 10 mnt — Rp 25.000</li><li>Internasional — Rp 20.000/mnt</li><li>Video Call 5 mnt — Rp 30.000</li>
</ul></div>
</div>

<h2>5. Report: Riwayat Transaksi</h2>
<p>Log seluruh transaksi dengan filter per napi dan jenis layanan.</p>
<table><thead><tr><th>ID Transaksi</th><th>Layanan</th><th>Napi</th><th>Total</th><th>Saldo</th><th>Status</th></tr></thead><tbody>
<tr><td>DEP-12345</td><td><span class="badge badge-green">💰 DEPOSIT</span></td><td>El Kartel</td><td style="color:#00a651">+Rp 100.000</td><td>Rp 150.000</td><td><span class="badge badge-green">success</span></td></tr>
<tr><td>TEL-67890</td><td><span class="badge badge-blue">📞 TELEPON</span></td><td>El Kartel</td><td style="color:#e67e22">-Rp 25.000</td><td>Rp 125.000</td><td><span class="badge badge-green">success</span></td></tr>
</tbody></table>
<div class="footer-bar"><span>SIPENJARA v5.0 — Presentasi Reports</span><span>Halaman 4</span></div>
</div>

<!-- PAGE 6: ROLE & API -->
<div class="page">
<h2>6. Akses Role-Based</h2>
<div class="two-col">
<div class="info-box" style="border:2px solid #003087">
<h4>🛡️ WARDEN — Full Access</h4>
<ul>
<li>Dashboard + Statistik</li><li>CRUD Data Napi (Tambah/Edit/Hapus)</li>
<li>Cetak Dossier</li><li>Deposit (Manual + Midtrans)</li>
<li>Riwayat Transaksi</li><li>Distribusi Payroll</li>
<li>Registrasi Napi Baru</li>
</ul>
<p style="margin-top:8px;font-size:0.75rem"><strong>Auth:</strong> Google OAuth (Single-Factor)</p>
</div>
<div class="info-box" style="border:2px solid #0070d1">
<h4>🔒 GUARD — Limited Access</h4>
<ul>
<li>Dashboard + Statistik</li><li>Lihat Data Napi (Read-Only)</li>
<li>Cetak Dossier</li><li>Deposit</li>
<li>Riwayat Transaksi</li>
</ul>
<p style="margin-top:8px;font-size:0.75rem"><strong>Auth:</strong> Google OAuth + OTP Email (Two-Factor)</p>
</div>
</div>

<h2>7. API Endpoints untuk Reports</h2>
<table><thead><tr><th>Method</th><th>Endpoint</th><th>Deskripsi</th></tr></thead><tbody>
<tr><td><span class="badge badge-green">GET</span></td><td>/api/inmates</td><td>Ambil semua data narapidana</td></tr>
<tr><td><span class="badge badge-green">GET</span></td><td>/api/transactions</td><td>Ambil semua riwayat transaksi</td></tr>
<tr><td><span class="badge badge-green">GET</span></td><td>/api/transactions?inmateId=X</td><td>Filter transaksi per napi</td></tr>
<tr><td><span class="badge badge-green">GET</span></td><td>/api/wallet/balance/:id</td><td>Cek saldo e-wallet napi</td></tr>
<tr><td><span class="badge badge-green">GET</span></td><td>/api/guards</td><td>Daftar guard terdaftar</td></tr>
</tbody></table>

<h2>8. Struktur Database</h2>
<table><thead><tr><th>Tabel</th><th>Kolom Utama</th><th>Fungsi</th></tr></thead><tbody>
<tr><td><strong>inmates</strong></td><td>id, alias, tier, crimeType, cell, saldo, points</td><td>Data master narapidana</td></tr>
<tr><td><strong>transactions</strong></td><td>trx_id, inmate_id, jenis, total, saldo_sebelum/sesudah</td><td>Log transaksi keuangan</td></tr>
<tr><td><strong>daily_limits</strong></td><td>inmate_id, jenis, amount, minutes_used, date</td><td>Limit harian per layanan</td></tr>
<tr><td><strong>guards</strong></td><td>google_id, name, email, status</td><td>Data petugas (Guard)</td></tr>
</tbody></table>
<div class="footer-bar"><span>SIPENJARA v5.0 — Presentasi Reports</span><span>Halaman 5</span></div>
</div>

<!-- PAGE 7: KESIMPULAN -->
<div class="page" style="display:flex;flex-direction:column;justify-content:center">
<h2 style="text-align:center;font-size:2rem;border:none">Kesimpulan</h2>
<p style="text-align:center;font-size:1rem;margin:16px 0 32px;color:#555">SIPENJARA v5.0 menghasilkan 5 jenis report utama:</p>
<table><thead><tr><th>#</th><th>Report</th><th>Format</th><th>Fitur Utama</th></tr></thead><tbody>
<tr><td>1</td><td>📊 Dashboard Statistik</td><td>Visual Cards</td><td>Real-time, auto-refresh</td></tr>
<tr><td>2</td><td>🖨️ Dossier Tahanan</td><td>Print/PDF</td><td>CSS print, TTD resmi</td></tr>
<tr><td>3</td><td>📋 Tabel Data Napi</td><td>CRUD Table</td><td>Search, Filter, Inline Edit</td></tr>
<tr><td>4</td><td>📋 Riwayat Transaksi</td><td>Tabel + Filter</td><td>Multi-filter, color-coded</td></tr>
<tr><td>5</td><td>✅ Receipt Digital</td><td>Struk Inline</td><td>Auto-generate, real-time</td></tr>
</tbody></table>
<div style="text-align:center;margin-top:40px;padding:24px;background:#f5f7ff;border-radius:16px;border:1px solid #e0e8ff">
<p style="font-size:0.85rem;color:#003087;font-weight:700">Semua report didesain dengan prinsip transparansi keuangan dan pencegahan korupsi sesuai pedoman Kemenkumham RI</p>
<p style="font-size:0.75rem;color:#666;margin-top:8px">Audit trail lengkap • Pencatatan otomatis • Role-based access control</p>
</div>
<div style="text-align:center;margin-top:48px">
<p style="font-size:1.2rem;font-weight:800;color:#003087;letter-spacing:4px">SIPENJARA v5.0</p>
<p style="font-size:0.7rem;color:#999;letter-spacing:3px;margin-top:4px">KEMENKUMHAM RI • E-WALLET SYSTEM • SQLite Database</p>
</div>
<div class="footer-bar"><span>SIPENJARA v5.0 — Presentasi Reports</span><span>Halaman 6</span></div>
</div>

</body></html>`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
  const out = path.join(__dirname, 'Presentasi_Reports_SIPENJARA.pdf');
  await page.pdf({ path: out, format: 'A4', printBackground: true, margin:{top:'0',bottom:'0',left:'0',right:'0'} });
  await browser.close();
  console.log('PDF berhasil dibuat:', out);
})();

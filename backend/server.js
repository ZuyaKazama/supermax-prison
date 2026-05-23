const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const midtransClient = require('midtrans-client');

const app = express();
app.use(cors());
app.use(express.json());

// =================================================================
// 💳 KONFIGURASI MIDTRANS
// =================================================================
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || 'Mid-client-YAwDc1cL-NWUpMAY';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

const snap = new midtransClient.Snap({
    isProduction: MIDTRANS_IS_PRODUCTION,
    serverKey: MIDTRANS_SERVER_KEY,
    clientKey: MIDTRANS_CLIENT_KEY,
});

// =================================================================
// 🔐 KONFIGURASI GOOGLE OAUTH
// =================================================================
const FRONTEND_CLIENT_ID = '872620897918-8ijpo28bm92f1fq8v5i34ip74dme1oa1.apps.googleusercontent.com';
const oauthClient = new OAuth2Client(FRONTEND_CLIENT_ID);

// =================================================================
// 📧 KONFIGURASI EMAIL (SMTP via Gmail App Password)
// =================================================================
const SMTP_EMAIL = process.env.SMTP_EMAIL || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const SMTP_CONFIGURED = !!(SMTP_EMAIL && SMTP_PASSWORD);

let transporter = null;
if (SMTP_CONFIGURED) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: SMTP_EMAIL, pass: SMTP_PASSWORD }
    });
}

// =================================================================
// 🔑 WARDEN WHITELIST
// =================================================================
const WARDEN_EMAILS = [
    'jamaldan390@gmail.com',
    ...(process.env.WARDEN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
];

const db = new sqlite3.Database('./sipenjara.db', (err) => {
    if (err) console.error("Gagal koneksi ke SQLite:", err.message);
    else console.log("✅ Berhasil koneksi ke SQLite Database!");
});

// =================================================================
// 📋 BUAT TABEL (jika belum ada)
// =================================================================
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS guards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        picture TEXT,
        status TEXT DEFAULT 'active',
        registered_at TEXT DEFAULT (datetime('now','localtime'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS otp_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        google_id TEXT,
        name TEXT,
        picture TEXT,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);

    // Tabel transaksi untuk sistem pembayaran internal
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trx_id TEXT NOT NULL,
        inmate_id TEXT NOT NULL,
        jenis TEXT NOT NULL,
        items TEXT,
        total INTEGER NOT NULL,
        saldo_sebelum INTEGER,
        saldo_sesudah INTEGER,
        status TEXT DEFAULT 'success',
        detail TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);

    // Tabel daily spending limit tracker
    db.run(`CREATE TABLE IF NOT EXISTS daily_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inmate_id TEXT NOT NULL,
        jenis TEXT NOT NULL,
        amount INTEGER DEFAULT 0,
        minutes_used INTEGER DEFAULT 0,
        date TEXT NOT NULL,
        UNIQUE(inmate_id, jenis, date)
    )`);
});

// =================================================================
// 🎲 HELPERS
// =================================================================
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

async function sendOTPEmail(email, otp, name) {
    if (!SMTP_CONFIGURED) {
        console.log('\n╔══════════════════════════════════════════════╗');
        console.log('║  📧 DEV MODE — SMTP BELUM DIKONFIGURASI      ║');
        console.log('╠══════════════════════════════════════════════╣');
        console.log(`║  Email  : ${email}`);
        console.log(`║  Nama   : ${name}`);
        console.log(`║  🔑 OTP : ${otp}`);
        console.log('╚══════════════════════════════════════════════╝\n');
        return { devMode: true, otp };
    }

    const mailOptions = {
        from: `"SIPENJARA Security" <${SMTP_EMAIL}>`,
        to: email,
        subject: '🔐 Kode OTP Pendaftaran Guard - SIPENJARA',
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0d12; color: #c5cdd8; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
                <div style="background: linear-gradient(135deg, #e74c3c, #f39c12); padding: 24px; text-align: center;">
                    <h1 style="margin: 0; color: white; font-size: 28px; letter-spacing: 4px;">SIPENJARA</h1>
                    <p style="margin: 4px 0 0; color: rgba(255,255,255,0.8); font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Sistem Informasi Pemasyarakatan</p>
                </div>
                <div style="padding: 32px 28px;">
                    <p style="color: #8892a4; font-size: 14px; margin: 0 0 8px;">Halo, <strong style="color: #edf0f5;">${name}</strong></p>
                    <p style="color: #8892a4; font-size: 14px; margin: 0 0 24px;">Kode OTP untuk pendaftaran akun Guard Anda:</p>
                    <div style="background: rgba(231,76,60,0.1); border: 2px solid rgba(231,76,60,0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                        <span style="font-size: 40px; font-weight: bold; color: #f39c12; letter-spacing: 12px; font-family: monospace;">${otp}</span>
                    </div>
                    <p style="color: #5a6477; font-size: 12px; margin: 0;">⏰ Kode berlaku selama <strong>5 menit</strong></p>
                </div>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
}

// Helper: get today's date string
function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

// Helper: get daily usage
function getDailyUsage(inmateId, jenis) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT * FROM daily_limits WHERE inmate_id = ? AND jenis = ? AND date = ?",
            [inmateId, jenis, getTodayStr()],
            (err, row) => {
                if (err) reject(err);
                else resolve(row || { amount: 0, minutes_used: 0 });
            }
        );
    });
}

// Helper: update daily usage
function updateDailyUsage(inmateId, jenis, addAmount, addMinutes = 0) {
    const today = getTodayStr();
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO daily_limits (inmate_id, jenis, amount, minutes_used, date)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(inmate_id, jenis, date)
             DO UPDATE SET amount = amount + ?, minutes_used = minutes_used + ?`,
            [inmateId, jenis, addAmount, addMinutes, today, addAmount, addMinutes],
            (err) => { if (err) reject(err); else resolve(); }
        );
    });
}

// =================================================================
// 🔐 AUTH ENDPOINTS (unchanged)
// =================================================================
app.post('/api/auth/warden', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await oauthClient.verifyIdToken({ idToken: credential });
        const payload = ticket.getPayload();
        const user = { name: payload.name, email: payload.email, picture: payload.picture, googleId: payload.sub, role: 'warden' };
        if (!WARDEN_EMAILS.includes(payload.email.toLowerCase())) {
            return res.status(403).json({ success: false, error: `Akses ditolak. Email ${payload.email} tidak terdaftar sebagai Warden.` });
        }
        console.log(`✅ Warden Login: ${user.name} (${user.email})`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("🔴 Warden Auth Error:", error.message);
        res.status(401).json({ success: false, error: 'Token tidak valid' });
    }
});

app.post('/api/auth/guard/request-otp', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await oauthClient.verifyIdToken({ idToken: credential });
        const payload = ticket.getPayload();
        const existingGuard = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM guards WHERE google_id = ? AND status = 'active'", [payload.sub], (err, row) => { if (err) reject(err); else resolve(row); });
        });

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        db.run("DELETE FROM otp_codes WHERE email = ?", [payload.email]);
        db.run("INSERT INTO otp_codes (email, code, google_id, name, picture, expires_at) VALUES (?,?,?,?,?,?)",
            [payload.email, otp, payload.sub, payload.name, payload.picture, expiresAt]);

        try {
            const result = await sendOTPEmail(payload.email, otp, payload.name);
            res.json({
                success: true, step: 'otp_sent', isRegistered: !!existingGuard, email: payload.email,
                message: result?.devMode ? `[DEV MODE] OTP: ${otp} — Cek console server` : `OTP dikirim ke ${payload.email}`,
                ...(result?.devMode ? { devOtp: otp } : {})
            });
        } catch (emailErr) {
            res.status(500).json({ success: false, error: 'Gagal mengirim OTP ke email.' });
        }
    } catch (error) {
        res.status(401).json({ success: false, error: 'Token Google tidak valid' });
    }
});

app.post('/api/auth/guard/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: 'Email dan OTP harus diisi' });
    try {
        const otpRecord = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM otp_codes WHERE email = ? AND code = ? AND used = 0 ORDER BY created_at DESC LIMIT 1",
                [email, otp], (err, row) => { if (err) reject(err); else resolve(row); });
        });
        if (!otpRecord) return res.status(400).json({ success: false, error: 'Kode OTP salah atau sudah expired' });
        if (new Date(otpRecord.expires_at) < new Date()) return res.status(400).json({ success: false, error: 'Kode OTP sudah expired.' });
        db.run("UPDATE otp_codes SET used = 1 WHERE id = ?", [otpRecord.id]);
        const existingGuard = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM guards WHERE google_id = ?", [otpRecord.google_id], (err, row) => { if (err) reject(err); else resolve(row); });
        });
        if (!existingGuard) {
            db.run("INSERT INTO guards (google_id, name, email, picture) VALUES (?,?,?,?)",
                [otpRecord.google_id, otpRecord.name, otpRecord.email, otpRecord.picture]);
        }
        const user = { name: otpRecord.name, email: otpRecord.email, picture: otpRecord.picture, googleId: otpRecord.google_id, role: 'guard' };
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Gagal verifikasi OTP' });
    }
});

app.post('/api/auth/guard/resend-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email harus diisi' });
    const lastOtp = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM otp_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1", [email], (err, row) => { if (err) reject(err); else resolve(row); });
    });
    if (!lastOtp) return res.status(400).json({ success: false, error: 'Data tidak ditemukan.' });
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    db.run("DELETE FROM otp_codes WHERE email = ?", [email]);
    db.run("INSERT INTO otp_codes (email, code, google_id, name, picture, expires_at) VALUES (?,?,?,?,?,?)",
        [email, otp, lastOtp.google_id, lastOtp.name, lastOtp.picture, expiresAt]);
    try {
        const result = await sendOTPEmail(email, otp, lastOtp.name);
        res.json({ success: true, message: result?.devMode ? `[DEV MODE] OTP Baru: ${otp}` : `OTP baru dikirim ke ${email}`, ...(result?.devMode ? { devOtp: otp } : {}) });
    } catch (emailErr) {
        res.status(500).json({ success: false, error: 'Gagal mengirim OTP.' });
    }
});

app.get('/api/guards', (req, res) => {
    db.all("SELECT id, name, email, status, registered_at FROM guards ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =================================================================
// 📋 INMATES API
// =================================================================
app.get('/api/inmates', (req, res) => db.all("SELECT * FROM inmates ORDER BY id DESC", [], (err, rows) => res.json(rows || [])));

app.post('/api/inmates', (req, res) => {
    const { id, alias, tier, crimeType, cell, points, saldo, age, gender, entryDate, exitDate, status, description } = req.body;
    db.run(`INSERT INTO inmates (id, alias, tier, crimeType, cell, points, saldo, age, gender, entryDate, exitDate, job, wage, description)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, alias, tier, crimeType, cell, points, saldo || 0, age, gender, entryDate, exitDate, status || 'aktif', 0, description],
        (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Berhasil" }));
});

app.delete('/api/inmates/:id', (req, res) => db.run("DELETE FROM inmates WHERE id = ?", [req.params.id], (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Terhapus" })));

app.put('/api/inmates/:id', (req, res) => {
    const { alias, crimeType, cell, age, gender, exitDate, tier, points } = req.body;
    if (!alias) return res.status(400).json({ error: 'Alias tidak boleh kosong' });
    db.run(
        `UPDATE inmates SET alias=?, crimeType=?, cell=?, age=?, gender=?, exitDate=?, tier=?, points=? WHERE id=?`,
        [alias, crimeType, cell, age, gender, exitDate, tier, points, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Napi tidak ditemukan' });
            res.json({ success: true, message: 'Data berhasil diupdate' });
        }
    );
});


// =================================================================
// 💰 E-WALLET: Deposit saldo (dari keluarga / admin)
// =================================================================
app.post('/api/wallet/deposit', (req, res) => {
    const { inmateId, amount } = req.body;
    if (!inmateId || !amount || amount <= 0) return res.status(400).json({ error: 'Data tidak valid' });

    db.get("SELECT * FROM inmates WHERE id = ?", [inmateId], (err, inmate) => {
        if (err || !inmate) return res.status(404).json({ error: 'Napi tidak ditemukan' });
        const saldoBefore = inmate.saldo || 0;
        const saldoAfter = saldoBefore + amount;
        db.run("UPDATE inmates SET saldo = ? WHERE id = ?", [saldoAfter, inmateId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            const trxId = 'DEP-' + Math.floor(Math.random() * 90000 + 10000);
            db.run("INSERT INTO transactions (trx_id, inmate_id, jenis, items, total, saldo_sebelum, saldo_sesudah, status) VALUES (?,?,?,?,?,?,?,?)",
                [trxId, inmateId, 'deposit', 'Top-up Saldo E-Wallet', amount, saldoBefore, saldoAfter, 'success']);
            res.json({ success: true, trxId, saldoBefore, saldoAfter });
        });
    });
});

// =================================================================
// 🛒 KANTIN: Order (E-Wallet internal — tetap bisa dipakai)
// =================================================================
app.post('/api/kantin/order', async (req, res) => {
    const { inmateId, items } = req.body;
    // items = [{ name, price, qty }]
    if (!inmateId || !items || items.length === 0) return res.status(400).json({ error: 'Data tidak valid' });

    try {
        const inmate = await new Promise((r, j) => db.get("SELECT * FROM inmates WHERE id = ?", [inmateId], (e, row) => e ? j(e) : r(row)));
        if (!inmate) return res.status(404).json({ error: 'Napi tidak ditemukan' });

        const total = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
        const saldoBefore = inmate.saldo || 0;

        // Check daily limit
        const usage = await getDailyUsage(inmateId, 'kantin');
        if ((usage.amount + total) > 200000) {
            return res.status(400).json({ error: `Limit kantin harian terlampaui. Terpakai: Rp ${usage.amount.toLocaleString()}, Limit: Rp 200.000` });
        }

        if (saldoBefore < total) {
            return res.status(400).json({ error: `Saldo tidak cukup. Saldo: Rp ${saldoBefore.toLocaleString()}, Kebutuhan: Rp ${total.toLocaleString()}` });
        }

        const saldoAfter = saldoBefore - total;
        const trxId = 'KANT-' + Math.floor(Math.random() * 90000 + 10000);

        db.run("UPDATE inmates SET saldo = ? WHERE id = ?", [saldoAfter, inmateId]);
        await updateDailyUsage(inmateId, 'kantin', total);
        db.run("INSERT INTO transactions (trx_id, inmate_id, jenis, items, total, saldo_sebelum, saldo_sesudah, status) VALUES (?,?,?,?,?,?,?,?)",
            [trxId, inmateId, 'kantin', JSON.stringify(items), total, saldoBefore, saldoAfter, 'success']);

        res.json({ success: true, trxId, total, saldoBefore, saldoAfter });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =================================================================
// 💳 MIDTRANS: Generate Snap Token (Kantin)
// =================================================================
app.post('/api/midtrans/kantin-token', async (req, res) => {
    const { inmateId, items } = req.body;
    if (!inmateId || !items || items.length === 0) return res.status(400).json({ error: 'Data tidak valid' });

    try {
        const inmate = await new Promise((r, j) => db.get("SELECT * FROM inmates WHERE id = ?", [inmateId], (e, row) => e ? j(e) : r(row)));
        if (!inmate) return res.status(404).json({ error: 'Napi tidak ditemukan' });

        const total = items.reduce((sum, i) => sum + (i.price * i.qty), 0);

        // Check daily limit
        const usage = await getDailyUsage(inmateId, 'kantin');
        if ((usage.amount + total) > 200000) {
            return res.status(400).json({ error: `Limit kantin harian terlampaui. Terpakai: Rp ${usage.amount.toLocaleString()}, Limit: Rp 200.000` });
        }

        const orderId = 'KANT-MT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        const parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: total,
            },
            item_details: items.map(i => ({
                id: i.name.replace(/\s/g, '_').toLowerCase(),
                price: i.price,
                quantity: i.qty,
                name: i.name.substring(0, 50),
            })),
            customer_details: {
                first_name: inmate.alias || 'Napi',
                email: `${inmateId.toLowerCase()}@sipenjara.internal`,
                notes: `Napi ID: ${inmateId}`,
            },
            callbacks: {
                finish: '/api/midtrans/finish',
            },
        };

        const snapResponse = await snap.createTransaction(parameter);

        // Simpan transaksi dengan status pending
        db.run("INSERT INTO transactions (trx_id, inmate_id, jenis, items, total, saldo_sebelum, saldo_sesudah, status, detail) VALUES (?,?,?,?,?,?,?,?,?)",
            [orderId, inmateId, 'kantin', JSON.stringify(items), total, inmate.saldo || 0, inmate.saldo || 0, 'pending_payment', JSON.stringify({ payment_method: 'midtrans', snap_token: snapResponse.token })]);

        console.log(`💳 Midtrans Kantin Token: ${orderId} | Total: Rp ${total.toLocaleString()} | Napi: ${inmate.alias}`);
        res.json({ success: true, token: snapResponse.token, orderId, total });
    } catch (e) {
        console.error('❌ Midtrans Token Error:', e.message);
        res.status(500).json({ error: 'Gagal membuat token pembayaran: ' + e.message });
    }
});

// =================================================================
// 💳 MIDTRANS: Generate Snap Token (Deposit E-Wallet)
// =================================================================
app.post('/api/midtrans/deposit-token', async (req, res) => {
    const { inmateId, amount } = req.body;
    if (!inmateId || !amount || amount <= 0) return res.status(400).json({ error: 'Data tidak valid' });

    try {
        const inmate = await new Promise((r, j) => db.get("SELECT * FROM inmates WHERE id = ?", [inmateId], (e, row) => e ? j(e) : r(row)));
        if (!inmate) return res.status(404).json({ error: 'Napi tidak ditemukan' });

        const orderId = 'DEP-MT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        const parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: amount,
            },
            item_details: [{
                id: 'deposit_ewallet',
                price: amount,
                quantity: 1,
                name: `Deposit E-Wallet ${inmate.alias}`,
            }],
            customer_details: {
                first_name: 'Keluarga',
                last_name: inmate.alias || 'Napi',
                email: `family-${inmateId.toLowerCase()}@sipenjara.internal`,
                notes: `Deposit untuk Napi: ${inmateId} - ${inmate.alias}`,
            },
            callbacks: {
                finish: '/api/midtrans/finish',
            },
        };

        const snapResponse = await snap.createTransaction(parameter);

        // Simpan transaksi pending
        db.run("INSERT INTO transactions (trx_id, inmate_id, jenis, items, total, saldo_sebelum, saldo_sesudah, status, detail) VALUES (?,?,?,?,?,?,?,?,?)",
            [orderId, inmateId, 'deposit', `Deposit via Midtrans`, amount, inmate.saldo || 0, inmate.saldo || 0, 'pending_payment', JSON.stringify({ payment_method: 'midtrans', snap_token: snapResponse.token })]);

        console.log(`💳 Midtrans Deposit Token: ${orderId} | Amount: Rp ${amount.toLocaleString()} | Napi: ${inmate.alias}`);
        res.json({ success: true, token: snapResponse.token, orderId, amount });
    } catch (e) {
        console.error('❌ Midtrans Deposit Token Error:', e.message);
        res.status(500).json({ error: 'Gagal membuat token pembayaran: ' + e.message });
    }
});

// =================================================================
// 💳 MIDTRANS: Confirm Payment (setelah Snap popup sukses)
// =================================================================
app.post('/api/midtrans/confirm', async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Order ID tidak valid' });

    try {
        // Cari transaksi pending
        const trx = await new Promise((r, j) => db.get("SELECT * FROM transactions WHERE trx_id = ? AND status = 'pending_payment'", [orderId], (e, row) => e ? j(e) : r(row)));
        if (!trx) return res.status(404).json({ error: 'Transaksi tidak ditemukan atau sudah diproses' });

        const inmate = await new Promise((r, j) => db.get("SELECT * FROM inmates WHERE id = ?", [trx.inmate_id], (e, row) => e ? j(e) : r(row)));
        if (!inmate) return res.status(404).json({ error: 'Napi tidak ditemukan' });

        const saldoBefore = inmate.saldo || 0;

        if (trx.jenis === 'deposit') {
            // Deposit: tambah saldo
            const saldoAfter = saldoBefore + trx.total;
            db.run("UPDATE inmates SET saldo = ? WHERE id = ?", [saldoAfter, trx.inmate_id]);
            db.run("UPDATE transactions SET status = 'success', saldo_sebelum = ?, saldo_sesudah = ? WHERE trx_id = ?",
                [saldoBefore, saldoAfter, orderId]);
            console.log(`✅ Deposit Midtrans BERHASIL: ${orderId} | +Rp ${trx.total.toLocaleString()} → ${inmate.alias}`);
            res.json({ success: true, trxId: orderId, saldoBefore, saldoAfter, type: 'deposit' });
        } else {
            res.status(400).json({ error: 'Tipe transaksi tidak dikenali' });
        }
    } catch (e) {
        console.error('❌ Midtrans Confirm Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// =================================================================
// 💳 MIDTRANS: Check Status (cek langsung ke Midtrans API)
// =================================================================
app.get('/api/midtrans/check-status/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
        // Cek status dari Midtrans API
        const statusResponse = await snap.transaction.status(orderId);
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`🔍 Check Status: ${orderId} | Status: ${transactionStatus} | Fraud: ${fraudStatus}`);

        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'accept' || !fraudStatus) {
                // Cek apakah transaksi masih pending di DB
                const trx = await new Promise((r, j) => db.get("SELECT * FROM transactions WHERE trx_id = ? AND status = 'pending_payment'", [orderId], (e, row) => e ? j(e) : r(row)));
                if (trx) {
                    const inmate = await new Promise((r, j) => db.get("SELECT * FROM inmates WHERE id = ?", [trx.inmate_id], (e, row) => e ? j(e) : r(row)));
                    if (inmate) {
                        const saldoBefore = inmate.saldo || 0;
                        if (trx.jenis === 'deposit') {
                            const saldoAfter = saldoBefore + trx.total;
                            db.run("UPDATE inmates SET saldo = ? WHERE id = ?", [saldoAfter, trx.inmate_id]);
                            db.run("UPDATE transactions SET status = 'success', saldo_sebelum = ?, saldo_sesudah = ? WHERE trx_id = ?",
                                [saldoBefore, saldoAfter, orderId]);
                            console.log(`✅ Check-Status Deposit BERHASIL: ${orderId} | +Rp ${trx.total.toLocaleString()} → ${inmate.alias}`);
                            return res.json({ success: true, status: 'paid', trxId: orderId, saldoBefore, saldoAfter });
                        }
                    }
                }
                // Sudah diproses sebelumnya
                return res.json({ success: true, status: 'already_processed' });
            }
        } else if (transactionStatus === 'pending') {
            return res.json({ success: true, status: 'pending', message: 'Pembayaran belum dikonfirmasi. Silakan selesaikan pembayaran.' });
        } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
            db.run("UPDATE transactions SET status = 'failed' WHERE trx_id = ? AND status = 'pending_payment'", [orderId]);
            return res.json({ success: true, status: 'failed', message: 'Pembayaran gagal/expired.' });
        }

        res.json({ success: true, status: transactionStatus });
    } catch (e) {
        console.error('❌ Check Status Error:', e.message);
        res.status(500).json({ error: 'Gagal cek status: ' + e.message });
    }
});

// =================================================================
// 💳 MIDTRANS: Webhook Notification (dari server Midtrans)
// =================================================================
app.post('/api/midtrans/notification', async (req, res) => {
    try {
        const notification = await snap.transaction.notification(req.body);
        const orderId = notification.order_id;
        const transactionStatus = notification.transaction_status;
        const fraudStatus = notification.fraud_status;

        console.log(`📩 Midtrans Notification: ${orderId} | Status: ${transactionStatus} | Fraud: ${fraudStatus}`);

        if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
            if (fraudStatus === 'accept' || !fraudStatus) {
                // Proses pembayaran berhasil
                const trx = await new Promise((r, j) => db.get("SELECT * FROM transactions WHERE trx_id = ? AND status = 'pending_payment'", [orderId], (e, row) => e ? j(e) : r(row)));
                if (trx) {
                    const inmate = await new Promise((r, j) => db.get("SELECT * FROM inmates WHERE id = ?", [trx.inmate_id], (e, row) => e ? j(e) : r(row)));
                    if (inmate) {
                        const saldoBefore = inmate.saldo || 0;
                        if (trx.jenis === 'deposit') {
                            const saldoAfter = saldoBefore + trx.total;
                            db.run("UPDATE inmates SET saldo = ? WHERE id = ?", [saldoAfter, trx.inmate_id]);
                            db.run("UPDATE transactions SET status = 'success', saldo_sebelum = ?, saldo_sesudah = ? WHERE trx_id = ?",
                                [saldoBefore, saldoAfter, orderId]);
                        } else if (trx.jenis === 'kantin') {
                            await updateDailyUsage(trx.inmate_id, 'kantin', trx.total);
                            db.run("UPDATE transactions SET status = 'success', saldo_sebelum = ?, saldo_sesudah = ? WHERE trx_id = ?",
                                [saldoBefore, saldoBefore, orderId]);
                        }
                    }
                }
            }
        } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
            db.run("UPDATE transactions SET status = 'failed' WHERE trx_id = ?", [orderId]);
        }

        res.status(200).json({ status: 'ok' });
    } catch (e) {
        console.error('❌ Midtrans Notification Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Legacy compatibility: /api/midtrans-token (used by old frontend code)
app.post('/api/midtrans-token', async (req, res) => {
    const { inmateId, inmateAlias, total, cart } = req.body;
    if (!inmateId || !total) return res.status(400).json({ error: 'Data tidak valid' });

    try {
        const orderId = 'TRX-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const parameter = {
            transaction_details: { order_id: orderId, gross_amount: Math.round(total) },
            customer_details: {
                first_name: inmateAlias || 'Napi',
                email: `${inmateId.toLowerCase()}@sipenjara.internal`,
            },
        };
        if (cart && cart.length > 0) {
            parameter.item_details = cart.map(i => ({
                id: (i.id || i.name || 'item').toString().substring(0, 50),
                price: Math.round(i.price || 0),
                quantity: i.qty || 1,
                name: (i.name || 'Item').substring(0, 50),
            }));
        }
        const snapResponse = await snap.createTransaction(parameter);
        res.json({ token: snapResponse.token, orderId });
    } catch (e) {
        console.error('❌ Midtrans Legacy Token Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// =================================================================
// 📞 TELEPON: Book slot
// =================================================================
app.post('/api/telepon/book', async (req, res) => {
    const { inmateId, tipe, durasi } = req.body;
    if (!inmateId || !tipe || !durasi) return res.status(400).json({ error: 'Data tidak valid' });

    // Price map
    const prices = {
        'lokal_3': { price: 10000, mins: 3 },
        'lokal_5': { price: 15000, mins: 5 },
        'lokal_10': { price: 25000, mins: 10 },
        'intl_per_min': { price: 20000, mins: durasi },
        'video_5': { price: 30000, mins: 5 },
    };
    const sel = prices[tipe];
    if (!sel) return res.status(400).json({ error: 'Tipe telepon tidak valid' });

    let totalPrice = sel.price;
    if (tipe === 'intl_per_min') totalPrice = sel.price * durasi;
    const totalMins = sel.mins;

    try {
        const inmate = await new Promise((r, j) => db.get("SELECT * FROM inmates WHERE id = ?", [inmateId], (e, row) => e ? j(e) : r(row)));
        if (!inmate) return res.status(404).json({ error: 'Napi tidak ditemukan' });

        const saldoBefore = inmate.saldo || 0;

        // Check daily limit (30 min/day)
        const usage = await getDailyUsage(inmateId, 'telepon');
        if ((usage.minutes_used + totalMins) > 30) {
            return res.status(400).json({ error: `Limit telepon harian terlampaui. Terpakai: ${usage.minutes_used} menit, Limit: 30 menit/hari` });
        }

        if (saldoBefore < totalPrice) {
            return res.status(400).json({ error: `Saldo tidak cukup. Saldo: Rp ${saldoBefore.toLocaleString()}, Kebutuhan: Rp ${totalPrice.toLocaleString()}` });
        }

        const saldoAfter = saldoBefore - totalPrice;
        const trxId = 'TEL-' + Math.floor(Math.random() * 90000 + 10000);

        db.run("UPDATE inmates SET saldo = ? WHERE id = ?", [saldoAfter, inmateId]);
        await updateDailyUsage(inmateId, 'telepon', totalPrice, totalMins);
        db.run("INSERT INTO transactions (trx_id, inmate_id, jenis, items, total, saldo_sebelum, saldo_sesudah, status, detail) VALUES (?,?,?,?,?,?,?,?,?)",
            [trxId, inmateId, 'telepon', tipe, totalPrice, saldoBefore, saldoAfter, 'success', JSON.stringify({ durasi: totalMins })]);

        res.json({ success: true, trxId, totalPrice, durasi: totalMins, saldoBefore, saldoAfter });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =================================================================
// 👕 LAUNDRY: Submit
// =================================================================
app.post('/api/laundry/submit', async (req, res) => {
    const { inmateId, tipe, kg, express: isExpress } = req.body;
    if (!inmateId || !tipe || !kg) return res.status(400).json({ error: 'Data tidak valid' });

    const priceMap = { 'cuci': 8000, 'strika': 10000, 'cuci_strika': 12000 };
    const basePrice = priceMap[tipe];
    if (!basePrice) return res.status(400).json({ error: 'Tipe laundry tidak valid' });

    let totalPrice = basePrice * kg;
    if (isExpress) totalPrice += 5000;

    try {
        const inmate = await new Promise((r, j) => db.get("SELECT * FROM inmates WHERE id = ?", [inmateId], (e, row) => e ? j(e) : r(row)));
        if (!inmate) return res.status(404).json({ error: 'Napi tidak ditemukan' });

        const saldoBefore = inmate.saldo || 0;
        if (saldoBefore < totalPrice) {
            return res.status(400).json({ error: `Saldo tidak cukup. Saldo: Rp ${saldoBefore.toLocaleString()}, Kebutuhan: Rp ${totalPrice.toLocaleString()}` });
        }

        const saldoAfter = saldoBefore - totalPrice;
        const trxId = 'LAUN-' + Math.floor(Math.random() * 90000 + 10000);
        const pickupDays = isExpress ? 1 : 3;

        db.run("UPDATE inmates SET saldo = ? WHERE id = ?", [saldoAfter, inmateId]);
        db.run("INSERT INTO transactions (trx_id, inmate_id, jenis, items, total, saldo_sebelum, saldo_sesudah, status, detail) VALUES (?,?,?,?,?,?,?,?,?)",
            [trxId, inmateId, 'laundry', tipe, totalPrice, saldoBefore, saldoAfter, 'success', JSON.stringify({ kg, express: isExpress, pickupDays })]);

        res.json({ success: true, trxId, totalPrice, kg, pickupDays, saldoBefore, saldoAfter });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =================================================================
// 📊 TRANSACTION HISTORY
// =================================================================
app.get('/api/transactions', (req, res) => {
    const { inmateId } = req.query;
    let sql = "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100";
    let params = [];
    if (inmateId) {
        sql = "SELECT * FROM transactions WHERE inmate_id = ? ORDER BY created_at DESC LIMIT 50";
        params = [inmateId];
    }
    db.all(sql, params, (err, rows) => res.json(rows || []));
});

// =================================================================
// 💰 CHECK BALANCE
// =================================================================
app.get('/api/wallet/balance/:inmateId', (req, res) => {
    db.get("SELECT id, alias, saldo, cell, tier FROM inmates WHERE id = ?", [req.params.inmateId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Napi tidak ditemukan' });
        res.json(row);
    });
});

// Legacy compat
app.post('/api/inmates/update-saldo', (req, res) => {
    const { id, amount } = req.body;
    db.run("UPDATE inmates SET saldo = saldo + ? WHERE id = ?", [amount, id], (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Sukses" }));
});

app.get('/api/products', (req, res) => db.all("SELECT * FROM products ORDER BY id DESC", [], (err, rows) => res.json(rows || [])));
app.post('/api/products', (req, res) => {
    const { id, name, price, type, stock } = req.body;
    db.run(`INSERT INTO products VALUES (?,?,?,?,?)`, [id, name, price, type, stock], (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Produk ditambah" }));
});

app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
    console.log(`📧 SMTP Status: ${SMTP_CONFIGURED ? '✅ Aktif' : '⚠️ DEV MODE (OTP via console)'}`);
    console.log(`💳 Midtrans: ${MIDTRANS_IS_PRODUCTION ? '🔴 PRODUCTION' : '🟡 SANDBOX'} | Server Key: ${MIDTRANS_SERVER_KEY.substring(0, 15)}...`);
});
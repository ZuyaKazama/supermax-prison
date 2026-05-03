const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const midtransClient = require('midtrans-client');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

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
// 🔑 WARDEN WHITELIST — WAJIB: Hanya email di daftar ini yang bisa
//    login sebagai Warden. Tambahkan email via env WARDEN_EMAILS
//    atau langsung hardcode di bawah.
// =================================================================
const WARDEN_EMAILS = [
    // === HARDCODED WARDEN (tambah email di sini) ===
    'jamaldan390@gmail.com',

    // === DARI ENVIRONMENT VARIABLE ===
    ...(process.env.WARDEN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
];


// =================================================================
// 💳 KONFIGURASI MIDTRANS SANDBOX 
// =================================================================
let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
});

const db = new sqlite3.Database('./sipenjara.db', (err) => {
    if (err) console.error("Gagal koneksi ke SQLite:", err.message);
    else console.log("✅ Berhasil koneksi ke SQLite Database!");
});

// =================================================================
// 📋 BUAT TABEL GUARDS & OTP (jika belum ada)
// =================================================================
db.serialize(() => {
    // Tabel guard yang sudah terdaftar
    db.run(`CREATE TABLE IF NOT EXISTS guards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        picture TEXT,
        status TEXT DEFAULT 'active',
        registered_at TEXT DEFAULT (datetime('now','localtime'))
    )`);

    // Tabel OTP untuk verifikasi pendaftaran
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
});

// =================================================================
// 🎲 HELPER: Generate OTP 6 digit
// =================================================================
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// =================================================================
// 📧 HELPER: Kirim email OTP (dengan fallback dev mode)
// =================================================================
async function sendOTPEmail(email, otp, name) {
    // DEV MODE: Jika SMTP belum dikonfigurasi, log ke console saja
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
                    <p style="color: #5a6477; font-size: 12px; margin: 4px 0 0;">🚫 Jangan berikan kode ini kepada siapapun</p>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 16px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
                    <p style="margin: 0; color: #5a6477; font-size: 11px; letter-spacing: 2px;">KEMENKUMHAM RI • NUSA KAMBANGAN SUPERMAX</p>
                </div>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

// =================================================================
// 🔐 ENDPOINT: LOGIN WARDEN (Google langsung)
// =================================================================
app.post('/api/auth/warden', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await oauthClient.verifyIdToken({ idToken: credential });
        const payload = ticket.getPayload();

        const user = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            googleId: payload.sub,
            role: 'warden'
        };

        // ❗ STRICT CHECK: Tolak jika email TIDAK ada di whitelist
        if (!WARDEN_EMAILS.includes(payload.email.toLowerCase())) {
            console.log(`🔴 WARDEN DITOLAK: ${payload.email} — tidak ada di whitelist`);
            return res.status(403).json({
                success: false,
                error: `Akses ditolak. Email ${payload.email} tidak terdaftar sebagai Warden.`
            });
        }
        console.log(`✅ Warden Login: ${user.name} (${user.email})`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("🔴 Warden Auth Error:", error.message);
        res.status(401).json({ success: false, error: 'Token tidak valid' });
    }
});

// =================================================================
// 🔐 ENDPOINT: GUARD - Step 1: Google Auth + Kirim OTP
// =================================================================
app.post('/api/auth/guard/request-otp', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await oauthClient.verifyIdToken({ idToken: credential });
        const payload = ticket.getPayload();

        // Cek apakah guard sudah terdaftar
        const existingGuard = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM guards WHERE google_id = ? AND status = 'active'", [payload.sub], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existingGuard) {
            // Guard sudah terdaftar, langsung kirim OTP untuk login
            const otp = generateOTP();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

            // Hapus OTP lama untuk email ini
            db.run("DELETE FROM otp_codes WHERE email = ?", [payload.email]);

            // Simpan OTP baru
            db.run(
                "INSERT INTO otp_codes (email, code, google_id, name, picture, expires_at) VALUES (?,?,?,?,?,?)",
                [payload.email, otp, payload.sub, payload.name, payload.picture, expiresAt]
            );

            // Kirim email OTP
            try {
                const result = await sendOTPEmail(payload.email, otp, payload.name);
                console.log(`📧 OTP Login dikirim ke ${payload.email}`);
                return res.json({
                    success: true,
                    step: 'otp_sent',
                    isRegistered: true,
                    email: payload.email,
                    message: result?.devMode
                        ? `[DEV MODE] OTP: ${otp} — Cek console server`
                        : `OTP dikirim ke ${payload.email}`,
                    ...(result?.devMode ? { devOtp: otp } : {})
                });
            } catch (emailErr) {
                console.error("🔴 Gagal kirim email:", emailErr.message);
                return res.status(500).json({
                    success: false,
                    error: 'Gagal mengirim OTP ke email. Coba lagi nanti.'
                });
            }
        }

        // Guard belum terdaftar, kirim OTP untuk registrasi
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        db.run("DELETE FROM otp_codes WHERE email = ?", [payload.email]);
        db.run(
            "INSERT INTO otp_codes (email, code, google_id, name, picture, expires_at) VALUES (?,?,?,?,?,?)",
            [payload.email, otp, payload.sub, payload.name, payload.picture, expiresAt]
        );

        try {
            const result = await sendOTPEmail(payload.email, otp, payload.name);
            console.log(`📧 OTP Registrasi dikirim ke ${payload.email}`);
            res.json({
                success: true,
                step: 'otp_sent',
                isRegistered: false,
                email: payload.email,
                message: result?.devMode
                    ? `[DEV MODE] OTP: ${otp} — Cek console server`
                    : `OTP registrasi dikirim ke ${payload.email}`,
                ...(result?.devMode ? { devOtp: otp } : {})
            });
        } catch (emailErr) {
            console.error("🔴 Gagal kirim email:", emailErr.message);
            return res.status(500).json({
                success: false,
                error: 'Gagal mengirim OTP ke email. Coba lagi nanti.'
            });
        }

    } catch (error) {
        console.error("🔴 Guard Auth Error:", error.message);
        res.status(401).json({ success: false, error: 'Token Google tidak valid' });
    }
});

// =================================================================
// 🔐 ENDPOINT: GUARD - Step 2: Verifikasi OTP
// =================================================================
app.post('/api/auth/guard/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, error: 'Email dan OTP harus diisi' });
    }

    try {
        const otpRecord = await new Promise((resolve, reject) => {
            db.get(
                "SELECT * FROM otp_codes WHERE email = ? AND code = ? AND used = 0 ORDER BY created_at DESC LIMIT 1",
                [email, otp],
                (err, row) => { if (err) reject(err); else resolve(row); }
            );
        });

        if (!otpRecord) {
            return res.status(400).json({ success: false, error: 'Kode OTP salah atau sudah expired' });
        }

        // Cek expired
        if (new Date(otpRecord.expires_at) < new Date()) {
            return res.status(400).json({ success: false, error: 'Kode OTP sudah expired. Silakan minta ulang.' });
        }

        // Tandai OTP sudah digunakan
        db.run("UPDATE otp_codes SET used = 1 WHERE id = ?", [otpRecord.id]);

        // Cek apakah guard sudah terdaftar
        const existingGuard = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM guards WHERE google_id = ?", [otpRecord.google_id], (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (!existingGuard) {
            // Daftarkan guard baru
            db.run(
                "INSERT INTO guards (google_id, name, email, picture) VALUES (?,?,?,?)",
                [otpRecord.google_id, otpRecord.name, otpRecord.email, otpRecord.picture]
            );
            console.log(`✅ Guard BARU terdaftar: ${otpRecord.name} (${otpRecord.email})`);
        }

        const user = {
            name: otpRecord.name,
            email: otpRecord.email,
            picture: otpRecord.picture,
            googleId: otpRecord.google_id,
            role: 'guard'
        };

        console.log(`✅ Guard Login: ${user.name} (${user.email})`);
        res.json({ success: true, user });

    } catch (error) {
        console.error("🔴 OTP Verify Error:", error.message);
        res.status(500).json({ success: false, error: 'Gagal verifikasi OTP' });
    }
});

// =================================================================
// 🔐 ENDPOINT: Resend OTP
// =================================================================
app.post('/api/auth/guard/resend-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'Email harus diisi' });
    }

    // Ambil data dari OTP terakhir
    const lastOtp = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM otp_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1", [email], (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });

    if (!lastOtp) {
        return res.status(400).json({ success: false, error: 'Data tidak ditemukan. Ulangi dari awal.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    db.run("DELETE FROM otp_codes WHERE email = ?", [email]);
    db.run(
        "INSERT INTO otp_codes (email, code, google_id, name, picture, expires_at) VALUES (?,?,?,?,?,?)",
        [email, otp, lastOtp.google_id, lastOtp.name, lastOtp.picture, expiresAt]
    );

    try {
        const result = await sendOTPEmail(email, otp, lastOtp.name);
        console.log(`📧 OTP Resend ke ${email}`);
        res.json({
            success: true,
            message: result?.devMode
                ? `[DEV MODE] OTP Baru: ${otp} — Cek console server`
                : `OTP baru dikirim ke ${email}`,
            ...(result?.devMode ? { devOtp: otp } : {})
        });
    } catch (emailErr) {
        console.error("🔴 Gagal kirim email:", emailErr.message);
        res.status(500).json({ success: false, error: 'Gagal mengirim OTP. Coba lagi nanti.' });
    }
});

// =================================================================
// 📋 ENDPOINT: List guards (admin only)
// =================================================================
app.get('/api/guards', (req, res) => {
    db.all("SELECT id, name, email, status, registered_at FROM guards ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// =================================================================
// 🗑 ENDPOINT: Deactivate guard
// =================================================================
app.delete('/api/guards/:id', (req, res) => {
    db.run("UPDATE guards SET status = 'inactive' WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Guard dinonaktifkan" });
    });
});

// =================================================================
// ✅ ENDPOINT: Reactivate guard
// =================================================================
app.post('/api/guards/:id/activate', (req, res) => {
    db.run("UPDATE guards SET status = 'active' WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Guard diaktifkan kembali" });
    });
});

// =================================================================
// 🔐 ENDPOINT VERIFIKASI GOOGLE LOGIN (Legacy - backward compat)
// =================================================================
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await oauthClient.verifyIdToken({
            idToken: credential,
        });
        const payload = ticket.getPayload();

        console.log(`🔑 Token audience: ${payload.aud}`);
        console.log(`🔑 Expected client: ${FRONTEND_CLIENT_ID}`);

        const user = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            googleId: payload.sub,
        };
        console.log(`✅ Login Google: ${user.name} (${user.email})`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("🔴 Google Auth Error:", error.message);
        res.status(401).json({ success: false, error: 'Token tidak valid' });
    }
});

app.post('/api/midtrans-token', async (req, res) => {
    const { inmateId, total, inmateAlias } = req.body;
    const orderId = 'TRX-' + Math.floor(Math.random() * 90000 + 10000);

    let parameter = {
        "transaction_details": {
            "order_id": orderId,
            "gross_amount": Math.round(total)
        },
        "customer_details": {
            "first_name": inmateAlias || "Tahanan",
            "last_name": inmateId,
            "email": "lapas@supermax.com"
        }
    };

    try {
        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token, orderId: orderId });
    } catch (e) {
        console.error("🔴 ERROR DARI MIDTRANS:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// API STANDAR
app.get('/api/inmates', (req, res) => db.all("SELECT * FROM inmates ORDER BY id DESC", [], (err, rows) => res.json(rows)));
app.post('/api/inmates', (req, res) => {
    const { id, alias, tier, crimeType, cell, points, saldo, age, gender, entryDate, exitDate, job, wage, description } = req.body;
    db.run(`INSERT INTO inmates (id, alias, tier, crimeType, cell, points, saldo, age, gender, entryDate, exitDate, job, wage, description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, alias, tier, crimeType, cell, points, saldo, age, gender, entryDate, exitDate, job, wage, description], (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Berhasil" }));
});
app.delete('/api/inmates/:id', (req, res) => db.run("DELETE FROM inmates WHERE id = ?", [req.params.id], (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Terhapus" })));
app.post('/api/payroll', (req, res) => db.run("UPDATE inmates SET saldo = saldo + wage WHERE wage > 0", [], (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Gaji Dibagikan" })));
app.get('/api/products', (req, res) => db.all("SELECT * FROM products ORDER BY id DESC", [], (err, rows) => res.json(rows)));
app.post('/api/products', (req, res) => {
    const { id, name, price, type, stock } = req.body;
    db.run(`INSERT INTO products VALUES (?,?,?,?,?)`, [id, name, price, type, stock], (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Produk ditambah" }));
});
app.post('/api/checkout', (req, res) => {
    const { inmateId, total, cart } = req.body;
    db.run("UPDATE inmates SET saldo = saldo - ? WHERE id = ?", [total, inmateId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        cart.forEach(item => db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.qty, item.id]));
        res.json({ message: "Sukses" });
    });
});
app.post('/api/inmates/update-saldo', (req, res) => {
    const { id, amount } = req.body;
    db.run("UPDATE inmates SET saldo = saldo + ? WHERE id = ?", [amount, id], (err) => err ? res.status(500).json({ error: err.message }) : res.json({ message: "Sukses" }));
});

app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server Gabungan berjalan di port ${PORT}`);
    console.log(`🔐 Warden Auth: Google Cloud Console (OAuth test users)`);
    console.log(`📧 SMTP Status: ${SMTP_CONFIGURED ? '✅ Aktif' : '⚠️ DEV MODE (OTP via console)'}`);
});
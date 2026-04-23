const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const midtransClient = require('midtrans-client');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

// =================================================================
// 🔐 KONFIGURASI GOOGLE OAUTH
// =================================================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
// 🔐 ENDPOINT VERIFIKASI GOOGLE LOGIN
// =================================================================
app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await oauthClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
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
app.listen(PORT, () => console.log(`🚀 Server Gabungan berjalan di port ${PORT}`));
import React, { useState, useEffect } from 'react';
import './App.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { this.setState({ errorInfo }); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', background: '#2b0000', color: '#ffaaaa', height: '100vh', fontFamily: 'monospace', zIndex: 99999, position: 'relative' }}>
                    <h1 style={{ color: '#ff4444', fontSize: '3rem' }}>🚨 SISTEM CRASH (FATAL ERROR) 🚨</h1>
                    <p style={{ fontSize: '1.2rem', color: 'white' }}>Tolong screenshot layar ini dan kirim ke gue, Bos!</p>
                    <hr style={{ borderColor: '#550000', margin: '20px 0' }} />
                    <h2 style={{ color: 'white' }}>Pesan Error:</h2>
                    <h3 style={{ color: '#ffcc00' }}>{this.state.error && this.state.error.toString()}</h3>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '30px', padding: '15px 30px', background: '#ff4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>REBOOT SISTEM</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const formatRp = (num) => isNaN(Number(num)) ? '0' : Number(num).toLocaleString('id-ID');

const getThreatLevel = (points) => {
    const pts = Number(points) || 0;
    if (pts >= 100) return { label: 'EXTREME', class: 'dl-extreme', restrictLuxury: true, creditLimit: 0 };
    if (pts >= 50) return { label: 'HIGH', class: 'dl-high', restrictLuxury: false, creditLimit: 50000 };
    if (pts >= 20) return { label: 'MEDIUM', class: 'dl-medium', restrictLuxury: false, creditLimit: 100000 };
    return { label: 'LOW', class: 'dl-low', restrictLuxury: false, creditLimit: 200000 };
};

const MaleAvatar = () => (
    <svg width="160" height="180" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg" style={{ border: '3px solid black', background: '#eee' }}>
        <rect x="0" y="0" width="160" height="180" fill="#e0e0e0" />
        <path d="M 20 180 Q 20 120 80 120 Q 140 120 140 180" fill="#e67e22" stroke="black" strokeWidth="3" />
        <circle cx="80" cy="70" r="35" fill="#f5cba7" stroke="black" strokeWidth="3" />
        <text x="80" y="85" fontSize="40" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" fill="black">?</text>
    </svg>
);

const FemaleAvatar = () => (
    <svg width="160" height="180" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg" style={{ border: '3px solid black', background: '#eee' }}>
        <rect x="0" y="0" width="160" height="180" fill="#e0e0e0" />
        <path d="M 35 70 C 25 120 25 160 35 170 C 45 170 50 120 50 90 C 110 90 115 170 125 170 C 135 160 135 120 125 70 Z" fill="#2c3e50" />
        <path d="M 30 180 Q 30 130 80 130 Q 130 130 130 180" fill="#e67e22" stroke="black" strokeWidth="3" />
        <circle cx="80" cy="70" r="32" fill="#f5cba7" stroke="black" strokeWidth="3" />
        <path d="M 45 65 Q 80 35 115 65 Q 115 40 80 35 Q 45 40 45 65" fill="#2c3e50" />
        <text x="80" y="85" fontSize="35" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" fill="black">?</text>
    </svg>
);

const GOOGLE_CLIENT_ID = '872620897918-8ijpo28bm92f1fq8v5i34ip74dme1oa1.apps.googleusercontent.com';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null); // { name, email, picture }
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [inmates, setInmates] = useState([]);
    const [products, setProducts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [transports, setTransports] = useState([]);
    const [notifications, setNotifications] = useState([{ id: 1, time: new Date().toLocaleTimeString(), msg: 'SISTEM ONLINE & TERKONEKSI DATABASE', type: 'info' }]);
    const [activePrint, setActivePrint] = useState(null);
    const [printType, setPrintType] = useState('dossier');
    const [clock, setClock] = useState('');

    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [isProdModalOpen, setIsProdModalOpen] = useState(false);

    const [selectedInmateId, setSelectedInmateId] = useState('');
    const [cart, setCart] = useState([]);
    const [loanAmount, setLoanAmount] = useState('');

    const [regName, setRegName] = useState('');
    const [regAlias, setRegAlias] = useState('');
    const [regCrime, setRegCrime] = useState('Sindikat Narkoba');
    const [regThreat, setRegThreat] = useState('🔴 EXTREME');
    const [regSentenceType, setRegSentenceType] = useState('Angka');
    const [regSentenceYears, setRegSentenceYears] = useState('');
    const [regBlock, setRegBlock] = useState('BLOK-A (Max)');
    const [regAge, setRegAge] = useState('');
    const [regGender, setRegGender] = useState('L');
    const [regJob, setRegJob] = useState('Tidak Ada');
    const [regDesc, setRegDesc] = useState('');

    const [prodName, setProdName] = useState('');
    const [prodPrice, setProdPrice] = useState('');
    const [prodStock, setProdStock] = useState('');
    const [prodType, setProdType] = useState('general');

    const fetchData = async () => {
        try {
            const resInm = await fetch('/api/inmates');
            if (resInm.ok) setInmates(await resInm.json());
            const resProd = await fetch('/api/products');
            if (resProd.ok) setProducts(await resProd.json());
        } catch (err) { sendNotif('Koneksi Backend Terputus!', 'error'); }
    };

    // Google Sign-In callback
    const handleGoogleCallback = async (response) => {
        setIsLoggingIn(true);
        setLoginError('');
        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                setIsLoggedIn(true);
            } else {
                setLoginError('Autentikasi gagal. Coba lagi.');
            }
        } catch (err) {
            setLoginError('Tidak bisa menghubungi server. Pastikan backend jalan!');
        }
        setIsLoggingIn(false);
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchData();

            // ========================================================
            // INJEKSI SCRIPT JS MIDTRANS (Otomatis masuk ke HTML)
            // ========================================================
            const script = document.createElement('script');
            script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
            script.setAttribute('data-client-key', 'Mid-client-YAwDc1cL-NWUpMAY');
            script.async = true;
            document.body.appendChild(script);

            return () => {
                document.body.removeChild(script);
            }
        }

        // Load Google Identity Services script on login page
        const gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        gsiScript.defer = true;
        gsiScript.onload = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback,
                });
                window.google.accounts.id.renderButton(
                    document.getElementById('google-signin-btn'),
                    {
                        theme: 'filled_black',
                        size: 'large',
                        shape: 'pill',
                        text: 'signin_with',
                        width: 300,
                    }
                );
            }
        };
        document.body.appendChild(gsiScript);

        const timer = setInterval(() => setClock(new Date().toLocaleTimeString('id-ID')), 1000);
        return () => {
            clearInterval(timer);
            if (document.body.contains(gsiScript)) document.body.removeChild(gsiScript);
        };
    }, [isLoggedIn]);

    const handleLogout = () => {
        setIsLoggedIn(false);
        setUser(null);
        if (window.google) {
            window.google.accounts.id.disableAutoSelect();
        }
    };
    const sendNotif = (msg, type = 'info') => setNotifications(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 8));
    const handlePrint = (data, type) => { setActivePrint(data); setPrintType(type); setTimeout(() => window.print(), 300); };

    const handleRegister = async () => {
        if (!regAlias || !regAge || !regDesc) return alert("Lengkapi Alias, Umur, dan Deskripsi!");
        if (regSentenceType === 'Angka' && !regSentenceYears) return alert("Isi Lama Tahun Hukuman!");

        let wage = 0;
        if (regJob === 'Tukang Sapu') wage = 15000;
        if (regJob === 'Pekerja Pabrik') wage = 25000;
        if (regJob === 'Admin Perpus') wage = 30000;
        if (regJob === 'Koki Dapur') wage = 45000;

        let points = 10, tier = 'Trusty';
        if ((regThreat || '').includes('EXTREME')) { points = 150; tier = 'High-Risk'; }
        else if ((regThreat || '').includes('HIGH')) { points = 80; tier = 'High-Risk'; }
        else if ((regThreat || '').includes('MEDIUM')) { points = 40; tier = 'Reguler'; }

        let exitDate = '';
        if (regSentenceType === 'Mati') exitDate = 'Hukuman Mati';
        else if (regSentenceType === 'Seumur Hidup') exitDate = 'Seumur Hidup';
        else exitDate = `Tahun ${new Date().getFullYear() + Number(regSentenceYears)}`;

        const newInmate = {
            id: 'NXP-' + Math.floor(Math.random() * 90000 + 10000),
            alias: regAlias, tier, crimeType: regCrime, cell: regBlock, points, saldo: 0,
            age: Number(regAge), gender: regGender, entryDate: new Date().toLocaleDateString('id-ID'),
            exitDate, job: regJob, wage, description: regDesc
        };

        try {
            const res = await fetch('/api/inmates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newInmate) });
            if (res.ok) { setIsRegModalOpen(false); sendNotif(`REGISTRASI: Napi ${regAlias} masuk database!`, 'outgoing'); fetchData(); }
        } catch (err) { alert("Gagal koneksi!"); }
    };

    const handleDelete = async (id, alias) => {
        if (window.confirm(`⚠ YAKIN HAPUS ${alias}?`)) {
            try {
                const res = await fetch(`/api/inmates/${id}`, { method: 'DELETE' });
                if (res.ok) { setInmates((inmates || []).filter(i => i.id !== id)); sendNotif(`SISTEM: Napi ${alias} terhapus.`, 'error'); }
            } catch (err) { alert("Gagal menghapus!"); }
        }
    };

    const handleAddProduct = async () => {
        if (!prodName || !prodPrice || !prodStock) return alert("Lengkapi data barang!");
        const newProd = { id: 'P' + Math.floor(Math.random() * 9000 + 1000), name: prodName, price: Number(prodPrice), type: prodType, stock: Number(prodStock) };
        try {
            const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProd) });
            if (res.ok) { setIsProdModalOpen(false); setProducts([newProd, ...(products || [])]); sendNotif(`GUDANG: Barang ditambah.`, 'green'); }
        } catch (err) { alert("Gagal menambah barang!"); }
    };

    const distributeSHU = async () => {
        try {
            const res = await fetch('/api/payroll', { method: 'POST' });
            if (res.ok) {
                setInmates((inmates || []).map(i => ({ ...i, saldo: (i.saldo || 0) + (i.wage || 0) })));
                sendNotif('PAYROLL: Gaji Dibagikan!', 'outgoing'); alert("Gaji sukses dibagikan!");
            }
        } catch (err) { alert("Gagal membagikan gaji!"); }
    };

    const addToCart = (productId) => {
        if (!selectedInmateId) return alert("Pilih Napi dulu!");
        const product = (products || []).find(p => p.id === productId);
        const inmate = (inmates || []).find(i => i.id === selectedInmateId);
        if (!product || !inmate) return;

        if (getThreatLevel(inmate.points).restrictLuxury && product.type === 'luxury') return alert("DITOLAK: Barang Mewah dilarang untuk EXTREME!");

        const existing = (cart || []).find(item => item.id === productId);
        if (existing) {
            if (existing.qty + 1 > product.stock) return alert("Stok tidak cukup!");
            setCart((cart || []).map(c => c.id === productId ? { ...c, qty: c.qty + 1 } : c));
        } else setCart([...(cart || []), { ...product, qty: 1 }]);
    };

    const removeFromCart = (productId) => setCart((cart || []).filter(item => item.id !== productId));

    const subtotal = (cart || []).reduce((a, b) => a + ((b.price || 0) * (b.qty || 0)), 0);
    const tax = subtotal * 0.11;
    const grandTotal = subtotal + tax;

    // =======================================================
    // SISTEM PEMBAYARAN MIDTRANS SNAP
    // =======================================================
    const triggerMidtransPayment = async () => {
        const inmate = (inmates || []).find(i => i.id === selectedInmateId);
        if (!inmate) return alert("Pilih Napi pembeli!");
        if ((inmate.saldo || 0) + getThreatLevel(inmate.points).creditLimit < grandTotal) return alert("OVERLIMIT: Saldo Napi kurang!");

        try {
            // 1. Minta Token ke Backend kita
            const response = await fetch('/api/midtrans-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inmateId: inmate.id,
                    inmateAlias: inmate.alias,
                    total: grandTotal,
                    cart: cart
                })
            });
            const data = await response.json();

            // 2. Kalau backend berhasil kasih Token, panggil pop-up Snap JS
            if (data.token) {
                window.snap.pay(data.token, {
                    onSuccess: async function (result) {
                        // Jika bayar sukses, kita potong saldo dan stok di DB kita
                        await fetch('/api/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ inmateId: selectedInmateId, total: grandTotal, cart })
                        });
                        setTransactions([{ id: data.orderId, date: new Date().toLocaleString(), inmateId: selectedInmateId, items: [...cart], total: grandTotal, status: 'PAID (MIDTRANS)' }, ...transactions]);
                        setCart([]);
                        sendNotif(`MIDTRANS: Trx ${data.orderId} Berhasil.`, 'green');
                        fetchData();
                    },
                    onPending: function (result) { alert("Menunggu konfirmasi pembayaran..."); },
                    onError: function (result) { alert("Pembayaran Midtrans Gagal!"); },
                    onClose: function () { alert("Anda menutup pop-up sebelum menyelesaikan pembayaran."); }
                });
            } else {
                alert("Gagal mendapatkan Token dari Midtrans. Cek Server/Client Key lo!");
            }
        } catch (error) {
            alert("Error Gateway: Pastikan server backend lo jalan!");
        }
    };

    const submitLoan = () => {
        if (!selectedInmateId || !loanAmount) return alert("Pilih napi dan nominal!");
        const trxId = 'LOAN-' + Math.floor(Math.random() * 90000);
        setTransactions([{ id: trxId, date: new Date().toLocaleString(), inmateId: selectedInmateId, items: [{ name: 'Pinjaman Koperasi' }], total: Number(loanAmount) || 0, status: 'QUEUE (PENDING)', type: 'LOAN' }, ...(transactions || [])]);
        sendNotif(`BANK: Pengajuan masuk ke Warden.`, 'incoming');
        setLoanAmount('');
    };

    const approveLoan = async (trx) => {
        const res = await fetch('/api/inmates/update-saldo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: trx.inmateId, amount: trx.total }) });
        if (res.ok) {
            setTransactions((transactions || []).map(t => t.id === trx.id ? { ...t, status: 'APPROVED' } : t));
            setInmates((inmates || []).map(i => i.id === trx.inmateId ? { ...i, saldo: (i.saldo || 0) + (trx.total || 0) } : i));
            sendNotif(`WARDEN: Pinjaman ${trx.id} APPROVED!`, 'outgoing');
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="login-screen">
                <div className="prison-bars"></div>
                <div className="login-bg-grid"></div>
                <div className="login-box">
                    <div className="logo-icon" style={{ margin: '0 auto 16px', width: '64px', height: '64px', background: 'linear-gradient(135deg, #e74c3c, #f39c12)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(231,76,60,0.3)' }}>
                        <svg viewBox="0 0 60 60" fill="none" style={{ width: '36px', height: '36px' }}>
                            <rect x="5" y="10" width="50" height="40" rx="4" fill="none" stroke="white" strokeWidth="2" />
                            <line x1="15" y1="10" x2="15" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                            <line x1="25" y1="10" x2="25" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                            <line x1="35" y1="10" x2="35" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                            <line x1="45" y1="10" x2="45" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                            <rect x="22" y="28" width="16" height="12" rx="2" fill="none" stroke="white" strokeWidth="1.5" />
                            <circle cx="30" cy="34" r="2" fill="white" />
                        </svg>
                    </div>
                    <h2>SIPENJARA</h2>
                    <p className="subtitle">SISTEM INFORMASI PEMASYARAKATAN</p>
                    <div className="google-login-section">
                        <div className="divider-line"><span>AUTENTIKASI GOOGLE</span></div>
                        <div id="google-signin-btn" className="google-btn-wrapper"></div>
                        {isLoggingIn && <p className="login-loading">⏳ Memverifikasi akun Google...</p>}
                        {loginError && <p className="login-error">🚫 {loginError}</p>}
                    </div>
                    <div className="login-version">v3.0 • KEMENKUMHAM RI</div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="prison-bars"></div>
            {/* Modal Registrasi & Modal Barang (SAMA PERSIS SPT SEBELUMNYA) */}
            <div className={`modal-overlay ${isRegModalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target.className.includes('modal-overlay')) setIsRegModalOpen(false) }}>
                <div className="modal-box" style={{ maxWidth: '650px' }}>
                    <div className="modal-header"><h3>🔒 Registrasi Narapidana Baru</h3><button className="modal-close" onClick={() => setIsRegModalOpen(false)}>✕</button></div>
                    <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                        <div className="form-row"><div className="form-group"><label>Nama Lengkap</label><input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Sesuai KTP..." /></div><div className="form-group"><label>Alias / Julukan</label><input type="text" value={regAlias} onChange={(e) => setRegAlias(e.target.value)} placeholder="Misal: El Kartel" /></div></div>
                        <div className="form-row"><div className="form-group"><label>Jenis Kelamin</label><select value={regGender} onChange={(e) => setRegGender(e.target.value)}><option value="L">Laki-Laki</option><option value="P">Perempuan</option></select></div><div className="form-group"><label>Umur (Tahun)</label><input type="number" value={regAge} onChange={(e) => setRegAge(e.target.value)} placeholder="Misal: 45" /></div></div>
                        <div className="form-row"><div className="form-group"><label>Jenis Kejahatan</label><select value={regCrime} onChange={(e) => setRegCrime(e.target.value)}><option>Korupsi Kelas Kakap</option><option>Sindikat Narkoba</option><option>Kejahatan Siber</option><option>Pembunuhan Berencana</option></select></div><div className="form-group"><label>Level Bahaya</label><select value={regThreat} onChange={(e) => setRegThreat(e.target.value)}><option>🔴 EXTREME</option><option>🟠 HIGH</option><option>🟡 MEDIUM</option><option>🟢 LOW</option></select></div></div>
                        <div className="form-row"><div className="form-group"><label>Tipe Hukuman</label><select value={regSentenceType} onChange={(e) => setRegSentenceType(e.target.value)}><option value="Angka">Durasi Waktu (Tahun)</option><option value="Seumur Hidup">Seumur Hidup</option><option value="Mati">Hukuman Mati</option></select></div>{regSentenceType === 'Angka' ? (<div className="form-group"><label>Lama (Tahun)</label><input type="number" value={regSentenceYears} onChange={(e) => setRegSentenceYears(e.target.value)} placeholder="Misal: 27" /></div>) : (<div className="form-group"><label>Lama (Tahun)</label><input type="text" disabled value="KUNCI SISTEM" style={{ backgroundColor: '#222' }} /></div>)}</div>
                        <div className="form-row"><div className="form-group"><label>Pekerjaan (Gaji/SHU)</label><select value={regJob} onChange={(e) => setRegJob(e.target.value)}><option value="Tidak Ada">Tidak Ada (Rp 0)</option><option value="Tukang Sapu">Tukang Sapu (Rp 15.000)</option><option value="Pekerja Pabrik">Pekerja Pabrik (Rp 25.000)</option><option value="Admin Perpus">Admin Perpus (Rp 30.000)</option><option value="Koki Dapur">Koki Dapur (Rp 45.000)</option></select></div><div className="form-group"><label>Blok Sel</label><select value={regBlock} onChange={(e) => setRegBlock(e.target.value)}><option>BLOK-A (Max)</option><option>BLOK-B (Reguler)</option><option>BLOK-S (Isolasi)</option></select></div></div>
                        <div className="form-group"><label>Deskripsi & Profil Kriminal</label><input type="text" value={regDesc} onChange={(e) => setRegDesc(e.target.value)} placeholder="Tulis catatan kejahatan..." /></div>
                        <button className="btn-primary" onClick={handleRegister}>⛓️ SIMPAN KE DATABASE</button>
                    </div>
                </div>
            </div>

            <div className={`modal-overlay ${isProdModalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target.className.includes('modal-overlay')) setIsProdModalOpen(false) }}>
                <div className="modal-box"><div className="modal-header"><h3>📦 Tambah Item Gudang</h3><button className="modal-close" onClick={() => setIsProdModalOpen(false)}>✕</button></div><div className="modal-body"><div className="form-group"><label>Nama Barang</label><input type="text" value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="Contoh: Kopi Hitam" /></div><div className="form-row"><div className="form-group"><label>Harga (Rp)</label><input type="number" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} /></div><div className="form-group"><label>Stok Awal</label><input type="number" value={prodStock} onChange={(e) => setProdStock(e.target.value)} /></div></div><div className="form-group"><label>Kategori</label><select value={prodType} onChange={(e) => setProdType(e.target.value)}><option value="general">Barang Umum</option><option value="luxury">Barang Mewah (Luxury)</option></select></div><button className="btn-primary" onClick={handleAddProduct}>+ SIMPAN BARANG</button></div></div>
            </div>

            <header>
                <div className="logo-area">
                    <div className="logo-icon">
                        <svg viewBox="0 0 60 60" fill="none" style={{ width: '28px', height: '28px' }}>
                            <rect x="5" y="10" width="50" height="40" rx="4" fill="none" stroke="white" strokeWidth="2" />
                            <line x1="15" y1="10" x2="15" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                            <line x1="25" y1="10" x2="25" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                            <line x1="35" y1="10" x2="35" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                            <line x1="45" y1="10" x2="45" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                            <rect x="22" y="28" width="16" height="12" rx="2" fill="none" stroke="white" strokeWidth="1.5" />
                            <circle cx="30" cy="34" r="2" fill="white" />
                        </svg>
                    </div>
                    <div className="logo-text"><h1>SIPENJARA</h1><p>Sistem Informasi Pemasyarakatan</p></div>
                </div>
                <div className="status-bar">
                    <div className="status-item"><div className="num">{(inmates || []).length}</div><div className="label">Total Napi</div></div>
                    <div className="alert-level"><div className="num">⚠ II</div><div className="label">Alert Level</div></div>
                    {user && (
                        <div className="user-profile-badge">
                            <img src={user.picture} alt="" className="user-avatar" referrerPolicy="no-referrer" />
                            <div className="user-info">
                                <span className="user-name">{user.name}</span>
                                <span className="user-email">{user.email}</span>
                            </div>
                        </div>
                    )}
                    <button className="action-btn" onClick={() => setIsRegModalOpen(true)} style={{ padding: '10px 18px', fontSize: '0.7rem', borderColor: 'var(--rust)', color: 'var(--rust)', borderRadius: '8px' }}>+ NAPI BARU</button>
                </div>
            </header>

            <nav>
                <a className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>📊 DASHBOARD</a>
                {/* Menu lain disembunyikan untuk sementara */}
                {/* <a onClick={() => setIsRegModalOpen(true)}>📝 REGISTRASI</a> */}
                {/* <a className={activeTab === 'warden' ? 'active' : ''} onClick={() => setActiveTab('warden')}>🔐 WARDEN</a> */}
                {/* <a className={activeTab === 'pinjaman' ? 'active' : ''} onClick={() => setActiveTab('pinjaman')}>💰 PINJAMAN</a> */}
                {/* <a className={activeTab === 'kantin' ? 'active' : ''} onClick={() => setActiveTab('kantin')}>🛒 KANTIN</a> */}
                {/* <a className={activeTab === 'payroll' ? 'active' : ''} onClick={() => setActiveTab('payroll')}>💵 PAYROLL</a> */}
                {/* <a className={activeTab === 'riwayat' ? 'active' : ''} onClick={() => setActiveTab('riwayat')}>📋 LAPORAN</a> */}
                <a style={{ color: '#e74c3c', marginLeft: 'auto', cursor: 'pointer' }} onClick={handleLogout}>⏏ LOGOUT</a>
            </nav>

            <div className="container">
                {activeTab === 'dashboard' && (
                    <>
                        {user && (
                            <div className="welcome-section">
                                <div className="welcome-left">
                                    <img src={user.picture} alt="" className="welcome-avatar" referrerPolicy="no-referrer" />
                                    <div className="welcome-text">
                                        <h2>Selamat Datang, {user.name.split(' ')[0]}!</h2>
                                        <p>{user.email} • Operator Lapas</p>
                                    </div>
                                </div>
                                <div className="welcome-right">
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="welcome-clock">{clock || '--:--:--'}</div>
                                        <div className="welcome-date">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="stats-row">
                            <div className="stat-box red"><span className="stat-icon">🚨</span><div className="big-num">{(inmates || []).filter(i => i?.tier === 'High-Risk').length}</div><div className="stat-label">Kelas Kakap</div></div>
                            <div className="stat-box orange"><span className="stat-icon">🔒</span><div className="big-num">{(inmates || []).filter(i => (i?.cell || '').includes('Isolasi')).length}</div><div className="stat-label">Di Isolasi</div></div>
                            <div className="stat-box yellow"><span className="stat-icon">⏳</span><div className="big-num">{(transactions || []).filter(t => (t?.status || '').includes('QUEUE')).length}</div><div className="stat-label">Trx Pending</div></div>
                            <div className="stat-box green"><span className="stat-icon">✅</span><div className="big-num">{(inmates || []).filter(i => i?.tier === 'Trusty').length}</div><div className="stat-label">Trusty Napi</div></div>
                            <div className="stat-box gray"><span className="stat-icon">🗄️</span><div className="big-num">DB</div><div className="stat-label">SQLite Aktif</div></div>
                        </div>

                        {/* === CATATAN WARDEN — ANTI KORUPSI === */}
                        <div className="warden-notes">
                            <div className="warden-notes-header">
                                <span className="warden-notes-icon">📜</span>
                                <div>
                                    <h3>Catatan & Pedoman Warden</h3>
                                    <p>Panduan integritas dan pencegahan korupsi di lingkungan Lapas</p>
                                </div>
                            </div>
                            <div className="warden-notes-grid">
                                <div className="note-card note-red">
                                    <div className="note-num">01</div>
                                    <h4>🚫 Anti-Gratifikasi</h4>
                                    <p>Dilarang keras menerima hadiah, uang, atau bentuk gratifikasi apapun dari narapidana, keluarga napi, maupun pihak ketiga. Segala bentuk suap wajib dilaporkan ke Inspektorat.</p>
                                </div>
                                <div className="note-card note-orange">
                                    <div className="note-num">02</div>
                                    <h4>📊 Transparansi Keuangan</h4>
                                    <p>Seluruh transaksi keuangan (kantin, payroll, pinjaman koperasi) harus tercatat di sistem. Manipulasi data saldo atau transaksi merupakan pelanggaran berat.</p>
                                </div>
                                <div className="note-card note-yellow">
                                    <div className="note-num">03</div>
                                    <h4>⚖️ Hak Narapidana</h4>
                                    <p>Setiap narapidana berhak mendapat perlakuan manusiawi sesuai UU No. 22 Tahun 2022. Pelanggaran HAM akan diproses secara hukum tanpa toleransi.</p>
                                </div>
                                <div className="note-card note-green">
                                    <div className="note-num">04</div>
                                    <h4>📝 Dokumentasi & Audit</h4>
                                    <p>Semua kegiatan wajib terdokumentasi. Audit internal dilakukan setiap bulan dan audit eksternal setiap semester. Data tidak boleh dihapus tanpa otorisasi.</p>
                                </div>
                                <div className="note-card note-blue">
                                    <div className="note-num">05</div>
                                    <h4>🔍 Pengawasan Berlapis</h4>
                                    <p>Sistem pengawasan menggunakan prinsip four-eyes: setiap keputusan penting memerlukan persetujuan minimal 2 pejabat berwenang untuk mencegah penyalahgunaan.</p>
                                </div>
                                <div className="note-card note-purple">
                                    <div className="note-num">06</div>
                                    <h4>🛡️ Whistleblower Protection</h4>
                                    <p>Petugas yang melaporkan tindak korupsi dijamin perlindungannya sesuai UU Perlindungan Saksi. Laporan bisa dilakukan secara anonim melalui kanal resmi.</p>
                                </div>
                            </div>
                        </div>

                        <div className="section-header"><h2>DATABASE NARAPIDANA</h2><span className="badge">{(inmates || []).length} TERDAFTAR</span></div>
                        <div className="two-col">
                            <div className="scroll-panel" style={{ border: 'none', padding: 0, backgroundColor: 'transparent' }}>
                                {(!inmates || inmates.length === 0) ? (
                                    <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-dim)', border: '1px dashed #444' }}><h2>DATABASE KOSONG</h2><p>Klik tombol "+ NAPI BARU" di atas.</p></div>
                                ) : (
                                    <div className="inmate-grid">
                                        {(inmates || []).map((i, index) => {
                                            const threat = getThreatLevel(i?.points);
                                            const barWidth = (i?.points || 0) > 100 ? '90%' : ((i?.points || 0) > 50 ? '50%' : '20%');
                                            const faceEmoji = i?.gender === 'P' ? '👩🏻' : '🧔🏻';
                                            return (
                                                <div className="inmate-card" key={i?.id || index} style={{ animationDelay: `${(index % 10) * 0.05}s` }}>
                                                    <div className="card-header"><span className="inmate-id">{i?.id}</span><span className={`danger-level ${threat.class}`}>{threat.label}</span></div>
                                                    <div className="card-body">
                                                        <div className="mugshot" data-num={(i?.id || '').split('-')[1]}>{faceEmoji}</div>
                                                        <div className="inmate-info">
                                                            <h3>{i?.alias}</h3><div className="crime-tag">{i?.crimeType}</div><div className="sentence-bar"><div className="sentence-fill" style={{ width: barWidth }}></div></div><div className="sentence-text">Hukuman: {i?.exitDate}</div>
                                                            <div style={{ color: 'var(--green-go)', fontSize: '0.7rem', marginTop: '3px', fontFamily: 'monospace' }}>Saldo: Rp {formatRp(i?.saldo)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="card-footer"><span className="cell-badge">📍 {i?.cell}</span><div><button className="action-btn" onClick={() => handlePrint(i, 'dossier')} style={{ marginRight: '5px' }}>🖨️ DOSSIER</button><button className="action-btn" onClick={() => handleDelete(i?.id, i?.alias)} style={{ color: 'var(--rust)', borderColor: 'var(--rust)' }}>🗑 HAPUS</button></div></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="panel" style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
                                <div className="panel-title"><div className="blink"></div> LOG KEJADIAN REAL-TIME</div>
                                <div className="event-list">
                                    {(notifications || []).map(n => {
                                        let evClass = 'ev-yellow'; if (n?.type === 'error') evClass = 'ev-red'; if (n?.type === 'incoming') evClass = 'ev-orange'; if (n?.type === 'outgoing' || n?.type === 'green') evClass = 'ev-green';
                                        return (<div key={n?.id} className={`event-item ${evClass}`}><div className="event-time">{n?.time}</div><div className="event-text">{n?.msg}</div></div>);
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'payroll' && (
                    <>
                        <div className="section-header"><h2>SHU & PAYROLL NAPI</h2><span className="badge">DISTRIBUSI MINGGUAN</span></div>
                        <div className="kantin-grid">
                            <div className="panel"><div className="panel-title">💰 EKSEKUSI PEMBAYARAN</div><p style={{ fontSize: '0.85rem', marginBottom: '20px' }}>Tekan tombol di bawah untuk mentransfer upah kerja ke saldo seluruh narapidana.</p><button className="btn-primary" onClick={distributeSHU} style={{ background: 'var(--green-go)' }}>KIRIM GAJI SEKARANG</button></div>
                            <div className="data-table-container">
                                <table className="data-table">
                                    <thead><tr><th>ID</th><th>Alias</th><th>Pekerjaan</th><th>Upah (Rp)</th></tr></thead>
                                    <tbody>{(inmates || []).filter(x => (x?.wage || 0) > 0).map(i => <tr key={i?.id}><td>{i?.id}</td><td>{i?.alias}</td><td>{i?.job}</td><td style={{ color: 'var(--green-go)' }}>+ {formatRp(i?.wage)}</td></tr>)}</tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'pinjaman' && (
                    <>
                        <div className="section-header"><h2>PENGAJUAN PINJAMAN KREDIT KOPERASI</h2></div>
                        <div className="kantin-grid">
                            <div className="panel">
                                <div className="panel-title">💰 FORMULIR KREDIT PINJAMAN</div>
                                <div className="form-group"><label>Pilih Narapidana (Pemohon)</label><select onChange={(e) => setSelectedInmateId(e.target.value)} value={selectedInmateId}><option value="">-- Pilih Napi --</option>{(inmates || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.alias} (Sisa Saldo: Rp{formatRp(i?.saldo)})</option>)}</select></div>
                                <div className="form-group"><label>Nominal Pinjaman yang Diajukan (Rp)</label><input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="Contoh: 500000" /></div>
                                <button className="btn-primary" onClick={submitLoan}>Ajukan Pinjaman ke Warden</button>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB KANTIN (DENGAN MIDTRANS SNAP) */}
                {activeTab === 'kantin' && (
                    <>
                        <div className="section-header"><h2>KANTIN & RETAIL</h2><span className="badge">MIDTRANS GATEWAY AKTIF</span></div>
                        <div className="kantin-grid">
                            <div className="panel">
                                <div className="panel-title" style={{ justifyContent: 'space-between' }}><span>PILIH NAPI & BARANG</span><button className="action-btn" onClick={() => setIsProdModalOpen(true)}>+ TAMBAH BARANG</button></div>
                                <div className="form-group"><select onChange={(e) => setSelectedInmateId(e.target.value)} value={selectedInmateId}><option value="">-- Scan ID Napi --</option>{(inmates || []).map(i => <option key={i?.id} value={i?.id}>{i?.id} - {i?.alias} (Saldo: Rp{formatRp(i?.saldo)})</option>)}</select></div>
                                <div className="data-table-container" style={{ height: '350px' }}>
                                    <table className="data-table">
                                        <thead><tr><th>Nama Barang</th><th>Harga</th><th>Aksi</th></tr></thead>
                                        <tbody>
                                            {(products || []).map(p => (
                                                <tr key={p?.id}><td>{p?.name} <br /><span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Sisa: {p?.stock || 0}</span></td><td>Rp {formatRp(p?.price)}</td><td><button className="action-btn" onClick={() => addToCart(p?.id)}>+ ADD</button></td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="panel">
                                <div className="panel-title">KERANJANG BELANJA</div>
                                <table className="data-table" style={{ marginBottom: '20px' }}>
                                    <thead><tr><th>Item</th><th>Qty</th><th>Subtotal</th><th>Aksi</th></tr></thead>
                                    <tbody>
                                        {(cart || []).map(c => (
                                            <tr key={c?.id}>
                                                <td>{c?.name}</td><td>x{c?.qty}</td><td>Rp {formatRp((c?.price || 0) * (c?.qty || 0))}</td>
                                                <td><button className="action-btn" onClick={() => removeFromCart(c?.id)} style={{ color: 'var(--rust)', borderColor: 'var(--rust)' }}>✕ BATAL</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ borderTop: '1px solid #444', paddingTop: '10px', marginBottom: '20px' }}>
                                    <h2 style={{ color: 'var(--orange)' }}>TOTAL: Rp {formatRp(grandTotal)}</h2>
                                </div>
                                <button className="btn-primary" onClick={triggerMidtransPayment} disabled={!cart || cart.length === 0} style={{ background: 'var(--green-go)' }}>💳 BAYAR VIA MIDTRANS</button>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'warden' && (
                    <>
                        <div className="section-header"><h2>WARDEN APPROVAL</h2><span className="badge">OTORISASI SIPIR</span></div>
                        <div className="data-table-container">
                            <table className="data-table">
                                <thead><tr><th>Tipe Req</th><th>ID Req</th><th>Pemohon</th><th>Detail</th><th>Aksi</th></tr></thead>
                                <tbody>
                                    {(transactions || []).filter(t => t?.status === 'QUEUE (PENDING)').map(t => (
                                        <tr key={t?.id}>
                                            <td><span className={`status-pill ${(t?.type || '') === 'LOAN' ? 'pill-transfer' : 'pill-active'}`}>{(t?.type || '') === 'LOAN' ? '💳 PINJAMAN' : '🛒 KANTIN'}</span></td>
                                            <td>{t?.id}</td><td>{t?.inmateAlias}</td><td>Rp {formatRp(t?.total)}</td>
                                            <td><button className="btn-approve" onClick={() => approveLoan(t)}>APPROVE</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <footer>
                <div className="footer-left">SIPENJARA v3.0 &nbsp;|&nbsp; KEMENKUMHAM RI &nbsp;|&nbsp; {clock} WIB</div>
                <div className="footer-right"><a className="footer-link">Kebijakan Privasi</a><a className="footer-link">Kontak Admin</a></div>
            </footer>

            {activePrint && (
                <div className="print-container">
                    {printType === 'dossier' && (
                        <>
                            <div className="kop-surat"><h1>NUSA KAMBANGAN SUPERMAX</h1><p>Dossier Tahanan | DATABASE SQLITE</p></div>
                            <div className="profil-layout">{activePrint.gender === 'P' ? <FemaleAvatar /> : <MaleAvatar />}<div className="data-napi"><h2>{activePrint.id} - {activePrint.alias}</h2><p>Klasifikasi Kejahatan: {activePrint.crimeType}</p><p>Membership Tier: <strong>{activePrint.tier}</strong></p><p>Lokasi Sel: <strong>{activePrint.cell}</strong></p></div></div>
                            <table className="dossier-table">
                                <thead><tr><th colSpan="2">INFORMASI BIODATA SUBJEK</th></tr></thead>
                                <tbody>
                                    <tr><td style={{ width: '35%', fontWeight: 'bold' }}>Umur:</td><td>{activePrint.age} Tahun</td></tr>
                                    <tr><td style={{ fontWeight: 'bold' }}>Jenis Kelamin:</td><td>{activePrint.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                                    <tr><td style={{ fontWeight: 'bold' }}>Pekerjaan:</td><td>{activePrint.job}</td></tr>
                                    <tr><td style={{ fontWeight: 'bold' }}>Gaji Pekerjaan:</td><td>Rp {formatRp(activePrint.wage)}</td></tr>
                                    <tr><td style={{ fontWeight: 'bold' }}>Estimasi Bebas:</td><td>{activePrint.exitDate}</td></tr>
                                    <tr><td style={{ fontWeight: 'bold' }}>Saldo Terkini:</td><td><strong>Rp {formatRp(activePrint.saldo)}</strong></td></tr>
                                </tbody>
                            </table>
                            <div className="description-box"><h3>Catatan Kriminal:</h3><p>{activePrint.description}</p></div>
                            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end', color: 'black' }}><div style={{ textAlign: 'center', width: '300px' }}><p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p><p style={{ margin: '0 0 80px 0', fontWeight: 'bold', fontSize: '16px' }}>KEPALA LEMBAGA PEMASYARAKATAN</p><div style={{ borderBottom: '2px solid black', width: '100%', display: 'inline-block' }}></div><p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>NIP. 19800512 200501 1 004</p></div></div>
                        </>
                    )}
                    {printType === 'struk' && (
                        <div className="struk-pembelian">
                            <h3 style={{ textAlign: 'center' }}>KANTIN SUPERMAX - INVOICE</h3><p>ID: {activePrint.trxId} | {activePrint.date}</p><hr />
                            {(activePrint.cart || []).map(c => <div key={c?.id}>{c?.name} x{c?.qty} - Rp {formatRp((c?.price || 0) * (c?.qty || 0))}</div>)}<hr />
                            <p><strong>TOTAL BAYAR: Rp {formatRp(activePrint.grandTotal)}</strong></p>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

export default function AppWrapper() {
    return (
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
}
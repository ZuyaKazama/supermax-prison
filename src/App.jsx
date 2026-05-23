import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Kantin from './components/Kantin';
import Telepon from './components/Telepon';
import Deposit from './components/Deposit';
import Riwayat from './components/Riwayat';
import DataNapi from './components/DataNapi';

// ============================================================
// ERROR BOUNDARY
// ============================================================
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
                <div style={{ padding: '40px', background: '#1a0000', color: '#ffaaaa', height: '100vh', fontFamily: 'monospace', zIndex: 99999, position: 'relative' }}>
                    <h1 style={{ color: '#ff4444', fontSize: '2.5rem' }}>🚨 SISTEM CRASH (FATAL ERROR) 🚨</h1>
                    <p style={{ fontSize: '1.1rem', color: 'white', marginTop: '12px' }}>Screenshot layar ini dan kirim ke administrator sistem.</p>
                    <hr style={{ borderColor: '#550000', margin: '20px 0' }} />
                    <h2 style={{ color: 'white' }}>Pesan Error:</h2>
                    <h3 style={{ color: '#ffcc00', marginTop: '8px' }}>{this.state.error && this.state.error.toString()}</h3>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '30px', padding: '15px 30px', background: '#ff4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '8px' }}
                    >
                        REBOOT SISTEM
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ============================================================
// HELPERS
// ============================================================
const formatRp = (num) => isNaN(Number(num)) ? '0' : Number(num).toLocaleString('id-ID');

const getThreatLevel = (points) => {
    const pts = Number(points) || 0;
    if (pts >= 100) return { label: 'EXTREME', class: 'dl-extreme', restrictLuxury: true, creditLimit: 0 };
    if (pts >= 50) return { label: 'HIGH', class: 'dl-high', restrictLuxury: false, creditLimit: 50000 };
    if (pts >= 20) return { label: 'MEDIUM', class: 'dl-medium', restrictLuxury: false, creditLimit: 100000 };
    return { label: 'LOW', class: 'dl-low', restrictLuxury: false, creditLimit: 200000 };
};

// ============================================================
// AVATAR COMPONENTS
// ============================================================
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

// ============================================================
// CONFIG
// ============================================================
const GOOGLE_CLIENT_ID = '872620897918-8ijpo28bm92f1fq8v5i34ip74dme1oa1.apps.googleusercontent.com';

// Menu yang hanya bisa diakses Warden
const WARDEN_ONLY_TABS = []; // semua tab bisa dibuka Guard, tapi action-nya dibatasi
const WARDEN_ONLY_ACTIONS = ['delete_inmate', 'add_product', 'payroll', 'approve_loan'];

// ============================================================
// MAIN APP
// ============================================================
function App() {
    // --- AUTH STATE (restore dari localStorage jika ada) ---
    const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('sipenjara_user'));
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('sipenjara_user')); } catch { return null; }
    });
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginRole, setLoginRole] = useState(null);

    // --- OTP STATE ---
    const [otpStep, setOtpStep] = useState('idle'); // idle | otp_sent
    const [otpEmail, setOtpEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpCountdown, setOtpCountdown] = useState(0);
    const [otpMessage, setOtpMessage] = useState('');

    // --- APP STATE ---
    const [activeTab, setActiveTab] = useState('dashboard');
    const [inmates, setInmates] = useState([]);
    const [products, setProducts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [notifications, setNotifications] = useState([
        { id: 1, time: new Date().toLocaleTimeString(), msg: 'SISTEM ONLINE & TERKONEKSI DATABASE', type: 'info' }
    ]);
    const [activePrint, setActivePrint] = useState(null);
    const [printType, setPrintType] = useState('dossier');
    const [clock, setClock] = useState('');

    // --- MODAL STATE ---
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [isProdModalOpen, setIsProdModalOpen] = useState(false);

    // --- REGISTRASI FORM ---
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

    // --- PRODUK FORM ---
    const [prodName, setProdName] = useState('');
    const [prodPrice, setProdPrice] = useState('');
    const [prodStock, setProdStock] = useState('');
    const [prodType, setProdType] = useState('general');

    // --- KANTIN STATE (dihapus) ---


    // ============================================================
    // HELPERS
    // ============================================================
    const isWarden = user?.role === 'warden';
    const isGuard = user?.role === 'guard';

    const sendNotif = useCallback((msg, type = 'info') => {
        setNotifications(prev =>
            [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 8)
        );
    }, []);

    const canDo = (action) => {
        if (!user) return false;
        if (WARDEN_ONLY_ACTIONS.includes(action)) return isWarden;
        return true;
    };

    // ============================================================
    // DATA FETCHING
    // ============================================================
    const fetchData = async () => {
        try {
            const resInm = await fetch('/api/inmates');
            if (resInm.ok) setInmates(await resInm.json());
            const resProd = await fetch('/api/products');
            if (resProd.ok) setProducts(await resProd.json());
        } catch (err) {
            sendNotif('Koneksi Backend Terputus!', 'error');
        }
    };

    // ============================================================
    // AUTH — WARDEN (Google langsung)
    // ============================================================
    const handleWardenGoogleCallback = useCallback(async (response) => {
        setIsLoggingIn(true);
        setLoginError('');
        try {
            const res = await fetch('/api/auth/warden', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('sipenjara_user', JSON.stringify(data.user));
                setUser(data.user);
                setIsLoggedIn(true);
            } else {
                setLoginError(data.error || 'Autentikasi Warden gagal. Akun tidak terdaftar.');
            }
        } catch {
            setLoginError('Tidak bisa menghubungi server. Cek koneksi dan coba lagi.');
        }
        setIsLoggingIn(false);
    }, []);

    // ============================================================
    // AUTH — GUARD (Google + OTP)
    // ============================================================
    const handleGuardGoogleCallback = useCallback(async (response) => {
        setIsLoggingIn(true);
        setLoginError('');
        try {
            const res = await fetch('/api/auth/guard/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
            });
            const data = await res.json();
            if (data.success) {
                setOtpStep('otp_sent');
                setOtpEmail(data.email);
                setOtpMessage(data.message || (data.isRegistered ? 'OTP dikirim untuk login.' : 'OTP dikirim untuk registrasi akun baru.'));
                setOtpCountdown(300);
                if (data.devOtp) setOtpCode(data.devOtp);
            } else {
                setLoginError(data.error || 'Gagal mengirim OTP. Hubungi Warden.');
            }
        } catch {
            setLoginError('Tidak bisa menghubungi server.');
        }
        setIsLoggingIn(false);
    }, []);

    const handleVerifyOTP = async () => {
        if (!otpCode || otpCode.length !== 6) {
            setLoginError('Masukkan 6 digit kode OTP.');
            return;
        }
        setIsLoggingIn(true);
        setLoginError('');
        try {
            const res = await fetch('/api/auth/guard/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: otpEmail, otp: otpCode }),
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('sipenjara_user', JSON.stringify(data.user));
                setUser(data.user);
                setIsLoggedIn(true);
                setOtpStep('idle');
            } else {
                setLoginError(data.error || 'OTP salah atau sudah expired.');
            }
        } catch {
            setLoginError('Gagal verifikasi OTP.');
        }
        setIsLoggingIn(false);
    };

    const handleResendOTP = async () => {
        setLoginError('');
        try {
            const res = await fetch('/api/auth/guard/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: otpEmail }),
            });
            const data = await res.json();
            if (data.success) {
                setOtpMessage(data.message || 'OTP baru telah dikirim!');
                setOtpCountdown(300);
                setOtpCode(data.devOtp || '');
            } else {
                setLoginError(data.error || 'Gagal kirim ulang OTP.');
            }
        } catch {
            setLoginError('Gagal menghubungi server.');
        }
    };

    // ============================================================
    // LOGOUT
    // ============================================================
    const handleLogout = () => {
        localStorage.removeItem('sipenjara_user');
        setIsLoggedIn(false);
        setUser(null);
        setLoginRole(null);
        setOtpStep('idle');
        setOtpEmail('');
        setOtpCode('');
        setLoginError('');
        setActiveTab('dashboard');
        if (window.google) window.google.accounts.id.disableAutoSelect();
    };

    const handleBackToRoleSelect = () => {
        setLoginRole(null);
        setOtpStep('idle');
        setOtpEmail('');
        setOtpCode('');
        setLoginError('');
        setOtpMessage('');
    };

    const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    // ============================================================
    // EFFECTS
    // ============================================================

    // FIX: Clock selalu berjalan, terpisah dari useEffect login
    useEffect(() => {
        const timer = setInterval(() => setClock(new Date().toLocaleTimeString('id-ID')), 1000);
        return () => clearInterval(timer);
    }, []);

    // OTP countdown
    useEffect(() => {
        if (otpCountdown <= 0) return;
        const timer = setInterval(() => {
            setOtpCountdown(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [otpCountdown]);

    // Data fetch & Midtrans setelah login
    useEffect(() => {
        if (!isLoggedIn) return;
        fetchData();
        const script = document.createElement('script');
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', 'Mid-client-YAwDc1cL-NWUpMAY');
        script.async = true;
        document.body.appendChild(script);
        return () => { if (document.body.contains(script)) document.body.removeChild(script); };
    }, [isLoggedIn]);

    // Google Sign-In button — script dimuat di index.html, tinggal init & render
    useEffect(() => {
        if (isLoggedIn || !loginRole || otpStep === 'otp_sent') return;

        const btnId = loginRole === 'warden' ? 'google-signin-warden' : 'google-signin-guard';
        const callback = loginRole === 'warden' ? handleWardenGoogleCallback : handleGuardGoogleCallback;

        let retryCount = 0;
        const maxRetries = 50; // 5 detik max

        const tryRender = () => {
            // Tunggu window.google tersedia (dimuat dari index.html)
            if (!window.google?.accounts?.id) {
                if (retryCount++ < maxRetries) {
                    setTimeout(tryRender, 100);
                } else {
                    setLoginError('Google Sign-In gagal dimuat. Refresh halaman.');
                }
                return;
            }

            // Tunggu elemen DOM tersedia
            const el = document.getElementById(btnId);
            if (!el) {
                if (retryCount++ < maxRetries) {
                    setTimeout(tryRender, 100);
                }
                return;
            }

            try {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback,
                    ux_mode: 'popup',
                });
                window.google.accounts.id.renderButton(el, {
                    theme: 'outline',
                    size: 'large',
                    shape: 'pill',
                    text: 'signin_with',
                    width: 300,
                });
            } catch (e) {
                console.warn('GSI renderButton error (mungkin sudah dirender):', e.message);
            }
        };

        // Sedikit delay agar DOM React sudah selesai render
        const timeout = setTimeout(tryRender, 50);
        return () => clearTimeout(timeout);
    }, [isLoggedIn, loginRole, otpStep, handleWardenGoogleCallback, handleGuardGoogleCallback]);


    // ============================================================
    // INMATE ACTIONS
    // ============================================================
    const handleRegister = async () => {
        if (!isWarden) return alert('Akses ditolak. Hanya Warden yang dapat mendaftarkan napi.');
        if (!regAlias || !regAge || !regDesc) return alert('Lengkapi Alias, Umur, dan Deskripsi!');
        if (regSentenceType === 'Angka' && !regSentenceYears) return alert('Isi Lama Tahun Hukuman!');

        const wageMap = { 'Tukang Sapu': 15000, 'Pekerja Pabrik': 25000, 'Admin Perpus': 30000, 'Koki Dapur': 45000 };
        const wage = wageMap[regJob] || 0;

        let points = 10, tier = 'Trusty';
        if ((regThreat || '').includes('EXTREME')) { points = 150; tier = 'High-Risk'; }
        else if ((regThreat || '').includes('HIGH')) { points = 80; tier = 'High-Risk'; }
        else if ((regThreat || '').includes('MEDIUM')) { points = 40; tier = 'Reguler'; }

        const exitDate =
            regSentenceType === 'Mati' ? 'Hukuman Mati' :
                regSentenceType === 'Seumur Hidup' ? 'Seumur Hidup' :
                    `Tahun ${new Date().getFullYear() + Number(regSentenceYears)}`;

        const newInmate = {
            id: 'NXP-' + Math.floor(Math.random() * 90000 + 10000),
            alias: regAlias, tier, crimeType: regCrime, cell: regBlock, points, saldo: 0,
            age: Number(regAge), gender: regGender,
            entryDate: new Date().toLocaleDateString('id-ID'),
            exitDate, job: regJob, wage, description: regDesc,
        };

        try {
            const res = await fetch('/api/inmates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newInmate),
            });
            if (res.ok) {
                setIsRegModalOpen(false);
                sendNotif(`REGISTRASI: Napi ${regAlias} masuk database!`, 'outgoing');
                fetchData();
                // reset form
                setRegName(''); setRegAlias(''); setRegAge(''); setRegDesc('');
                setRegSentenceYears('');
            } else {
                alert('Gagal menyimpan data. Cek koneksi server.');
            }
        } catch { alert('Gagal koneksi!'); }
    };

    const handleDelete = async (id, alias) => {
        if (!isWarden) return alert('Akses ditolak. Hanya Warden yang dapat menghapus data napi.');
        if (!window.confirm(`⚠ YAKIN HAPUS DATA NAPI ${alias}?\nTindakan ini tidak dapat dibatalkan.`)) return;
        try {
            const res = await fetch(`/api/inmates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setInmates(prev => (prev || []).filter(i => i.id !== id));
                sendNotif(`SISTEM: Napi ${alias} terhapus dari database.`, 'error');
            }
        } catch { alert('Gagal menghapus!'); }
    };

    // ============================================================
    // PRODUCT ACTIONS
    // ============================================================
    const handleAddProduct = async () => {
        if (!isWarden) return alert('Akses ditolak. Hanya Warden yang dapat menambah produk.');
        if (!prodName || !prodPrice || !prodStock) return alert('Lengkapi data barang!');
        const newProd = {
            id: 'P' + Math.floor(Math.random() * 9000 + 1000),
            name: prodName, price: Number(prodPrice), type: prodType, stock: Number(prodStock),
        };
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProd),
            });
            if (res.ok) {
                setIsProdModalOpen(false);
                setProducts(prev => [newProd, ...(prev || [])]);
                sendNotif('GUDANG: Barang baru ditambahkan.', 'green');
                setProdName(''); setProdPrice(''); setProdStock('');
            }
        } catch { alert('Gagal menambah barang!'); }
    };

    // ============================================================
    // PAYROLL
    // ============================================================
    const distributeSHU = async () => {
        if (!isWarden) return alert('Akses ditolak. Hanya Warden yang dapat mendistribusikan payroll.');
        if (!window.confirm('Distribusikan gaji ke semua napi yang bekerja?')) return;
        try {
            const res = await fetch('/api/payroll', { method: 'POST' });
            if (res.ok) {
                setInmates(prev => (prev || []).map(i => ({ ...i, saldo: (i.saldo || 0) + (i.wage || 0) })));
                sendNotif('PAYROLL: Gaji berhasil didistribusikan!', 'outgoing');
                alert('✅ Gaji sukses dibagikan ke semua napi yang bekerja!');
            }
        } catch { alert('Gagal membagikan gaji!'); }
    };

    // (Midtrans payment and Cart logic have been removed as part of Kantin removal)

    // ============================================================
    // LOAN (KOPERASI)
    // ============================================================
    const submitLoan = () => {
        if (!selectedInmateId || !loanAmount) return alert('Pilih napi dan masukkan nominal pinjaman!');
        const inmate = (inmates || []).find(i => i.id === selectedInmateId);
        if (!inmate) return alert('Napi tidak ditemukan!');
        const trxId = 'LOAN-' + Math.floor(Math.random() * 90000);
        setTransactions(prev => [{
            id: trxId,
            date: new Date().toLocaleString(),
            inmateId: selectedInmateId,
            inmateAlias: inmate.alias,
            items: [{ name: 'Pinjaman Koperasi' }],
            total: Number(loanAmount) || 0,
            status: 'QUEUE (PENDING)',
            type: 'LOAN',
        }, ...(prev || [])]);
        sendNotif(`KOPERASI: Pengajuan pinjaman ${inmate.alias} masuk antrian Warden.`, 'incoming');
        setLoanAmount('');
    };

    const approveLoan = async (trx) => {
        if (!isWarden) return alert('Akses ditolak. Hanya Warden yang dapat menyetujui pinjaman.');
        try {
            const res = await fetch('/api/inmates/update-saldo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: trx.inmateId, amount: trx.total }),
            });
            if (res.ok) {
                setTransactions(prev => (prev || []).map(t => t.id === trx.id ? { ...t, status: 'APPROVED' } : t));
                setInmates(prev => (prev || []).map(i => i.id === trx.inmateId ? { ...i, saldo: (i.saldo || 0) + (trx.total || 0) } : i));
                sendNotif(`WARDEN: Pinjaman ${trx.id} DISETUJUI!`, 'outgoing');
            } else {
                alert('Gagal menyetujui pinjaman. Cek server.');
            }
        } catch {
            alert('Error koneksi server.');
        }
    };

    const handlePrint = (data, type) => {
        setActivePrint(data);
        setPrintType(type);
        setTimeout(() => window.print(), 300);
    };

    // ============================================================
    // RENDER — LOGIN SCREEN
    // ============================================================
    if (!isLoggedIn) {
        // Tambah class berbeda berdasarkan role yang dipilih
        const loginScreenClass = loginRole ? `login-screen role-${loginRole}` : 'login-screen';

        return (
            <div className={loginScreenClass}>
                <div className="login-bg-grid"></div>
                <div className="login-bg-orbs">
                    <div className="orb orb-1"></div>
                    <div className="orb orb-2"></div>
                    <div className="orb orb-3"></div>
                </div>

                <div className="login-box">
                    {/* Logo & Title */}
                    <div className="login-logo-wrap">
                        <div className="logo-icon login-logo-icon">
                            <svg viewBox="0 0 60 60" fill="none">
                                <rect x="5" y="10" width="50" height="40" rx="4" fill="none" stroke="white" strokeWidth="2" />
                                <line x1="15" y1="10" x2="15" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                                <line x1="25" y1="10" x2="25" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                                <line x1="35" y1="10" x2="35" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                                <line x1="45" y1="10" x2="45" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                                <rect x="22" y="28" width="16" height="12" rx="2" fill="none" stroke="white" strokeWidth="1.5" />
                                <circle cx="30" cy="34" r="2" fill="white" />
                            </svg>
                        </div>
                        <h2 className="login-title">SIPENJARA</h2>
                        <p className="login-subtitle">SISTEM INFORMASI PEMASYARAKATAN</p>

                        {/* Role indicator badge — muncul setelah pilih role */}
                        {loginRole && (
                            <div className={`login-role-indicator role-indicator-${loginRole}`}>
                                {loginRole === 'warden' ? (
                                    <><span>🛡️</span> MODE WARDEN — AKSES PENUH</>
                                ) : (
                                    <><span>🔒</span> MODE GUARD — AKSES TERBATAS</>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ======================================
                        STEP 1: PILIH ROLE
                    ====================================== */}
                    {!loginRole && (
                        <div className="role-selection">
                            <div className="divider-line"><span>PILIH AKSES LOGIN</span></div>
                            <div className="role-cards">
                                <div className="role-card role-warden" onClick={() => setLoginRole('warden')}>
                                    <div className="role-card-bg"></div>
                                    <div className="role-icon">🛡️</div>
                                    <h3>WARDEN</h3>
                                    <p>Kepala Lapas — Akses penuh ke seluruh sistem</p>
                                    <span className="role-badge role-badge-warden">FULL ACCESS</span>
                                    <div className="role-card-features">
                                        <span>✓ Manajemen napi</span>
                                        <span>✓ Payroll & keuangan</span>
                                        <span>✓ Approve pinjaman</span>
                                    </div>
                                </div>
                                <div className="role-card role-guard" onClick={() => setLoginRole('guard')}>
                                    <div className="role-card-bg"></div>
                                    <div className="role-icon">🔒</div>
                                    <h3>GUARD</h3>
                                    <p>Petugas Lapas — Akses terbatas + OTP</p>
                                    <span className="role-badge role-badge-guard">LIMITED ACCESS</span>
                                    <div className="role-card-features">
                                        <span>✓ Lihat data napi</span>
                                        <span>✓ Kantin & layanan</span>
                                        <span>✗ Aksi administratif</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================
                        STEP 2A: WARDEN LOGIN (Google langsung)
                    ====================================== */}
                    {loginRole === 'warden' && otpStep === 'idle' && (
                        <div className="auth-section">
                            <div className="divider-line"><span>AUTENTIKASI WARDEN</span></div>
                            <div className="auth-info-banner warden-banner">
                                <div className="auth-banner-icon">🛡️</div>
                                <div>
                                    <strong>Login Warden — One-Step Google Auth</strong>
                                    <p>Akun Google harus terdaftar sebagai Warden di sistem.</p>
                                </div>
                            </div>
                            <div className="auth-security-level warden-security">
                                <div className="security-dots">
                                    <span className="dot dot-active"></span>
                                    <span className="dot dot-active"></span>
                                    <span className="dot dot-inactive"></span>
                                </div>
                                <span>Keamanan: LEVEL 2 — Single Factor</span>
                            </div>
                            <div id="google-signin-warden" className="google-btn-wrapper"></div>
                            {isLoggingIn && <p className="auth-loading">⏳ Memverifikasi akun Warden...</p>}
                            {loginError && <div className="auth-error">🚫 {loginError}</div>}
                            <button className="btn-back-role" onClick={handleBackToRoleSelect}>← Kembali Pilih Role</button>
                        </div>
                    )}

                    {/* ======================================
                        STEP 2B: GUARD LOGIN — Google + OTP (step 1: trigger OTP)
                    ====================================== */}
                    {loginRole === 'guard' && otpStep === 'idle' && (
                        <div className="auth-section">
                            <div className="divider-line"><span>AUTENTIKASI GUARD</span></div>
                            <div className="auth-info-banner guard-banner">
                                <div className="auth-banner-icon">🔒</div>
                                <div>
                                    <strong>Login Guard — Two-Step Verification</strong>
                                    <p>Google Auth → Kode OTP dikirim ke email → Verifikasi</p>
                                </div>
                            </div>
                            <div className="auth-security-level guard-security">
                                <div className="security-dots">
                                    <span className="dot dot-active"></span>
                                    <span className="dot dot-active"></span>
                                    <span className="dot dot-active"></span>
                                </div>
                                <span>Keamanan: LEVEL 3 — Two-Factor Auth</span>
                            </div>
                            <div id="google-signin-guard" className="google-btn-wrapper"></div>
                            {isLoggingIn && <p className="auth-loading">⏳ Mengirim OTP ke email Anda...</p>}
                            {loginError && <div className="auth-error">🚫 {loginError}</div>}
                            <button className="btn-back-role" onClick={handleBackToRoleSelect}>← Kembali Pilih Role</button>
                        </div>
                    )}

                    {/* ======================================
                        STEP 3: OTP VERIFICATION (Guard only)
                    ====================================== */}
                    {loginRole === 'guard' && otpStep === 'otp_sent' && (
                        <div className="otp-section">
                            <div className="divider-line"><span>VERIFIKASI OTP</span></div>
                            <div className="otp-email-badge">
                                <span>📧</span>
                                <div>
                                    <p>Kode OTP dikirim ke:</p>
                                    <strong>{otpEmail}</strong>
                                </div>
                            </div>
                            {otpMessage && <p className="otp-info-msg">✉️ {otpMessage}</p>}
                            <div className="otp-input-wrapper">
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="● ● ● ● ● ●"
                                    className="otp-input"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                                />
                            </div>
                            <div className="otp-timer-row">
                                {otpCountdown > 0 ? (
                                    <p className="otp-countdown">⏰ Berlaku: <strong>{formatCountdown(otpCountdown)}</strong></p>
                                ) : (
                                    <p className="otp-expired">❌ OTP sudah expired. Kirim ulang.</p>
                                )}
                            </div>
                            <button
                                className="btn-primary btn-otp-verify"
                                onClick={handleVerifyOTP}
                                disabled={isLoggingIn || otpCode.length !== 6}
                            >
                                {isLoggingIn ? '⏳ Memverifikasi...' : '✅ VERIFIKASI OTP'}
                            </button>
                            <div className="otp-actions">
                                <button
                                    className="btn-resend"
                                    onClick={handleResendOTP}
                                    disabled={otpCountdown > 270}
                                >
                                    🔄 Kirim Ulang {otpCountdown > 270 ? `(${formatCountdown(otpCountdown - 270)})` : ''}
                                </button>
                                <button className="btn-back-role" onClick={handleBackToRoleSelect}>← Kembali</button>
                            </div>
                            {loginError && <div className="auth-error" style={{ marginTop: '12px' }}>🚫 {loginError}</div>}
                        </div>
                    )}

                    <div className="login-version">v5.0 • KEMENKUMHAM RI • {loginRole === 'guard' ? 'DUAL-FACTOR AUTH' : loginRole === 'warden' ? 'SINGLE-FACTOR AUTH' : 'SIPENJARA SECURE LOGIN'}</div>
                </div>
            </div>
        );
    }

    // ============================================================
    // RENDER — MAIN APP (setelah login)
    // ============================================================

    // Sidebar items dengan permission check
    const sidebarItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard', section: 'main', access: 'all' },
        { id: 'datanapi', icon: '📋', label: 'Data Napi', section: 'main', access: 'all' },
        { id: 'kantin', icon: '🛒', label: 'Kantin', section: 'main', access: 'all' },
        { id: 'telepon', icon: '📞', label: 'Telepon', section: 'main', access: 'all' },
        { id: 'deposit', icon: '💰', label: 'Deposit', section: 'keuangan', access: 'all' },
        { id: 'riwayat', icon: '📋', label: 'Riwayat', section: 'keuangan', access: 'all' },
    ];

    return (
        <>
            <div className="prison-bars"></div>

            {/* ============================================================
                MODAL — REGISTRASI NAPI (Warden only)
            ============================================================ */}
            {isWarden && (
                <div className={`modal-overlay ${isRegModalOpen ? 'open' : ''}`}
                    onClick={(e) => { if (e.target.className.includes('modal-overlay')) setIsRegModalOpen(false); }}>
                    <div className="modal-box" style={{ maxWidth: '650px' }}>
                        <div className="modal-header">
                            <h3>🔒 Registrasi Narapidana Baru</h3>
                            <button className="modal-close" onClick={() => setIsRegModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nama Lengkap</label>
                                    <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Sesuai KTP..." />
                                </div>
                                <div className="form-group">
                                    <label>Alias / Julukan</label>
                                    <input type="text" value={regAlias} onChange={(e) => setRegAlias(e.target.value)} placeholder="Misal: El Kartel" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Jenis Kelamin</label>
                                    <select value={regGender} onChange={(e) => setRegGender(e.target.value)}>
                                        <option value="L">Laki-Laki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Umur (Tahun)</label>
                                    <input type="number" value={regAge} onChange={(e) => setRegAge(e.target.value)} placeholder="Misal: 45" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Jenis Kejahatan</label>
                                    <select value={regCrime} onChange={(e) => setRegCrime(e.target.value)}>
                                        <option>Korupsi Kelas Kakap</option>
                                        <option>Sindikat Narkoba</option>
                                        <option>Kejahatan Siber</option>
                                        <option>Pembunuhan Berencana</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Level Bahaya</label>
                                    <select value={regThreat} onChange={(e) => setRegThreat(e.target.value)}>
                                        <option>🔴 EXTREME</option>
                                        <option>🟠 HIGH</option>
                                        <option>🟡 MEDIUM</option>
                                        <option>🟢 LOW</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tipe Hukuman</label>
                                    <select value={regSentenceType} onChange={(e) => setRegSentenceType(e.target.value)}>
                                        <option value="Angka">Durasi Waktu (Tahun)</option>
                                        <option value="Seumur Hidup">Seumur Hidup</option>
                                        <option value="Mati">Hukuman Mati</option>
                                    </select>
                                </div>
                                {regSentenceType === 'Angka' ? (
                                    <div className="form-group">
                                        <label>Lama (Tahun)</label>
                                        <input type="number" value={regSentenceYears} onChange={(e) => setRegSentenceYears(e.target.value)} placeholder="Misal: 27" />
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label>Lama (Tahun)</label>
                                        <input type="text" disabled value="KUNCI SISTEM" style={{ backgroundColor: '#222' }} />
                                    </div>
                                )}
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Pekerjaan (Gaji/SHU)</label>
                                    <select value={regJob} onChange={(e) => setRegJob(e.target.value)}>
                                        <option value="Tidak Ada">Tidak Ada (Rp 0)</option>
                                        <option value="Tukang Sapu">Tukang Sapu (Rp 15.000)</option>
                                        <option value="Pekerja Pabrik">Pekerja Pabrik (Rp 25.000)</option>
                                        <option value="Admin Perpus">Admin Perpus (Rp 30.000)</option>
                                        <option value="Koki Dapur">Koki Dapur (Rp 45.000)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Blok Sel</label>
                                    <select value={regBlock} onChange={(e) => setRegBlock(e.target.value)}>
                                        <option>BLOK-A (Max)</option>
                                        <option>BLOK-B (Reguler)</option>
                                        <option>BLOK-S (Isolasi)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Deskripsi & Profil Kriminal</label>
                                <input type="text" value={regDesc} onChange={(e) => setRegDesc(e.target.value)} placeholder="Tulis catatan kejahatan..." />
                            </div>
                            <button className="btn-primary" onClick={handleRegister}>⛓️ SIMPAN KE DATABASE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
                MODAL — TAMBAH PRODUK (Warden only)
            ============================================================ */}
            {isWarden && (
                <div className={`modal-overlay ${isProdModalOpen ? 'open' : ''}`}
                    onClick={(e) => { if (e.target.className.includes('modal-overlay')) setIsProdModalOpen(false); }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>📦 Tambah Item Gudang</h3>
                            <button className="modal-close" onClick={() => setIsProdModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Nama Barang</label>
                                <input type="text" value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="Contoh: Kopi Hitam" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Harga (Rp)</label>
                                    <input type="number" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Stok Awal</label>
                                    <input type="number" value={prodStock} onChange={(e) => setProdStock(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Kategori</label>
                                <select value={prodType} onChange={(e) => setProdType(e.target.value)}>
                                    <option value="general">Barang Umum</option>
                                    <option value="luxury">Barang Mewah (Luxury)</option>
                                </select>
                            </div>
                            <button className="btn-primary" onClick={handleAddProduct}>+ SIMPAN BARANG</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
                HEADER
            ============================================================ */}
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
                    <div className="logo-text">
                        <h1>SIPENJARA</h1>
                        <p>Sistem Informasi Pemasyarakatan</p>
                    </div>
                </div>
                <div className="status-bar">
                    <div className="status-item">
                        <div className="num">{(inmates || []).length}</div>
                        <div className="label">Total Napi</div>
                    </div>
                    <div className="alert-level">
                        <div className="num">⚠ II</div>
                        <div className="label">Alert Level</div>
                    </div>
                    {user && (
                        <div className="user-profile-badge">
                            <img src={user.picture} alt="" className="user-avatar" referrerPolicy="no-referrer" />
                            <div className="user-info">
                                <span className="user-name">{user.name}</span>
                                <span className="user-email">{user.email}</span>
                            </div>
                            <span className={`header-role-badge ${user.role === 'warden' ? 'badge-warden' : 'badge-guard'}`}>
                                {user.role === 'warden' ? '🛡️ WARDEN' : '🔒 GUARD'}
                            </span>
                        </div>
                    )}
                    {isWarden && (
                        <button className="action-btn" onClick={() => setIsRegModalOpen(true)}
                            style={{ padding: '10px 18px', fontSize: '0.7rem', borderColor: 'var(--rust)', color: 'var(--rust)', borderRadius: '8px' }}>
                            + NAPI BARU
                        </button>
                    )}
                    {isWarden && (
                        <button className="action-btn" onClick={() => setIsProdModalOpen(true)}
                            style={{ padding: '10px 18px', fontSize: '0.7rem', borderColor: 'var(--green-go)', color: 'var(--green-go)', borderRadius: '8px' }}>
                            + PRODUK
                        </button>
                    )}
                </div>
            </header>

            {/* Guard access warning banner */}
            {isGuard && (
                <div className="guard-access-banner">
                    <span>🔒</span>
                    <span>Anda login sebagai <strong>Guard</strong> — Akses administratif (tambah/hapus napi, payroll, approve pinjaman) dinonaktifkan. Hubungi Warden untuk tindakan tersebut.</span>
                </div>
            )}

            {/* ============================================================
                APP LAYOUT
            ============================================================ */}
            <div className="app-layout">
                <aside className="sidebar">
                    <div className="sidebar-section-label">MENU UTAMA</div>
                    {sidebarItems.filter(i => i.section === 'main').map(item => (
                        <a
                            key={item.id}
                            className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </a>
                    ))}

                    <div className="sidebar-divider"></div>
                    <div className="sidebar-section-label">KEUANGAN</div>
                    {sidebarItems.filter(i => i.section === 'keuangan').map(item => (
                        <a
                            key={item.id}
                            className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </a>
                    ))}

                    {/* Payroll — Warden only */}
                    {isWarden && (
                        <>
                            <div className="sidebar-divider"></div>
                            <div className="sidebar-section-label">ADMINISTRASI</div>
                            <a className="sidebar-link sidebar-link-payroll" onClick={distributeSHU}>
                                <span className="sidebar-icon">💵</span>
                                <span>Distribusi Payroll</span>
                            </a>
                        </>
                    )}

                    {/* Guard: tampilkan seksi admin tapi disabled */}
                    {isGuard && (
                        <>
                            <div className="sidebar-divider"></div>
                            <div className="sidebar-section-label">ADMINISTRASI</div>
                            <a className="sidebar-link sidebar-link-disabled">
                                <span className="sidebar-icon">💵</span>
                                <span>Distribusi Payroll</span>
                                <span className="sidebar-lock">🔒</span>
                            </a>
                            <a className="sidebar-link sidebar-link-disabled">
                                <span className="sidebar-icon">📦</span>
                                <span>Tambah Produk</span>
                                <span className="sidebar-lock">🔒</span>
                            </a>
                        </>
                    )}

                    <div className="sidebar-divider"></div>
                    <div className="sidebar-section-label">SISTEM</div>
                    <a className="sidebar-link sidebar-logout" onClick={handleLogout}>
                        <span className="sidebar-icon">⏏</span>
                        <span>Logout</span>
                    </a>

                    <div className="sidebar-footer">
                        <span>v5.0</span>
                        <span>{user?.role?.toUpperCase()}</span>
                    </div>
                </aside>

                <div className="main-content">
                    <div className="container">

                        {/* =================== DASHBOARD =================== */}
                        {activeTab === 'dashboard' && (
                            <>
                                {user && (
                                    <div className="welcome-section">
                                        <div className="welcome-left">
                                            <img src={user.picture} alt="" className="welcome-avatar" referrerPolicy="no-referrer" />
                                            <div className="welcome-text">
                                                <h2>Selamat Datang, {user.name.split(' ')[0]}!</h2>
                                                <p>
                                                    {user.email} •{' '}
                                                    <span style={{ color: user.role === 'warden' ? 'var(--rust)' : 'var(--blue-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                                                        {user.role === 'warden' ? '🛡️ Warden — Full Access' : '🔒 Guard — Limited Access'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="welcome-right">
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="welcome-clock">{clock || '--:--:--'}</div>
                                                <div className="welcome-date">
                                                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="stats-row">
                                    <div className="stat-box red">
                                        <span className="stat-icon">🚨</span>
                                        <div className="big-num">{(inmates || []).filter(i => i?.tier === 'High-Risk').length}</div>
                                        <div className="stat-label">Kelas Kakap</div>
                                    </div>
                                    <div className="stat-box orange">
                                        <span className="stat-icon">🔒</span>
                                        <div className="big-num">{(inmates || []).filter(i => (i?.cell || '').includes('Isolasi')).length}</div>
                                        <div className="stat-label">Di Isolasi</div>
                                    </div>
                                    <div className="stat-box yellow">
                                        <span className="stat-icon">⏳</span>
                                        <div className="big-num">{(transactions || []).filter(t => (t?.status || '').includes('QUEUE')).length}</div>
                                        <div className="stat-label">Trx Pending</div>
                                    </div>
                                    <div className="stat-box green">
                                        <span className="stat-icon">✅</span>
                                        <div className="big-num">{(inmates || []).filter(i => i?.tier === 'Trusty').length}</div>
                                        <div className="stat-label">Trusty Napi</div>
                                    </div>
                                    <div className="stat-box gray">
                                        <span className="stat-icon">🗄️</span>
                                        <div className="big-num">DB</div>
                                        <div className="stat-label">SQLite Aktif</div>
                                    </div>
                                </div>

                                {/* Warden-only: Payroll quick action */}
                                {isWarden && (
                                    <div className="warden-quick-actions">
                                        <div className="quick-actions-title">⚡ Aksi Cepat Warden</div>
                                        <div className="quick-actions-row">
                                            <button className="quick-action-btn qa-blue" onClick={() => setIsRegModalOpen(true)}>
                                                <span>⛓️</span> Registrasi Napi Baru
                                            </button>
                                            <button className="quick-action-btn qa-green" onClick={distributeSHU}>
                                                <span>💵</span> Distribusi Payroll
                                            </button>
                                            <button className="quick-action-btn qa-orange" onClick={() => setIsProdModalOpen(true)}>
                                                <span>📦</span> Tambah Produk Kantin
                                            </button>
                                            <button className="quick-action-btn qa-red"
                                                onClick={() => {
                                                    const pending = transactions.filter(t => t.status?.includes('QUEUE') && t.type === 'LOAN');
                                                    if (pending.length === 0) return alert('Tidak ada pengajuan pinjaman pending.');
                                                    setActiveTab('riwayat');
                                                }}>
                                                <span>🏦</span> Review Pinjaman ({transactions.filter(t => t.status?.includes('QUEUE')).length})
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Catatan Warden — Anti Korupsi */}
                                <div className="warden-notes">
                                    <div className="warden-notes-header">
                                        <span className="warden-notes-icon">📜</span>
                                        <div>
                                            <h3>Catatan & Pedoman Warden</h3>
                                            <p>Panduan integritas dan pencegahan korupsi di lingkungan Lapas</p>
                                        </div>
                                    </div>
                                    <div className="warden-notes-grid">
                                        {[
                                            { num: '01', cls: 'note-red', icon: '🚫', title: 'Anti-Gratifikasi', text: 'Dilarang keras menerima hadiah, uang, atau bentuk gratifikasi apapun dari narapidana, keluarga napi, maupun pihak ketiga. Segala bentuk suap wajib dilaporkan ke Inspektorat.' },
                                            { num: '02', cls: 'note-orange', icon: '📊', title: 'Transparansi Keuangan', text: 'Seluruh transaksi keuangan (kantin, payroll, pinjaman koperasi) harus tercatat di sistem. Manipulasi data saldo atau transaksi merupakan pelanggaran berat.' },
                                            { num: '03', cls: 'note-yellow', icon: '⚖️', title: 'Hak Narapidana', text: 'Setiap narapidana berhak mendapat perlakuan manusiawi sesuai UU No. 22 Tahun 2022. Pelanggaran HAM akan diproses secara hukum tanpa toleransi.' },
                                            { num: '04', cls: 'note-green', icon: '📝', title: 'Dokumentasi & Audit', text: 'Semua kegiatan wajib terdokumentasi. Audit internal dilakukan setiap bulan dan audit eksternal setiap semester. Data tidak boleh dihapus tanpa otorisasi.' },
                                            { num: '05', cls: 'note-blue', icon: '🔍', title: 'Pengawasan Berlapis', text: 'Sistem pengawasan menggunakan prinsip four-eyes: setiap keputusan penting memerlukan persetujuan minimal 2 pejabat berwenang untuk mencegah penyalahgunaan.' },
                                            { num: '06', cls: 'note-purple', icon: '🛡️', title: 'Whistleblower Protection', text: 'Petugas yang melaporkan tindak korupsi dijamin perlindungannya sesuai UU Perlindungan Saksi. Laporan bisa dilakukan secara anonim melalui kanal resmi.' },
                                        ].map(note => (
                                            <div key={note.num} className={`note-card ${note.cls}`}>
                                                <div className="note-num">{note.num}</div>
                                                <h4>{note.icon} {note.title}</h4>
                                                <p>{note.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="section-header">
                                    <h2>DATABASE NARAPIDANA</h2>
                                    <span className="badge">{(inmates || []).length} TERDAFTAR</span>
                                </div>

                                <div className="two-col">
                                    <div className="scroll-panel">
                                        {(!inmates || inmates.length === 0) ? (
                                            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-dim)', border: '1px dashed #444', borderRadius: '12px' }}>
                                                <h2>DATABASE KOSONG</h2>
                                                <p style={{ marginTop: '8px' }}>
                                                    {isWarden ? 'Klik tombol "+ NAPI BARU" untuk mendaftarkan narapidana.' : 'Belum ada data napi. Hubungi Warden.'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="inmate-grid">
                                                {(inmates || []).map((i, index) => {
                                                    const threat = getThreatLevel(i?.points);
                                                    const barWidth = (i?.points || 0) > 100 ? '90%' : (i?.points || 0) > 50 ? '50%' : '20%';
                                                    const faceEmoji = i?.gender === 'P' ? '👩🏻' : '🧔🏻';
                                                    return (
                                                        <div className="inmate-card" key={i?.id || index} style={{ animationDelay: `${(index % 10) * 0.05}s` }}>
                                                            <div className="card-header">
                                                                <span className="inmate-id">{i?.id}</span>
                                                                <span className={`danger-level ${threat.class}`}>{threat.label}</span>
                                                            </div>
                                                            <div className="card-body">
                                                                <div className="mugshot" data-num={(i?.id || '').split('-')[1]}>{faceEmoji}</div>
                                                                <div className="inmate-info">
                                                                    <h3>{i?.alias}</h3>
                                                                    <div className="crime-tag">{i?.crimeType}</div>
                                                                    <div className="sentence-bar"><div className="sentence-fill" style={{ width: barWidth }}></div></div>
                                                                    <div className="sentence-text">Hukuman: {i?.exitDate}</div>
                                                                    <div style={{ color: 'var(--green-go)', fontSize: '0.7rem', marginTop: '3px', fontFamily: 'monospace' }}>
                                                                        Saldo: Rp {formatRp(i?.saldo)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="card-footer">
                                                                <span className="cell-badge">📍 {i?.cell}</span>
                                                                <div>
                                                                    <button className="action-btn" onClick={() => handlePrint(i, 'dossier')} style={{ marginRight: '5px' }}>
                                                                        🖨️ DOSSIER
                                                                    </button>
                                                                    {isWarden && (
                                                                        <button className="action-btn" onClick={() => handleDelete(i?.id, i?.alias)} style={{ color: 'var(--rust)', borderColor: 'var(--rust)' }}>
                                                                            🗑 HAPUS
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
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
                                                let evClass = 'ev-yellow';
                                                if (n?.type === 'error') evClass = 'ev-red';
                                                if (n?.type === 'incoming') evClass = 'ev-orange';
                                                if (n?.type === 'outgoing' || n?.type === 'green') evClass = 'ev-green';
                                                return (
                                                    <div key={n?.id} className={`event-item ${evClass}`}>
                                                        <div className="event-time">{n?.time}</div>
                                                        <div className="event-text">{n?.msg}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* =================== SUB PAGES =================== */}
                        {activeTab === 'kantin' && (
                            <Kantin inmates={inmates} onNotif={sendNotif} onRefresh={fetchData} user={user} />
                        )}
                        {activeTab === 'telepon' && (
                            <Telepon inmates={inmates} onNotif={sendNotif} onRefresh={fetchData} user={user} />
                        )}
                        {activeTab === 'deposit' && (
                            <Deposit inmates={inmates} onNotif={sendNotif} onRefresh={fetchData} user={user} />
                        )}
                        {activeTab === 'riwayat' && (
                            <Riwayat
                                inmates={inmates}
                                transactions={transactions}
                                user={user}
                                onApproveLoan={isWarden ? approveLoan : null}
                            />
                        )}
                        {activeTab === 'datanapi' && (
                            <DataNapi inmates={inmates} onNotif={sendNotif} onRefresh={fetchData} user={user} />
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================================
                FOOTER
            ============================================================ */}
            <footer>
                <div className="footer-left">SIPENJARA v5.0 &nbsp;|&nbsp; KEMENKUMHAM RI &nbsp;|&nbsp; E-WALLET SYSTEM &nbsp;|&nbsp; {clock} WIB</div>
                <div className="footer-right">
                    <a className="footer-link">Kebijakan Privasi</a>
                    <a className="footer-link">Kontak Admin</a>
                </div>
            </footer>

            {/* ============================================================
                PRINT CONTAINER
            ============================================================ */}
            {activePrint && (
                <div className="print-container">
                    {printType === 'dossier' && (
                        <>
                            <div className="kop-surat">
                                <h1>NUSA KAMBANGAN SUPERMAX</h1>
                                <p>Dossier Tahanan | DATABASE SQLITE</p>
                            </div>
                            <div className="profil-layout">
                                {activePrint.gender === 'P' ? <FemaleAvatar /> : <MaleAvatar />}
                                <div className="data-napi">
                                    <h2>{activePrint.id} - {activePrint.alias}</h2>
                                    <p>Klasifikasi Kejahatan: {activePrint.crimeType}</p>
                                    <p>Membership Tier: <strong>{activePrint.tier}</strong></p>
                                    <p>Lokasi Sel: <strong>{activePrint.cell}</strong></p>
                                </div>
                            </div>
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
                            <div className="description-box">
                                <h3>Catatan Kriminal:</h3>
                                <p>{activePrint.description}</p>
                            </div>
                            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end', color: 'black' }}>
                                <div style={{ textAlign: 'center', width: '300px' }}>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
                                    <p style={{ margin: '0 0 80px 0', fontWeight: 'bold', fontSize: '16px' }}>KEPALA LEMBAGA PEMASYARAKATAN</p>
                                    <div style={{ borderBottom: '2px solid black', width: '100%', display: 'inline-block' }}></div>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>NIP. 19800512 200501 1 004</p>
                                </div>
                            </div>
                        </>
                    )}
                    {/* Print options specific to features removed */}
                </div>
            )}
        </>
    );
}

// ============================================================
// EXPORT
// ============================================================
export default function AppWrapper() {
    return (
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
}
import React, { useState } from 'react';

const MENU = {
  makanan: [
    { name: 'Nasi Kuning', price: 15000 },
    { name: 'Mie Instan', price: 8000 },
    { name: 'Tahu Goreng', price: 5000 },
    { name: 'Tempe Goreng', price: 5000 },
    { name: 'Telur Rebus', price: 4000 },
  ],
  minuman: [
    { name: 'Kopi', price: 3000 },
    { name: 'Teh', price: 2000 },
    { name: 'Air Putih', price: 0 },
  ],
  rokok: [
    { name: 'Kretek', price: 25000 },
    { name: 'Filter', price: 30000 },
  ],
  perlengkapan: [
    { name: 'Sabun', price: 5000 },
    { name: 'Pasta Gigi', price: 7000 },
    { name: 'Sikat Gigi', price: 10000 },
    { name: 'Shampo', price: 8000 },
  ],
};

const formatRp = (n) => isNaN(Number(n)) ? '0' : Number(n).toLocaleString('id-ID');

export default function Kantin({ inmates, onNotif, onRefresh }) {
  const [selectedId, setSelectedId] = useState('');
  const [cart, setCart] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState('midtrans'); // 'midtrans' | 'ewallet'

  const addToCart = (item) => {
    if (!selectedId) return alert('Pilih Napi dulu!');
    setError('');
    const existing = cart.find(c => c.name === item.name);
    if (existing) setCart(cart.map(c => c.name === item.name ? { ...c, qty: c.qty + 1 } : c));
    else setCart([...cart, { ...item, qty: 1 }]);
  };

  const removeFromCart = (name) => setCart(cart.filter(c => c.name !== name));
  const updateQty = (name, delta) => {
    setCart(cart.map(c => {
      if (c.name !== name) return c;
      const newQty = c.qty + delta;
      return newQty <= 0 ? null : { ...c, qty: newQty };
    }).filter(Boolean));
  };
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  // === BAYAR VIA E-WALLET (internal) ===
  const handleOrderEwallet = async () => {
    if (!selectedId || cart.length === 0) return;
    setLoading(true); setError(''); setReceipt(null);
    try {
      const res = await fetch('/api/kantin/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inmateId: selectedId, items: cart })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setReceipt({ ...data, payMethod: 'E-Wallet' });
      setCart([]);
      onNotif(`✅ KANTIN: Order ${data.trxId} berhasil! Total Rp ${formatRp(data.total)} (E-Wallet)`, 'green');
      onRefresh();
    } catch (e) { setError('Gagal koneksi server'); }
    setLoading(false);
  };

  // === BAYAR VIA MIDTRANS ===
  const handleOrderMidtrans = async () => {
    if (!selectedId || cart.length === 0) return;
    setLoading(true); setError(''); setReceipt(null);

    try {
      // 1. Minta Snap token dari backend
      const res = await fetch('/api/midtrans/kantin-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inmateId: selectedId, items: cart })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }

      // 2. Buka Midtrans Snap popup
      if (!window.snap) {
        setError('Midtrans Snap belum dimuat. Refresh halaman.');
        setLoading(false);
        return;
      }

      window.snap.pay(data.token, {
        onSuccess: async (result) => {
          // 3. Konfirmasi ke backend
          try {
            const confirmRes = await fetch('/api/midtrans/confirm', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderId })
            });
            const confirmData = await confirmRes.json();
            if (confirmRes.ok) {
              setReceipt({
                trxId: data.orderId,
                total: data.total,
                saldoBefore: confirmData.saldoBefore,
                saldoAfter: confirmData.saldoAfter,
                payMethod: 'Midtrans',
                midtransPayment: result.payment_type,
              });
              setCart([]);
              onNotif(`💳 KANTIN: Order ${data.orderId} LUNAS via Midtrans! Total Rp ${formatRp(data.total)}`, 'green');
              onRefresh();
            }
          } catch (e) {
            setError('Pembayaran berhasil tapi gagal konfirmasi. Hubungi admin.');
          }
          setLoading(false);
        },
        onPending: (result) => {
          onNotif(`⏳ KANTIN: Pembayaran ${data.orderId} menunggu konfirmasi...`, 'incoming');
          setError('Pembayaran menunggu konfirmasi. Cek status di riwayat transaksi.');
          setLoading(false);
        },
        onError: (result) => {
          setError('Pembayaran Midtrans gagal! Coba lagi.');
          setLoading(false);
        },
        onClose: () => {
          setError('Pembayaran dibatalkan.');
          setLoading(false);
        },
      });

    } catch (e) {
      setError('Gagal koneksi ke payment gateway');
      setLoading(false);
    }
  };

  const handleOrder = () => {
    if (payMethod === 'midtrans') handleOrderMidtrans();
    else handleOrderEwallet();
  };

  const inmate = (inmates || []).find(i => i.id === selectedId);

  return (
    <>
      <div className="section-header"><h2>🛒 KANTIN PENJARA</h2><span className="badge">MIDTRANS PAYMENT</span></div>
      <div className="kantin-grid">
        <div className="panel">
          <div className="panel-title">PILIH NAPI & MENU</div>
          <div className="form-group">
            <label>Narapidana</label>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setReceipt(null); setError(''); }}>
              <option value="">-- Scan ID Napi --</option>
              {(inmates || []).map(i => <option key={i.id} value={i.id}>{i.id} - {i.alias} (Saldo: Rp {formatRp(i.saldo)})</option>)}
            </select>
          </div>
          {selectedId && inmate && (
            <div className="wallet-badge">
              <span>💰</span>
              <div><p>Saldo E-Wallet</p><strong>Rp {formatRp(inmate.saldo)}</strong></div>
              <span className={`status-pill ${inmate.tier === 'High-Risk' ? 'pill-danger' : 'pill-active'}`}>{inmate.tier}</span>
            </div>
          )}
          <div className="menu-sections">
            {Object.entries(MENU).map(([cat, items]) => (
              <div key={cat} className="menu-category">
                <h4>{cat.toUpperCase()}</h4>
                <div className="menu-items">
                  {items.map(item => (
                    <div key={item.name} className="menu-item" onClick={() => addToCart(item)}>
                      <span>{item.name}</span>
                      <span className="menu-price">{item.price === 0 ? 'Gratis' : `Rp ${formatRp(item.price)}`}</span>
                      <button className="action-btn">+ ADD</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">🛒 KERANJANG BELANJA</div>
          {cart.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '30px 0' }}>Keranjang kosong</p>
          ) : (
            <table className="data-table" style={{ marginBottom: '16px' }}>
              <thead><tr><th>Item</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
              <tbody>
                {cart.map(c => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button className="action-btn" onClick={() => updateQty(c.name, -1)} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>−</button>
                        <span>{c.qty}</span>
                        <button className="action-btn" onClick={() => updateQty(c.name, 1)} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>+</button>
                      </div>
                    </td>
                    <td>Rp {formatRp(c.price * c.qty)}</td>
                    <td><button className="action-btn" onClick={() => removeFromCart(c.name)} style={{ color: 'var(--rust)', borderColor: 'var(--rust)' }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '16px' }}>
            <h2 style={{ color: 'var(--orange)', fontSize: '1.4rem' }}>TOTAL: Rp {formatRp(total)}</h2>
          </div>

          {/* PAYMENT METHOD SELECTOR */}
          {cart.length > 0 && (
            <div className="midtrans-pay-method">
              <label style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                METODE PEMBAYARAN
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  className={`pay-method-btn ${payMethod === 'midtrans' ? 'active' : ''}`}
                  onClick={() => setPayMethod('midtrans')}
                  style={{
                    flex: 1,
                    padding: '14px 12px',
                    borderRadius: '10px',
                    border: payMethod === 'midtrans' ? '2px solid #00d4aa' : '1px solid var(--border)',
                    background: payMethod === 'midtrans' ? 'rgba(0,212,170,0.1)' : 'rgba(255,255,255,0.03)',
                    color: payMethod === 'midtrans' ? '#00d4aa' : 'var(--text-dim)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>💳</div>
                  MIDTRANS
                  <div style={{ fontSize: '0.6rem', opacity: 0.7, marginTop: '2px' }}>GoPay, QRIS, Transfer, VA</div>
                </button>
                <button
                  className={`pay-method-btn ${payMethod === 'ewallet' ? 'active' : ''}`}
                  onClick={() => setPayMethod('ewallet')}
                  style={{
                    flex: 1,
                    padding: '14px 12px',
                    borderRadius: '10px',
                    border: payMethod === 'ewallet' ? '2px solid #f39c12' : '1px solid var(--border)',
                    background: payMethod === 'ewallet' ? 'rgba(243,156,18,0.1)' : 'rgba(255,255,255,0.03)',
                    color: payMethod === 'ewallet' ? '#f39c12' : 'var(--text-dim)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>💰</div>
                  E-WALLET
                  <div style={{ fontSize: '0.6rem', opacity: 0.7, marginTop: '2px' }}>Potong saldo internal</div>
                </button>
              </div>

              {payMethod === 'ewallet' && inmate && total > (inmate.saldo || 0) && (
                <div className="error-box" style={{ marginBottom: '12px' }}>
                  ⚠️ Saldo tidak cukup! Saldo: Rp {formatRp(inmate.saldo)}, Kebutuhan: Rp {formatRp(total)}
                </div>
              )}
            </div>
          )}

          {error && <div className="error-box">❌ {error}</div>}
          <button
            className="btn-primary"
            onClick={handleOrder}
            disabled={loading || cart.length === 0 || (payMethod === 'ewallet' && inmate && total > (inmate.saldo || 0))}
            style={{
              background: payMethod === 'midtrans'
                ? 'linear-gradient(135deg, #00d4aa, #00a884)'
                : 'linear-gradient(135deg, #27ae60, #2ecc71)',
            }}
          >
            {loading
              ? '⏳ Memproses...'
              : payMethod === 'midtrans'
                ? '💳 BAYAR VIA MIDTRANS'
                : '💰 BAYAR DARI E-WALLET'
            }
          </button>

          {receipt && (
            <div className="receipt-box">
              <h3>✅ Order Berhasil!</h3>
              <p>Order ID: <strong>{receipt.trxId}</strong></p>
              <p>Total: <strong>Rp {formatRp(receipt.total)}</strong></p>
              <p>Metode: <strong style={{ color: receipt.payMethod === 'Midtrans' ? '#00d4aa' : 'var(--orange)' }}>
                {receipt.payMethod}
                {receipt.midtransPayment && ` (${receipt.midtransPayment})`}
              </strong></p>
              {receipt.payMethod === 'E-Wallet' && (
                <>
                  <p>Saldo Sebelum: Rp {formatRp(receipt.saldoBefore)}</p>
                  <p>Saldo Sesudah: <strong style={{ color: 'var(--green-go)' }}>Rp {formatRp(receipt.saldoAfter)}</strong></p>
                </>
              )}
              {receipt.payMethod === 'Midtrans' && (
                <p style={{ fontSize: '0.7rem', color: '#00d4aa', marginTop: '6px' }}>
                  ✅ Dibayar via payment gateway — saldo e-wallet tidak terpotong
                </p>
              )}
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '8px' }}>Estimasi siap: 30 menit | Lokasi: Kantin Utama</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

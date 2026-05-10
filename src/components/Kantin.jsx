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

  const addToCart = (item) => {
    if (!selectedId) return alert('Pilih Napi dulu!');
    setError('');
    const existing = cart.find(c => c.name === item.name);
    if (existing) setCart(cart.map(c => c.name === item.name ? { ...c, qty: c.qty + 1 } : c));
    else setCart([...cart, { ...item, qty: 1 }]);
  };

  const removeFromCart = (name) => setCart(cart.filter(c => c.name !== name));
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const handleOrder = async () => {
    if (!selectedId || cart.length === 0) return;
    setLoading(true); setError(''); setReceipt(null);
    try {
      const res = await fetch('/api/kantin/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inmateId: selectedId, items: cart })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setReceipt(data);
      setCart([]);
      onNotif(`✅ KANTIN: Order ${data.trxId} berhasil! Total Rp ${formatRp(data.total)}`, 'green');
      onRefresh();
    } catch (e) { setError('Gagal koneksi server'); }
    setLoading(false);
  };

  const inmate = (inmates || []).find(i => i.id === selectedId);

  return (
    <>
      <div className="section-header"><h2>🛒 KANTIN PENJARA</h2><span className="badge">E-WALLET PAYMENT</span></div>
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
                    <td>{c.name}</td><td>x{c.qty}</td>
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
          {error && <div className="error-box">❌ {error}</div>}
          <button className="btn-primary" onClick={handleOrder} disabled={loading || cart.length === 0}
            style={{ background: 'linear-gradient(135deg, #27ae60, #2ecc71)' }}>
            {loading ? '⏳ Memproses...' : '💳 BAYAR DARI E-WALLET'}
          </button>

          {receipt && (
            <div className="receipt-box">
              <h3>✅ Order Berhasil!</h3>
              <p>Order ID: <strong>{receipt.trxId}</strong></p>
              <p>Total: <strong>Rp {formatRp(receipt.total)}</strong></p>
              <p>Saldo Sebelum: Rp {formatRp(receipt.saldoBefore)}</p>
              <p>Saldo Sesudah: <strong style={{ color: 'var(--green-go)' }}>Rp {formatRp(receipt.saldoAfter)}</strong></p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '8px' }}>Estimasi siap: 30 menit | Lokasi: Kantin Utama</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

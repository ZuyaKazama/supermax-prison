import React, { useState } from 'react';

const LAUNDRY_TYPES = [
  { id: 'cuci', label: 'Cuci Pakaian', price: 8000, unit: '/kg' },
  { id: 'strika', label: 'Strika', price: 10000, unit: '/5 item' },
  { id: 'cuci_strika', label: 'Cuci + Strika', price: 12000, unit: '/kg' },
];

const formatRp = (n) => isNaN(Number(n)) ? '0' : Number(n).toLocaleString('id-ID');

export default function Laundry({ inmates, onNotif, onRefresh }) {
  const [selectedId, setSelectedId] = useState('');
  const [tipe, setTipe] = useState('cuci');
  const [kg, setKg] = useState(1);
  const [isExpress, setIsExpress] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selected = LAUNDRY_TYPES.find(t => t.id === tipe);
  const basePrice = (selected?.price || 0) * kg;
  const expressPrice = isExpress ? 5000 : 0;
  const totalPrice = basePrice + expressPrice;
  const pickupDays = isExpress ? 1 : 3;
  const inmate = (inmates || []).find(i => i.id === selectedId);

  const handleSubmit = async () => {
    if (!selectedId) return alert('Pilih Napi dulu!');
    setLoading(true); setError(''); setReceipt(null);
    try {
      const res = await fetch('/api/laundry/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inmateId: selectedId, tipe, kg, express: isExpress })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setReceipt(data);
      onNotif(`👕 LAUNDRY: Order ${data.trxId} berhasil! ${data.kg}kg`, 'green');
      onRefresh();
    } catch (e) { setError('Gagal koneksi server'); }
    setLoading(false);
  };

  const pickupDate = new Date();
  pickupDate.setDate(pickupDate.getDate() + pickupDays);

  return (
    <>
      <div className="section-header"><h2>👕 LAYANAN LAUNDRY</h2><span className="badge">UNLIMITED HARIAN</span></div>
      <div className="kantin-grid">
        <div className="panel">
          <div className="panel-title">FORMULIR LAUNDRY</div>
          <div className="form-group">
            <label>Narapidana</label>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setReceipt(null); setError(''); }}>
              <option value="">-- Pilih Napi --</option>
              {(inmates || []).map(i => <option key={i.id} value={i.id}>{i.id} - {i.alias} (Saldo: Rp {formatRp(i.saldo)})</option>)}
            </select>
          </div>
          {selectedId && inmate && (
            <div className="wallet-badge">
              <span>💰</span>
              <div><p>Saldo E-Wallet</p><strong>Rp {formatRp(inmate.saldo)}</strong></div>
            </div>
          )}
          <div className="form-group">
            <label>Tipe Layanan</label>
            <select value={tipe} onChange={e => setTipe(e.target.value)}>
              {LAUNDRY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label} — Rp {formatRp(t.price)} {t.unit}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Jumlah (kg / set)</label>
            <input type="number" min="1" max="20" value={kg} onChange={e => setKg(Math.max(1, Math.min(20, Number(e.target.value))))} />
          </div>
          <div className="express-toggle" onClick={() => setIsExpress(!isExpress)}>
            <div className={`toggle-switch ${isExpress ? 'active' : ''}`}><div className="toggle-knob"></div></div>
            <div>
              <strong>Express (1 Hari)</strong>
              <p>+Rp 5.000 untuk layanan express</p>
            </div>
          </div>

          <div className="service-summary">
            <div className="summary-row"><span>Layanan:</span><strong>{selected?.label}</strong></div>
            <div className="summary-row"><span>Jumlah:</span><strong>{kg} {tipe === 'strika' ? 'set' : 'kg'}</strong></div>
            <div className="summary-row"><span>Harga dasar:</span><strong>Rp {formatRp(basePrice)}</strong></div>
            {isExpress && <div className="summary-row"><span>Express:</span><strong style={{ color: 'var(--orange)' }}>+Rp 5.000</strong></div>}
            <div className="summary-row total"><span>Total:</span><strong style={{ color: 'var(--orange)' }}>Rp {formatRp(totalPrice)}</strong></div>
            <div className="summary-row"><span>Estimasi selesai:</span><strong>{pickupDays} hari kerja</strong></div>
            <div className="summary-row"><span>Pickup:</span><strong>{pickupDate.toLocaleDateString('id-ID')}</strong></div>
          </div>

          {error && <div className="error-box">❌ {error}</div>}
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || !selectedId}
            style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)' }}>
            {loading ? '⏳ Memproses...' : '👕 SUBMIT LAUNDRY'}
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">📋 INFO LAUNDRY</div>
          <div className="info-cards">
            <div className="info-card"><span>🕐</span><p>Normal: 3-4 hari kerja</p></div>
            <div className="info-card"><span>⚡</span><p>Express: 1 hari kerja (+Rp 5.000)</p></div>
            <div className="info-card"><span>📍</span><p>Pickup: Unit Laundry Blok C</p></div>
            <div className="info-card"><span>♾️</span><p>Tanpa limit harian</p></div>
          </div>
          {receipt && (
            <div className="receipt-box">
              <h3>✅ Laundry Diterima!</h3>
              <p>Laundry ID: <strong>{receipt.trxId}</strong></p>
              <p>Jumlah: <strong>{receipt.kg} {tipe === 'strika' ? 'set' : 'kg'}</strong></p>
              <p>Total: <strong>Rp {formatRp(receipt.totalPrice)}</strong></p>
              <p>Pickup: <strong>{pickupDate.toLocaleDateString('id-ID')} ({receipt.pickupDays} hari)</strong></p>
              <p>Saldo Sebelum: Rp {formatRp(receipt.saldoBefore)}</p>
              <p>Saldo Sesudah: <strong style={{ color: 'var(--green-go)' }}>Rp {formatRp(receipt.saldoAfter)}</strong></p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

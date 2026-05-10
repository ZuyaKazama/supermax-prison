import React, { useState } from 'react';

const TELEPON_OPTIONS = [
  { id: 'lokal_3', label: 'Lokal (3 menit)', price: 10000, mins: 3 },
  { id: 'lokal_5', label: 'Lokal (5 menit)', price: 15000, mins: 5 },
  { id: 'lokal_10', label: 'Lokal (10 menit)', price: 25000, mins: 10 },
  { id: 'intl_per_min', label: 'Internasional (per menit)', price: 20000, mins: 0 },
  { id: 'video_5', label: 'Video Call (5 menit)', price: 30000, mins: 5 },
];

const formatRp = (n) => isNaN(Number(n)) ? '0' : Number(n).toLocaleString('id-ID');

export default function Telepon({ inmates, onNotif, onRefresh }) {
  const [selectedId, setSelectedId] = useState('');
  const [tipe, setTipe] = useState('lokal_10');
  const [intlMins, setIntlMins] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selected = TELEPON_OPTIONS.find(o => o.id === tipe);
  const totalPrice = tipe === 'intl_per_min' ? 20000 * intlMins : (selected?.price || 0);
  const totalMins = tipe === 'intl_per_min' ? intlMins : (selected?.mins || 0);
  const inmate = (inmates || []).find(i => i.id === selectedId);

  const handleBook = async () => {
    if (!selectedId) return alert('Pilih Napi dulu!');
    setLoading(true); setError(''); setReceipt(null);
    try {
      const res = await fetch('/api/telepon/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inmateId: selectedId, tipe, durasi: tipe === 'intl_per_min' ? intlMins : totalMins })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setReceipt(data);
      onNotif(`📞 TELEPON: Booking ${data.trxId} berhasil! ${data.durasi} menit`, 'green');
      onRefresh();
    } catch (e) { setError('Gagal koneksi server'); }
    setLoading(false);
  };

  const now = new Date();
  const slot1Start = new Date(now.getTime() + 30 * 60000);
  const slot1End = new Date(slot1Start.getTime() + totalMins * 60000);
  const fmtTime = (d) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="section-header"><h2>📞 LAYANAN TELEPON</h2><span className="badge">MAX 30 MENIT/HARI</span></div>
      <div className="kantin-grid">
        <div className="panel">
          <div className="panel-title">BOOKING TELEPON</div>
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
              {TELEPON_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label} — Rp {formatRp(o.price)}{o.id === 'intl_per_min' ? '/mnt' : ''}</option>)}
            </select>
          </div>
          {tipe === 'intl_per_min' && (
            <div className="form-group">
              <label>Durasi (menit)</label>
              <input type="number" min="1" max="10" value={intlMins} onChange={e => setIntlMins(Math.max(1, Math.min(10, Number(e.target.value))))} />
            </div>
          )}
          <div className="service-summary">
            <div className="summary-row"><span>Durasi:</span><strong>{totalMins} menit</strong></div>
            <div className="summary-row"><span>Biaya:</span><strong style={{ color: 'var(--orange)' }}>Rp {formatRp(totalPrice)}</strong></div>
            <div className="summary-row"><span>Slot tersedia:</span><strong>{fmtTime(slot1Start)} - {fmtTime(slot1End)}</strong></div>
          </div>
          {error && <div className="error-box">❌ {error}</div>}
          <button className="btn-primary" onClick={handleBook} disabled={loading || !selectedId}
            style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)' }}>
            {loading ? '⏳ Memproses...' : '📞 BOOKING TELEPON'}
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">📋 INFO & RECEIPT</div>
          <div className="info-cards">
            <div className="info-card"><span>📍</span><p>Lokasi: Ruang Telepon Blok A</p></div>
            <div className="info-card"><span>⏰</span><p>Hadir 5 menit sebelum slot</p></div>
            <div className="info-card"><span>🔒</span><p>Nomor tujuan disembunyikan untuk keamanan</p></div>
            <div className="info-card"><span>⚠️</span><p>Limit: Maksimal 30 menit per hari</p></div>
          </div>
          {receipt && (
            <div className="receipt-box">
              <h3>✅ Booking Telepon Berhasil!</h3>
              <p>Slot ID: <strong>{receipt.trxId}</strong></p>
              <p>Durasi: <strong>{receipt.durasi} menit</strong></p>
              <p>Waktu: <strong>{fmtTime(slot1Start)} - {fmtTime(slot1End)} (Hari ini)</strong></p>
              <p>Biaya: <strong>Rp {formatRp(receipt.totalPrice)}</strong></p>
              <p>Saldo Sebelum: Rp {formatRp(receipt.saldoBefore)}</p>
              <p>Saldo Sesudah: <strong style={{ color: 'var(--green-go)' }}>Rp {formatRp(receipt.saldoAfter)}</strong></p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

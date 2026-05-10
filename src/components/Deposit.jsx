import React, { useState } from 'react';

const formatRp = (n) => isNaN(Number(n)) ? '0' : Number(n).toLocaleString('id-ID');

export default function Deposit({ inmates, onNotif, onRefresh }) {
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inmate = (inmates || []).find(i => i.id === selectedId);
  const presets = [50000, 100000, 200000, 500000];

  const handleDeposit = async () => {
    if (!selectedId || !amount || Number(amount) <= 0) return alert('Pilih napi dan masukkan nominal!');
    setLoading(true); setError(''); setReceipt(null);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inmateId: selectedId, amount: Number(amount) })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setReceipt(data);
      setAmount('');
      onNotif(`💰 DEPOSIT: ${data.trxId} berhasil! +Rp ${formatRp(Number(amount))}`, 'green');
      onRefresh();
    } catch (e) { setError('Gagal koneksi server'); }
    setLoading(false);
  };

  return (
    <>
      <div className="section-header"><h2>💰 DEPOSIT E-WALLET</h2><span className="badge">TOP-UP SALDO</span></div>
      <div className="kantin-grid">
        <div className="panel">
          <div className="panel-title">FORMULIR DEPOSIT</div>
          <div className="form-group">
            <label>Narapidana Penerima</label>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setReceipt(null); setError(''); }}>
              <option value="">-- Pilih Napi --</option>
              {(inmates || []).map(i => <option key={i.id} value={i.id}>{i.id} - {i.alias} (Saldo: Rp {formatRp(i.saldo)})</option>)}
            </select>
          </div>
          {selectedId && inmate && (
            <div className="wallet-badge">
              <span>💰</span>
              <div><p>Saldo Saat Ini</p><strong>Rp {formatRp(inmate.saldo)}</strong></div>
              <span className="status-pill pill-active">AKTIF</span>
            </div>
          )}
          <div className="form-group">
            <label>Nominal Deposit (Rp)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Masukkan nominal..." min="1000" />
          </div>
          <div className="preset-amounts">
            {presets.map(p => (
              <button key={p} className={`preset-btn ${Number(amount) === p ? 'active' : ''}`} onClick={() => setAmount(String(p))}>
                Rp {formatRp(p)}
              </button>
            ))}
          </div>
          {amount && Number(amount) > 0 && inmate && (
            <div className="service-summary">
              <div className="summary-row"><span>Deposit:</span><strong style={{ color: 'var(--green-go)' }}>+Rp {formatRp(amount)}</strong></div>
              <div className="summary-row"><span>Saldo Sekarang:</span><strong>Rp {formatRp(inmate.saldo)}</strong></div>
              <div className="summary-row total"><span>Saldo Sesudah:</span><strong style={{ color: 'var(--green-go)' }}>Rp {formatRp((inmate.saldo || 0) + Number(amount))}</strong></div>
            </div>
          )}
          {error && <div className="error-box">❌ {error}</div>}
          <button className="btn-primary" onClick={handleDeposit} disabled={loading || !selectedId || !amount}
            style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)' }}>
            {loading ? '⏳ Memproses...' : '💰 PROSES DEPOSIT'}
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">📋 INFO E-WALLET</div>
          <div className="info-cards">
            <div className="info-card"><span>🔒</span><p>E-wallet internal, tidak bisa withdraw/transfer keluar</p></div>
            <div className="info-card"><span>👨‍👩‍👧</span><p>Keluarga bisa deposit melalui admin</p></div>
            <div className="info-card"><span>📊</span><p>Semua transaksi tercatat otomatis</p></div>
            <div className="info-card"><span>🛡️</span><p>Saldo dijamin aman oleh sistem</p></div>
          </div>
          {receipt && (
            <div className="receipt-box">
              <h3>✅ Deposit Berhasil!</h3>
              <p>ID Transaksi: <strong>{receipt.trxId}</strong></p>
              <p>Saldo Sebelum: Rp {formatRp(receipt.saldoBefore)}</p>
              <p>Saldo Sesudah: <strong style={{ color: 'var(--green-go)' }}>Rp {formatRp(receipt.saldoAfter)}</strong></p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

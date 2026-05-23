import React, { useState } from 'react';

const formatRp = (n) => isNaN(Number(n)) ? '0' : Number(n).toLocaleString('id-ID');

export default function Deposit({ inmates, onNotif, onRefresh }) {
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState('midtrans'); // 'midtrans' | 'manual'

  const inmate = (inmates || []).find(i => i.id === selectedId);
  const presets = [50000, 100000, 200000, 500000];

  // === DEPOSIT MANUAL (admin langsung tambah saldo) ===
  const handleDepositManual = async () => {
    if (!selectedId || !amount || Number(amount) <= 0) return alert('Pilih napi dan masukkan nominal!');
    setLoading(true); setError(''); setReceipt(null);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inmateId: selectedId, amount: Number(amount) })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setReceipt({ ...data, payMethod: 'Manual (Admin)' });
      setAmount('');
      onNotif(`💰 DEPOSIT: ${data.trxId} berhasil! +Rp ${formatRp(Number(amount))} (Manual)`, 'green');
      onRefresh();
    } catch (e) { setError('Gagal koneksi server'); }
    setLoading(false);
  };

  // === DEPOSIT VIA MIDTRANS (keluarga bayar via payment gateway) ===
  const handleDepositMidtrans = async () => {
    if (!selectedId || !amount || Number(amount) <= 0) return alert('Pilih napi dan masukkan nominal!');
    setLoading(true); setError(''); setReceipt(null);

    try {
      // 1. Minta Snap token dari backend
      const res = await fetch('/api/midtrans/deposit-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inmateId: selectedId, amount: Number(amount) })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }

      // 2. Buka Midtrans Snap popup
      if (!window.snap) {
        setError('Midtrans Snap belum dimuat. Refresh halaman.');
        setLoading(false);
        return;
      }

      const depositAmount = Number(amount);

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
                saldoBefore: confirmData.saldoBefore,
                saldoAfter: confirmData.saldoAfter,
                payMethod: 'Midtrans',
                midtransPayment: result.payment_type,
              });
              setAmount('');
              onNotif(`💳 DEPOSIT: ${data.orderId} berhasil via Midtrans! +Rp ${formatRp(depositAmount)}`, 'green');
              onRefresh();
            }
          } catch (e) {
            setError('Pembayaran berhasil tapi gagal konfirmasi. Hubungi admin.');
          }
          setLoading(false);
        },
        onPending: (result) => {
          onNotif(`⏳ DEPOSIT: Pembayaran ${data.orderId} menunggu konfirmasi...`, 'incoming');
          setError('Pembayaran menunggu konfirmasi. Saldo akan otomatis bertambah setelah pembayaran dikonfirmasi.');
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

  const handleDeposit = () => {
    if (payMethod === 'midtrans') handleDepositMidtrans();
    else handleDepositManual();
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

          {/* PAYMENT METHOD SELECTOR */}
          {selectedId && amount && Number(amount) > 0 && (
            <>
              <div style={{ marginTop: '16px' }}>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
                  METODE DEPOSIT
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
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
                    <div style={{ fontSize: '0.6rem', opacity: 0.7, marginTop: '2px' }}>
                      Keluarga bayar via GoPay, VA, QRIS
                    </div>
                  </button>
                  <button
                    onClick={() => setPayMethod('manual')}
                    style={{
                      flex: 1,
                      padding: '14px 12px',
                      borderRadius: '10px',
                      border: payMethod === 'manual' ? '2px solid #f39c12' : '1px solid var(--border)',
                      background: payMethod === 'manual' ? 'rgba(243,156,18,0.1)' : 'rgba(255,255,255,0.03)',
                      color: payMethod === 'manual' ? '#f39c12' : 'var(--text-dim)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>🏦</div>
                    MANUAL
                    <div style={{ fontSize: '0.6rem', opacity: 0.7, marginTop: '2px' }}>
                      Admin input deposit tunai
                    </div>
                  </button>
                </div>
              </div>

              <div className="service-summary">
                <div className="summary-row"><span>Deposit:</span><strong style={{ color: 'var(--green-go)' }}>+Rp {formatRp(amount)}</strong></div>
                <div className="summary-row"><span>Saldo Sekarang:</span><strong>Rp {formatRp(inmate.saldo)}</strong></div>
                <div className="summary-row total"><span>Saldo Sesudah:</span><strong style={{ color: 'var(--green-go)' }}>Rp {formatRp((inmate.saldo || 0) + Number(amount))}</strong></div>
                <div className="summary-row">
                  <span>Via:</span>
                  <strong style={{ color: payMethod === 'midtrans' ? '#00d4aa' : '#f39c12' }}>
                    {payMethod === 'midtrans' ? '💳 Midtrans Payment Gateway' : '🏦 Input Manual Admin'}
                  </strong>
                </div>
              </div>
            </>
          )}

          {error && <div className="error-box">❌ {error}</div>}
          <button
            className="btn-primary"
            onClick={handleDeposit}
            disabled={loading || !selectedId || !amount || Number(amount) <= 0}
            style={{
              background: payMethod === 'midtrans'
                ? 'linear-gradient(135deg, #00d4aa, #00a884)'
                : 'linear-gradient(135deg, #f39c12, #e67e22)',
            }}
          >
            {loading
              ? '⏳ Memproses...'
              : payMethod === 'midtrans'
                ? '💳 DEPOSIT VIA MIDTRANS'
                : '💰 PROSES DEPOSIT MANUAL'
            }
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">📋 INFO E-WALLET</div>
          <div className="info-cards">
            <div className="info-card"><span>💳</span><p>Deposit bisa via Midtrans: GoPay, QRIS, Transfer Bank, VA, Kartu Kredit</p></div>
            <div className="info-card"><span>👨‍👩‍👧</span><p>Keluarga bisa deposit langsung dari HP melalui link pembayaran Midtrans</p></div>
            <div className="info-card"><span>🔒</span><p>E-wallet internal, tidak bisa withdraw/transfer keluar penjara</p></div>
            <div className="info-card"><span>📊</span><p>Semua transaksi tercatat otomatis dengan ID unik</p></div>
            <div className="info-card"><span>🛡️</span><p>Pembayaran dijamin aman oleh Midtrans (PCI-DSS Certified)</p></div>
          </div>

          {/* Midtrans payment methods info */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(0,212,170,0.05)',
            border: '1px solid rgba(0,212,170,0.15)',
          }}>
            <h4 style={{ color: '#00d4aa', fontSize: '0.8rem', marginBottom: '10px', letterSpacing: '1px' }}>
              💳 METODE PEMBAYARAN MIDTRANS
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {['GoPay', 'QRIS', 'BCA VA', 'BNI VA', 'Mandiri VA', 'BRI VA', 'Permata VA', 'Kartu Kredit', 'Alfamart', 'Indomaret'].map(m => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#00d4aa' }}>✓</span> {m}
                </div>
              ))}
            </div>
          </div>

          {receipt && (
            <div className="receipt-box" style={{ marginTop: '16px' }}>
              <h3>✅ Deposit Berhasil!</h3>
              <p>ID Transaksi: <strong>{receipt.trxId}</strong></p>
              <p>Metode: <strong style={{ color: receipt.payMethod === 'Midtrans' ? '#00d4aa' : 'var(--orange)' }}>
                {receipt.payMethod}
                {receipt.midtransPayment && ` (${receipt.midtransPayment})`}
              </strong></p>
              <p>Saldo Sebelum: Rp {formatRp(receipt.saldoBefore)}</p>
              <p>Saldo Sesudah: <strong style={{ color: 'var(--green-go)' }}>Rp {formatRp(receipt.saldoAfter)}</strong></p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

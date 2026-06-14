import React, { useState, useEffect } from 'react';

const formatRp = (n) => isNaN(Number(n)) ? '0' : Number(n).toLocaleString('id-ID');

const JENIS_ICONS = { kantin: '🛒', telepon: '📞', laundry: '👕', deposit: '💰' };
const JENIS_COLORS = { kantin: 'var(--green-go)', telepon: 'var(--blue-accent)', laundry: '#9b59b6', deposit: 'var(--orange)' };

export default function Riwayat({ inmates }) {
  const [trxList, setTrxList] = useState([]);
  const [filterId, setFilterId] = useState('');
  const [filterJenis, setFilterJenis] = useState('');

  const fetchTrx = async () => {
    const url = filterId ? `/api/transactions?inmateId=${filterId}` : '/api/transactions';
    try {
      const res = await fetch(url);
      if (res.ok) setTrxList(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchTrx(); }, [filterId]);

  const filtered = filterJenis ? trxList.filter(t => t.jenis === filterJenis) : trxList;

  return (
    <>
      <div className="section-header"><h2>📊 RIWAYAT TRANSAKSI</h2><span className="badge">{filtered.length} RECORD</span></div>
      <div className="form-row" style={{ marginBottom: '16px' }}>
        <div className="form-group">
          <label>Filter Napi</label>
          <select value={filterId} onChange={e => setFilterId(e.target.value)}>
            <option value="">Semua Napi</option>
            {(inmates || []).map(i => <option key={i.id} value={i.id}>{i.id} - {i.alias}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Filter Layanan</label>
          <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)}>
            <option value="">Semua</option>
            <option value="telepon">📞 Telepon</option>
            <option value="deposit">💰 Deposit</option>
          </select>
        </div>
      </div>
      <div className="data-table-container" style={{ height: 'auto', maxHeight: '600px' }}>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Layanan</th><th>Napi</th><th>Total</th><th>Saldo</th><th>Waktu</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Belum ada transaksi</td></tr>
            ) : filtered.map(t => {
              const inmateData = (inmates || []).find(i => i.id === t.inmate_id);
              return (
                <tr key={t.id}>
                  <td style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '0.7rem' }}>{t.trx_id}</td>
                  <td><span className="status-pill" style={{ background: `${JENIS_COLORS[t.jenis]}20`, color: JENIS_COLORS[t.jenis], border: `1px solid ${JENIS_COLORS[t.jenis]}40` }}>{JENIS_ICONS[t.jenis]} {t.jenis?.toUpperCase()}</span></td>
                  <td>{inmateData?.alias || t.inmate_id}</td>
                  <td style={{ color: t.jenis === 'deposit' ? 'var(--green-go)' : 'var(--orange)' }}>{t.jenis === 'deposit' ? '+' : '-'}Rp {formatRp(t.total)}</td>
                  <td style={{ fontSize: '0.7rem' }}>Rp {formatRp(t.saldo_sesudah)}</td>
                  <td style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{t.created_at}</td>
                  <td><span className="status-pill pill-active">{t.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

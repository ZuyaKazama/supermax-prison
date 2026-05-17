import React, { useState } from 'react';

const formatRp = (n) => isNaN(Number(n)) ? '0' : Number(n).toLocaleString('id-ID');

const getThreatLabel = (points) => {
  const pts = Number(points) || 0;
  if (pts >= 100) return 'EXTREME';
  if (pts >= 50) return 'HIGH';
  if (pts >= 20) return 'MEDIUM';
  return 'LOW';
};

export default function DataNapi({ inmates, onNotif, onRefresh, user }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNapi, setNewNapi] = useState({
    alias: '', crimeType: 'Sindikat Narkoba', cell: 'BLOK-A (Max)',
    age: '', gender: 'L', job: 'Tidak Ada', description: '',
    threat: '🔴 EXTREME', sentenceType: 'Angka', sentenceYears: ''
  });

  const filtered = (inmates || []).filter(i => {
    const matchSearch = !search ||
      (i.alias || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.crimeType || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.cell || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus ||
      (filterStatus === 'High-Risk' && i.tier === 'High-Risk') ||
      (filterStatus === 'Reguler' && i.tier === 'Reguler') ||
      (filterStatus === 'Trusty' && i.tier === 'Trusty');
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id, alias) => {
    if (window.confirm(`⚠ YAKIN HAPUS DATA ${alias}?`)) {
      try {
        const res = await fetch(`/api/inmates/${id}`, { method: 'DELETE' });
        if (res.ok) {
          onNotif(`🗑️ Data ${alias} (${id}) telah dihapus`, 'error');
          onRefresh();
        }
      } catch (err) { alert('Gagal menghapus!'); }
    }
  };

  const startEdit = (inmate) => {
    setEditId(inmate.id);
    setEditData({ ...inmate });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    try {
      const res = await fetch(`/api/inmates/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      if (res.ok) {
        onNotif(`✏️ Data ${editData.alias} berhasil diupdate`, 'green');
        onRefresh();
        setEditId(null);
        setEditData({});
      } else {
        alert('Gagal update data!');
      }
    } catch (err) { alert('Gagal koneksi server!'); }
  };

  const handleAdd = async () => {
    if (!newNapi.alias || !newNapi.age || !newNapi.description) return alert('Lengkapi Alias, Umur, dan Deskripsi!');
    if (newNapi.sentenceType === 'Angka' && !newNapi.sentenceYears) return alert('Isi Lama Tahun Hukuman!');

    let wage = 0;
    if (newNapi.job === 'Tukang Sapu') wage = 15000;
    if (newNapi.job === 'Pekerja Pabrik') wage = 25000;
    if (newNapi.job === 'Admin Perpus') wage = 30000;
    if (newNapi.job === 'Koki Dapur') wage = 45000;

    let points = 10, tier = 'Trusty';
    if ((newNapi.threat || '').includes('EXTREME')) { points = 150; tier = 'High-Risk'; }
    else if ((newNapi.threat || '').includes('HIGH')) { points = 80; tier = 'High-Risk'; }
    else if ((newNapi.threat || '').includes('MEDIUM')) { points = 40; tier = 'Reguler'; }

    let exitDate = '';
    if (newNapi.sentenceType === 'Mati') exitDate = 'Hukuman Mati';
    else if (newNapi.sentenceType === 'Seumur Hidup') exitDate = 'Seumur Hidup';
    else exitDate = `Tahun ${new Date().getFullYear() + Number(newNapi.sentenceYears)}`;

    const inmateData = {
      id: 'NXP-' + Math.floor(Math.random() * 90000 + 10000),
      alias: newNapi.alias, tier, crimeType: newNapi.crimeType, cell: newNapi.cell,
      points, saldo: 0, age: Number(newNapi.age), gender: newNapi.gender,
      entryDate: new Date().toLocaleDateString('id-ID'), exitDate,
      job: newNapi.job, wage, description: newNapi.description
    };

    try {
      const res = await fetch('/api/inmates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inmateData)
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        onNotif(`✅ REGISTRASI: Napi ${newNapi.alias} masuk database!`, 'outgoing');
        onRefresh();
        setNewNapi({
          alias: '', crimeType: 'Sindikat Narkoba', cell: 'BLOK-A (Max)',
          age: '', gender: 'L', job: 'Tidak Ada', description: '',
          threat: '🔴 EXTREME', sentenceType: 'Angka', sentenceYears: ''
        });
      }
    } catch (err) { alert('Gagal koneksi!'); }
  };

  return (
    <>
      {/* Add Modal */}
      <div className={`modal-overlay ${isAddModalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target.className.includes('modal-overlay')) setIsAddModalOpen(false); }}>
        <div className="modal-box" style={{ maxWidth: '650px' }}>
          <div className="modal-header"><h3>🔒 Registrasi Narapidana Baru</h3><button className="modal-close" onClick={() => setIsAddModalOpen(false)}>✕</button></div>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            <div className="form-row"><div className="form-group"><label>Alias / Julukan</label><input type="text" value={newNapi.alias} onChange={e => setNewNapi({...newNapi, alias: e.target.value})} placeholder="Misal: El Kartel" /></div><div className="form-group"><label>Umur (Tahun)</label><input type="number" value={newNapi.age} onChange={e => setNewNapi({...newNapi, age: e.target.value})} placeholder="Misal: 45" /></div></div>
            <div className="form-row"><div className="form-group"><label>Jenis Kelamin</label><select value={newNapi.gender} onChange={e => setNewNapi({...newNapi, gender: e.target.value})}><option value="L">Laki-Laki</option><option value="P">Perempuan</option></select></div><div className="form-group"><label>Jenis Kejahatan</label><select value={newNapi.crimeType} onChange={e => setNewNapi({...newNapi, crimeType: e.target.value})}><option>Korupsi Kelas Kakap</option><option>Sindikat Narkoba</option><option>Kejahatan Siber</option><option>Pembunuhan Berencana</option></select></div></div>
            <div className="form-row"><div className="form-group"><label>Level Bahaya</label><select value={newNapi.threat} onChange={e => setNewNapi({...newNapi, threat: e.target.value})}><option>🔴 EXTREME</option><option>🟠 HIGH</option><option>🟡 MEDIUM</option><option>🟢 LOW</option></select></div><div className="form-group"><label>Blok Sel</label><select value={newNapi.cell} onChange={e => setNewNapi({...newNapi, cell: e.target.value})}><option>BLOK-A (Max)</option><option>BLOK-B (Reguler)</option><option>BLOK-S (Isolasi)</option></select></div></div>
            <div className="form-row"><div className="form-group"><label>Tipe Hukuman</label><select value={newNapi.sentenceType} onChange={e => setNewNapi({...newNapi, sentenceType: e.target.value})}><option value="Angka">Durasi Waktu (Tahun)</option><option value="Seumur Hidup">Seumur Hidup</option><option value="Mati">Hukuman Mati</option></select></div>{newNapi.sentenceType === 'Angka' ? (<div className="form-group"><label>Lama (Tahun)</label><input type="number" value={newNapi.sentenceYears} onChange={e => setNewNapi({...newNapi, sentenceYears: e.target.value})} placeholder="Misal: 27" /></div>) : (<div className="form-group"><label>Lama (Tahun)</label><input type="text" disabled value="KUNCI SISTEM" style={{ backgroundColor: '#222' }} /></div>)}</div>
            <div className="form-row"><div className="form-group"><label>Pekerjaan</label><select value={newNapi.job} onChange={e => setNewNapi({...newNapi, job: e.target.value})}><option value="Tidak Ada">Tidak Ada (Rp 0)</option><option value="Tukang Sapu">Tukang Sapu (Rp 15.000)</option><option value="Pekerja Pabrik">Pekerja Pabrik (Rp 25.000)</option><option value="Admin Perpus">Admin Perpus (Rp 30.000)</option><option value="Koki Dapur">Koki Dapur (Rp 45.000)</option></select></div><div className="form-group"><label>Deskripsi</label><input type="text" value={newNapi.description} onChange={e => setNewNapi({...newNapi, description: e.target.value})} placeholder="Catatan kejahatan..." /></div></div>
            <button className="btn-primary" onClick={handleAdd}>⛓️ SIMPAN KE DATABASE</button>
          </div>
        </div>
      </div>

      {/* CRUD Table Page - matching screenshot style */}
      <div className="crud-page">
        <div className="crud-header">
          <div className="crud-header-left">
            <span className="crud-header-icon">📋</span>
            <div>
              <h2 className="crud-title">Data Narapidana</h2>
              <p className="crud-subtitle">Total {filtered.length} narapidana ditemukan</p>
            </div>
          </div>
          {user?.role === 'warden' && (
            <button className="crud-add-btn" onClick={() => setIsAddModalOpen(true)}>
              + Tambah Narapidana
            </button>
          )}
        </div>

        <div className="crud-toolbar">
          <div className="crud-search-wrapper">
            <svg className="crud-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              className="crud-search"
              placeholder="Cari nama, ID, kejahatan, blok..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="crud-filter-group">
            <select className="crud-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="High-Risk">High-Risk</option>
              <option value="Reguler">Reguler</option>
              <option value="Trusty">Trusty</option>
            </select>
            <button className="crud-search-btn" onClick={onRefresh}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
        </div>

        <div className="crud-table-wrapper">
          <table className="crud-table">
            <thead>
              <tr>
                <th className="crud-th">NO.</th>
                <th className="crud-th">AKSI</th>
                <th className="crud-th">ID NAPI</th>
                <th className="crud-th">ALIAS</th>
                <th className="crud-th">KEJAHATAN</th>
                <th className="crud-th">BLOK SEL</th>
                <th className="crud-th">UMUR</th>
                <th className="crud-th">JK</th>
                <th className="crud-th">PEKERJAAN</th>
                <th className="crud-th">GAJI</th>
                <th className="crud-th">SALDO</th>
                <th className="crud-th">HUKUMAN</th>
                <th className="crud-th">TANGGAL MASUK</th>
                <th className="crud-th">LEVEL BAHAYA</th>
                <th className="crud-th">STATUS TIER</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="15" className="crud-empty">Tidak ada data narapidana ditemukan</td></tr>
              ) : filtered.map((inmate, idx) => (
                <tr key={inmate.id} className="crud-tr">
                  <td className="crud-td crud-td-center">{idx + 1}</td>
                  <td className="crud-td crud-td-actions">
                    {editId === inmate.id ? (
                      <>
                        <button className="crud-action-save" onClick={saveEdit} title="Simpan">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                        <button className="crud-action-cancel" onClick={cancelEdit} title="Batal">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="crud-action-edit" onClick={() => startEdit(inmate)} title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        {user?.role === 'warden' && (
                          <button className="crud-action-delete" onClick={() => handleDelete(inmate.id, inmate.alias)} title="Hapus">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        )}
                      </>
                    )}
                  </td>
                  <td className="crud-td crud-td-id">{inmate.id}</td>
                  <td className="crud-td crud-td-name">
                    {editId === inmate.id ? (
                      <input type="text" className="crud-inline-input" value={editData.alias || ''} onChange={e => setEditData({...editData, alias: e.target.value})} />
                    ) : inmate.alias}
                  </td>
                  <td className="crud-td">
                    {editId === inmate.id ? (
                      <select className="crud-inline-input" value={editData.crimeType || ''} onChange={e => setEditData({...editData, crimeType: e.target.value})}>
                        <option>Korupsi Kelas Kakap</option><option>Sindikat Narkoba</option><option>Kejahatan Siber</option><option>Pembunuhan Berencana</option>
                      </select>
                    ) : inmate.crimeType}
                  </td>
                  <td className="crud-td">
                    {editId === inmate.id ? (
                      <select className="crud-inline-input" value={editData.cell || ''} onChange={e => setEditData({...editData, cell: e.target.value})}>
                        <option>BLOK-A (Max)</option><option>BLOK-B (Reguler)</option><option>BLOK-S (Isolasi)</option>
                      </select>
                    ) : inmate.cell}
                  </td>
                  <td className="crud-td crud-td-center">{inmate.age}</td>
                  <td className="crud-td crud-td-center">{inmate.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                  <td className="crud-td">
                    {editId === inmate.id ? (
                      <select className="crud-inline-input" value={editData.job || ''} onChange={e => setEditData({...editData, job: e.target.value})}>
                        <option value="Tidak Ada">Tidak Ada</option><option value="Tukang Sapu">Tukang Sapu</option><option value="Pekerja Pabrik">Pekerja Pabrik</option><option value="Admin Perpus">Admin Perpus</option><option value="Koki Dapur">Koki Dapur</option>
                      </select>
                    ) : inmate.job}
                  </td>
                  <td className="crud-td">Rp {formatRp(inmate.wage)}</td>
                  <td className="crud-td crud-td-saldo">Rp {formatRp(inmate.saldo)}</td>
                  <td className="crud-td">{inmate.exitDate}</td>
                  <td className="crud-td crud-td-center">{inmate.entryDate}</td>
                  <td className="crud-td crud-td-center">
                    <span className={`crud-threat-badge threat-${getThreatLabel(inmate.points).toLowerCase()}`}>
                      {getThreatLabel(inmate.points)}
                    </span>
                  </td>
                  <td className="crud-td">
                    <span className={`crud-tier-badge tier-${(inmate.tier || '').toLowerCase().replace('-', '')}`}>
                      {inmate.tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

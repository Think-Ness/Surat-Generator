import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/utils';

function RecentInput({ label, value, onChange, placeholder, recentList }) {
  const [show, setShow] = useState(false);
  const ref = useRef();
  const filtered = recentList.filter(r => r && r !== value && r.toLowerCase().includes(value.toLowerCase()));

  useEffect(() => {
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    window.addEventListener('mousedown', click);
    return () => window.removeEventListener('mousedown', click);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label>{label}</label>
      <input
        placeholder={placeholder}
        value={value}
        onFocus={() => setShow(true)}
        onChange={e => onChange(e.target.value)}
      />
      {show && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--card)', border: '1px solid var(--accent)',
          borderRadius: 8, marginTop: 2, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
          maxHeight: 180, overflowY: 'auto',
        }}>
          {filtered.map((r, i) => (
            <div key={i} onMouseDown={() => { onChange(r); setShow(false); }}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >{r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentTextarea({ label, value, onChange, placeholder, recentList, rows }) {
  const [show, setShow] = useState(false);
  const ref = useRef();
  const filtered = recentList.filter(r => r && r !== value && r.toLowerCase().includes(value.toLowerCase()));

  useEffect(() => {
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    window.addEventListener('mousedown', click);
    return () => window.removeEventListener('mousedown', click);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label>{label}</label>
      <textarea
        placeholder={placeholder}
        value={value}
        onFocus={() => setShow(true)}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
      />
      {show && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--card)', border: '1px solid var(--accent)',
          borderRadius: 8, marginTop: 2, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
          maxHeight: 180, overflowY: 'auto',
        }}>
          {filtered.map((r, i) => (
            <div key={i} onMouseDown={() => { onChange(r); setShow(false); }}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >{r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PerizinanModal({ show, noSurat, onClose }) {
  if (!show) return null;
  const [data, setData] = useState({ Keperluan: '', Alasan: '' });
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (show) {
      // Get all perizinan history
      api.getPerizinan('').then(r => setHistory(r.data || [])).catch(() => {});
      
      if (noSurat) {
        api.getPerizinan(noSurat).then(r => {
          if (r.data && r.data.length > 0) {
            setData(r.data[0]);
          } else {
            setData({ Keperluan: '', Alasan: '' });
          }
        });
      }
    }
  }, [show, noSurat]);

  const recentKeperluan = [...new Set(history.map(h => h.Keperluan).filter(Boolean))];
  const recentAlasan = [...new Set(history.map(h => h.Alasan).filter(Boolean))];

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.insertPerizinan({ No_Surat: noSurat, ...data });
      toast('Rincian perizinan disimpan', 'success');
      onClose();
    } catch (e) {
      toast('Gagal simpan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 20
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 500 }}>
        <div className="section-title">Rincian Perizinan (No: {noSurat})</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <RecentInput 
            label="Keperluan Izin" 
            value={data.Keperluan} 
            onChange={v => setData({ ...data, Keperluan: v })} 
            placeholder="Contoh: Meninggalkan kegiatan....." 
            recentList={recentKeperluan} 
          />
          <RecentTextarea 
            label="Alasan / Keterangan Tambahan" 
            value={data.Alasan} 
            onChange={v => setData({ ...data, Alasan: v })} 
            placeholder="Contoh: Mempersiapkan acara...." 
            recentList={recentAlasan} 
            rows={4} 
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? '⏳' : '💾 Simpan'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}

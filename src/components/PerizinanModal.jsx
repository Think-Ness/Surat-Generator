import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/utils';

export default function PerizinanModal({ show, noSurat, onClose }) {
  if (!show) return null;
  const [data, setData] = useState({ Keperluan: '', Alasan: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (noSurat) {
      api.getPerizinan(noSurat).then(r => {
        if (r.data && r.data.length > 0) {
          setData(r.data[0]);
        }
      });
    }
  }, [noSurat]);

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
      position:'fixed', top:0, left:0, right:0, bottom:0,
      background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center',
      justifyContent:'center', zIndex:1000, padding:20
    }}>
      <div className="card fade-in" style={{ width:'100%', maxWidth:500 }}>
        <div className="section-title">Rincian Perizinan (No: {noSurat})</div>
        
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label>Keperluan Izin</label>
            <input 
              placeholder="Contoh: Mengikuti Lomba Memanah" 
              value={data.Keperluan} 
              onChange={e => setData({...data, Keperluan: e.target.value})} 
            />
          </div>
          <div>
            <label>Alasan / Keterangan Tambahan</label>
            <textarea 
              placeholder="Contoh: Mewakili sekolah di tingkat provinsi" 
              value={data.Alasan} 
              onChange={e => setData({...data, Alasan: e.target.value})}
              rows={4}
              style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid var(--border)' }}
            />
          </div>
          
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
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

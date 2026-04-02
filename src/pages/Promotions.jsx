import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Edit, Trash2, X, BadgePercent, Calendar } from 'lucide-react';

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'amount',
    discount_value: '',
    start_date: '',
    end_date: '',
    is_active: true
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'promotions'), snapshot => {
      setPromotions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'promotions', editingId), formData);
      } else {
        await addDoc(collection(db, 'promotions'), formData);
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch(err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('ต้องการลบโปรโมชั่นนี้ใช่หรือไม่?')) {
      await deleteDoc(doc(db, 'promotions', id));
    }
  };

  const openEdit = (p) => {
    setFormData({
      name: p.name,
      discount_type: p.discount_type || 'amount',
      discount_value: p.discount_value || '',
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      is_active: p.is_active !== false
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  }

  const openAdd = () => {
    setFormData({
      name: '',
      discount_type: 'amount',
      discount_value: '',
      start_date: '',
      end_date: '',
      is_active: true
    });
    setEditingId(null);
    setIsModalOpen(true);
  }

  return (
    <div className="animate-slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2D3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BadgePercent size={28} color="#D69E2E" /> จัดการโปรโมชั่น / ส่วนลด
          </h1>
          <p style={{ color: '#718096' }}>เพิ่มและจัดการโปรโมชั่นส่วนลดต่างๆ ของร้านค้า สำหรับใช้ในระบบ POS</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#D69E2E' }}>
          <Plus size={18} /> สร้างยอดลด / โปรโมชั่น
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
             <tr style={{ background: '#F7FAFC', borderBottom: '2px solid #E2E8F0', color: '#4A5568', fontSize: '13px' }}>
               <th style={{ padding: '12px 16px' }}>ชื่อโปรโมชั่น</th>
               <th style={{ padding: '12px 16px' }}>ประเภท / มูลค่าลด</th>
               <th style={{ padding: '12px 16px' }}>ระยะเวลาแคมเปญ</th>
               <th style={{ padding: '12px 16px' }}>สถานะใช้งาน</th>
               <th style={{ padding: '12px 16px', textAlign: 'center' }}>จัดการ</th>
             </tr>
          </thead>
          <tbody>
            {promotions.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{p.name}</td>
                <td style={{ padding: '12px 16px', color: '#E53E3E', fontWeight: 'bold' }}>
                  {p.discount_type === 'percent' ? `ลด ${p.discount_value}%` : `ลด ฿${Number(p.discount_value).toLocaleString()}`}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#718096' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> 
                    {p.start_date ? new Date(p.start_date).toLocaleDateString('th-TH') : '-'} ถึง {p.end_date ? new Date(p.end_date).toLocaleDateString('th-TH') : '-'}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`badge ${p.is_active ? 'badge-success' : 'badge-danger'}`} style={{ opacity: p.is_active ? 1 : 0.6 }}>
                    {p.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                     <button className="btn-icon" onClick={() => openEdit(p)} style={{ padding: '6px', background: '#EBF8FF', color: '#3182CE' }}><Edit size={14} /></button>
                     <button className="btn-icon" onClick={() => handleDelete(p.id)} style={{ padding: '6px', background: '#FFF5F5', color: '#E53E3E' }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#A0AEC0' }}>ยังไม่มีโปรโมชั่น (กดสร้างยอดลด / โปรโมชั่น ด้านบน)</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card animate-slide-in" style={{ width: '450px', background: 'white', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: '#FFFBEB', borderBottom: '1px solid #FEFCBF', display: 'flex', justifyContent: 'space-between' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#B7791F' }}>{editingId ? 'แก้ไขข้อมูลโปรโมชั่น' : 'สร้างโปรโมชั่น / ส่วนลด'}</h2>
                 <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#D69E2E' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                 <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>ชื่อโปรโมชั่น / แคมเปญ *</label>
                    <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="เช่น ลดล้างสต๊อก 10%" />
                 </div>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>ประเภทส่วนลด</label>
                       <select className="input" value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})}>
                          <option value="amount">หักเป็นเงินบาท (THB)</option>
                          <option value="percent">ลดเป็นเปอร์เซ็นต์ (%)</option>
                       </select>
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#E53E3E' }}>มีมูลค่าการลด *</label>
                       <input type="number" className="input" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} required min="0" step="0.01" placeholder="ระบุตัวเลข" />
                    </div>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>วันเริ่มต้นแคมเปญ</label>
                       <input type="date" className="input" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>วันสิ้นสุดแคมเปญ</label>
                       <input type="date" className="input" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                    </div>
                 </div>

                 <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', background: '#F7FAFC', padding: '12px', border: '1px dashed #CBD5E0', borderRadius: '8px' }}>
                    <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    <label htmlFor="is_active" style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', color: formData.is_active ? '#38A169' : '#A0AEC0' }}>
                       {formData.is_active ? 'สถานะ: เปิดใช้งานโปรโมชั่นนี้ในหน้าร้าน POS' : 'สถานะ: ปิดใช้งาน'}
                    </label>
                 </div>

                 <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2, background: '#D69E2E', border: 'none' }}>{editingId ? 'บันทึกการแก้ไข' : 'สร้างโปรโมชั่น'}</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

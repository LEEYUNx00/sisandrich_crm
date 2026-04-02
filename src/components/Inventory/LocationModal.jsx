import React from 'react';

export default function LocationModal({ editingLocationId, setEditingLocationId, locationFormData, setLocationFormData, handleSaveLocation }) {
  if (!editingLocationId) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card animate-slide-in" style={{ width: '480px', maxWidth: '90%', padding: '24px', backgroundColor: '#fff', borderRadius: '12px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>แก้ไขข้อมูลคลังสินค้า</h3>
        <form onSubmit={handleSaveLocation}>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '120px', fontSize: '14px', fontWeight: '600', color: '#555' }}>รหัสอ้างอิง</label>
            <input 
              type="text" 
              className="input" 
              value={locationFormData.ref} 
              onChange={(e) => setLocationFormData({...locationFormData, ref: e.target.value})}
              required
            />
          </div>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '120px', fontSize: '14px', fontWeight: '600', color: '#555' }}>ชื่อคลัง</label>
            <input 
              type="text" 
              className="input" 
              value={locationFormData.name} 
              onChange={(e) => setLocationFormData({...locationFormData, name: e.target.value})}
              required
            />
          </div>
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start' }}>
            <label style={{ width: '120px', fontSize: '14px', fontWeight: '600', color: '#555', marginTop: '8px' }}>รายละเอียด</label>
            <textarea 
              className="input" 
              style={{ minHeight: '80px' }}
              value={locationFormData.desc} 
              onChange={(e) => setLocationFormData({...locationFormData, desc: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setEditingLocationId(null)}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#48BB78', borderColor: '#48BB78', color: '#fff' }}>บันทึก</button>
          </div>
        </form>
      </div>
    </div>
  );
}

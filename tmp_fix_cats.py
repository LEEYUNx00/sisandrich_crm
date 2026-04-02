import sys

output_path = r"c:\Users\liliy\Desktop\sisandrich\WEB_CRM_POS\src\components\Inventory\AddProductView.jsx"
with open(output_path, 'r', encoding='utf-8') as f:
    text = f.read()

fixed_bottom = """      {/* ------------------------------------------------------------------
          CATEGORY CONFIG MODAL
         ------------------------------------------------------------------ */}
      {isCategoryConfigOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card animate-slide-in" style={{ width: '450px', maxWidth: '95%', maxHeight: '80vh', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2D3748' }}>⚙️ ตั้งค่าหมวดหมู่และตัวย่อ (SKU)</h3>
                <p style={{ fontSize: '13px', color: '#718096' }}>หมวดหมู่ที่ใช้แบ่งและสร้างรหัสอัตโนมัติ</p>
              </div>
              <button className="btn-icon" onClick={() => setIsCategoryConfigOpen(false)} style={{ color: '#4A5568' }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {localCats.map((c, idx) => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid #EDF2F7', borderRadius: '8px', background: '#F9FAFB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button type="button" className="btn-icon" disabled={idx === 0} onClick={() => moveUp(idx)} style={{ padding: '2px', color: idx === 0 ? '#CBD5E0' : '#4A5568' }}>▲</button>
                        <button type="button" className="btn-icon" disabled={idx === localCats.length - 1} onClick={() => moveDown(idx)} style={{ padding: '2px', color: idx === localCats.length - 1 ? '#CBD5E0' : '#4A5568' }}>▼</button>
                      </div>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#2D3748' }}>{c.name}</span>
                        <span style={{ fontSize: '12px', color: '#718096', marginLeft: '8px' }}>(ตัวย่อ: {c.prefix})</span>
                      </div>
                    </div>
                    <button type="button" className="btn-icon" onClick={() => handleDeleteLocalCategory(idx)} title="ลบหมวดหมู่นี้" style={{ padding: '6px', color: '#E53E3E' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ background: '#F7FAFC', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#4A5568' }}>เพิ่มผู้หมวดหมู่ใหม่</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input type="text" className="input" placeholder="ชื่อหมวดหมู่ (เช่น อุปกรณ์เสริม)" value={newCatName} onChange={e => setNewCatName(e.target.value)} style={{ marginBottom: '8px', padding: '8px 12px' }} required />
                    <input type="text" className="input" placeholder="ตัวย่อภาษาอังกฤษ (เช่น ACC)" value={newCatPrefix} onChange={e => setNewCatPrefix(e.target.value)} style={{ marginBottom: 0, padding: '8px 12px', textTransform: 'uppercase' }} required />
                  </div>
                  <button type="button" onClick={handleAddLocalCategory} className="btn btn-primary" style={{ padding: '10px', height: '100%' }}>
                     <Check size={16} /> บันทึกเพิ่ม
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #eee', gap: '12px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsCategoryConfigOpen(false)}>ยกเลิก</button>
              <button type="button" className="btn btn-primary" onClick={handleCommitCategoryChanges} style={{ background: '#38A169', borderColor: '#38A169' }}>บันทึกการแก้ไข</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

split_marker = "{/* ------------------------------------------------------------------"
split_index = text.rfind(split_marker) # LAST index
if split_index != -1:
    new_text = text[:split_index] + fixed_bottom
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Fixed fully via last split!")
else:
    print("Marker not found")

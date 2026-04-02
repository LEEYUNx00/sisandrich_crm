import React, { useState } from 'react';

export default function ImportPreviewModal({ importPreview, setImportPreview, selectedImportItems, setSelectedImportItems, handleConfirmImport }) {
  const [visibleCount, setVisibleCount] = useState(50); 
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'add' | 'update'
  const [filterCategory, setFilterCategory] = useState('all'); // หมวดหมู่สินค้า
  const [sortBy, setSortBy] = useState('none'); // 'none' | 'price_desc' | 'price_asc' | 'cost_desc' | 'cost_asc'

  if (!importPreview) return null;

  // ดึงหมวดหมู่ทั้งหมดที่มีในไฟล์
  const categories = [...new Set(importPreview.map(item => item.newData?.category).filter(Boolean))];

  // กรองข้อมูลตามฟิลเตอร์
  const filteredItems = importPreview
    .map((item, index) => ({ ...item, originalIndex: index }))
    .filter(item => {
      const matchType = filterType === 'all' || item.type === filterType;
      const matchCategory = filterCategory === 'all' || item.newData?.category === filterCategory;
      const matchSearch = !searchQuery || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchCategory && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price_desc') return (b.newData?.price || 0) - (a.newData?.price || 0);
      if (sortBy === 'price_asc') return (a.newData?.price || 0) - (b.newData?.price || 0);
      if (sortBy === 'cost_desc') return (b.newData?.cost || 0) - (a.newData?.cost || 0);
      if (sortBy === 'cost_asc') return (a.newData?.cost || 0) - (b.newData?.cost || 0);
      return 0; // retain originalIndex order
    });

  const visibleItems = filteredItems.slice(0, visibleCount);
  const isAllChecked = filteredItems.length > 0 && filteredItems.every(item => selectedImportItems.includes(item.originalIndex));

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1001, 
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card animate-slide-in" style={{ width: '950px', maxWidth: '95%', maxHeight: '85vh', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#2D3748' }}>📋 ตรวจสอบข้อมูลก่อนนำเข้ายอดคลัง</h3>
          <span style={{ fontSize: '13px', color: '#718096' }}>รายการทั้งหมด <span style={{ fontWeight: 'bold', color: '#2B6CB0' }}>{filteredItems.length} / {importPreview.length} รายการ</span></span>
        </div>

        {/* 🔍 ฟิลเตอร์คัดเลือก (Filters Bar) */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="ค้นหา SKU หรือชื่อสินค้า..." 
            value={searchQuery}
            style={{ marginBottom: 0, padding: '8px 12px', fontSize: '13px', flex: 1 }}
            onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(50); }}
          />
          <select 
            className="input" 
            style={{ marginBottom: 0, padding: '8px 12px', fontSize: '13px', width: '150px' }}
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setVisibleCount(50); }}
          >
            <option value="all">ทุกหมวดหมู่</option>
            {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
          </select>

          <select 
            className="input" 
            style={{ marginBottom: 0, padding: '8px 12px', fontSize: '13px', width: '130px' }}
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setVisibleCount(50); }}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="add">เพิ่มใหม่ (+)</option>
            <option value="update">อัปเดต (🔄)</option>
          </select>

          <select 
            className="input" 
            style={{ marginBottom: 0, padding: '8px 12px', fontSize: '13px', width: '140px' }}
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setVisibleCount(50); }}
          >
            <option value="none">ตามลำดับเดิม</option>
            <option value="price_desc">ราคาสูง ➜ ต่ำ</option>
            <option value="price_asc">ราคาต่ำ ➜ สูง</option>
            <option value="cost_desc">ต้นทุนสูง ➜ ต่ำ</option>
            <option value="cost_asc">ต้นทุนต่ำ ➜ สูง</option>
          </select>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ backgroundColor: '#F7FAFC' }}>
                <th style={{ width: '40px', padding: '12px', borderBottom: '1px solid #E2E8F0' }}>
                  <input 
                    type="checkbox" 
                    checked={isAllChecked} 
                    onChange={(e) => {
                      if (e.target.checked) {
                         const toAdd = filteredItems.map(item => item.originalIndex);
                         setSelectedImportItems([...new Set([...selectedImportItems, ...toAdd])]);
                      } else {
                         const toRemove = filteredItems.map(item => item.originalIndex);
                         setSelectedImportItems(selectedImportItems.filter(idx => !toRemove.includes(idx)));
                      }
                    }} 
                  />
                </th>
                <th style={{ padding: '12px', borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>สถานะ</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>สินค้า (SKU) / ชื่อ</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>ราคา / ต้นทุน</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #E2E8F0', fontSize: '13px', textAlign: 'center' }}>ยอดสต็อก (Assign)</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #E2E8F0', fontSize: '13px', width: '30%' }}>รายละเอียดเปลี่ยนแปลง</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const globalIndex = item.originalIndex;
                const isSelected = selectedImportItems.includes(globalIndex);
                const colorLabel = item.type === 'add' ? '#38A169' : '#D69E2E';
                const bgLabel = item.type === 'add' ? '#E6FFFA' : '#FEFCBF';

                return (
                  <tr key={globalIndex} style={{ borderBottom: '1px solid #EDF2F7', backgroundColor: isSelected ? '#F7FAFC' : 'transparent', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={(e) => setSelectedImportItems(e.target.checked ? [...selectedImportItems, globalIndex] : selectedImportItems.filter(i => i !== globalIndex))} 
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: bgLabel, color: colorLabel, fontSize: '12px', fontWeight: 'bold' }}>
                        {item.type === 'add' ? '+ เพิ่มใหม่' : '🔄 อัปเดต'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.image ? (
                          <img src={item.image} alt="Product" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', background: '#F7FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#CBD5E0' }}>No Img</span>
                          </div>
                        )}
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: '700', color: '#2D3748', fontSize: '13px' }}>{item.sku}</div>
                          <div style={{ fontSize: '12px', color: '#718096', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '180px' }} title={item.name}>{item.name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      <div>ราคา: <span style={{ fontWeight: 'bold', color: '#E53E3E' }}>฿{item.newData?.price?.toLocaleString()}</span></div>
                      <div style={{ fontSize: '11px', color: '#718096' }}>ทุน: ฿{item.newData?.cost?.toLocaleString()}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                        {item.newData?.stock1st !== undefined && (
                          <span style={{ padding: '3px 6px', borderRadius: '4px', background: '#EBF8FF', color: '#3182CE', fontSize: '11px', fontWeight: 'bold', width: 'max-content' }}>
                            ชั้น 1: {item.newData.stock1st}
                          </span>
                        )}
                        {item.newData?.stock3rd !== undefined && (
                          <span style={{ padding: '3px 6px', borderRadius: '4px', background: '#F0FFF4', color: '#38A169', fontSize: '11px', fontWeight: 'bold', width: 'max-content' }}>
                            ชั้น 3: {item.newData.stock3rd}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>
                      {item.type === 'add' ? (
                        <div style={{ color: '#38A169', fontWeight: '600' }}>✓ เพิ่มรายการสินค้าใหม่เข้าระบบคลัง</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#4A5568' }}>
                          {item.changes.map((ch, i) => <div key={i} style={{ fontSize: '11px' }}>• {ch}</div>)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visibleCount < filteredItems.length && (
             <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #EDF2F7', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button type="button" className="btn btn-outline" style={{ fontSize: '13px', background: '#F7FAFC' }} onClick={() => setVisibleCount(visibleCount + 50)}>
                   ➕ ดูเพิ่ม (+50 รายการ)
                </button>
                <button type="button" className="btn btn-outline" style={{ fontSize: '13px', background: '#FFF5F5', color: '#E53E3E', borderColor: '#FED7D7' }} onClick={() => setVisibleCount(filteredItems.length)}>
                   📂 แสดงทั้งหมด ({filteredItems.length} รายการที่พบ)
                </button>
             </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn btn-outline" onClick={() => setImportPreview(null)}>ยกเลิก</button>
          <button 
            type="button" 
            className="btn" 
            disabled={selectedImportItems.length === 0}
            onClick={handleConfirmImport}
            style={{ background: '#48BB78', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: selectedImportItems.length === 0 ? 0.6 : 1 }}
          >
            ยืนยันนำเข้าระบบ ({selectedImportItems.length} รายการ)
          </button>
        </div>
      </div>
    </div>
  );
}

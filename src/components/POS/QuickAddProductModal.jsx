import React from 'react';
import { X, Save, Package } from 'lucide-react';

export default function QuickAddProductModal({ isOpen, onClose, barcode, form, setForm, onSubmit }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }}>
      <div className="card animate-scale-up" style={{ width: '450px', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #3182CE 0%, #2B6CB0 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
              <Package size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>เพิ่มสินค้าด่วน (Quick Add)</h3>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>พบรหัสบาร์โค้ดใหม่ที่ยังไม่มีในระบบ</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '8px' }}>บาร์โค้ด (Barcode)</label>
              <input 
                type="text" 
                className="input" 
                value={barcode} 
                readOnly 
                style={{ background: '#F7FAFC', color: '#718096', fontWeight: 'bold', border: '1px solid #E2E8F0', cursor: 'not-allowed' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '8px' }}>รหัสสินค้า (SKU)</label>
              <input 
                type="text" 
                className="input" 
                value={form.sku} 
                onChange={e => setForm({ ...form, sku: e.target.value })}
                placeholder="ระบุรหัสสินค้า..."
                style={{ border: '1px solid #3182CE' }} 
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '8px' }}>ชื่อสินค้า (Product Name) <span style={{ color: '#E53E3E' }}>*</span></label>
            <input 
              type="text" 
              className="input" 
              placeholder="เช่น เสื้อยืดลายกราฟิก, กางเกงยีนส์..." 
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '8px' }}>ราคาขาย (Price) <span style={{ color: '#E53E3E' }}>*</span></label>
              <input 
                type="number" 
                className="input" 
                placeholder="0.00" 
                required
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '8px' }}>สต็อกเริ่มต้น (Stock)</label>
              <input 
                type="number" 
                className="input" 
                value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
              />
              <p style={{ fontSize: '10px', color: '#718096', marginTop: '4px' }}>* เพิ่มเข้าชั้น 1 ทันที</p>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '8px' }}>หมวดหมู่ (Category)</label>
            <select 
              className="input"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              <option value="General">ทั่วไป (General)</option>
              <option value="Top">เสื้อ (Top)</option>
              <option value="Bottom">กางเกง (Bottom)</option>
              <option value="Dress">เดรส (Dress)</option>
              <option value="Accessory">เครื่องประดับ (Accessory)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1, padding: '12px' }}>
              ยกเลิก
            </button>
            <button type="submit" className="btn" style={{ flex: 2, background: '#3182CE', color: 'white', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <Save size={18} /> บันทึกและขาย (Save & Sell)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

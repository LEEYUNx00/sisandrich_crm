import React, { useState, useEffect } from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import { db } from '../../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function AddProductModal({ isOpen, onClose, products = [], locations = {} }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'เครื่องประดับ',
    price: '',
    cost: '',
    stockMode: 'Stock Control [Overselling]',
    initialLocation: '1st', // '1st' | '3rd'
    stockQty: '0',
    image: ''
  });

  const categoryPrefixes = {
    'เครื่องประดับ': 'JW',
    'แหวน': 'RNG',
    'สร้อยคอ': 'NKL',
    'ต่างหู': 'ER',
    'สร้อยข้อมือ': 'BR',
    'เสื้อผ้า': 'CL',
    'กระเป๋า': 'BG',
    'อื่นๆ': 'ETC'
  };

  // ------------------------------------------------------------------
  // AUTO SKU GENERATION LOGIC
  // ------------------------------------------------------------------
  const generateSku = (cat) => {
    const prefix = categoryPrefixes[cat] || 'ITEM';
    
    // Find highest index for this prefix
    const relatedProducts = products.filter(p => p.sku && p.sku.startsWith(prefix + '-'));
    let maxIndex = 0;
    relatedProducts.forEach(p => {
      const parts = p.sku.split('-');
      const num = parseInt(parts[1]);
      if (!isNaN(num) && num > maxIndex) {
        maxIndex = num;
      }
    });

    return `${prefix}-${(maxIndex + 1).toString().padStart(3, '0')}`;
  };

  // Update SKU when category changes
  useEffect(() => {
    if (formData.category) {
      setFormData(prev => ({ ...prev, sku: generateSku(formData.category) }));
    }
  }, [formData.category, products]);

  const handleManualGenSku = () => {
    setFormData(prev => ({ ...prev, sku: generateSku(formData.category) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = Number(formData.price);
    const cost = Number(formData.cost);
    const qty = Number(formData.stockQty);

    if (isNaN(price) || price < 0) {
      alert("กรุณากรอกราคาขายที่ถูกต้อง");
      return;
    }

    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        price: price,
        cost: cost || 0,
        stockMode: formData.stockMode,
        stock1st: formData.initialLocation === '1st' ? qty : 0,
        stock3rd: formData.initialLocation === '3rd' ? qty : 0,
        image: formData.image || 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&auto=format&fit=crop&q=60',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'products'), productData);
      
      // Add System Audit Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'inventory',
        action: 'เพิ่มสินค้าใหม่',
        detail: `สินค้า: ${formData.name} (SKU: ${formData.sku}) เข้าคลัง ${formData.initialLocation} จำนวน ${qty}`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });
      
      alert("เพิ่มสินค้าสำเร็จ! 🎉");
      onClose(); // Close modal
      setFormData({
        name: '', sku: '', category: 'เครื่องประดับ', price: '', cost: '',
        stockMode: 'Stock Control [Overselling]', initialLocation: '1st', stockQty: '0', image: ''
      });
    } catch (error) {
      alert("ไม่สามารถเพิ่มสินค้าได้: " + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card animate-slide-in" style={{ width: '450px', maxWidth: '90%', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '700', color: '#2D3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✨ เพิ่มข้อมูลสินค้าใหม่เข้าคลัง
        </h3>
        <form onSubmit={handleSubmit}>
          {/* CATEGORY SELECTOR first to gen SKU */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>หมวดหมู่สินค้า</label>
            <select 
              className="input" 
              value={formData.category} 
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ background: '#F7FAFC' }}
            >
              {Object.keys(categoryPrefixes).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* NAME */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>ชื่อสินค้า</label>
            <input 
              type="text" 
              className="input" 
              placeholder="เช่น สร้อยคอทองคำ 1 บาท" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required 
            />
          </div>

          {/* SKU AUTO GEN */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>รหัสสินค้า (SKU)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="input" 
                value={formData.sku} 
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required 
              />
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleManualGenSku} 
                style={{ padding: '8px', minWidth: 'max-content', background: '#E6FFFA', borderColor: '#38A169', color: '#38A169' }}
                title="สุ่มรหัสใหม่"
              >
                <Sparkles size={16} /> บูรณาการ
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>ต้นทุน (Cost)</label>
              <input 
                type="number" 
                className="input" 
                placeholder="0" 
                value={formData.cost} 
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>ราคาขาย (Price)</label>
              <input 
                type="number" 
                className="input" 
                placeholder="0" 
                value={formData.price} 
                onChange={(e) => setFormData({ ...formData, price: e.target.value })} 
                required 
              />
            </div>
          </div>

          {/* STOCK ASSIGNMENT */}
          <div style = {{ padding: '12px', background: '#F7FAFC', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>สต็อกตั้งต้นใส่ใน:</label>
                <select 
                  className="input" 
                  value={formData.initialLocation} 
                  onChange={(e) => setFormData({ ...formData, initialLocation: e.target.value })}
                >
                  <option value="1st">หน้าร้าน - ชั้น 1</option>
                  <option value="3rd">คลังสินค้า - ชั้น 3</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>จำนวนสินค้า</label>
                <input 
                  type="number" 
                  className="input" 
                  value={formData.stockQty} 
                  onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })} 
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>โหมด (Stock Mode)</label>
            <select 
              className="input" 
              value={formData.stockMode} 
              onChange={(e) => setFormData({ ...formData, stockMode: e.target.value })}
            >
              <option value="No Stock Control">No Stock</option>
              <option value="Stock Control [Overselling]">Overselling</option>
              <option value="Stock Control [Restricted]">Restricted</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={18} /> ยืนยันแอดสินค้า
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

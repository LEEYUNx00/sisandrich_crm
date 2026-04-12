import React, { useState, useEffect } from 'react';
import { X, Plus, Package, Save } from 'lucide-react';

export default function QuickStockModal({ isOpen, onClose, product, onConfirm }) {
  const [addQty, setAddQty] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setAddQty(1);
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(0,0,0,0.7)', 
      zIndex: 10000, 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      backdropFilter: 'blur(8px)' 
    }}>
      <div className="card animate-scale-up" style={{ 
        width: '400px', 
        backgroundColor: 'white', 
        borderRadius: '24px', 
        overflow: 'hidden', 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
      }}>
        
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', 
          background: 'linear-gradient(135deg, #E53E3E 0%, #C53030 100%)', 
          color: 'white', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>
              <Package size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>สินค้าหมดสต็อก! (Out of Stock)</h3>
              <p style={{ margin: 0, fontSize: '11px', opacity: 0.8 }}>เติมสต็อกด่วนเพื่อทำรายการต่อ</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2D3748', marginBottom: '4px' }}>{product.name}</div>
            <div style={{ fontSize: '13px', color: '#718096' }}>รหัส: {product.sku || product.barcode || '-'}</div>
            <div style={{ 
              display: 'inline-block', 
              marginTop: '12px', 
              padding: '4px 12px', 
              background: '#FFF5F5', 
              color: '#C53030', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: 'bold' 
            }}>
              สต็อกปัจจุบัน: {product.stock1st || 0} ชิ้น
            </div>
          </div>

          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#4A5568', marginBottom: '12px', textAlign: 'center' }}>
            ต้องการการเพิ่มจำนวนสินค้าเข้าสต็อกเท่าไหร่?
          </label>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '24px' }}>
            <button 
              onClick={() => setAddQty(prev => Math.max(1, prev - 1))}
              style={{ 
                width: '45px', 
                height: '45px', 
                borderRadius: '50%', 
                border: '2px solid #E2E8F0', 
                background: 'white', 
                fontSize: '20px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4A5568'
              }}
            >
              -
            </button>
            <input 
              type="number" 
              value={addQty} 
              onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
              style={{ 
                width: '80px', 
                textAlign: 'center', 
                fontSize: '24px', 
                fontWeight: 'bold', 
                border: 'none', 
                borderBottom: '2px solid #E53E3E',
                outline: 'none',
                padding: '4px 0'
              }}
            />
            <button 
              onClick={() => setAddQty(prev => prev + 1)}
              style={{ 
                width: '45px', 
                height: '45px', 
                borderRadius: '50%', 
                border: '2px solid #E2E8F0', 
                background: 'white', 
                fontSize: '20px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4A5568'
              }}
            >
              +
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={onClose} 
              className="btn btn-outline" 
              style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
            >
              ยกเลิก
            </button>
            <button 
              onClick={() => onConfirm(addQty)} 
              className="btn" 
              style={{ 
                flex: 2, 
                background: '#48BB78', 
                color: 'white', 
                padding: '12px', 
                borderRadius: '12px',
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '8px',
                fontWeight: 'bold',
                boxShadow: '0 4px 6px rgba(72, 187, 120, 0.2)'
              }}
            >
              <Save size={18} /> เพิ่มและขายทันที
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

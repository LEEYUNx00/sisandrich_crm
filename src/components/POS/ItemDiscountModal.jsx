import React, { useState, useEffect } from 'react';
import { X, BadgePercent, Tag, ArrowRight, Layers, Layout, Save, ChevronRight } from 'lucide-react';

export default function ItemDiscountModal({ 
  isOpen, 
  onClose, 
  item, 
  onApply 
}) {
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState('amount'); // 'amount' | 'percent'
  const [applyMode, setApplyMode] = useState('all'); // 'all' | 'split'

  useEffect(() => {
    if (item && isOpen) {
      setDiscountValue(item.itemDiscount || 0);
      setDiscountType(item.itemDiscountType || 'amount');
      setApplyMode('all');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const calculateNewPrice = () => {
    const original = Number(item.price) || 0;
    const val = Number(discountValue) || 0;
    if (discountType === 'percent') {
      return original - (original * val / 100);
    }
    return original - val;
  };

  const calculateTotalSaving = () => {
    const original = Number(item.price) || 0;
    const val = Number(discountValue) || 0;
    const qty = applyMode === 'all' ? (item.qty || 1) : 1;
    let singleSaving = 0;
    if (discountType === 'percent') {
      singleSaving = (original * val / 100);
    } else {
      singleSaving = val;
    }
    return singleSaving * qty;
  };

  const isDiscountInvalid = () => {
    const val = Number(discountValue) || 0;
    if (discountType === 'percent') {
      return val > 100 || val < 0;
    }
    return val > item.price || val < 0;
  };

  const handleSave = () => {
    if (isDiscountInvalid()) return;
    onApply({
      value: Number(discountValue),
      type: discountType,
      mode: applyMode
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(12px)', zIndex: 10006, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '420px', backgroundColor: 'white', borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
        
        {/* Header Section */}
        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#ef4444', padding: '10px', borderRadius: '14px', color: 'white', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
              <BadgePercent size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>ตั้งค่าส่วนลด</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{item.name} • <span style={{ color: '#ef4444' }}>{item.sku}</span></p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'white', border: '1px solid #e2e8f0', width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Main Input Field Area */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
               <label style={{ fontSize: '14px', fontWeight: '800', color: '#334155' }}>จำนวนส่วนลด</label>
               {isDiscountInvalid() && (
                 <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>* ส่วนลดเกินราคาสินค้า</span>
               )}
            </div>
            
            <div style={{ display: 'flex', background: '#f8fafc', borderRadius: '20px', border: '2px solid', borderColor: isDiscountInvalid() ? '#ef4444' : '#e2e8f0', padding: '6px', position: 'relative', transition: 'border-color 0.2s' }}>
              <input 
                type="number" 
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                autoFocus
                onFocus={(e) => e.target.select()}
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '12px 18px', fontSize: '24px', fontWeight: '900', outline: 'none', color: isDiscountInvalid() ? '#ef4444' : '#0f172a', width: '100%' }}
                placeholder="0"
              />
              <div style={{ display: 'flex', gap: '6px', padding: '2px' }}>
                <button 
                  onClick={() => setDiscountType('amount')}
                  style={{ width: '52px', borderRadius: '14px', border: discountType === 'amount' ? 'none' : '1px solid #e2e8f0', cursor: 'pointer', fontWeight: '900', fontSize: '16px', background: discountType === 'amount' ? '#ef4444' : 'white', color: discountType === 'amount' ? 'white' : '#64748b', transition: 'all 0.2s', boxShadow: discountType === 'amount' ? '0 4px 6px rgba(239, 68, 68, 0.2)' : 'none' }}
                >฿</button>
                <button 
                  onClick={() => setDiscountType('percent')}
                  style={{ width: '52px', borderRadius: '14px', border: discountType === 'percent' ? 'none' : '1px solid #e2e8f0', cursor: 'pointer', fontWeight: '900', fontSize: '16px', background: discountType === 'percent' ? '#ef4444' : 'white', color: discountType === 'percent' ? 'white' : '#64748b', transition: 'all 0.2s', boxShadow: discountType === 'percent' ? '0 4px 6px rgba(239, 68, 68, 0.2)' : 'none' }}
                >%</button>
              </div>
            </div>
          </div>

          {/* Scope selection (Split/All) */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <label style={{ fontSize: '14px', fontWeight: '800', color: '#334155' }}>ขอบเขตการลดราคา</label>
              {item.qty === 1 && <span style={{ fontSize: '11px', color: '#94a3b8' }}>(รายการนี้มีเพียง 1 ชิ้น)</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                onClick={() => setApplyMode('all')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '18px', border: '2px solid', borderColor: applyMode === 'all' ? '#ef4444' : '#f1f5f9', background: applyMode === 'all' ? 'linear-gradient(135deg, #fff1f2 0%, #fff 100%)' : 'white', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <Layers size={20} color={applyMode === 'all' ? '#ef4444' : '#94a3b8'} />
                <div style={{ textAlign: 'left' }}>
                   <div style={{ fontSize: '13px', fontWeight: '900', color: applyMode === 'all' ? '#ef4444' : '#1e293b' }}>ลดทุกชิ้น</div>
                   <div style={{ fontSize: '10px', color: applyMode === 'all' ? '#ef4444' : '#94a3b8' }}>จำนวนทั้งหมด {item.qty} ชิ้น</div>
                </div>
              </button>

              <button 
                onClick={() => { if (item.qty > 1) setApplyMode('split'); }}
                disabled={item.qty <= 1}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '18px', border: '2px solid', borderColor: applyMode === 'split' ? '#ef4444' : '#f1f5f9', background: applyMode === 'split' ? 'linear-gradient(135deg, #fff1f2 0%, #fff 100%)' : 'white', cursor: item.qty > 1 ? 'pointer' : 'not-allowed', transition: 'all 0.2s', opacity: item.qty > 1 ? 1 : 0.5 }}
              >
                <Layout size={20} color={applyMode === 'split' ? '#ef4444' : '#94a3b8'} />
                <div style={{ textAlign: 'left' }}>
                   <div style={{ fontSize: '13px', fontWeight: '900', color: applyMode === 'split' ? '#ef4444' : '#1e293b' }}>ลดแค่ 1 ชิ้น</div>
                   <div style={{ fontSize: '10px', color: applyMode === 'split' ? '#ef4444' : '#94a3b8' }}>แยกแถวออกมา</div>
                </div>
              </button>
            </div>
          </div>

          {/* Pricing Summary Card */}
          <div style={{ background: isDiscountInvalid() ? '#fef2f2' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '22px', padding: '20px', border: '1px solid', borderColor: isDiscountInvalid() ? '#fecaca' : '#e2e8f0', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>ราคาปกติ:</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>฿{(Number(item.price) || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '14px', borderBottom: '2px dashed #cbd5e1' }}>
              <span style={{ fontSize: '14px', color: isDiscountInvalid() ? '#b91c1c' : '#ef4444', fontWeight: '800' }}>ราคาพิเศษ:</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '20px', fontWeight: '900', color: isDiscountInvalid() ? '#b91c1c' : '#ef4444' }}>฿{calculateNewPrice().toLocaleString()}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>{isDiscountInvalid() ? '⚠️ ราคาร์นี้ไม่สามารถบันทึกได้' : `ประหยัด -฿${(Number(item.price) - calculateNewPrice()).toLocaleString()} / ชิ้น`}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>ประหยัดรวมทั้งบิล:</span>
              <div style={{ background: isDiscountInvalid() ? '#fee2e2' : '#dcfce7', padding: '4px 12px', borderRadius: '10px', border: '1px solid', borderColor: isDiscountInvalid() ? '#fca5a5' : '#86efac' }}>
                <span style={{ fontSize: '15px', fontWeight: '900', color: isDiscountInvalid() ? '#b91c1c' : '#166534' }}>- ฿{calculateTotalSaving().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div style={{ padding: '24px', background: 'white', display: 'flex', gap: '14px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '18px', background: 'white', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
            ยกเลิก
          </button>
          <button 
            onClick={handleSave}
            disabled={isDiscountInvalid()}
            style={{ flex: 2, padding: '14px', borderRadius: '18px', background: isDiscountInvalid() ? '#cbd5e1' : '#0f172a', border: 'none', color: 'white', fontWeight: '900', cursor: isDiscountInvalid() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: isDiscountInvalid() ? 'none' : '0 10px 15px -3px rgba(15, 23, 42, 0.4)', fontSize: '15px', transition: 'all 0.2s' }}
          >
            <Save size={20} /> บันทึกส่วนลด
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, Delete } from 'lucide-react';

export default function BillDiscountModal({ 
  isOpen, 
  onClose, 
  subtotal,
  currentValue,
  currentType,
  onApply 
}) {
  const [discountValue, setDiscountValue] = useState('0');
  const [discountType, setDiscountType] = useState('amount'); // 'amount' | 'percent'

  useEffect(() => {
    if (isOpen) {
      setDiscountValue(String(currentValue || '0'));
      setDiscountType(currentType || 'amount');
    }
  }, [isOpen, currentValue, currentType]);

  if (!isOpen) return null;

  const valNum = parseFloat(discountValue) || 0;

  const isInvalid = () => {
    if (discountType === 'percent') return valNum > 100 || valNum < 0;
    return valNum > subtotal || valNum < 0;
  };

  const calculateSaving = () => {
    if (discountType === 'percent') return (subtotal * valNum) / 100;
    return valNum;
  };

  const handleKeypress = (key) => {
    if (key === 'clear') {
      setDiscountValue('0');
      return;
    }
    if (key === '.') {
      if (!discountValue.includes('.')) setDiscountValue(prev => prev + '.');
      return;
    }
    setDiscountValue(prev => {
      if (prev === '0') return String(key);
      return prev + String(key);
    });
  };

  const handleBackspace = () => {
    setDiscountValue(prev => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleSave = () => {
    if (isInvalid()) return;
    onApply(valNum, discountType);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', zIndex: 10007, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="card animate-scale-up" style={{ 
        width: '100%', 
        maxWidth: '420px', 
        maxHeight: '90vh',
        backgroundColor: 'white', 
        borderRadius: '28px', 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header - Fixed */}
        <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#3b82f6', padding: '6px', borderRadius: '10px', color: 'white' }}>
              <Calculator size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#1E293B' }}>ส่วนลดท้ายบิล</h3>
          </div>
          <button onClick={onClose} style={{ background: 'white', border: '1px solid #E2E8F0', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16}/></button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          
          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '14px', padding: '3px', marginBottom: '14px' }}>
            <button 
              onClick={() => setDiscountType('amount')}
              style={{ flex: 1, padding: '7px', borderRadius: '11px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s', background: discountType === 'amount' ? 'white' : 'transparent', color: discountType === 'amount' ? '#3B82F6' : '#64748B', boxShadow: discountType === 'amount' ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none' }}
            >
              บาท (฿)
            </button>
            <button 
              onClick={() => setDiscountType('percent')}
              style={{ flex: 1, padding: '7px', borderRadius: '11px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s', background: discountType === 'percent' ? 'white' : 'transparent', color: discountType === 'percent' ? '#3B82F6' : '#64748B', boxShadow: discountType === 'percent' ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none' }}
            >
              เปอร์เซ็นต์ (%)
            </button>
          </div>

          {/* Display */}
          <div style={{ background: '#F8FAFC', borderRadius: '20px', padding: '10px 16px', border: '2px solid', borderColor: isInvalid() ? '#EF4444' : '#E2E8F0', marginBottom: '14px', textAlign: 'center' }}>
             <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#94A3B8', marginBottom: '0px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>จำนวนส่วนลด</div>
             <div style={{ fontSize: '32px', fontWeight: '900', color: isInvalid() ? '#EF4444' : '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
               {discountValue}
               <span style={{ fontSize: '18px', color: '#94A3B8' }}>{discountType === 'amount' ? '฿' : '%'}</span>
             </div>
             {isInvalid() && <div style={{ fontSize: '10px', color: '#EF4444', fontWeight: 'bold' }}>ยอดเกินขอบเขต!</div>}
          </div>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '8px', background: '#F0F9FF', borderRadius: '16px', padding: '10px', marginBottom: '14px', border: '1px solid #BAE6FD' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#64748B' }}>ก่อนลด</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1E293B' }}>฿{subtotal.toLocaleString()}</div>
            </div>
            <div style={{ background: '#BAE6FD' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#3B82F6' }}>ส่วนลดสุทธิ</div>
              <div style={{ fontSize: '13px', fontWeight: '900', color: '#2563EB' }}>- ฿{calculateSaving().toLocaleString()}</div>
            </div>
          </div>

          {/* Keypad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((k) => (
              <button key={k} onClick={() => handleKeypress(k)} style={{ padding: '10px', borderRadius: '12px', border: 'none', background: '#F8FAFC', color: '#1E293B', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>{k}</button>
            ))}
            <button onClick={handleBackspace} style={{ padding: '10px', borderRadius: '12px', border: 'none', background: '#FFF1F2', color: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Delete size={18}/></button>
            <button onClick={() => handleKeypress('clear')} style={{ gridColumn: 'span 3', padding: '8px', borderRadius: '10px', border: 'none', background: '#F1F5F9', color: '#64748B', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>ล้างค่าตัวเลข (CLR)</button>
          </div>
        </div>

        {/* Footer Actions - Fixed */}
        <div style={{ padding: '14px 20px', display: 'flex', gap: '10px', borderTop: '1px solid #F1F5F9', background: 'white', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: 'white', border: '1px solid #E2E8F0', color: '#64748B', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>ยกเลิก</button>
          <button 
            onClick={handleSave}
            disabled={isInvalid()}
            style={{ flex: 1.5, padding: '12px', borderRadius: '14px', background: isInvalid() ? '#CBD5E1' : '#1E293B', border: 'none', color: 'white', fontWeight: 'bold', cursor: isInvalid() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px' }}
          >
            <Save size={16} /> ยืนยันส่วนลด
          </button>
        </div>
      </div>
    </div>
  );
}

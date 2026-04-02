import React from 'react';
import { X, ShoppingCart, Send, CreditCard, Gift, Beer, Smartphone, MoreHorizontal } from 'lucide-react';

export default function MethodSelectorModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  const methods = [
    { id: 'cash', label: 'เงินสด', color: '#38a169', icon: <ShoppingCart size={32}/> },
    { id: 'transfer', label: 'โอนเงิน', color: '#08627d', icon: <Send size={32}/> },
    { id: 'credit', label: 'บัตรเครดิต', color: '#3182ce', icon: <CreditCard size={32}/> },
    { id: 'debit', label: 'บัตรเดบิต', color: '#805ad5', icon: <CreditCard size={32}/> },
    { id: 'gift', label: 'บัตรกำนัล/ของขวัญ', color: '#e53e3e', icon: <Gift size={32}/> },
    { id: 'entertain', label: 'เอ็นเทอร์เทน/รับรอง', color: '#d69e2e', icon: <Beer size={32}/> },
    { id: 'online', label: 'ธนาคาร (ออนไลน์/แอป)', color: '#ed8936', icon: <Smartphone size={32}/> },
    { id: 'other', label: 'อื่นๆ', color: '#48bb78', icon: <MoreHorizontal size={32}/> },
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', width: '100%', maxWidth: '900px', borderRadius: '24px', padding: '40px', position: 'relative' }}>
         <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', border: 'none', background: 'none', color: '#cbd5e0' }}><X size={32}/></button>
         <h2 style={{ fontSize: '24px', color: '#4a5568', marginBottom: '40px', fontWeight: 'bold' }}>เลือกวิธีการชำระเงิน</h2>
         
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '30px' }}>
            {methods.map(m => (
               <button 
                 key={m.id}
                 onClick={() => onSelect(m.id)}
                 style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                 className="hover-scale"
               >
                  <div style={{ 
                     width: '120px', 
                     height: '120px', 
                     borderRadius: '50%', 
                     background: m.color, 
                     color: 'white', 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center',
                     boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                  }}>
                     {m.icon}
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#4a5568' }}>{m.label}</span>
               </button>
            ))}
         </div>

         <div style={{ marginTop: '50px', textAlign: 'right' }}>
            <button 
              onClick={onClose}
              style={{ padding: '12px 30px', background: '#feb2b2', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '18px' }}
            >
              ปิด
            </button>
         </div>
      </div>
    </div>
  );
}

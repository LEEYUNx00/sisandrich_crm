import React from 'react';
import { X, ShoppingCart, Send, CreditCard, Gift, MoreHorizontal, Wallet, Banknote } from 'lucide-react';

export default function MethodSelectorModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  const methods = [
    { id: 'cash', label: 'เงินสด', color: '#10b981', icon: <Banknote size={40}/>, bg: 'rgba(16, 185, 129, 0.1)' },
    { id: 'transfer', label: 'โอนเงิน', color: '#0ea5e9', icon: <Send size={40}/>, bg: 'rgba(14, 165, 233, 0.1)' },
    { id: 'credit', label: 'บัตรเครดิต', color: '#6366f1', icon: <CreditCard size={40}/>, bg: 'rgba(99, 102, 241, 0.1)' },
    { id: 'storeCredit', label: 'เครดิตวอลเล็ท', color: '#14b8a6', icon: <Wallet size={40}/>, bg: 'rgba(20, 184, 166, 0.1)' },
    { id: 'gift', label: 'บัตรกำนัล/ของขวัญ', color: '#ef4444', icon: <Gift size={40}/>, bg: 'rgba(239, 68, 68, 0.1)' },
    { id: 'other', label: 'อื่นๆ', color: '#64748b', icon: <MoreHorizontal size={40}/>, bg: 'rgba(100, 116, 139, 0.1)' },
  ];

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(15, 23, 42, 0.6)', 
      backdropFilter: 'blur(8px)',
      zIndex: 10000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px' 
    }}>
      <div style={{ 
        background: 'white', 
        width: '100%', 
        maxWidth: '800px', 
        borderRadius: '32px', 
        padding: '40px', 
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'modalSlideUp 0.3s ease-out'
      }}>
        <style>
          {`
            @keyframes modalSlideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .method-btn {
              transition: all 0.2s ease;
            }
            .method-btn:hover {
              transform: translateY(-5px);
            }
            .method-btn:active {
              transform: scale(0.95);
            }
          `}
        </style>

         <button 
           onClick={onClose} 
           style={{ 
             position: 'absolute', 
             top: '24px', 
             right: '24px', 
             border: 'none', 
             background: '#f1f5f9', 
             color: '#64748b',
             width: '40px',
             height: '40px',
             borderRadius: '12px',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             cursor: 'pointer'
           }}
         >
           <X size={24}/>
         </button>
         
         <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', color: '#1e293b', fontWeight: '900', margin: 0 }}>เลือกวิธีการชำระเงิน</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>โปรดเลือกวิธีที่ลูกค้าใช้ชำระเงินในรายการนี้</p>
         </div>
         
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {methods.map(m => (
               <button 
                 key={m.id}
                 onClick={() => onSelect(m.id)}
                 style={{ 
                   border: '1px solid #f1f5f9', 
                   background: '#fff', 
                   display: 'flex', 
                   flexDirection: 'column', 
                   alignItems: 'center', 
                   gap: '16px', 
                   cursor: 'pointer',
                   padding: '24px',
                   borderRadius: '24px',
                   boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                 }}
                 className="method-btn"
               >
                  <div style={{ 
                     width: '80px', 
                     height: '80px', 
                     borderRadius: '24px', 
                     background: m.bg, 
                     color: m.color, 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center',
                  }}>
                     {m.icon}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#334155' }}>{m.label}</span>
               </button>
            ))}
         </div>

         <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={onClose}
              style={{ 
                padding: '12px 48px', 
                background: '#f1f5f9', 
                border: 'none', 
                borderRadius: '12px', 
                color: '#64748b', 
                fontWeight: '700', 
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ยกเลิก
            </button>
         </div>
      </div>
    </div>
  );
}


import React from 'react';
import { X, Plus, ShoppingCart, Send, CreditCard, Gift, Beer, Smartphone, MoreHorizontal, BadgePercent, Printer, Wallet, Banknote } from 'lucide-react';

export default function PaymentModal({
  isOpen,
  onClose,
  cart,
  getTotal,
  getTax,
  getDiscountAmount,
  getGrandTotal,
  tempCustomerId,
  customers,
  payments,
  removePaymentEntry,
  currentMethod,
  currentAmount,
  handleKeypadPress,
  setExactAmount,
  addCashNote,
  noteCounts,
  addPaymentEntry,
  getPaidTotal,
  isProcessing,
  processCheckout,
  setShowMethodSelector,
  selectedPromotion
}) {
  if (!isOpen) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'rgba(15, 23, 42, 0.7)', 
      backdropFilter: 'blur(8px)',
      zIndex: 9991, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '1100px', 
        height: '90vh', 
        maxHeight: '850px',
        background: '#f8fafc', 
        borderRadius: '24px', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        animation: 'modalFadeIn 0.3s ease-out'
      }}>
        <style>
          {`
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            .payment-card {
              transition: all 0.2s ease;
            }
            .payment-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .keypad-btn {
              transition: all 0.1s active;
            }
            .keypad-btn:active {
              transform: scale(0.95);
              background: #edf2f7;
            }
          `}
        </style>

        {/* Header */}
        <div style={{ background: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={onClose}
                style={{ 
                  background: '#f1f5f9', 
                  border: 'none', 
                  borderRadius: '12px', 
                  width: '40px', 
                  height: '40px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={20}/>
              </button>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>ชำระเงิน (Payment)</h2>
                <div style={{ fontSize: '13px', color: '#64748b' }}>สเกลพอดีหน้าจอ / สีสันทำเข้าใจง่าย</div>
              </div>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>ลูกค้า: <span style={{ color: '#0f172a', fontWeight: '700' }}>{tempCustomerId ? (customers.find(c => c.id === tempCustomerId)?.nickname || customers.find(c => c.id === tempCustomerId)?.name || 'Guest') : 'Walk-in'}</span></div>
           </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(300px, 340px) 1fr', overflow: 'hidden' }}>
           
           {/* Left: Receipt Preview */}
           <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#f1f5f9', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ width: '100%', background: 'white', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', borderRadius: '16px', alignSelf: 'start', position: 'relative' }}>
                 <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px dashed #f1f5f9', paddingBottom: '20px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '1px' }}>SIS & RICH</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px', fontWeight: '700' }}>Receipt / Tax Invoice (Draft)</div>
                 </div>
                 
                 <div style={{ fontSize: '13px', color: '#334155' }}>
                    {cart.map(item => (
                       <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ flex: 1, fontWeight: '500' }}>{item.name} <span style={{ color: '#94a3b8', marginLeft: '4px', fontSize: '11px' }}>x {item.qty}</span></div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>฿{(item.price * item.qty).toLocaleString()}</div>
                       </div>
                    ))}
                 </div>

                 <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '20px', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                       <span>รวมเงิน</span>
                       <span>฿{getTotal().toLocaleString()}</span>
                    </div>
                    {selectedPromotion && (
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ef4444', marginBottom: '6px', fontWeight: '600' }}>
                          <span>ส่วนลด</span>
                          <span>-฿{getDiscountAmount().toLocaleString()}</span>
                       </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: '900', color: '#0f172a', marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                       <span style={{ fontSize: '14px', color: '#64748b', alignSelf: 'center' }}>ยอดสุทธิ</span>
                       <span>฿{getGrandTotal().toLocaleString()}</span>
                    </div>
                 </div>

                 <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>* This is a draft receipt *</div>
              </div>
           </div>

           {/* Right: Payment Controls */}
           <div style={{ background: 'white', padding: '24px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                   <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>ยอดที่ชำระแล้ว ({payments.length})</div>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {payments.length === 0 && <span style={{ fontSize: '13px', color: '#cbd5e1' }}>ยังไม่มีรายการยืนยัน</span>}
                      {payments.map((p) => {
                         const methodData = {
                            cash: { label: 'เงินสด', color: '#10b981', bg: '#ecfdf5' },
                            transfer: { label: 'โอน', color: '#0ea5e9', bg: '#f0f9ff' },
                            credit: { label: 'เครดิต', color: '#6366f1', bg: '#eef2ff' },
                            storeCredit: { label: 'วอลเล็ท', color: '#14b8a6', bg: '#f0fdfa' },
                            other: { label: 'อื่นๆ', color: '#64748b', bg: '#f8fafc' },
                         }[p.method] || { label: 'อื่นๆ', color: '#64748b', bg: '#f8fafc' };

                         return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: methodData.bg, border: `1px solid ${methodData.color}20`, padding: '4px 10px', borderRadius: '8px' }}>
                               <span style={{ fontWeight: 'bold', fontSize: '11px', color: methodData.color }}>{methodData.label}</span>
                               <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '13px' }}>฿{p.amount.toLocaleString()}</span>
                               <button onClick={() => removePaymentEntry(p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex' }}><X size={14}/></button>
                            </div>
                         );
                      })}
                   </div>
                </div>
                <button 
                   onClick={() => setShowMethodSelector(true)}
                   style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     gap: '8px', 
                     fontSize: '13px', 
                     fontWeight: '700',
                     background: '#f8fafc', 
                     border: '1px solid #e2e8f0',
                     padding: '8px 16px',
                     borderRadius: '12px',
                     cursor: 'pointer',
                     color: '#475569'
                   }}
                >
                   <Plus size={16} /> วิธีชำระเงินอื่น
                </button>
              </div>

              {/* Input Area */}
              <div style={{ 
                background: currentMethod === 'cash' ? '#f0fdf4' : currentMethod === 'storeCredit' ? '#f0fdfa' : '#f0f9ff', 
                border: `2px solid ${currentMethod === 'cash' ? '#10b981' : currentMethod === 'storeCredit' ? '#14b8a6' : '#0ea5e9'}`,
                borderRadius: '20px', 
                padding: '16px 20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px',
                boxShadow: `0 10px 15px -3px ${currentMethod === 'cash' ? '#10b981' : '#0ea5e9'}15`
              }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ 
                      background: currentMethod === 'cash' ? '#10b981' : currentMethod === 'storeCredit' ? '#14b8a6' : '#0ea5e9', 
                      color: 'white', 
                      padding: '10px', 
                      borderRadius: '12px',
                      display: 'flex'
                    }}>
                       {currentMethod === 'cash' ? <Banknote size={24} /> : currentMethod === 'storeCredit' ? <Wallet size={24}/> : <Smartphone size={24} />}
                    </div>
                    <div>
                       <div style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>
                          กำลังระบุ: <span style={{ color: currentMethod === 'cash' ? '#10b981' : currentMethod === 'storeCredit' ? '#14b8a6' : '#0ea5e9' }}>{currentMethod === 'cash' ? 'เงินสด' : currentMethod === 'storeCredit' ? 'เครดิตวอลเล็ท' : currentMethod === 'transfer' ? 'โอนเงิน' : 'อื่นๆ'}</span>
                       </div>
                       <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                          {currentMethod === 'storeCredit' ? (() => {
                             const customer = customers.find(c => c.id === tempCustomerId);
                             const usedCredit = payments.filter(p => p.method === 'storeCredit').reduce((s, p) => s + p.amount, 0);
                             const available = (customer?.storeCredit || 0) - usedCredit;
                             return `เครดิตคงเหลือที่ใช้ได้: ฿${available.toLocaleString()}`;
                          })() : 'แตะปุ่มหรือเลือกลูกบอลเพื่อป้อนยอด'}
                       </div>
                    </div>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a' }}>฿ {currentAmount.toLocaleString()}</div>
                 </div>
              </div>

              {/* Keypad & Modifiers */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 1.2fr', gap: '24px' }}>
                 
                 {/* Left Column: Cash Notes */}
                 <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase' }}>ทางลัดธนบัตร / เหรียญ</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        {[1, 2, 5, 10, 20, 50, 100, 500, 1000].map(val => (
                           <button 
                             key={val} 
                             onClick={() => addCashNote(val)}
                             style={{ 
                               display: 'flex', 
                               alignItems: 'center', 
                               justifyContent: 'space-between',
                               background: 'white', 
                               borderRadius: '12px', 
                               padding: '8px 12px', 
                               border: '1px solid #e2e8f0',
                               cursor: 'pointer',
                               transition: 'all 0.2s'
                             }}
                             className="payment-card"
                           >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <div style={{ 
                                    width: val <= 10 ? '12px' : '20px', 
                                    height: val <= 10 ? '12px' : '10px', 
                                    background: val === 1 ? '#cbd5e1' : val === 2 ? '#fbbf24' : val === 5 ? '#10b981' : val === 10 ? '#64748b' : val === 20 ? '#22c55e' : val === 50 ? '#3b82f6' : val === 100 ? '#ef4444' : val === 500 ? '#a855f7' : '#eab308', 
                                    borderRadius: val <= 10 ? '50%' : '2px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                 }}></div>
                                 <span style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>{val}</span>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: noteCounts[val] > 0 ? '#10b981' : '#cbd5e1' }}>
                                 {noteCounts[val] > 0 ? `x${noteCounts[val]}` : 'x0'}
                              </span>
                           </button>
                        ))}
                    </div>
                 </div>

                 {/* Right Column: Keypad */}
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', flex: 1 }}>
                       {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
                          <button key={n} onClick={() => handleKeypadPress(n)} style={{ fontSize: '24px', fontWeight: '900', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#1e293b', cursor: 'pointer' }} className="keypad-btn">{n}</button>
                       ))}
                       <button onClick={() => handleKeypadPress('clear')} style={{ fontSize: '16px', fontWeight: '800', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '16px', cursor: 'pointer' }} className="keypad-btn">CLR</button>
                       <button onClick={() => handleKeypadPress(0)} style={{ fontSize: '24px', fontWeight: '900', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#1e293b', cursor: 'pointer' }} className="keypad-btn">0</button>
                       <button onClick={() => handleKeypadPress('.')} style={{ fontSize: '24px', fontWeight: '900', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#1e293b', cursor: 'pointer' }} className="keypad-btn">.</button>
                    </div>
                    <button 
                      onClick={setExactAmount} 
                      style={{ 
                        padding: '16px', 
                        background: '#fef9c3', 
                        border: '1px solid #fde047', 
                        borderRadius: '16px', 
                        fontWeight: '800', 
                        fontSize: '16px', 
                        color: '#854d0e',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                      }} 
                      className="payment-card"
                    >
                      ชำระพอดี ฿{getGrandTotal().toLocaleString()}
                    </button>
                 </div>
              </div>

              {/* Summary & Action */}
              <div style={{ marginTop: '24px', borderTop: '2px solid #f1f5f9', paddingTop: '20px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ background: '#fef2f2', padding: '12px 16px', borderRadius: '16px', border: '1px solid #fee2e2' }}>
                       <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>คงเหลือที่ต้องชำระ</div>
                       <div style={{ fontSize: '20px', fontWeight: '900', color: '#b91c1c' }}>
                          {getPaidTotal() >= getGrandTotal() ? 'ชำระล่วงครบแล้ว' : `฿ ${(getGrandTotal() - getPaidTotal()).toLocaleString()}`}
                       </div>
                    </div>
                    <div style={{ background: '#f0f9ff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e0f2fe' }}>
                       <div style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>เงินทอน (กรณีส่งเกิน)</div>
                       <div style={{ fontSize: '20px', fontWeight: '900', color: '#0369a1' }}>
                          {getPaidTotal() > getGrandTotal() ? `฿ ${(getPaidTotal() - getGrandTotal()).toLocaleString()}` : '฿ 0'}
                       </div>
                    </div>
                 </div>

                 <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                      style={{ 
                        flex: 1, 
                        padding: '16px', 
                        background: currentAmount > 0 ? '#10b981' : '#f1f5f9', 
                        color: currentAmount > 0 ? 'white' : '#94a3b8', 
                        border: 'none', 
                        fontWeight: '800', 
                        borderRadius: '16px',
                        cursor: currentAmount > 0 ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: currentAmount > 0 ? '0 10px 15px -3px rgba(16, 185, 129, 0.2)' : 'none',
                        transition: 'all 0.2s'
                      }}
                      onClick={addPaymentEntry}
                      disabled={currentAmount <= 0}
                    >
                       <Plus size={20} /> ยืนยันยอดนี้
                    </button>
                    <button 
                      style={{ 
                        flex: 1.5, 
                        padding: '16px', 
                        background: (getPaidTotal() >= getGrandTotal()) ? '#0f172a' : '#e2e8f0', 
                        color: (getPaidTotal() >= getGrandTotal()) ? 'white' : '#94a3b8', 
                        border: 'none', 
                        fontWeight: '900', 
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center', 
                        gap: '12px', 
                        borderRadius: '16px',
                        cursor: (getPaidTotal() >= getGrandTotal()) ? 'pointer' : 'not-allowed',
                        boxShadow: (getPaidTotal() >= getGrandTotal()) ? '0 10px 15px -3px rgba(15, 23, 42, 0.3)' : 'none',
                        transition: 'all 0.2s'
                      }}
                      disabled={isProcessing || (getPaidTotal() < getGrandTotal())}
                      onClick={() => {
                         onClose();
                         processCheckout(tempCustomerId);
                      }}
                    >
                       {isProcessing ? 'กำลังบันทึก...' : (getPaidTotal() >= getGrandTotal() ? 'เสร็จสิ้นการชำระเงิน' : 'รอชำระให้ครบ...')}
                       <Send size={20} />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}


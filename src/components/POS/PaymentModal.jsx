import React from 'react';
import { X, Plus, ShoppingCart, Send, CreditCard, Gift, Beer, Smartphone, MoreHorizontal, BadgePercent, Printer } from 'lucide-react';

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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#f0f2f5', zIndex: 9991, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn-icon" onClick={onClose}><X size={24}/></button>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>ชำระเงิน (Payment)</h2>
         </div>
         <div style={{ fontSize: '14px', color: '#718096' }}>ลูกค้า: <span style={{ color: '#2d3748', fontWeight: 'bold' }}>{tempCustomerId ? (customers.find(c => c.id === tempCustomerId)?.name || 'Guest') : 'Walk-in'}</span></div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden' }}>
         
         {/* Left: Receipt Preview */}
         <div style={{ padding: '20px 15px', overflowY: 'auto', display: 'flex', justifyContent: 'flex-start', background: '#e2e8f0' }}>
            <div style={{ width: '100%', background: 'white', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', borderRadius: '2px', alignSelf: 'start', position: 'relative' }}>
               <div style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '15px' }}>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#2d3748', letterSpacing: '2px' }}>SIS & RICH</div>
                  <div style={{ fontSize: '11px', color: '#718096', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Receipt / Tax Invoice (Draft)</div>
               </div>
               
               <div style={{ fontSize: '13px', color: '#2d3748' }}>
                  {cart.map(item => (
                     <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>{item.name} <span style={{ color: '#cbd5e0', marginLeft: '4px' }}>x {item.qty}</span></div>
                        <div style={{ fontWeight: '500' }}>฿{(item.price * item.qty).toLocaleString()}</div>
                     </div>
                  ))}
               </div>

               <div style={{ borderTop: '1px solid #2d3748', marginTop: '20px', paddingTop: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#718096', marginBottom: '4px' }}>
                     <span>รวมเป็นเงิน</span>
                     <span>฿{getTotal().toLocaleString()}</span>
                  </div>
                  {selectedPromotion && (
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#e53e3e', marginBottom: '4px' }}>
                        <span>ส่วนลด</span>
                        <span>-฿{getDiscountAmount().toLocaleString()}</span>
                     </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', fontWeight: '900', color: '#2d3748', marginTop: '10px' }}>
                     <span>ยอดสุทธิ</span>
                     <span>฿{getGrandTotal().toLocaleString()}</span>
                  </div>
               </div>

               <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '11px', color: '#cbd5e0', fontStyle: 'italic' }}>* This is a draft receipt *</div>
            </div>
         </div>

         {/* Right: Payment Controls */}
         <div style={{ background: 'white', padding: '24px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
               <button 
                 className="btn btn-outline" 
                 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                 onClick={() => setShowMethodSelector(true)}
               >
                  <Plus size={16} /> วิธีการชำระอื่น
               </button>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '12px', color: '#718096' }}>ยอดรวมสุทธิ</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#2d3748' }}>฿ {getGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
               </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#718096', marginBottom: '10px' }}>รายการที่รับมาแล้ว ({payments.length})</div>
                {payments.length === 0 && <div style={{ padding: '15px', border: '1px dashed #cbd5e0', borderRadius: '8px', color: '#a0aec0', textAlign: 'center' }}>ยังไม่มีรายการยืนยัน</div>}
               {payments.map((p) => {
                  const methodData = {
                     cash: { label: 'เงินสด', color: '#38a169', icon: <ShoppingCart size={14}/>, bg: '#f0fff4' },
                     transfer: { label: 'โอนเงิน', color: '#08627d', icon: <Send size={14}/>, bg: '#ebf8ff' },
                     credit: { label: 'บัตรเครดิต', color: '#3182ce', icon: <CreditCard size={14}/>, bg: '#ebf8ff' },
                     debit: { label: 'บัตรเดบิต', color: '#805ad5', icon: <CreditCard size={14}/>, bg: '#faf5ff' },
                     gift: { label: 'บัตรกำนัล', color: '#e53e3e', icon: <Gift size={14}/>, bg: '#fff5f5' },
                     entertain: { label: 'รับรอง', color: '#d69e2e', icon: <Beer size={14}/>, bg: '#fffaf0' },
                     online: { label: 'แอปธนาคาร', color: '#ed8936', icon: <Smartphone size={14}/>, bg: '#fffaf0' },
                     other: { label: 'อื่นๆ', color: '#48bb78', icon: <MoreHorizontal size={14}/>, bg: '#f0fff4' },
                  }[p.method] || { label: 'อื่นๆ', color: '#4a5568', icon: <MoreHorizontal size={14}/>, bg: '#f7fafc' };

                  return (
                     <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: methodData.bg, border: `1px solid ${methodData.color}40`, padding: '8px 12px', borderRadius: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: methodData.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {methodData.icon}
                           </div>
                           <span style={{ fontWeight: 'bold', fontSize: '13px', color: methodData.color }}>{methodData.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <span style={{ fontWeight: '900', color: '#2d3748', fontSize: '15px' }}>฿ {p.amount.toLocaleString()}</span>
                           <button onClick={() => removePaymentEntry(p.id)} style={{ color: '#e53e3e', background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex' }}><X size={16}/></button>
                        </div>
                     </div>
                  );
               })}
            </div>

            <div style={{ border: currentMethod === 'cash' ? '2px solid #38a169' : '2px solid #3182ce', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: currentMethod === 'cash' ? '#f0fff4' : '#ebf8ff', marginBottom: '16px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ background: currentMethod === 'cash' ? '#38a169' : '#3182ce', color: 'white', padding: '8px', borderRadius: '8px' }}>
                     {currentMethod === 'cash' ? <ShoppingCart size={24} /> : <BadgePercent size={24} />}
                  </div>
                  <div>
                     <div style={{ fontWeight: 'bold', fontSize: '15px' }}>กำลังระบุ: {currentMethod === 'cash' ? 'เงินสด' : currentMethod === 'transfer' ? 'โอนเงิน' : 'วิธีการอื่นๆ'}</div>
                     <div style={{ fontSize: '11px', color: currentMethod === 'cash' ? '#38a169' : '#3182ce' }}>กรอกยอดเงินสำหรับวิธีนี้</div>
                  </div>
               </div>
               <div style={{ fontSize: '24px', fontWeight: 'bold' }}>฿ {currentAmount.toLocaleString()}</div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', alignContent: 'start', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
                      {[1, 2, 5, 10, 20, 50, 100, 500, 1000].map(val => (
                         <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F7FAFC', borderRadius: '8px', padding: '4px', border: '1px solid #E2E8F0' }}>
                            <button 
                              onClick={() => addCashNote(val)}
                              style={{ flex: 1, height: '40px', borderRadius: '6px', border: 'none', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                              className="hover-bg-gray"
                            >
                               <div style={{ 
                                  width: val <= 10 ? '10px' : '20px', 
                                  height: val <= 10 ? '10px' : '8px', 
                                  background: val === 1 ? '#CBD5E0' : val === 2 ? '#ECC94B' : val === 5 ? '#38A169' : val === 10 ? '#718096' : val === 20 ? '#48BB78' : val === 50 ? '#4299E1' : val === 100 ? '#F56565' : val === 500 ? '#9F7AEA' : '#ECC94B', 
                                  borderRadius: val <= 10 ? '50%' : '1px' 
                               }}></div>
                               <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{val}</span>
                            </button>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: noteCounts[val] > 0 ? '#2F855A' : '#A0AEC0', minWidth: '30px', textAlign: 'center' }}>
                               x{noteCounts[val]}
                            </div>
                         </div>
                      ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                     {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
                        <button key={n} onClick={() => handleKeypadPress(n)} style={{ fontSize: '20px', fontWeight: '900', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', height: '52px' }} className="hover-bg-gray">{n}</button>
                     ))}
                     <button onClick={() => handleKeypadPress('clear')} style={{ fontSize: '15px', fontWeight: 'bold', background: '#fff5f5', color: '#e53e3e', border: '1px solid #feb2b2', borderRadius: '10px' }} className="hover-bg-gray">CLR</button>
                     <button onClick={() => handleKeypadPress(0)} style={{ fontSize: '20px', fontWeight: '900', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px' }} className="hover-bg-gray">0</button>
                     <button onClick={() => handleKeypadPress('.')} style={{ fontSize: '20px', fontWeight: '900', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px' }} className="hover-bg-gray">.</button>
                     <button onClick={setExactAmount} style={{ gridColumn: 'span 3', padding: '12px', background: '#fbd38d', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', color: '#744210' }} className="hover-bg-gray">ชำระพอดี ฿{getGrandTotal().toLocaleString()}</button>
                  </div>
               </div>
            </div>

            <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#e53e3e', fontWeight: 'bold', fontSize: '13px' }}>คงเหลือที่ต้องจ่าย</span>
                  <span style={{ color: '#e53e3e', fontWeight: 'bold', fontSize: '16px' }}>฿ {Math.max(0, getGrandTotal() - getPaidTotal()).toLocaleString()}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ color: '#718096', fontWeight: 'bold', fontSize: '13px' }}>เงินทอน (กรณีเงินสดเกิน)</span>
                  <span style={{ color: '#3182ce', fontWeight: 'bold', fontSize: '20px' }}>
                     {getPaidTotal() > getGrandTotal() ? `-฿ ${(getPaidTotal() - getGrandTotal()).toLocaleString()}` : '฿ 0'}
                  </span>
               </div>

               <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn" 
                    style={{ flex: 1.2, padding: '12px', background: '#38a169', color: 'white', border: 'none', fontWeight: 'bold', borderRadius: '8px' }}
                    onClick={addPaymentEntry}
                    disabled={currentAmount <= 0}
                  >
                     <Plus size={16} /> ยืนยันยอดนี้
                  </button>
                  <button 
                    className="btn" 
                    style={{ 
                      flex: 2, 
                      padding: '12px', 
                      background: (getPaidTotal() >= getGrandTotal()) ? '#2d3748' : '#cbd5e0', 
                      color: 'white', 
                      border: 'none', 
                      fontWeight: 'bold', 
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center', gap: '10px', borderRadius: '8px'
                    }}
                    disabled={isProcessing || (getPaidTotal() < getGrandTotal())}
                    onClick={() => {
                       onClose();
                       processCheckout(tempCustomerId);
                    }}
                  >
                     {isProcessing ? 'กำลังบันทึก...' : 'ชำระเงินเรียบร้อย'}
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Plus, ShoppingCart, Send, CreditCard, Gift, Beer, Smartphone, MoreHorizontal, BadgePercent, Printer, Wallet, Banknote, Briefcase, User, Search } from 'lucide-react';

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
  selectedPromotion,
  employees,
  selectedSeller,
  setSelectedSeller,
  selectedCustomer,
  setSelectedCustomer,
  setTempCustomerId
}) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const customerData = tempCustomerId ? customers.find(c => c.id === tempCustomerId) : null;

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.phone?.includes(customerSearch) ||
    c.nickname?.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 10); // Limit to 10 for performance

  const handleSelectCustomer = (id) => {
    setSelectedCustomer(id);
    setTempCustomerId(id);
    setIsSearchOpen(false);
    setCustomerSearch(''); // Clear search after selection
  };

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
            .selector-input:focus {
              border-color: #3182ce !important;
              box-shadow: 0 0 0 1px #3182ce !important;
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
                <div style={{ fontSize: '13px', color: '#64748b' }}>กรอกข้อมูลพนักงานและลูกค้าเพื่อบันทึกการขายลงระบบ</div>
              </div>
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Salesperson Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <Briefcase size={16} color="#3182ce" />
                <select 
                  className="selector-input"
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    outline: 'none', 
                    fontSize: '13px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    padding: '4px 0',
                    cursor: 'pointer'
                  }}
                  value={selectedSeller?.id || ''} 
                  onChange={(e) => {
                    const emp = employees.find(emp => emp.id === e.target.value);
                    setSelectedSeller(emp || null);
                  }}
                >
                  <option value="">-- เลือกพนักงานขาย --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              {/* Searchable Customer Selector */}
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <Search size={16} color="#48bb78" />
                  <input 
                    type="text"
                    placeholder={customerData ? `👤 ${customerData.name}` : "ค้นชื่อ / เบอร์สมาชิก..."}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      outline: 'none', 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      color: customerData && !customerSearch ? '#48bb78' : '#1e293b',
                      padding: '4px 0',
                      width: '100%'
                    }}
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                  />
                  {(customerSearch || tempCustomerId) && (
                    <button 
                      onClick={() => {
                        handleSelectCustomer('');
                        setCustomerSearch('');
                      }}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {isSearchOpen && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    background: 'white', 
                    marginTop: '8px', 
                    borderRadius: '16px', 
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0',
                    zIndex: 10000,
                    overflow: 'hidden'
                  }}>
                    <div 
                      onClick={() => handleSelectCustomer('')}
                      style={{ padding: '10px 16px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      🚶 Walk-in Customer (ลูกค้าทั่วไป)
                    </div>
                    {filteredCustomers.map(c => (
                      <div 
                        key={c.id}
                        onClick={() => handleSelectCustomer(c.id)}
                        style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f0fdf4'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{c.name}</span>
                           <span style={{ fontSize: '11px', color: '#3182ce', fontWeight: 'bold' }}>{c.phone}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                           💰 ฿{(c.storeCredit || 0).toLocaleString()} | 🎯 {c.points || 0} pts
                        </div>
                      </div>
                    ))}
                    {filteredCustomers.length === 0 && customerSearch && (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                         ไม่พบข้อมูลสมาชิก...
                      </div>
                    )}
                  </div>
                )}
              </div>
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
                    {customerData && (
                      <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px dotted #cbd5e1' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} /> สิทธิประโยชน์สมาชิก
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#475569' }}>💸 เครดิตวอลเล็ท:</span>
                          <span style={{ fontWeight: 'bold', color: '#10b981' }}>฿{(customerData.storeCredit || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: '#475569' }}>🎯 แต้มสะสม:</span>
                          <span style={{ fontWeight: 'bold', color: '#3182ce' }}>{(customerData.points || 0).toLocaleString()} pts</span>
                        </div>
                      </div>
                    )}
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


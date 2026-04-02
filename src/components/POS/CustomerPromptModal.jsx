import React from 'react';
import { X, Search, Zap, Plus, UserPlus } from 'lucide-react';

export default function CustomerPromptModal({ 
  isOpen, 
  onClose, 
  customers, 
  modalCustomerSearch, 
  setModalCustomerSearch,
  onQuickQN,
  onAddMember,
  onSelectCustomer
}) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(6px)' }}>
      <div className="card animate-slide-in" style={{ width: '650px', backgroundColor: '#fff', padding: 0, borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, #FFFFFF, #F8FAFC)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3182CE' }}></div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2D3748' }}>เลือกลูกค้า / สมัครสมาชิก</h2>
          </div>
          <button 
            className="btn-icon" 
            onClick={onClose}
            style={{ transition: 'transform 0.2s' }}
            onMouseOver={e => e.currentTarget.style.transform = 'rotate(90deg)'}
            onMouseOut={e => e.currentTarget.style.transform = 'rotate(0deg)'}
          >
            <X size={24} color="#A0AEC0" />
          </button>
        </div>
        
        <div style={{ padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            
            {/* Left: Search CRM Section */}
            <div style={{ borderRight: '1px solid #E2E8F0', paddingRight: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                 <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EBF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Search size={18} color="#3182CE" />
                 </div>
                 <label style={{ fontSize: '15px', fontWeight: 'bold', color: '#2D3748' }}>ค้นหาสมาชิกเดิม (CRM)</label>
              </div>
              
              <div className="input-icon-wrapper" style={{ marginBottom: '20px' }}>
                <Search className="icon" size={18} color="#3182CE" />
                <input 
                  type="text" 
                  className="input" 
                  placeholder="ค้นด้วยชื่อ หรือ เบอร์โทร..." 
                  style={{ 
                    height: '52px', 
                    fontSize: '16px', 
                    borderRadius: '16px', 
                    border: '2px solid #EBF8FF',
                    background: '#F8FAFC' 
                  }}
                  value={modalCustomerSearch}
                  onChange={(e) => setModalCustomerSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ 
                height: '300px', 
                overflowY: 'auto', 
                border: '1px solid #E2E8F0', 
                borderRadius: '20px', 
                background: '#FFFFFF',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' 
              }}>
                {!modalCustomerSearch ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#A0AEC0', padding: '20px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#F7FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <Search size={32} color="#CBD5E0" />
                    </div>
                    <div style={{ fontSize: '15px', color: '#718096', fontWeight: '500' }}>พิมพ์เพื่อเริ่มต้นค้นหา...</div>
                  </div>
                ) : (
                  <div style={{ padding: '12px' }}>
                    {customers
                      .filter(c => 
                        c.name?.toLowerCase().includes(modalCustomerSearch.toLowerCase()) || 
                        c.phone?.includes(modalCustomerSearch) ||
                        c.nickname?.toLowerCase().includes(modalCustomerSearch.toLowerCase())
                      )
                      .slice(0, 10).map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => onSelectCustomer(c.id)}
                          style={{ 
                            padding: '12px 16px', 
                            borderRadius: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                            background: '#F8FAFC',
                            border: '1px solid #EDF2F7',
                            transition: 'all 0.2s'
                          }}
                          className="hover-scale"
                          onMouseOver={e => {
                            e.currentTarget.style.background = '#EBF8FF';
                            e.currentTarget.style.borderColor = '#BEE3F8';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = '#F8FAFC';
                            e.currentTarget.style.borderColor = '#EDF2F7';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                             <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3182CE' }}>{c.name?.charAt(0)}</div>
                             </div>
                             <div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2D3748' }}>{c.name}</div>
                                <div style={{ fontSize: '12px', color: '#718096' }}>{c.phone}</div>
                             </div>
                          </div>
                          <div style={{ fontSize: '11px', color: '#3182CE', fontWeight: 'bold', background: '#FFFFFF', padding: '4px 8px', borderRadius: '8px', border: '1px solid #EBF8FF' }}>{c.memberId}</div>
                        </div>
                      ))}
                    {customers.filter(c => 
                      c.name?.toLowerCase().includes(modalCustomerSearch.toLowerCase()) || 
                      c.phone?.includes(modalCustomerSearch) ||
                      c.nickname?.toLowerCase().includes(modalCustomerSearch.toLowerCase())
                    ).length === 0 && (
                      <div style={{ padding: '60px 20px', textAlign: 'center', fontSize: '14px', color: '#718096' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
                        ไม่พข้อมูลสมาชิกที่ค้นหา
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
              
              {/* Quick Pay Button - Vibrant Gradient */}
              <button 
                onClick={onQuickQN}
                style={{ 
                  width: '100%', 
                  padding: '30px 20px', 
                  background: 'linear-gradient(135deg, #48BB78 0%, #38A169 100%)', 
                  border: 'none', 
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px -5px rgba(56, 161, 105, 0.4)',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                className="hover-scale"
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={32} color="#FFFFFF" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: '900', color: '#FFFFFF', fontSize: '22px', marginBottom: '2px' }}>ชำระเงินทันที</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}>( ข้ามการระบุสมาชิก )</div>
                </div>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '0 20px' }}>
                <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }}></div>
                <span style={{ fontSize: '13px', color: '#A0AEC0', fontWeight: 'bold' }}>หรือ</span>
                <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }}></div>
              </div>

              {/* Add Member Button - Vibrant Blue Gradient */}
              <button 
                onClick={onAddMember}
                style={{ 
                  width: '100%', 
                  padding: '24px 20px', 
                  background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', 
                  border: 'none', 
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  boxShadow: '0 10px 25px -5px rgba(118, 75, 162, 0.4)',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                className="hover-scale"
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={22} color="#FFFFFF" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '900', fontSize: '18px' }}>ลงทะเบียนสมาชิกใหม่</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>สมัครสมาชิก CRM ใน 30 วินาที</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 32px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
           <button 
             className="btn" 
             style={{ 
               background: '#718096', 
               color: 'white', 
               border: 'none', 
               padding: '10px 30px', 
               borderRadius: '10px',
               fontWeight: 'bold',
               transition: 'all 0.2s' 
             }} 
             onClick={onClose}
             onMouseOver={e => e.currentTarget.style.background = '#4A5568'}
             onMouseOut={e => e.currentTarget.style.background = '#718096'}
           >
             ปิดหน้าต่าง
           </button>
        </div>
      </div>
    </div>
  );
}

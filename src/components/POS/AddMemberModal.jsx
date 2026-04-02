import React from 'react';
import { X, User, CheckCircle2 } from 'lucide-react';

export default function AddMemberModal({ isOpen, onClose, customerForm, setCustomerForm, onSubmit }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
       <div className="card animate-slide-in" style={{ width: '550px', background: 'white', padding: 0, borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          
          {/* Header with Indigo Gradient */}
          <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <User size={24} color="#FFFFFF" />
                </div>
                <div>
                   <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF' }}>ลงทะเบียนสมาชิกด่วน</h2>
                   <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>กรอกข้อมูลเพียงไม่กี่อย่างเพื่อเริ่มสะสมแต้ม</p>
                </div>
             </div>
             <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFFFFF' }}>
                <X size={20} />
             </button>
          </div>

          <form onSubmit={onSubmit} style={{ padding: '32px' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                   <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#4A5568' }}>ชื่อเล่นสมาชิก *</label>
                   <input 
                     type="text" 
                     className="input" 
                     style={{ height: '50px', borderRadius: '12px', fontSize: '16px', border: '2px solid #E2E8F0' }}
                     value={customerForm.nickname} 
                     onChange={e => setCustomerForm({...customerForm, nickname: e.target.value})} 
                     required 
                     placeholder="เช่น น้องฟ้า" 
                   />
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#4A5568' }}>เบอร์โทรศัพท์ *</label>
                   <input 
                     type="tel" 
                     className="input" 
                     style={{ height: '50px', borderRadius: '12px', fontSize: '16px', border: '2px solid #E2E8F0' }}
                     value={customerForm.phone} 
                     onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} 
                     required 
                     placeholder="08X-XXX-XXXX" 
                   />
                </div>
             </div>

             <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#4A5568' }}>เพศ (Gender)</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                   {['Male', 'Female', 'Other'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setCustomerForm({...customerForm, gender: g})}
                        style={{ 
                           flex: 1, 
                           padding: '12px', 
                           borderRadius: '12px', 
                           border: customerForm.gender === g ? '2px solid #667EEA' : '2px solid #E2E8F0',
                           background: customerForm.gender === g ? '#EBF4FF' : '#FFFFFF',
                           color: customerForm.gender === g ? '#5A67D8' : '#718096',
                           fontWeight: 'bold',
                           cursor: 'pointer',
                           transition: 'all 0.2s'
                        }}
                      >
                         {g === 'Male' ? 'ชาย (Male)' : g === 'Female' ? 'หญิง (Female)' : 'อื่นๆ (Other)'}
                      </button>
                   ))}
                </div>
             </div>

             <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ flex: 1, height: '56px', borderRadius: '16px', border: 'none', background: '#F7FAFC', color: '#718096', fontWeight: 'bold', fontSize: '16px' }} 
                  onClick={onClose}
                >
                   ยกเลิก
                </button>
                <button 
                   type="submit" 
                   className="btn" 
                   style={{ 
                      flex: 2, 
                      height: '56px', 
                      borderRadius: '16px', 
                      border: 'none', 
                      background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', 
                      color: '#FFFFFF', 
                      fontWeight: '900', 
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 10px 15px -3px rgba(118, 75, 162, 0.3)'
                   }}
                >
                   <CheckCircle2 size={24} /> บันทึกและเลือกใชั
                </button>
             </div>
          </form>
       </div>
    </div>
  );
}

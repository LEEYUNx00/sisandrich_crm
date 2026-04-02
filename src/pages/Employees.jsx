import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Search, Plus, UserCheck, Shield, Trash2, Edit, X, User, Briefcase, Phone, Mail } from 'lucide-react';

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    role: 'Staff',
    phone: '',
    email: '',
    status: 'Active',
    permissions: {
      pos: true,
      inventory: false,
      crm: false,
      promotions: false,
      reports: false,
      employees: false,
      settings: false
    }
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const empList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmployees(empList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'employees'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      alert("✅ เพิ่มพนักงานเรียบร้อย!");
      setIsModalOpen(false);
      setFormData({ 
        name: '', role: 'Staff', phone: '', email: '', status: 'Active',
        permissions: { pos: true, inventory: false, crm: false, promotions: false, reports: false, employees: false, settings: false } 
      });
    } catch(err) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      const empRef = doc(db, 'employees', editingEmployee.id);
      await updateDoc(empRef, {
        name: editingEmployee.name,
        role: editingEmployee.role,
        phone: editingEmployee.phone,
        email: editingEmployee.email,
        status: editingEmployee.status,
        permissions: editingEmployee.permissions || {}
      });
      alert("✅ อัปเดตข้อมูลพนักงานสำเร็จ!");
      setIsEditModalOpen(false);
    } catch(err) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteEmployee = async (id, name) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพนักงาน "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'employees', id));
        alert("🗑️ ลบข้อมูลเรียบร้อยแล้ว");
      } catch(err) {
        alert("Error: " + err.message);
      }
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-slide-in" style={{ padding: '0 10px' }}>
      
      {/* --- Page Header --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '950', color: '#1A202C', marginBottom: '6px', letterSpacing: '-0.02em' }}>
             ทีมงาน & <span style={{ color: '#3182CE' }}>การเข้าถึง</span>
          </h2>
          <p style={{ color: '#718096', fontSize: '14px', fontWeight: '500' }}>จัดการรายชื่อ บทบาท และสถานะของพนักงานในระบบ</p>
        </div>
        <button 
           className="btn btn-primary" 
           style={{ 
             display: 'flex', 
             alignItems: 'center', 
             gap: '10px', 
             background: 'linear-gradient(135deg, #3182CE 0%, #2B6CB0 100%)',
             padding: '12px 24px',
             borderRadius: '16px',
             border: 'none',
             boxShadow: '0 10px 15px -3px rgba(49, 130, 206, 0.3)',
             fontSize: '15px',
             fontWeight: 'bold'
           }} 
           onClick={() => setIsModalOpen(true)}
        >
           <Plus size={20} /> เพิ่มพนักงานใหม่
        </button>
      </div>

      {/* --- Search & Stats Summary --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '24px', display: 'flex', alignItems: 'center' }}>
          <div className="input-icon-wrapper" style={{ width: '100%', margin: 0 }}>
            <Search className="icon" size={20} color="#A0AEC0" />
            <input 
              type="text" 
              className="input" 
              placeholder="ค้นหาชื่อพนักงาน หรือ ตำแหน่งหน้าที่..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', height: '50px' }}
            />
          </div>
        </div>
        <div className="card" style={{ padding: '24px', background: '#3182CE', borderRadius: '24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.8, marginBottom: '4px' }}>TOTAL STAFF</p>
              <h3 style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>{employees.length} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>คน</span></h3>
           </div>
           <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={24} />
           </div>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', background: 'white', borderRadius: '24px', border: '1px solid #EDF2F7', overflow: 'hidden' }}>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: '#718096', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 20px' }}>ข้อมูลส่วนตัว (Profile)</th>
                <th style={{ padding: '12px 20px' }}>บทบาท (Role)</th>
                <th style={{ padding: '12px 20px' }}>ข้อมูลติดต่อ</th>
                <th style={{ padding: '12px 20px' }}>สถานะ</th>
                <th style={{ padding: '12px 20px', textAlign: 'center' }}>เครื่องมือ</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.id} style={{ transition: 'all 0.2s' }} className="hover-bg-blue">
                  <td style={{ padding: '16px 20px', background: '#F8FAFC', borderRadius: '16px 0 0 16px', borderTop: '1px solid #EDF2F7', borderBottom: '1px solid #EDF2F7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ 
                         width: '44px', 
                         height: '44px', 
                         borderRadius: '14px', 
                         background: 'linear-gradient(135deg, #EBF8FF 0%, #BEE3F8 100%)', 
                         color: '#3182CE', 
                         display: 'flex', 
                         alignItems: 'center', 
                         justifyContent: 'center', 
                         fontWeight: '900',
                         fontSize: '18px'
                      }}>
                        {emp.name?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#2D3748' }}>{emp.name}</div>
                        <div style={{ fontSize: '11px', color: '#A0AEC0' }}>ID: {emp.id.slice(-6).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', background: '#F8FAFC', borderTop: '1px solid #EDF2F7', borderBottom: '1px solid #EDF2F7' }}>
                    <div style={{ 
                       fontSize: '12px', 
                       fontWeight: '700', 
                       display: 'inline-flex', 
                       alignItems: 'center', 
                       gap: '6px',
                       padding: '6px 12px',
                       borderRadius: '10px',
                       background: emp.role === 'Admin' ? '#FFF5F5' : '#EBF8FF',
                       color: emp.role === 'Admin' ? '#E53E3E' : '#3182CE'
                    }}>
                      {emp.role === 'Admin' ? <Shield size={14} /> : <Briefcase size={14} />}
                      {emp.role}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', background: '#F8FAFC', borderTop: '1px solid #EDF2F7', borderBottom: '1px solid #EDF2F7' }}>
                    <div style={{ fontSize: '13px', color: '#4A5568', fontWeight: '600' }}>{emp.phone || '-'}</div>
                    <div style={{ fontSize: '11px', color: '#718096' }}>{emp.email || '-'}</div>
                  </td>
                  <td style={{ padding: '16px 20px', background: '#F8FAFC', borderTop: '1px solid #EDF2F7', borderBottom: '1px solid #EDF2F7' }}>
                    <span style={{ 
                       fontSize: '11px', 
                       fontWeight: 'bold', 
                       padding: '4px 10px', 
                       borderRadius: '8px', 
                       background: emp.status === 'Active' ? '#C6F6D5' : '#FED7D7', 
                       color: emp.status === 'Active' ? '#22543D' : '#822727',
                       display: 'inline-flex',
                       alignItems: 'center',
                       gap: '4px'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: emp.status === 'Active' ? '#48BB78' : '#F56565' }}></div>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', background: '#F8FAFC', borderRadius: '0 16px 16px 0', borderTop: '1px solid #EDF2F7', borderBottom: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button 
                         className="btn-icon" 
                         style={{ background: 'white', color: '#3182CE', border: '1px solid #E2E8F0', width: '36px', height: '36px' }} 
                         onClick={() => { setEditingEmployee(emp); setIsEditModalOpen(true); }}
                      >
                         <Edit size={16} />
                      </button>
                      <button 
                         className="btn-icon" 
                         style={{ background: 'white', color: '#E53E3E', border: '1px solid #E2E8F0', width: '36px', height: '36px' }} 
                         onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                      >
                         <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD MODAL --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div className="card animate-slide-in" style={{ width: '500px', background: 'white', padding: 0, borderRadius: '28px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #3182CE 0%, #2B6CB0 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <User size={24} color="#FFFFFF" />
                  </div>
                  <div>
                     <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF' }}>เพิ่มพนักงานใหม่</h3>
                     <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>กรอกข้อมูลเพื่อสร้างสิทธิ์การใช้งานระบบ</p>
                  </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%', color: 'white', cursor: 'pointer' }}>
                  <X size={20}/>
               </button>
            </div>

            <form onSubmit={handleAddEmployee} style={{ padding: '32px' }}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ชื่อ-นามสกุล / ชื่อเล่น</label>
                 <input 
                   type="text" 
                   className="input" 
                   value={formData.name} 
                   onChange={e => setFormData({...formData, name: e.target.value})} 
                   required 
                   placeholder="เช่น คุณแอร์ (Administrator)" 
                   style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', height: '52px', borderRadius: '14px' }}
                 />
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>ตำแหน่ง (Role)</label>
                    <select 
                      className="input" 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', height: '52px', borderRadius: '14px' }}
                    >
                       <option value="Staff">Staff</option>
                       <option value="Manager">Manager</option>
                       <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>สถานะ (Status)</label>
                    <select 
                       className="input" 
                       value={formData.status} 
                       onChange={e => setFormData({...formData, status: e.target.value})}
                       style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', height: '52px', borderRadius: '14px' }}
                    >
                       <option value="Active">Active</option>
                       <option value="On Leave">On Leave</option>
                       <option value="Inactive">Inactive</option>
                    </select>
                  </div>
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>เบอร์โทรศัพท์ติดต่อ</label>
                 <input 
                   type="tel" 
                   className="input" 
                   value={formData.phone} 
                   onChange={e => setFormData({...formData, phone: e.target.value})} 
                   placeholder="081-XXX-XXXX"
                   style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', height: '52px', borderRadius: '14px' }}
                 />
               </div>

               <div style={{ marginBottom: '32px' }}>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>อีเมล (Email)</label>
                 <input 
                   type="email" 
                   className="input" 
                   value={formData.email} 
                   onChange={e => setFormData({...formData, email: e.target.value})} 
                   placeholder="example@sisandrich.com"
                   style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', height: '52px', borderRadius: '14px' }}
                 />
               </div>

               <div style={{ marginBottom: '24px', background: '#F7FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#3182CE', marginBottom: '12px', textTransform: 'uppercase' }}>สิทธิ์การเข้าใช้งาน (Permissions)</label>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { key: 'pos', label: 'ใช้งาน POS' },
                      { key: 'inventory', label: 'จัดการสต็อกสินค้า' },
                      { key: 'crm', label: 'จัดการลูกค้า (CRM)' },
                      { key: 'reports', label: 'ดูรายงาน & Log' },
                      { key: 'promotions', label: 'จัดการโปรโมชั่น' },
                      { key: 'employees', label: 'จัดการทีมงาน' },
                      { key: 'settings', label: 'ตั้งค่าระบบ' }
                    ].map(perm => (
                      <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#4A5568', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={formData.permissions[perm.key]} 
                          onChange={e => setFormData({
                            ...formData, 
                            permissions: { ...formData.permissions, [perm.key]: e.target.checked }
                          })} 
                        />
                        {perm.label}
                      </label>
                    ))}
                 </div>
               </div>

               <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1, height: '56px', borderRadius: '16px', fontWeight: 'bold' }} onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '56px', borderRadius: '16px', fontWeight: 'bold', background: '#2D3748' }}>บันทึกพนักงาน</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && editingEmployee && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div className="card animate-slide-in" style={{ width: '500px', background: 'white', padding: 0, borderRadius: '28px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #4A5568 0%, #2D3748 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Edit size={24} color="#FFFFFF" />
                  </div>
                  <div>
                     <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF' }}>แก้ไขข้อมูลพนักงาน</h3>
                     <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>ID: {editingEmployee.id}</p>
                  </div>
               </div>
               <button onClick={() => setIsEditModalOpen(false)} style={{ border: 'none', background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%', color: 'white', cursor: 'pointer' }}>
                  <X size={20}/>
               </button>
            </div>

            <form onSubmit={handleUpdateEmployee} style={{ padding: '32px' }}>
               <div style={{ marginBottom: '20px' }}>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>ชื่อ-นามสกุล</label>
                 <input 
                   type="text" 
                   className="input" 
                   value={editingEmployee.name} 
                   onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} 
                   required 
                   style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', height: '52px', borderRadius: '14px' }}
                 />
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>ตำแหน่ง</label>
                    <select 
                      className="input" 
                      value={editingEmployee.role} 
                      onChange={e => setEditingEmployee({...editingEmployee, role: e.target.value})}
                      style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', height: '52px', borderRadius: '14px' }}
                    >
                       <option value="Staff">Staff</option>
                       <option value="Manager">Manager</option>
                       <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>สถานะ</label>
                    <select 
                       className="input" 
                       value={editingEmployee.status} 
                       onChange={e => setEditingEmployee({...editingEmployee, status: e.target.value})}
                       style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', height: '52px', borderRadius: '14px' }}
                    >
                       <option value="Active">Active</option>
                       <option value="On Leave">On Leave</option>
                       <option value="Inactive">Inactive</option>
                    </select>
                  </div>
               </div>

               <div style={{ marginBottom: '20px' }}>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>เบอร์โทรศัพท์</label>
                 <input 
                   type="tel" 
                   className="input" 
                   value={editingEmployee.phone} 
                   onChange={e => setEditingEmployee({...editingEmployee, phone: e.target.value})} 
                   style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', height: '52px', borderRadius: '14px' }}
                 />
               </div>

               <div style={{ marginBottom: '32px' }}>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>อีเมล</label>
                 <input 
                   type="email" 
                   className="input" 
                   value={editingEmployee.email} 
                   onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} 
                   style={{ background: '#F7FAFC', border: '1px solid #E2E8F0', height: '52px', borderRadius: '14px' }}
                 />
               </div>

               <div style={{ marginBottom: '24px', background: '#F7FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '12px', textTransform: 'uppercase' }}>สิทธิ์การเข้าใช้งาน (Permissions)</label>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { key: 'pos', label: 'ใช้งาน POS' },
                      { key: 'inventory', label: 'จัดการสต็อกสินค้า' },
                      { key: 'crm', label: 'จัดการลูกค้า (CRM)' },
                      { key: 'reports', label: 'ดูรายงาน & Log' },
                      { key: 'promotions', label: 'จัดการโปรโมชั่น' },
                      { key: 'employees', label: 'จัดการทีมงาน' },
                      { key: 'settings', label: 'ตั้งค่าระบบ' }
                    ].map(perm => (
                      <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#4A5568', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={editingEmployee.permissions?.[perm.key] || false} 
                          onChange={e => setEditingEmployee({
                            ...editingEmployee, 
                            permissions: { ...(editingEmployee.permissions || {}), [perm.key]: e.target.checked }
                          })} 
                        />
                        {perm.label}
                      </label>
                    ))}
                 </div>
               </div>

               <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1, height: '56px', borderRadius: '16px', fontWeight: 'bold' }} onClick={() => setIsEditModalOpen(false)}>ยกเลิก</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '56px', borderRadius: '16px', fontWeight: 'bold', background: '#3182CE' }}>อัปเดตข้อมูล</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

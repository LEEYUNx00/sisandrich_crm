import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Search, Plus, Filter, Download, Users, User, Star, Award, Crown, Gift, Calendar, Share2, Wallet, X, CheckCircle, Copy, Edit, Trash2, History, ChevronRight, ShoppingBag } from 'lucide-react';

export default function CRM() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Registration Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState(null);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // New Customer Form State
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    dob: '',
    gender: 'Male', // Default
    channel: 'Walk-in',
    notes: ''
  });

  // Fetch real-time data from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customerList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!formData.nickname || !formData.phone) {
      return alert('กรุณากรอกชื่อเล่นและเบอร์โทรศัพท์');
    }
    
    try {
      const nextNum = customers.length > 0 
        ? Math.max(...customers.map(c => {
            const match = c.memberId?.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          })) + 1 
        : 1;
      const memberId = `SSR${nextNum.toString().padStart(5, '0')}`;

      const customerRef = await addDoc(collection(db, 'customers'), {
        memberId: memberId,
        nickname: formData.nickname,
        name: formData.nickname, 
        phone: formData.phone,
        dob: formData.dob,
        gender: formData.gender,
        channel: formData.channel,
        notes: formData.notes,
        type: 'Silver', 
        totalSpend: 0,
        points: 0,
        totalVisit: 0,
        lastVisit: null,
        walletBalance: 0, 
        createdAt: serverTimestamp()
      });

      // Add System Audit Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'crm',
        action: 'สมัครสมาชิก',
        detail: `ลูกค้า: ${formData.nickname} (ID: ${memberId})`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      alert("✅ สมัครสมาชิกสำเร็จ! รหัสประจำตัว: " + memberId);
      setIsModalOpen(false);
      setFormData({ nickname: '', phone: '', dob: '', gender: 'Male', channel: 'Walk-in', notes: '' });
    } catch(err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editingCustomer.nickname || !editingCustomer.phone) {
      return alert('กรุณากรอกชื่อเล่นและเบอร์โทรศัพท์');
    }
    
    try {
      const customerRef = doc(db, 'customers', editingCustomer.id);
      await updateDoc(customerRef, {
        nickname: editingCustomer.nickname,
        name: editingCustomer.nickname, 
        phone: editingCustomer.phone,
        dob: editingCustomer.dob || '',
        gender: editingCustomer.gender || 'Male',
        channel: editingCustomer.channel || 'Walk-in',
        notes: editingCustomer.notes || '',
        updatedAt: serverTimestamp()
      });

      alert("✅ อัปเดตข้อมูลสำเร็จ!");
      setIsEditModalOpen(false);
    } catch(err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleDeleteCustomer = async (id, nickname) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้า "${nickname}"?`)) {
      try {
        await deleteDoc(doc(db, 'customers', id));
        alert("🗑️ ลบข้อมูลลูกค้าเรียบร้อยแล้ว");
      } catch(err) {
        alert("เกิดข้อผิดพลาดในการลบ: " + err.message);
      }
    }
  };

  const handleHistoryClick = async (customer) => {
    setSelectedHistoryCustomer(customer);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryOrders([]);

    try {
      const salesRef = collection(db, 'sales');
      // Remove orderBy from query to avoid index requirement
      const q = query(
        salesRef, 
        where('customer.id', '==', customer.id)
      );
      
      const querySnapshot = await getDocs(q);
      let orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort in JavaScript instead of Firestore query
      orders.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return timeB - timeA;
      });

      setHistoryOrders(orders);
    } catch (error) {
      console.error("Error fetching history:", error);
      // Fallback for missing index or other error: fetch all and filter if needed, 
      // but usually we want the index. To be safe for now without demanding index:
      alert("ไม่สามารถดึงข้อมูลประวัติได้ (อาจต้องรอการตั้งค่า Index ใน Firestore): " + error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // -------------------------
  // 📊 CALCULATIONS & STATS
  // -------------------------
  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm) ||
    c.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.memberId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate Tiers Logic (Based on Total Spend)
  const getTier = (spend = 0) => {
    if (spend >= 500000) return { name: 'SSVIP', color: '#805AD5', bg: '#FAF5FF', icon: <Crown size={16}/> };
    if (spend >= 100000) return { name: 'SVIP', color: '#DD6B20', bg: '#FFFAF0', icon: <Crown size={16}/> };
    if (spend >= 50000) return { name: 'VVIP', color: '#D69E2E', bg: '#FFFFF0', icon: <Award size={16}/> };
    if (spend >= 10000) return { name: 'VIP', color: '#3182CE', bg: '#EBF8FF', icon: <Star size={16}/> };
    return { name: 'Silver', color: '#718096', bg: '#EDF2F7', icon: <User size={16}/> };
  };

  const stats = {
    total: customers.length,
    tiers: { Silver: 0, VIP: 0, VVIP: 0, SVIP: 0, SSVIP: 0 },
    channels: { 'Walk-in': 0, 'TikTok': 0, 'Instagram': 0, 'Facebook': 0, 'Line': 0, 'Friend': 0, 'Other': 0 }
  };

  customers.forEach(c => {
    const tierName = getTier(c.totalSpend).name;
    stats.tiers[tierName] = (stats.tiers[tierName] || 0) + 1;
    const channel = c.channel || 'Walk-in';
    stats.channels[channel] = (stats.channels[channel] || 0) + 1;
  });

  const topChannels = Object.entries(stats.channels).sort((a,b) => b[1] - a[1]);

  return (
    <>
      <div className="animate-slide-in" style={{ paddingBottom: '40px' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1A202C', marginBottom: '4px' }}>รายชื่อสมาชิก (CRM & Members)</h2>
            <p style={{ color: '#718096', fontSize: '14px' }}>ข้อมูลสมาชิกระดับต่างๆ ประวัติการใช้งาน และการตลาด</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowLinkModal(true)}>
               <Share2 size={16} /> ลิงก์สมัครสมาชิก
            </button>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#047857' }} onClick={() => setIsModalOpen(true)}>
               <Plus size={16} /> เริ่มสมัครสมาชิกใหม่
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 4fr', gap: '16px', marginBottom: '20px' }}>
          <div className="card" style={{ padding: '24px', textAlign: 'center', background: '#fff', borderRadius: '12px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EBF8FF', color: '#3182CE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
               <Users size={24} />
             </div>
             <h3 style={{ fontSize: '32px', fontWeight: '900', color: '#2D3748', margin: 0 }}>{stats.total.toLocaleString()}</h3>
             <p style={{ fontSize: '12px', color: '#718096', fontWeight: 'bold' }}>TOTAL MEMBERS</p>
          </div>

          <div className="card" style={{ padding: '20px', background: '#fff', borderRadius: '12px' }}>
             <h4 style={{ fontSize: '12px', color: '#718096', fontWeight: 'bold', marginBottom: '16px' }}>ACQUISITION CHANNELS (ช่องทางการรู้จักร้าน)</h4>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {topChannels.slice(0, 6).map(([ch, count]) => (
                  <div key={ch} style={{ border: '1px solid #EDF2F7', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                     <span style={{ fontSize: '13px', color: '#4A5568' }}>{ch}</span>
                     <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2B6CB0' }}>{count}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Tier Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { t: 'Silver', icon: <User size={20}/>, c: '#718096', bg: '#f7fafc' },
              { t: 'VIP', icon: <Star size={20}/>, c: '#3182CE', bg: '#ebf8ff' },
              { t: 'VVIP', icon: <Award size={20}/>, c: '#D69E2E', bg: '#fffff0' },
              { t: 'SVIP', icon: <Crown size={20}/>, c: '#DD6B20', bg: '#fffaf0' },
              { t: 'SSVIP', icon: <Crown size={20}/>, c: '#805AD5', bg: '#faf5ff' },
            ].map(tier => (
              <div key={tier.t} className="card" style={{ padding: '16px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tier.bg, color: tier.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {tier.icon}
                 </div>
                 <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{tier.t}</h4>
                    <div style={{ fontSize: '18px', fontWeight: '900' }}>{stats.tiers[tier.t].toLocaleString()}</div>
                 </div>
              </div>
            ))}
        </div>

        {/* Search & Member List */}
        <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '12px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div className="input-icon-wrapper" style={{ width: '400px' }}>
              <Search className="icon" size={18} />
              <input 
                type="text" 
                className="input" 
                placeholder="ค้นหาสมาชิก เบอร์โทร, ชื่อเล่น, รหัสประจำตัว..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#A0AEC0' }}>Loading Data...</div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#A0AEC0' }}>ไม่พบข้อมูลลูกค้า</div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F7FAFC', color: '#4A5568', fontSize: '12px' }}>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>สมาชิก (Member)</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>ระดับ / เพศ</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>สรุปยอดซื้อ (Spend summary)</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>แต้มสะสม</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(c => {
                    const tier = getTier(c.totalSpend);
                    const avg = c.totalSpend / (c.totalVisit || 1);
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                         <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EDF2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0AEC0', fontSize: '14px', fontWeight: 'bold' }}>
                                 {c.nickname ? c.nickname.charAt(0).toUpperCase() : <User size={16}/>}
                              </div>
                              <div>
                                 <div style={{ fontSize: '14px', fontWeight: '700' }}>{c.nickname || c.name}</div>
                                 <div style={{ fontSize: '11px', color: '#3182CE', fontWeight: 'bold' }}>{c.memberId || 'SSR-----'}</div>
                                 <div style={{ fontSize: '11px', color: '#A0AEC0' }}>{c.phone}</div>
                              </div>
                            </div>
                         </td>
                         <td style={{ padding: '12px 16px' }}>
                            <div style={{ marginBottom: '4px' }}>
                              <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 6px', borderRadius: '4px', background: tier.bg, color: tier.color }}>{tier.name}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#4A5568' }}>เพศ {c.gender || 'Male'}</div>
                         </td>
                         <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#4A5568', marginBottom: '2px' }}>
                              <strong>Total Spent :</strong> {c.totalSpend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB
                            </div>
                            <div style={{ fontSize: '11px', color: '#718096', marginBottom: '2px' }}>
                              <strong>Avg. Spent :</strong> {avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB
                            </div>
                            <div style={{ fontSize: '11px', color: '#4A5568' }}>
                              <strong>Total Visit :</strong> {c.totalVisit || 0}
                            </div>
                            <div style={{ fontSize: '10px', color: '#A0AEC0', marginTop: '4px' }}>
                              <strong>Last Visit :</strong> {c.lastVisit ? (() => {
                                const d = c.lastVisit.toDate ? c.lastVisit.toDate() : new Date(c.lastVisit);
                                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${(d.getFullYear() % 100).toString().padStart(2, '0')}`;
                              })() : '-'}
                            </div>
                         </td>
                         <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#D69E2E' }}>
                              Total Point : {c.points?.toLocaleString() || 0}
                            </div>
                         </td>
                         <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                               <button 
                                 className="btn-icon" 
                                 title="ประวัติการซื้อ"
                                 onClick={() => handleHistoryClick(c)}
                                 style={{ padding: '6px', background: '#F0FFF4', color: '#38A169', border: '1px solid #C6F6D5' }}
                               >
                                 <History size={14} />
                               </button>
                               <button className="btn-icon" onClick={() => { setEditingCustomer(c); setIsEditModalOpen(true); }} style={{ padding: '6px', background: '#EBF8FF', color: '#3182CE', border: '1px solid #BEE3F8' }}><Edit size={14} /></button>
                               <button className="btn-icon" onClick={() => handleDeleteCustomer(c.id, c.nickname || c.name)} style={{ padding: '6px', background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7' }}><Trash2 size={14} /></button>
                            </div>
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* --- ADD MODAL --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card animate-slide-in" style={{ width: '500px', background: 'white', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: '#F7FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={20} color="#047857" /> ลงทะเบียนสมาชิกใหม่</h2>
                 <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#A0AEC0' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddCustomer} style={{ padding: '24px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>ชื่อเล่นสมาชิก *</label>
                       <input type="text" className="input" name="nickname" value={formData.nickname} onChange={handleInputChange} required placeholder="เช่น น้องหญิง" />
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>เบอร์โทรศัพท์ *</label>
                       <input type="tel" className="input" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="081-234-5678" />
                    </div>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>เพศ (Gender)</label>
                       <select className="input" name="gender" value={formData.gender} onChange={handleInputChange}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                       </select>
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>วันเกิด</label>
                       <input type="date" className="input" name="dob" value={formData.dob} onChange={handleInputChange} />
                    </div>
                 </div>
                 <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>ช่องทางที่รู้จักร้าน</label>
                    <select className="input" name="channel" value={formData.channel} onChange={handleInputChange}>
                       <option value="Walk-in">Walk-in</option>
                       <option value="TikTok">TikTok</option>
                       <option value="Instagram">Instagram</option>
                       <option value="Facebook">Facebook</option>
                       <option value="Line">LINE OA</option>
                       <option value="Friend">เพื่อนแนะนำ</option>
                       <option value="Other">อื่นๆ</option>
                    </select>
                 </div>
                 <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>หมายเหตุ (Notes)</label>
                    <textarea className="input" name="notes" value={formData.notes} onChange={handleInputChange} rows="2"></textarea>
                 </div>
                 <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2, background: '#047857' }}>บันทึกสมาชิก</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && editingCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card animate-slide-in" style={{ width: '500px', background: 'white', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: '#F0F9FF', borderBottom: '1px solid #BAE6FD', display: 'flex', justifyContent: 'space-between' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0369A1' }}>แก้ไขข้อมูลสมาชิก</h2>
                 <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateCustomer} style={{ padding: '24px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>ชื่อเล่น *</label>
                       <input type="text" className="input" value={editingCustomer.nickname} onChange={e => setEditingCustomer({...editingCustomer, nickname: e.target.value})} required />
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>เบอร์โทร *</label>
                       <input type="tel" className="input" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} required />
                    </div>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>เพศ</label>
                       <select className="input" value={editingCustomer.gender || 'Male'} onChange={e => setEditingCustomer({...editingCustomer, gender: e.target.value})}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                       </select>
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>วันเกิด</label>
                       <input type="date" className="input" value={editingCustomer.dob || ''} onChange={e => setEditingCustomer({...editingCustomer, dob: e.target.value})} />
                    </div>
                 </div>
                 <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>หมายเหตุ</label>
                    <textarea className="input" value={editingCustomer.notes || ''} onChange={e => setEditingCustomer({...editingCustomer, notes: e.target.value})} rows="2"></textarea>
                 </div>
                 <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditModalOpen(false)}>ยกเลิก</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2, background: '#0369A1' }}>อัปเดตข้อมูล</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {showHistoryModal && selectedHistoryCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
           <div className="card animate-slide-in" style={{ width: '750px', maxWidth: '95vw', background: 'white', padding: 0, borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              
              {/* Header */}
              <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #38A169 0%, #2F855A 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <History size={24} color="#FFFFFF" />
                    </div>
                    <div>
                       <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF' }}>ประวัติการเข้าใช้บริการ</h2>
                       <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>ของลูกค้า: {selectedHistoryCustomer.nickname} ({selectedHistoryCustomer.memberId})</p>
                    </div>
                 </div>
                 <button onClick={() => setShowHistoryModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFFFFF' }}>
                    <X size={20} />
                 </button>
              </div>

              <div style={{ padding: '32px', maxHeight: '70vh', overflowY: 'auto' }}>
                 
                 {/* Quick Summary Row */}
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: '#F0FFF4', borderRadius: '16px', border: '1px solid #C6F6D5' }}>
                       <div style={{ fontSize: '11px', color: '#38A169', fontWeight: 'bold', marginBottom: '4px' }}>ยอดซื้อรวม (CUMULATIVE)</div>
                       <div style={{ fontSize: '20px', fontWeight: '900', color: '#2F855A' }}>฿{selectedHistoryCustomer.totalSpend?.toLocaleString()}</div>
                    </div>
                    <div style={{ padding: '16px', background: '#EBF8FF', borderRadius: '16px', border: '1px solid #BEE3F8' }}>
                       <div style={{ fontSize: '11px', color: '#3182CE', fontWeight: 'bold', marginBottom: '4px' }}>แต้มปัจจุบัน (POINTS)</div>
                       <div style={{ fontSize: '20px', fontWeight: '900', color: '#2B6CB0' }}>{selectedHistoryCustomer.points?.toLocaleString()} pts</div>
                    </div>
                    <div style={{ padding: '16px', background: '#FFF5F5', borderRadius: '16px', border: '1px solid #FED7D7' }}>
                       <div style={{ fontSize: '11px', color: '#E53E3E', fontWeight: 'bold', marginBottom: '4px' }}>เข้าใชบริการรวม (VISITS)</div>
                       <div style={{ fontSize: '20px', fontWeight: '900', color: '#C53030' }}>{selectedHistoryCustomer.totalVisit || 0} ครั้ง</div>
                    </div>
                 </div>

                 <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#4A5568', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingBag size={18} /> รายการสั่งซื้อล่าสุด
                 </h4>

                 {historyLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#A0AEC0' }}>
                       <div className="spinner" style={{ marginBottom: '12px' }}></div>
                       กำลังโหลดประวัติการซื้อ...
                    </div>
                 ) : historyOrders.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', background: '#F8FAFC', borderRadius: '16px', border: '2px dashed #E2E8F0' }}>
                       <Calendar size={48} color="#CBD5E0" style={{ margin: '0 auto 16px' }} />
                       <div style={{ color: '#718096', fontWeight: 'bold' }}>ยังไม่พบประวัติการสั่งซื้อในระบบ</div>
                       <div style={{ fontSize: '12px', color: '#A0AEC0' }}>ประวัติจะเริ่มปรากฏเมื่อมีการทำรายการผ่าน POS</div>
                    </div>
                 ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       {historyOrders.map((order, idx) => (
                          <div key={order.id} style={{ 
                             display: 'flex', 
                             alignItems: 'center', 
                             justifyContent: 'space-between', 
                             padding: '16px 20px', 
                             background: '#FFFFFF', 
                             border: '1px solid #EDF2F7', 
                             borderRadius: '16px',
                             transition: 'all 0.2s'
                          }}
                          className="hover-bg-blue"
                          >
                             <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#F7FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#718096', fontWeight: 'bold', fontSize: '14px' }}>
                                   {historyOrders.length - idx}
                                </div>
                                <div>
                                   <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2D3748' }}>
                                      {order.timestamp?.toDate ? order.timestamp.toDate().toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                      <span style={{ fontSize: '11px', color: '#A0AEC0', marginLeft: '8px', fontWeight: 'normal' }}>
                                         {order.timestamp?.toDate ? order.timestamp.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}
                                      </span>
                                   </div>
                                   <div style={{ fontSize: '12px', color: '#718096' }}>{order.totalQty || 0} รายการ • ชำระโดย {order.payments?.[0]?.method || 'ไม่ระบุ'}</div>
                                </div>
                             </div>
                             <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#3182CE' }}>+ ฿{order.grandTotal?.toLocaleString()}</div>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#D69E2E' }}>
                                   ได้รับ {Math.floor(order.grandTotal / 100)} Points
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              <div style={{ padding: '24px 32px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'center' }}>
                 <button 
                   className="btn btn-primary" 
                   style={{ width: '200px', height: '48px', borderRadius: '12px', background: '#4A5568' }} 
                   onClick={() => setShowHistoryModal(false)}
                 >
                    ตกลง
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- LINK MODAL --- */}
      {showLinkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card animate-slide-in" style={{ width: '400px', background: 'white', padding: '30px', borderRadius: '16px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: '#3182CE' }}><Share2 size={48} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>ลิงก์สำหรับสมัครสมาชิก</h3>
              <p style={{ fontSize: '13px', color: '#718096', marginBottom: '24px' }}>ให้ลูกค้าสแกนเพื่อกรอกข้อมูลด้วยตนเอง</p>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', background: '#F7FAFC', marginBottom: '24px' }}>
                 <input type="text" value="https://sisandrich.com/register" readOnly style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '14px', outline: 'none' }} />
                 <button className="btn-icon" onClick={() => { navigator.clipboard.writeText('https://sisandrich.com/register'); alert('Copied!'); }}><Copy size={16}/></button>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowLinkModal(false)}>ตกลง</button>
           </div>
        </div>
      )}
    </>
  );
}

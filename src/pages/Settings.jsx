import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, setDoc, getDocs, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { Calendar, Search, Download, Filter, FileText, ShoppingCart, ShoppingBag, Clock, Settings as SettingsIcon, Shield, Store, Bell, Trash2, Database, AlertTriangle, Printer, Layout, Smartphone, Save, Smartphone as Mobile } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'maintenance'
  
  const [loading, setLoading] = useState(false);

  // States for General Configs
  const [shopConfig, setShopConfig] = useState({
    shopName: 'SIS & RICH',
    taxRate: '0',
    currency: 'THB',
    receiptFooter: 'ขอบคุณที่ใช้บริการ / Thank you',
    receiptHeader: 'S&R SHOP - ยินดีต้อนรับ',
    pointBase: '100',
    serviceCharge: '0',
    terminalName: 'Main Terminal #1',
    enableLowStockAlert: true
  });

  const [printSettings, setPrintSettings] = useState({
    shopName: 'Sis&Rich',
    address: '860 ถ. มังกร แขวงจักรวรรดิ์\nเขตสัมพันธวงศ์ กรุงเทพมหานคร 10100',
    receiptFooter: 'หากชำระค่าสินค้าแล้วไม่สามารถเปลี่ยน / คืนสินค้าได้\nกรณีสินค้าชำรุดกรุณาแจ้งเคลมสินค้าภายใน 7 วันทำการ\n**ขอสงวนสิทธิ์การเคลมสินค้า กรณีไม่มีใบเสร็จมาแสดง**',
    barcodeWidth: '32mm',
    barcodeHeight: '25mm',
    showShopNameOnBarcode: true,
    qrCodeUrl: '',
    blessings: 'ขอให้เป็นวันที่สดใสนะคะ\nขอบคุณที่แวนมาอุดหนุนค่ะ\nขอให้สนุกกับการแต่งตัวนะคะ\nขอให้ร่ำรวยๆ ค่ะ',
    receiptWidth: 72,
    receiptFontSize: 12,
    receiptLeftMargin: 0
  });

  const [posSubTab, setPosSubTab] = useState('sales'); // 'sales' | 'receipt' | 'barcode'

  const mockLogs = [
    { id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 5), type: 'sales', action: 'เปิดบิลขาย POS', detail: 'เปิดบิลขาย #INV-10023 รายการรวม ฿3,400 (ชำระด้วยเงินสด)', operator: 'Cashier Staff' },
    { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 25), type: 'inventory', action: 'ปรับระดับสต็อก', detail: 'ปรับสต็อกสินค้า RNG-001 เพิ่ม +12 ชิ้น', operator: 'Admin Staff' },
    { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 60), type: 'inventory', action: 'ปรับโหมดสต็อกกลุ่ม', detail: 'ปรับโหมดสินค้า 10 รายการ เป็น Overselling', operator: 'Manager' },
    { id: '4', timestamp: new Date(Date.now() - 1000 * 60 * 120), type: 'crm', action: 'เพิ่มลูกค้าใหม่', detail: 'ลงทะเบียนสมาชิก คุณณัฐพล ทองดี (VIP)', operator: 'Admin Staff' }
  ];

  // Load Settings from Firestore
  useEffect(() => {
    const unsubSystem = onSnapshot(doc(db, 'settings', 'system_config'), (snapshot) => {
      if (snapshot.exists()) setShopConfig(snapshot.data());
    });
    const unsubReceipt = onSnapshot(doc(db, 'settings', 'receipt'), (snapshot) => {
      if (snapshot.exists()) setPrintSettings(snapshot.data());
    });
    return () => { unsubSystem(); unsubReceipt(); };
  }, []);


  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      if (activeTab === 'general' || (activeTab === 'pos_config' && posSubTab === 'sales')) {
         await setDoc(doc(db, 'settings', 'system_config'), shopConfig);
      } else {
         await setDoc(doc(db, 'settings', 'receipt'), printSettings);
      }
      alert('บันทึกการตั้งค่าเรียบร้อยแล้ว! 🎉');
    } catch (err) {
      alert('Error saving settings: ' + err.message);
    }
  };


  const [maintenanceTargets, setMaintenanceTargets] = useState({
    sales: false,
    voided_sales: false, // New: Clear only voided bills
    inv_logs: false,
    shifts: false,
    sys_logs: false,
    crm_reset: false
  });
  const [confirmText, setConfirmText] = useState('');

  const handleGranularReset = async () => {
    // Double check with standard alert too
    const confirmation = window.confirm("⚠️ ยืนยันขั้นตอนสุดท้าย: คุณเตรียมใจลบข้อมูลที่เลือกแล้วใช่ไหม? (ไม่สามารถกู้คืนได้)");
    if (!confirmation) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      // 1. Delete ALL Sales History
      if (maintenanceTargets.sales) {
        const snap = await getDocs(collection(db, 'sales'));
        snap.forEach(d => { batch.delete(d.ref); count++; });
      } 
      // 1.1 Delete ONLY Voided Sales (if not already deleting all)
      else if (maintenanceTargets.voided_sales) {
        const snap = await getDocs(collection(db, 'sales'));
        snap.forEach(d => {
          if (d.data().status === 'voided') {
            batch.delete(d.ref); 
            count++;
          }
        });
      }

      // 2. Delete Inventory Logs
      if (maintenanceTargets.inv_logs) {
        const snap = await getDocs(collection(db, 'inventory_logs'));
        snap.forEach(d => { batch.delete(d.ref); count++; });
      }

      // 3. Delete Shift Records
      if (maintenanceTargets.shifts) {
        const snap = await getDocs(collection(db, 'shifts'));
        snap.forEach(d => { batch.delete(d.ref); count++; });
      }

      // 4. Delete System Logs
      if (maintenanceTargets.sys_logs) {
        const snap = await getDocs(collection(db, 'system_logs'));
        snap.forEach(d => { batch.delete(d.ref); count++; });
      }

      // 5. CRM Reset (Points/Spend)
      if (maintenanceTargets.crm_reset) {
        const snap = await getDocs(collection(db, 'customers'));
        snap.forEach(d => {
          batch.update(d.ref, { totalSpend: 0, points: 0, totalVisit: 0 });
          count++;
        });
      }

      if (count === 0) {
        alert("ℹ️ ไม่มีการเลือกหมวดหมู่ที่ต้องการลบ");
        setLoading(false);
        return;
      }

      await batch.commit();
      alert(`🎉 ดำเนินการล้างข้อมูลเรียบร้อย! (ลบทั้งหมด ${count} รายการ)`);
      window.location.reload();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบำรุงรักษา: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  const menuItems = [
    { id: 'general', label: 'ตั้งค่าร้านค้า (Store)', icon: <Store size={18} /> },
    { id: 'pos_config', label: 'ตั้งค่าการขาย & ภาษี (Sales)', icon: <ShoppingCart size={18} /> },
    { id: 'maintenance', label: 'บำรุงรักษา (Maintenance)', icon: <Database size={18} /> },
    { id: 'notifications', label: 'การแจ้งเตือน (Notice)', icon: <Bell size={18} /> },
    { id: 'security', label: 'ความปลอดภัย (Security)', icon: <Shield size={18} /> }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'flex-start' }} className="animate-slide-in">
      
      {/* LEFT SUB-SIDEBAR */}
      <div className="card" style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '12px', sticky: 'top', top: '80px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #EDF2F7', paddingBottom: '12px', marginBottom: '12px', color: '#2D3748' }}>
          System Settings
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map(item => (
            <button 
              key={item.id}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', background: activeTab === item.id ? '#FFF5F5' : 'transparent', color: activeTab === item.id ? '#E53E3E' : '#4A5568', fontWeight: activeTab === item.id ? 'bold' : 'normal' }}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon} <span style={{ fontSize: '14px' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT CONTENT WORKSPACE */}
      <div style={{ flex: 1 }}>
        
        {/* VIEW 1: GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <div className="card animate-slide-in" style={{ padding: '24px', backgroundColor: '#fff' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#1A202C' }}>⚙️ ตั้งค่าร้านค้า & ระบบ</h3>
            <form onSubmit={handleSaveSettings}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>ชื่อร้านค้า (Shop Name)</label>
                  <input type="text" className="input" value={shopConfig.shopName} onChange={e => setShopConfig({...shopConfig, shopName: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>สกุลเงิน (Currency)</label>
                  <input type="text" className="input" value={shopConfig.currency} onChange={e => setShopConfig({...shopConfig, currency: e.target.value})} />
                </div>
              </div>

              <div style={{ padding: '16px', background: '#F7FAFC', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 'bold' }}>🔔 เปิดแจ้งเตือนสต็อกต่ำ (Low Stock Alert)</p>
                  <p style={{ fontSize: '12px', color: '#718096' }}>ระบบจะขึ้นแท็บ Minimum Alert อัตโนมัติเมื่อของใกล้หมด</p>
                </div>
                <input type="checkbox" checked={shopConfig.enableLowStockAlert} onChange={e => setShopConfig({...shopConfig, enableLowStockAlert: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>บันทึกข้อมูล</button>
            </form>
          </div>
        )}

        {activeTab === 'pos_config' && (
          <div className="animate-slide-in">
            <div style={{ display: 'flex', gap: '2px', background: '#F7FAFC', padding: '0 10px', borderRadius: '12px 12px 0 0', border: '1px solid #E2E8F0', borderBottom: 'none' }}>
               <button onClick={() => setPosSubTab('sales')} style={{ padding: '12px 20px', fontWeight: 'bold', cursor: 'pointer', borderBottom: posSubTab === 'sales' ? '3px solid #E53E3E' : '3px solid transparent', color: posSubTab === 'sales' ? '#E53E3E' : '#718096', background: posSubTab === 'sales' ? '#FFF5F5' : 'transparent', border: 'none' }}>
                  ⚙️ ระบบขาย & ภาษี
               </button>
            </div>

            <div className="card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '0 0 12px 12px' }}>
              
              {/* SUB-VIEW 1: SALES & TAX */}
              {posSubTab === 'sales' && (
                 <div className="animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #EDF2F7', paddingBottom: '8px', marginBottom: '16px' }}>อัตราภาษี & ค่าธรรมเนียม</h4>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>อัตราภาษีมูลค่าเพิ่ม (%)</label>
                          <input type="number" className="input" value={shopConfig.taxRate} onChange={e => setShopConfig({...shopConfig, taxRate: e.target.value})} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>ค่าบริการ (Service Charge %)</label>
                          <input type="number" className="input" value={shopConfig.serviceCharge} onChange={e => setShopConfig({...shopConfig, serviceCharge: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #EDF2F7', paddingBottom: '8px', marginBottom: '16px' }}>คะแนนสมาชิก & CRM</h4>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>ทุกๆกี่บาท ได้ 1 คะแนน? (Point Base)</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="number" className="input" value={shopConfig.pointBase} onChange={e => setShopConfig({...shopConfig, pointBase: e.target.value})} style={{ marginBottom: 0 }} />
                            <span style={{ fontSize: '13px', color: '#718096' }}>บาท = 1 คะแนน</span>
                          </div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>รหัสเครื่อง Point (POS Terminal Name)</label>
                          <input type="text" className="input" value={shopConfig.terminalName} onChange={e => setShopConfig({...shopConfig, terminalName: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '20px', borderTop: '1px solid #EDF2F7', paddingTop: '20px' }}>
                      <button className="btn btn-primary" onClick={handleSaveSettings}>บันทึกข้อมูลระบบการขาย</button>
                    </div>
                 </div>
              )}


            </div>
          </div>
        )}


        {/* MAINTENANCE & RESET - Granular Control */}
        {activeTab === 'maintenance' && (
          <div className="card animate-slide-in" style={{ padding: '24px', backgroundColor: '#fff' }}>
            <div style={{ borderBottom: '2px solid #FEE2E2', paddingBottom: '16px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                <AlertTriangle size={28} /> พื้นที่บำรุงรักษาระบบ (Maintenance Zone)
              </h3>
              <p style={{ margin: '8px 0 0 40px', fontSize: '14px', color: '#64748B' }}>จัดการฐานข้อมูลและล้างข้อมูลเก่าเพื่อเพิ่มประสิทธิภาพระบบ</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
              {/* Step 1: Select Categories */}
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={18} /> 1. เลือกหมวดหลักที่ต้องการลบ
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { id: 'sales', label: 'ประวัติการขาย "ทั้งหมด" (All Sales)', desc: 'ลบรายการขายทั้งหมดทุกสถานะทิ้งถาวร', color: '#EF4444' },
                    { id: 'voided_sales', label: 'ลบเฉพาะ "บิลที่ยกเลิกแล้ว" (Voided Only)', desc: 'ล้างบิลที่เป็นสีแดง (ยกเลิก) ทิ้งเท่านั้น บิลสำเร็จยังอยู่', color: '#B91C1C' },
                    { id: 'inv_logs', label: 'ประวัติการปรับสต็อก (Inventory Logs)', desc: 'ล้างบันทึกการเพิ่ม/ลดสต็อกย้อนหลัง', color: '#F59E0B' },
                    { id: 'shifts', label: 'ประวัติการเข้ากะ (Shift Records)', desc: 'ล้างข้อมูลบันทึกเวลาเปิด-ปิดกะพนักงาน', color: '#10B981' },
                    { id: 'sys_logs', label: 'บันทึกกิจกรรมระบบ (System Logs)', desc: 'ล้าง LOG การใช้งานทั่วไปของพนักงาน', color: '#3B82F6' },
                    { id: 'crm_reset', label: 'รีเซ็ตคะแนนสมาชิก (Customer Points)', desc: 'ล้างพอยต์และยอดซื้อสะสมลูกค้าทุกคนเป็น 0', color: '#8B5CF6' }
                  ].map(cat => (
                    <label key={cat.id} style={{ 
                      display: 'flex', 
                      padding: '14px', 
                      borderRadius: '16px', 
                      border: '1px solid #E2E8F0', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s', 
                      background: maintenanceTargets[cat.id] ? '#FEF2F2' : 'white', 
                      borderColor: maintenanceTargets[cat.id] ? '#FECACA' : '#E2E8F0',
                      // If 'sales' is selected, disable 'voided_sales' visually as it's redundant
                      opacity: (cat.id === 'voided_sales' && maintenanceTargets.sales) ? 0.5 : 1
                    }}>
                      <input 
                        type="checkbox" 
                        checked={maintenanceTargets[cat.id] || false}
                        disabled={cat.id === 'voided_sales' && maintenanceTargets.sales}
                        onChange={(e) => setMaintenanceTargets({...maintenanceTargets, [cat.id]: e.target.checked})}
                        style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer' }}
                      />
                      <div style={{ marginLeft: '14px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: maintenanceTargets[cat.id] ? cat.color : '#1E293B' }}>{cat.label}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{cat.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 2: Confirm & Action */}
              <div style={{ background: '#F8FAFC', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} /> 2. ยืนยันความปลอดภัย
                </h4>

                <div style={{ background: '#FFF1F2', border: '1px solid #FFE4E6', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', color: '#9F1239', fontWeight: 'bold', margin: '0 0 8px 0' }}>⚠️ คำเตือน: ข้อมูลที่ลบจะไม่สามารถกู้คืนได้</p>
                  <p style={{ fontSize: '12px', color: '#BE123C', margin: 0 }}>กรุณาตรวจสอบหมวดที่เลือกให้มั่นใจก่อนยืนยันการลบ</p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>
                    พิมพ์ข้อความ <span style={{ color: '#E11D48', textDecoration: 'underline' }}>PERMANENT DELETE</span> เพื่อยืนยัน
                  </label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="พิมพ์ที่นี่..."
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    style={{ background: 'white', fontSize: '16px', fontWeight: 'bold', border: '2px solid #E2E8F0', letterSpacing: '1px' }}
                  />
                </div>

                <button 
                  className="btn" 
                  disabled={confirmText !== 'PERMANENT DELETE' || Object.values(maintenanceTargets).every(v => !v) || loading}
                  onClick={handleGranularReset}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    borderRadius: '16px', 
                    background: (confirmText === 'PERMANENT DELETE' && !Object.values(maintenanceTargets).every(v => !v)) ? '#E11D48' : '#CBD5E1',
                    color: 'white',
                    fontWeight: '900',
                    fontSize: '16px',
                    border: 'none',
                    cursor: (confirmText === 'PERMANENT DELETE' && !Object.values(maintenanceTargets).every(v => !v)) ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: (confirmText === 'PERMANENT DELETE' && !Object.values(maintenanceTargets).every(v => !v)) ? '0 10px 15px -3px rgba(225, 29, 72, 0.4)' : 'none'
                  }}
                >
                  <Trash2 size={20} /> {loading ? 'กำลังดำเนินการ...' : 'ยืนยันลบข้อมูลที่เลือก'}
                </button>

                <p style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center', marginTop: '16px' }}>
                  ระบบจะทำการลบข้อมูลแบบ Batch และบันทึกลงใน System Log อัตโนมัติ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PLACEHOLDERS FOR OTHER TAB MODES */}
        {(activeTab === 'notifications' || activeTab === 'security') && (
          <div className="card animate-slide-in" style={{ padding: '24px', backgroundColor: '#fff', textAlign: 'center' }}>
            <SettingsIcon size={48} style={{ margin: '0 auto 12px', color: '#A0AEC0' }} />
            <h4 style={{ color: '#4A5568' }}>โมดูลป้อนยังอยู่ภายในการพัฒนา (Under Construction)</h4>
          </div>
        )}

      </div>
    </div>
  );
}

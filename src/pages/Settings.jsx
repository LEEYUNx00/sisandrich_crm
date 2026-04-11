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


  const handleSystemReset = async () => {
    const confirmation = window.confirm("⚠️ คำเตือน: คุณแน่ใจหรือไม่ที่จะรีเซ็ตระบบ?\n\nการกระทำนี้จะลบทิ้งถาวร:\n1. ประวัติการขายทั้งหมด (Sales History)\n2. ประวัติการใช้งานระบบ (System Logs)\n3. ประวัติการปรับสต็อก (Inventory Logs)\n4. รีเซ็ตยอดซื้อและคะแนนของลูกค้าทุกคนเป็น 0\n\n** ไม่สามารถย้อนกลับได้ **");
    
    if (!confirmation) return;

    setLoading(true);
    try {
       const batch = writeBatch(db);

       // 1. Delete Sales
       const salesSnap = await getDocs(collection(db, 'sales'));
       salesSnap.forEach(d => batch.delete(d.ref));

       // 2. Delete System Logs
       const logsSnap = await getDocs(collection(db, 'system_logs'));
       logsSnap.forEach(d => batch.delete(d.ref));

       // 3. Delete Inventory Logs
       const invLogsSnap = await getDocs(collection(db, 'inventory_logs'));
       invLogsSnap.forEach(d => batch.delete(d.ref));

       // 4. Update Customers
       const custSnap = await getDocs(collection(db, 'customers'));
       custSnap.forEach(d => {
         batch.update(d.ref, {
           totalSpend: 0,
           points: 0,
           totalVisit: 0
         });
       });

       await batch.commit();
       alert("🎉 รีเซ็ตระบบสำเร็จ! ประวัติทั้งหมดถูกล้างเรียบร้อยแล้ว");
       window.location.reload();
    } catch (err) {
       alert("เกิดข้อผิดพลาดในการรีเซ็ต: " + err.message);
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


        {/* MAINTENANCE & RESET */}
        {activeTab === 'maintenance' && (
          <div className="card animate-slide-in" style={{ padding: '24px', backgroundColor: '#fff' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#C53030', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={24} /> พื้นที่บำรุงรักษาระบบ (Maintenance Zone)
            </h3>
            
            <div style={{ padding: '20px', backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '12px', marginBottom: '24px' }}>
              <h4 style={{ color: '#C53030', marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' }}>ล้างข้อมูลทั้งหมดในระบบ (Emergency System Reset)</h4>
              <p style={{ fontSize: '13px', color: '#742A2A', marginBottom: '16px', lineHeight: '1.6' }}>
                ฟังก์ชันนี้จะทำความสะอาดฐานข้อมูลให้เหมือนใหม่ โดยจะลบ **ประวัติการขาย, บิล, ข้อมูลสต็อกย้อนหลัง และพอยต์ลูกค้า** 
                <br/>*ข้อมูลไอเทมสินค้า (Inventory Products) และรายชื่อลูกค้าจะยังอยู่ แต่ยอดขายสะสมจะกลายเป็น 0*
              </p>
              
              <button 
                className="btn" 
                style={{ background: '#E53E3E', color: 'white', padding: '12px 24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={handleSystemReset}
                disabled={loading}
              >
                <Trash2 size={18} /> {loading ? 'กำลังรีเซ็ต...' : 'เริ่มกระบวนการรีเซ็ตระบบตอนนี้'}
              </button>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <h4 style={{ color: '#2D3748', marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' }}>การสำรองข้อมูล (Data Backup)</h4>
              <p style={{ fontSize: '13px', color: '#4A5568', marginBottom: '16px' }}>ระบบฐานข้อมูลของคุณทำงานบน Cloud แบบ Real-time และมีการสำรองข้อมูลอัตโนมัติโดย Firebase</p>
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

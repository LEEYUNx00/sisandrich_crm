import { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Save, Printer, Smartphone, FileText, Layout, Info } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function PrintSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('receipt'); // 'receipt' | 'barcode'
  const [settings, setSettings] = useState({
    shopName: 'Sis&Rich',
    address: '860 ถ. มังกร แขวงจักรวรรดิ์\\nเขตสัมพันธวงศ์ กรุงเทพมหานคร 10100',
    receiptFooter: 'หากชำระค่าสินค้าแล้วไม่สามารถเปลี่ยน / คืนสินค้าได้\\nกรณีสินค้าชำรุดกรุณาแจ้งเคลมสินค้าภายใน 7 วันทำการ\\n**ขอสงวนสิทธิ์การเคลมสินค้า กรณีไม่มีใบเสร็จมาแสดง**',
    barcodeWidth: '32mm',
    barcodeHeight: '25mm',
    showShopNameOnBarcode: true,
    qrCodeUrl: '', // URL ของรูป QR Code
    blessings: 'ขอให้เป็นวันที่สดใสนะคะ\\nขอบคุณที่แวะมาอุดหนุนค่ะ\\nขอให้สนุกกับการแต่งตัวนะคะ\\nขอให้ร่ำรวยๆ ค่ะ',
    receiptWidth: 72, // มิลลิเมตร
    receiptFontSize: 12, // พิกเซล
    receiptLeftMargin: 0 // มิลลิเมตร
  });
  const [testBarcode, setTestBarcode] = useState('SR003026');
  const [testPrice, setTestPrice] = useState('169');
  const [testQty, setTestQty] = useState(3); // จำนวนดวงที่จะพิมพ์

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'receipt');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching settings:", error);
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'receipt'), {
        ...settings,
        updatedAt: serverTimestamp()
      });
      alert('บันทึกการตั้งค่าเรียบร้อยแล้ว!');
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    }
    setSaving(false);
  };

  const handleQuickPrint = async () => {
    // พิมพ์บาร์โค้ดผ่าน Bridge โดยส่งเป็นภาษา TSPL (สำหรับเครื่องบาร์โค้ดโดยเฉพาะ)
    try {
      await fetch('http://localhost:8000/print-barcode', {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Printer: 'TSC TTP-247',
          Barcode: testBarcode,
          Name: `${testBarcode}/${testPrice}.-`,
          Price: testPrice,
          Qty: testQty
        })
      });
      alert('ส่งคำสั่งพิมพ์ไปยัง TSC TTP-247 สำเร็จ');
    } catch (err) {
      console.warn("Bridge print-barcode failed, fallback...", err);
      window.print();
    }
  };

  const handleReceiptTestPrint = async () => {
    // พิมพ์บิลเปล่าผ่าน Bridge
    try {
      const element = document.getElementById('test-receipt-print-area');
      if (!element) return window.print();

      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' });
      const imageData = canvas.toDataURL('image/png');

      await fetch('http://localhost:8000/print-receipt', {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName: 'POSPrinter POS80',
          image: imageData,
          billId: 'RECEIPT-TEST'
        })
      });
    } catch (err) {
      console.warn("Bridge print failed, fallback...", err);
      window.print();
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const storageRef = ref(storage, 'receipt/logo.png');
    
    setSaving(true);
    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setSettings(prev => ({ ...prev, qrCodeUrl: downloadURL }));
      alert('อัปโหลดโลโก้เรียบร้อยแล้ว กรุณากด "บันทึกการตั้งค่า" เพื่อยืนยัน');
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.message);
    }
    setSaving(false);
  };

  const handleRemoveImage = async () => {
    if (!settings.qrCodeUrl) return;
    
    setSaving(true);
    try {
      try {
        const storageRef = ref(storage, 'receipt/logo.png');
        await deleteObject(storageRef);
      } catch (err) {
        console.warn("Storage warning:", err);
      }
      
      setSettings(prev => ({ ...prev, qrCodeUrl: '' }));
      alert('ลบโลโก้เรียบร้อยแล้ว กรุณากด "บันทึกการตั้งค่า" เพื่อยืนยัน');
    } catch (error) {
       alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>กำลังโหลดการตั้งค่า...</div>;

  return (
    <div className="animate-slide-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <style>
        {`
          @media print {
            @page { margin: 0; }
            html, body { margin: 0; padding: 0; background: #fff; }
            .settings-ui, .sidebar, .top-header { display: none !important; }
            .test-print-area { display: block !important; margin: 0; padding: 0; width: 100% !important; }
            .print-receipt-80 { 
              width: 70mm !important; /* ล็อคความกว้างให้พอดีกับหัวพิมพ์ที่สเกล 100 */
              margin-left: ${settings.receiptLeftMargin || 0}mm !important; 
              padding: 0 !important; 
              font-size: ${settings.receiptFontSize || 13}px !important;
            }
          }
          .tab-btn { padding: 12px 24px; font-weight: bold; cursor: pointer; border-bottom: 3px solid transparent; color: #718096; transition: all 0.2s; background: none; border: none; }
          .tab-btn.active { border-bottom: 3px solid #D91A1A; color: #D91A1A; background: #FFF5F5; }
          .receipt-preview { width: 300px; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 20px; font-family: 'Courier New', monospace; font-size: 11px; border-top: 10px solid #D91A1A; margin: 0 auto; border: 1px solid #E2E8F0; }
          .barcode-preview-row { display: flex; gap: 8px; background: #EDF2F7; padding: 10px; border-radius: 8px; justify-content: center; }
          .barcode-preview-item { width: 95px; min-height: 75px; background: white; border: 1px solid #CBD5E0; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; font-family: Arial, sans-serif; text-align: center; font-size: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
          .p-barcode-font { 
            font-family: 'Libre Barcode 39 Text', cursive !important; 
            font-size: 18px !important; 
            margin: 1px 0; 
            color: black; 
            transform: scaleX(0.7); /* บีบตัวอย่างเพื่อให้เห็นว่าอยู่ตรงกลางพอดี */
            transform-origin: center;
          }
          .newline-text { white-space: pre-wrap; }
          .label-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        `}
      </style>

      <div className="settings-ui">
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2D3748' }}>จัดการรูปแบบและการพิมพ์</h1>
            <p style={{ color: '#718096' }}>ตั้งค่าและสร้างบาร์โค้ดราคาสำหรับเครื่องพิมพ์แต่ละประเภท</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {saving ? 'กำลังบันทึก...' : <><Save size={18} /> บันทึกการตั้งค่า</>}
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '2px', background: '#F7FAFC', padding: '0 10px', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
           <button className={`tab-btn ${activeTab === 'receipt' ? 'active' : ''}`} onClick={() => setActiveTab('receipt')}>
             <FileText size={18} style={{ marginBottom: '-4px', marginRight: '6px' }} /> บิลเงินสด (POS80)
           </button>
           <button className={`tab-btn ${activeTab === 'barcode' ? 'active' : ''}`} onClick={() => setActiveTab('barcode')}>
             <Layout size={18} style={{ marginBottom: '-4px', marginRight: '6px' }} /> สติกเกอร์ (TSC TTP)
           </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
          {/* Main Editor Section */}
          <div className="card">
            {activeTab === 'receipt' ? (
              <div className="animate-slide-in">
                <div style={{ paddingBottom: '16px', marginBottom: '20px', borderBottom: '1px solid #EDF2F7', display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ background: '#FFF5F5', padding: '10px', borderRadius: '12px', color: '#D91A1A' }}><FileText size={24} /></div>
                   <div>
                     <h3 style={{ fontWeight: 'bold' }}>ตั้งค่าบิลเงินสด</h3>
                     <p style={{ fontSize: '13px', color: '#718096' }}>เครื่องพิมพ์ POSPrinter POS80 (80mm)</p>
                   </div>
                </div>

                <div className="input-group">
                  <label>ชื่อร้าน (Header)</label>
                  <input type="text" className="input" value={settings.shopName} onChange={e => setSettings({...settings, shopName: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>ที่อยู่ร้าน (Address)</label>
                  <textarea className="input" rows="3" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>ข้อความท้ายบิล (Footer Content)</label>
                  <textarea className="input" rows="3" value={settings.receiptFooter} onChange={e => setSettings({...settings, receiptFooter: e.target.value})} />
                </div>

                 <div style={{ background: '#F0FFF4', padding: '16px', borderRadius: '12px', border: '1px solid #C6F6D5', marginTop: '16px' }}>
                   <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#2F855A' }}>📐 ปรับแต่งระยะการพิมพ์ (กรณีตกขอบ)</h4>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>กว้างพื้นที่พิมพ์ (mm)</label>
                        <input type="number" className="input" value={settings.receiptWidth} onChange={e => setSettings({...settings, receiptWidth: Number(e.target.value)})} />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>ขนาดตัวอักษร (px)</label>
                        <input type="number" className="input" value={settings.receiptFontSize} onChange={e => setSettings({...settings, receiptFontSize: Number(e.target.value)})} />
                      </div>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>ขยับซ้าย-ขวา (mm)</label>
                        <input type="number" className="input" value={settings.receiptLeftMargin} onChange={e => setSettings({...settings, receiptLeftMargin: Number(e.target.value)})} />
                      </div>
                   </div>
                   <p style={{ fontSize: '11px', color: '#718096', marginTop: '8px' }}>* แนะนำ กว้าง 72mm / ฟอนต์ 12px / ขยับ 0mm สำหรับ XP-80 มาตรฐาน</p>
                </div>

                <div className="input-group" style={{ marginTop: '16px' }}>
                  <label style={{ fontWeight: 'bold', color: '#2B6CB0' }}>ตั้งค่ารูปโลโก้ร้าน / QR Code</label>
                  
                  {settings.qrCodeUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px', background: '#F8FAFC' }}>
                      <img src={settings.qrCodeUrl} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                      <div style={{ flex: 1, fontSize: '13px', color: '#4A5568' }}>มีรูปอัปโหลดไว้แล้วในฐานข้อมูล</div>
                      <button onClick={handleRemoveImage} className="btn" style={{ background: '#FFF5F5', color: '#C53030', border: '1px solid #FEB2B2', padding: '6px 12px', fontSize: '12px' }}>
                        ลบรูปภาพ
                      </button>
                    </div>
                  ) : (
                    <div style={{ border: '1.5px dashed #CBD5E0', background: '#F7FAFC', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                       <input 
                         type="file" 
                         accept="image/*" 
                         onChange={handleImageUpload} 
                         id="logo-upload"
                         style={{ display: 'none' }}
                       />
                       <label htmlFor="logo-upload" className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-block', margin: 0 }}>
                          คลิกเพื่อแนบไฟล์รูปภาพ
                       </label>
                       <p style={{ fontSize: '11px', color: '#718096', marginTop: '8px' }}>ไฟล์จะถูกเก็บไว้บนฐานข้อมูล (Firebase Storage)<br/>ทำให้สามารถปริ้นออกหน้าใบเสร็จได้แบบไม่โดนบล็อค</p>
                    </div>
                  )}
                </div>
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: 'bold', color: '#2B6CB0' }}>รายการคำอวยพร (สุ่มทีละ 1 ประโยค)</label>
                  <p style={{ fontSize: '12px', color: '#718096', marginBottom: '8px' }}>พิมพ์คำที่ต้องการ 1 ประโยคต่อ 1 บรรทัด</p>
                  <textarea 
                    className="input" 
                    rows="4" 
                    placeholder="รวยๆ เฮงๆ\nสวยขึ้นทุกวัน..\nฯลฯ"
                    value={settings.blessings || ''} 
                    onChange={e => setSettings({...settings, blessings: e.target.value})} 
                  />
                </div>

                <button onClick={handleReceiptTestPrint} className="btn btn-outline" style={{ width: '100%', border: '1.5px solid #D91A1A', color: '#D91A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Printer size={18} /> ทดสอบพิมพ์บิลเปล่า
                </button>
              </div>
            ) : (
              <div className="animate-slide-in">
                <div style={{ paddingBottom: '16px', marginBottom: '20px', borderBottom: '1px solid #EDF2F7', display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ background: '#EBF8FF', padding: '10px', borderRadius: '12px', color: '#3182CE' }}><Layout size={24} /></div>
                   <div>
                     <h3 style={{ fontWeight: 'bold' }}>เครื่องมือสร้างบาร์โค้ดด่วน</h3>
                     <p style={{ fontSize: '13px', color: '#718096' }}>พิมพ์รหัสและราคาเพื่อสร้างสติกเกอร์แถวละ 3 ดวง</p>
                   </div>
                </div>

                <div className="label-box">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '16px' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 'bold', color: '#2D3748' }}>รหัส (Barcode)</label>
                      <input type="text" className="input" value={testBarcode} onChange={e => setTestBarcode(e.target.value.toUpperCase())} />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 'bold', color: '#2D3748' }}>ราคา (บาท)</label>
                      <input type="number" className="input" value={testPrice} onChange={e => setTestPrice(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 'bold', color: '#2D3748' }}>จำนวน (ดวง)</label>
                      <input type="number" className="input" min="1" value={testQty} onChange={e => setTestQty(Number(e.target.value))} />
                    </div>
                  </div>
                  <button 
                    onClick={handleQuickPrint}
                    className="btn btn-primary" 
                    style={{ marginTop: '20px', width: '100%', height: '48px', fontSize: '16px', fontWeight: 'bold', background: '#2D3748' }}
                  >
                    <Printer size={20} /> พิมพ์สติกเกอร์ตอนนี้ ({testQty} ดวง)
                  </button>
                </div>

                <div className="label-box" style={{ background: 'white' }}>
                   <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#4A5568' }}>ตั้งค่าขนาดสติกเกอร์ (กรณีเปลี่ยนม้วน)</h4>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '15px' }}>
                    <div className="input-group">
                      <label>กว้างดวง (mm)</label>
                      <input type="text" className="input" value={settings.barcodeWidth} onChange={e => setSettings({...settings, barcodeWidth: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>สูงดวง (mm)</label>
                      <input type="text" className="input" value={settings.barcodeHeight} onChange={e => setSettings({...settings, barcodeHeight: e.target.value})} />
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={settings.showShopNameOnBarcode} onChange={e => setSettings({...settings, showShopNameOnBarcode: e.target.checked})} />
                    <span style={{ fontSize: '14px' }}>แสดงชื่อร้าน "{settings.shopName}" บนหัวสติกเกอร์</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Side Preview Section */}
          <div style={{ position: 'sticky', top: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px', color: '#718096', fontWeight: 'bold' }}>
              <Smartphone size={16} /> ตัวอย่างก่อนสั่งพิมพ์จริง
            </div>

            {activeTab === 'receipt' ? (
              <div 
                className="receipt-preview shadow-lg" 
                style={{ 
                  width: `${settings.receiptWidth || 72}mm`, 
                  fontSize: `${settings.receiptFontSize || 11}px`,
                  marginLeft: `${settings.receiptLeftMargin || 0}mm`,
                  background: 'white', 
                  padding: '15px', 
                  fontFamily: "'Courier New', Courier, monospace", 
                  color: '#000',
                  borderTop: '10px solid #D91A1A', 
                  border: '1px solid #E2E8F0',
                  transition: 'all 0.3s ease' // เพิ่มความสมูทตอนขยับ
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.6em', marginBottom: '2px', textTransform: 'uppercase' }}>{settings.shopName}</div>
                  <div style={{ fontSize: '1.3em', fontWeight: 'bold', marginBottom: '4px' }}>RECEIPT</div>
                  <div style={{ fontSize: '1em', lineHeight: '1.4', padding: '0 5px' }}>
                    {settings.address ? settings.address.split('\\n').map((line, i) => <div key={i}>{line}</div>) : ''}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', fontSize: '1em', lineHeight: '1.6' }}>
                  <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Date:</span> 8/4/2569 19:23</div>
                  <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Receipt No.:</span> RC2604...</div>
                  <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Cashier:</span> Admin Staff</div>
                  <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Ref:</span> General Staff</div>
                  <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Member:</span> ลูกค้าทั่วไป</div>
                </div>

                <div style={{ textAlign: 'center', letterSpacing: '-1px', marginBottom: '5px' }}>==========================================</div>
        
                <div style={{ display: 'flex', fontWeight: 'bold', fontSize: '1em', marginBottom: '5px' }}>
                  <div style={{ flex: 1 }}>Items/Services</div>
                  <div style={{ width: '40px', flexShrink: 0, textAlign: 'right' }}>Qty.</div>
                  <div style={{ width: '60px', flexShrink: 0, textAlign: 'right' }}>Price</div>
                  <div style={{ width: '65px', flexShrink: 0, textAlign: 'right' }}>Total</div>
                </div>

                <div style={{ textAlign: 'center', letterSpacing: '-1px', marginBottom: '5px' }}>==========================================</div>

                <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '1.1em', fontWeight: 'bold' }}>SR000873 / 125.-</div>
                    <div style={{ display: 'flex', fontSize: '1em', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingLeft: '5px', fontSize: '0.9em', color: '#333' }}>ตัวอย่างสินค้า</div>
                    <div style={{ width: '40px', flexShrink: 0, textAlign: 'right' }}>1.00x</div>
                    <div style={{ width: '60px', flexShrink: 0, textAlign: 'right' }}>125.00</div>
                    <div style={{ width: '65px', flexShrink: 0, textAlign: 'right' }}>125.00</div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', letterSpacing: '-1px', marginBottom: '5px' }}>------------------------------------------</div>

                <div style={{ fontSize: '1.1em', paddingLeft: '40%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Sub-Total</span>
                    <span>125.00</span>
                  </div>
                  
                  <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }}></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.4em', marginBottom: '8px' }}>
                    <span>Total</span>
                    <span>125.00</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Payment Cash</span>
                    <span>125.00</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Debt</span>
                    <span>0.00</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Change</span>
                    <span>0.00</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '11px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>Thank You</div>
                  
                  <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                     {settings.qrCodeUrl && (
                       <img src={settings.qrCodeUrl} alt="QR" style={{ width: '35mm', height: '35mm', marginBottom: '8px', border: '1px solid #eee', padding: '2px' }} />
                     )}
                     <div style={{ fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic', color: '#1A202C', marginTop: '4px' }}>
                       ✨ ขอให้เป็นวันที่สดใสนะคะ ✨
                     </div>
                  </div>

                  <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: '1.6', borderTop: '1px solid #eee', paddingTop: '10px' }} className="newline-text">
                    {settings.receiptFooter}
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '20px', letterSpacing: '2px' }}>
                  ********
                </div>
                <div style={{ height: '60px' }}></div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '12px', color: '#718096', textAlign: 'center', marginBottom: '15px' }}>ผลลัพธ์แบบ 3 ดวงเรียงกัน</p>
                <div className="barcode-preview-row">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="barcode-preview-item">
                       {settings.showShopNameOnBarcode && <div style={{ fontSize: '6px', fontWeight: 'bold', marginBottom: '1px', opacity: 0.7 }}>{settings.shopName}</div>}
                       <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{testBarcode}</div>
                       <div className="p-barcode-font">*{testBarcode}*</div>
                       <div style={{ fontSize: '10px', fontWeight: 'bold', borderTop: '0.4px solid #000', width: '100%', marginTop: '1px', paddingTop: '1px' }}>
                         {Number(testPrice).toLocaleString()} .-
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Test Print Area - ขยับไปไกลๆ แทน opacity เพื่อให้ html2canvas ทำงานได้ดีที่สุด */}
      <div className="test-print-area" style={{ position: 'fixed', left: '-5000px', top: 0, zIndex: -1 }}>
        {activeTab === 'receipt' ? (
          <div id="test-receipt-print-area" className="print-receipt-80" style={{ width: '72mm', margin: '0', color: '#000', fontFamily: "'Courier New', Courier, monospace", padding: '10px 0', background: 'white' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '20px', marginBottom: '2px', textTransform: 'uppercase' }}>{settings.shopName}</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>RECEIPT (TEST)</div>
              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>{settings.address && settings.address.replace(/\\n/g, '\n')}</div>
            </div>

            {/* Meta */}
            <div style={{ marginBottom: '10px', fontSize: '13px', lineHeight: '1.6' }}>
              <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Date:</span> {new Date().toLocaleString('th-TH')}</div>
              <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Receipt No.:</span> RC-TEST-0001</div>
              <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Cashier:</span> Admin Staff</div>
            </div>

            <div style={{ textAlign: 'center', letterSpacing: '-1px', marginBottom: '5px' }}>==========================================</div>
            
            <div style={{ display: 'flex', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px' }}>
              <div style={{ flex: 1 }}>Items/Services</div>
              <div style={{ width: '50px', flexShrink: 0, textAlign: 'right' }}>Qty.</div>
              <div style={{ width: '70px', flexShrink: 0, textAlign: 'right' }}>Price</div>
              <div style={{ width: '80px', flexShrink: 0, textAlign: 'right' }}>Total</div>
            </div>

            <div style={{ textAlign: 'center', letterSpacing: '-1px', marginBottom: '5px' }}>==========================================</div>

            {/* Sample Item */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>SR-TEST / 100.-</div>
              <div style={{ display: 'flex', fontSize: '13px' }}>
                <div style={{ flex: 1, paddingLeft: '5px', fontSize: '12px' }}>ตัวอย่างสินค้าทดสอบ</div>
                <div style={{ width: '50px', flexShrink: 0, textAlign: 'right' }}>1.00x</div>
                <div style={{ width: '70px', flexShrink: 0, textAlign: 'right' }}>100.00</div>
                <div style={{ width: '80px', flexShrink: 0, textAlign: 'right' }}>100.00</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', letterSpacing: '-1px', marginBottom: '5px' }}>------------------------------------------</div>

            {/* Totals Section */}
            <div style={{ fontSize: '14px', paddingLeft: '40%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Sub-Total</span>
                <span>100.00</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>
                <span>Total</span>
                <span>100.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Change</span>
                <span>0.00</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '13px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '15px' }}>Thank You</div>
              
              <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 {settings.qrCodeUrl && (
                   <img src={settings.qrCodeUrl} alt="QR" style={{ width: '35mm', height: '35mm', marginBottom: '8px' }} />
                 )}
                 <div style={{ fontSize: '14px', fontWeight: 'bold', fontStyle: 'italic' }}> ✨ ขอให้ค้าขายร่ำรวยค่ะ ✨ </div>
              </div>

              <div style={{ textAlign: 'left', fontSize: '11px', lineHeight: '1.6', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                {settings.receiptFooter && settings.receiptFooter.replace(/\\n/g, '\n')}
              </div>
            </div>

            <div style={{ height: '60px' }}></div>
          </div>
        ) : (
          <div id="test-barcode-print-area" className="print-row-3" style={{ display: 'flex', flexWrap: 'wrap', width: '102mm', background: 'white' }}>
             {[...Array(testQty)].map((_, i) => (
              <div key={i} style={{ width: '32mm', height: '25mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 2px', boxSizing: 'border-box', overflow: 'hidden' }}>
                 {settings.showShopNameOnBarcode && <div style={{ fontSize: '7px', fontWeight: 'bold' }}>{settings.shopName}</div>}
                 <div style={{ fontSize: '9px', fontWeight: 'bold' }}>{testBarcode}</div>
                 <div style={{ fontFamily: "'Libre Barcode 39 Text', cursive", fontSize: '22px', lineHeight: 1, transform: 'scaleX(0.7)', transformOrigin: 'center' }}>*{testBarcode}*</div>
                 <div style={{ fontSize: '11px', fontWeight: '900', borderTop: '0.5px solid #000', width: '100%', marginTop: '1px', paddingTop: '1px' }}>
                   {Number(testPrice).toLocaleString()} .-
                 </div>
              </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

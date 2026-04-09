import React, { useState, useEffect } from 'react';
import { CheckCircle, Printer, X } from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ReceiptModal({ receiptData, onClose, onPrint }) {
  const [printSettings, setPrintSettings] = useState({
    shopName: 'Sis&Rich',
    address: '860 ถ. มังกร แขวงจักรวรรดิ์\\nเขตสัมพันธวงศ์ กรุงเทพมหานคร 10100',
    qrCodeUrl: '',
    blessings: ''
  });
  const [randomBlessing, setRandomBlessing] = useState('');

  useEffect(() => {
    if (receiptData) {
      const fetchSettings = async () => {
        try {
          const docRef = doc(db, 'settings', 'receipt');
          const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setPrintSettings(data);
              
              // ระบบสุ่มคำอวยพร: แยกบรรทัดและเลือกมา 1 ประโยค
              if (data.blessings) {
                const list = data.blessings.split('\\n').filter(line => line.trim() !== '');
                if (list.length > 0) {
                   const index = Math.floor(Math.random() * list.length);
                   setRandomBlessing(list[index]);
                }
              }
            }
        } catch (error) {
          console.error("Error fetching print settings:", error);
        }
      };
      fetchSettings();
    }
  }, [receiptData]);

  if (!receiptData) return null;

  const formatText = (text) => {
    if (!text) return ""; // ป้องกัน Error หน้าขาวถ้าข้อมูลยังไม่มา
    return text.split('\\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  return (
    <>
      {/* Success View */}
      <div className="hide-on-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
        <div className="card animate-slide-in" style={{ width: '420px', backgroundColor: '#F7FAFC', padding: '30px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
          
          <div style={{ width: '60px', height: '60px', background: '#38A169', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '20px' }}>
            <CheckCircle size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2D3748', marginBottom: '8px' }}>ทำรายการสำเร็จ!</h2>
          <p style={{ color: '#718096', marginBottom: '24px', textAlign: 'center' }}>ตัดสต็อกและบันทึกประวัติการขายในระบบเรียบร้อยแล้ว<br/>รหัสบิล: {receiptData.billId || receiptData.id.slice(0, 8).toUpperCase()}</p>

          {/* Draft view for staff */}
          <div style={{ width: '100%', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '24px' }}>
             <div style={{ borderBottom: '1px dashed #E2E8F0', paddingBottom: '12px', marginBottom: '12px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                 <span>Total:</span>
                 <span style={{ color: '#38A169' }}>฿{receiptData.grandTotal.toLocaleString()}</span>
               </div>
               <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>Items: {receiptData.totalQty} ชิ้น</div>
             </div>
             <div style={{ display: 'flex', gap: '8px' }}>
               <button className="btn" style={{ flex: 1, background: '#2D3748', color: 'white', padding: '12px' }} onClick={onPrint}>
                 <Printer size={18} /> พิมพ์ใบเสร็จ (Print)
               </button>
             </div>
          </div>

          <button className="btn btn-outline" style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 'bold' }} onClick={onClose}>
             กลับไปทำรายการใหม่
          </button>
        </div>
      </div>

      {/* Actual Printable Template */}
      {/* Actual Printable Template (XP-80 Optimized) */}
        <div className="print-area" style={{ 
          width: '70mm', 
          marginLeft: `${printSettings.receiptLeftMargin || 0}mm`, 
          fontSize: `${printSettings.receiptFontSize || 13}px`,
          color: '#000', 
          fontFamily: "'Courier New', Courier, monospace", 
          padding: '10px 0' 
        }}>
        
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.6em', marginBottom: '2px', textTransform: 'uppercase' }}>{printSettings.shopName}</div>
          <div style={{ fontSize: '1.3em', fontWeight: 'bold', marginBottom: '4px' }}>RECEIPT</div>
          <div style={{ fontSize: '1em', lineHeight: '1.4', padding: '0 5px' }}>
            {formatText(printSettings.address)}
          </div>
        </div>
        
        <div style={{ marginBottom: '10px', fontSize: '1em', lineHeight: '1.6' }}>
          <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Date:</span> {receiptData.printedDate?.toLocaleString('th-TH') || new Date().toLocaleString('th-TH')}</div>
          <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Receipt No.:</span> {receiptData.billId || receiptData.id.slice(0, 8).toUpperCase()}</div>
          <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Cashier:</span> {receiptData.staff || 'Admin'}</div>
          <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Ref:</span> {receiptData.seller?.name || 'General Staff'}</div>
          <div style={{ display: 'flex' }}><span style={{ width: '90px' }}>Member:</span> {receiptData.customer?.name ? (receiptData.customer.nickname || receiptData.customer.name) : 'ลูกค้าทั่วไป (General)'}</div>
        </div>

        <div style={{ textAlign: 'center', letterSpacing: '-1px', marginBottom: '5px' }}>==========================================</div>
        
        <div style={{ display: 'flex', fontWeight: 'bold', fontSize: '1em', marginBottom: '5px' }}>
          <div style={{ flex: 1 }}>Items/Services</div>
          <div style={{ width: '40px', flexShrink: 0, textAlign: 'right' }}>Qty.</div>
          <div style={{ width: '60px', flexShrink: 0, textAlign: 'right' }}>Price</div>
          <div style={{ width: '65px', flexShrink: 0, textAlign: 'right' }}>Total</div>
        </div>

        <div style={{ textAlign: 'center', letterSpacing: '-1px', marginBottom: '5px' }}>==========================================</div>

        {receiptData.items.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{item.sku} / {item.price.toLocaleString()}.-</div>
            <div style={{ display: 'flex', fontSize: '1em', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, paddingLeft: '5px', fontSize: '0.9em', color: '#333' }}>{item.name}</div>
              <div style={{ width: '40px', flexShrink: 0, textAlign: 'right' }}>{(item.qty || 0).toFixed(2)}x</div>
              <div style={{ width: '60px', flexShrink: 0, textAlign: 'right' }}>{(item.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
              <div style={{ width: '65px', flexShrink: 0, textAlign: 'right' }}>{(item.subtotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', letterSpacing: '-1px', marginBottom: '5px' }}>------------------------------------------</div>

        <div style={{ fontSize: '1.1em', paddingLeft: '40%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Sub-Total</span>
            <span>{(receiptData.subTotal || receiptData.grandTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
          
          <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.4em', marginBottom: '8px' }}>
            <span>Total</span>
            <span>{(receiptData.grandTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Payment Cash</span>
            <span>{(receiptData.totalPaid || receiptData.grandTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Debt</span>
            <span>0.00</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>Change</span>
            <span>{(receiptData.changeAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '11px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>Thank You</div>
          
          {/* ส่วนสุ่มคำอวยพรและ QR Code */}
          <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             {printSettings.qrCodeUrl && (
               <img 
                 src={printSettings.qrCodeUrl} 
                 alt="QR Code" 
                 style={{ width: '35mm', height: '35mm', marginBottom: '8px', border: '1px solid #eee', padding: '2px' }} 
               />
             )}
             {randomBlessing && (
               <div style={{ fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic', color: '#1A202C', marginTop: '4px' }}>
                 ✨ {randomBlessing} ✨
               </div>
             )}
          </div>

          <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: '1.6', borderTop: '1px solid #eee', paddingTop: '10px' }}>
            {formatText(printSettings.receiptFooter)}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '20px', letterSpacing: '2px' }}>
          ********
        </div>
        <div style={{ height: '60px' }}></div>
      </div>
    </>
  );
}

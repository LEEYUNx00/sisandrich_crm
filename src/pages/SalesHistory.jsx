import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { History, Search, Download, XCircle, Printer, CheckCircle, AlertCircle, X, FileText } from 'lucide-react';
import ReceiptModal from '../components/POS/ReceiptModal';
import html2canvas from 'html2canvas';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setSales(fetchedSales);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleVoid = async (sale) => {
    if (sale.status === 'voided') return alert('บิลนี้ถูกยกเลิกไปแล้ว');
    const confirmVoid = window.confirm(`คุณแน่ใจหรือไม่ที่จะยกเลิกบิล ${sale.billId || sale.id.slice(0, 8).toUpperCase()}?\n\nการกระทำนี้จะ:\n- คืนสต็อกสินค้ากลับสู่ระบบ\n- ลบยอดซื้อสะสมและคะแนนของลูกค้า(ถ้ามี)\n- ทำเครื่องหมายว่าบิลนี้ยกเลิกแล้ว`);
    
    if (!confirmVoid) return;

    setIsProcessing(true);
    try {
      // 1. Mark Sale as Voided
      const saleRef = doc(db, 'sales', sale.id);
      await updateDoc(saleRef, {
        status: 'voided',
        voidedAt: serverTimestamp(),
        voidedBy: 'Admin Staff' // can be dynamic if auth is fully used
      });

      // 2. Return Stock & Log Inventory
      const batchLogRef = collection(db, 'inventory_logs');
      const productPromises = sale.items.map(async (item) => {
        const productRef = doc(db, 'products', item.id);
        
        // We might not know if it was strict stock controlled inside the sale log,
        // but generally we just increment back based on what was sold.
        await updateDoc(productRef, {
          stock1st: increment(item.qty),
          updatedAt: serverTimestamp()
        });

        // Log return
        await addDoc(batchLogRef, {
          productId: item.id,
          sku: item.sku || '',
          name: item.name || '',
          type: 'return', // Void counts as return to stock
          amount: item.qty,
          location: '1st',
          reason: `Void Bill: ${sale.billId || sale.id.slice(0,8).toUpperCase()}`,
          timestamp: serverTimestamp()
        });
      });
      await Promise.all(productPromises);

      // 3. Rollback CRM (minus spend and points)
      if (sale.customer && sale.customer.id !== 'walk-in' && sale.customer.id !== undefined) {
        const customerRef = doc(db, 'customers', sale.customer.id);
        
        // Check if customer exists first to avoid errors
        const custSnap = await getDoc(customerRef);
        if (custSnap.exists()) {
          const minusSpend = -(sale.grandTotal || 0);
          const minusPoints = -(Math.floor(sale.grandTotal / 100));
          
          await updateDoc(customerRef, {
            totalSpend: increment(minusSpend),
            points: increment(minusPoints),
            // totalVisit decrement is optional, we might just leave the visit count.
          });
        }
      }

      // 4. System Audit Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'pos',
        action: 'ยกเลิกบิล (Void Bill)',
        detail: `บิล ${sale.billId || sale.id.slice(0,8).toUpperCase()} ยอด ฿${(sale.grandTotal || 0).toLocaleString()}`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      alert('ยกเลิกบิลสำเร็จ คืนสต็อกเรียบร้อย');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการยกเลิกบิล: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    let csv = '\uFEFF'; 
    csv += "วันที่,เวลา,รหัสบิล,ลูกค้า,พนักงานขาย,สถานะ,จำนวนชิ้นรวม,ยอดรวม(บาท),ลดราคาโปรโมชั่น(บาท),ภาษี(บาท),ยอดสุทธิ(บาท),รายการสินค้า\n";
    
    filteredSales.forEach(s => {
      const dDate = s.timestamp.toLocaleDateString('th-TH');
      const dTime = s.timestamp.toLocaleTimeString('th-TH');
      const billId = s.billId || s.id.slice(0,8).toUpperCase();
      const customer = s.customer?.name || 'Walk-in';
      const seller = s.seller?.name || 'General Staff';
      const status = s.status === 'voided' ? 'ยกเลิก' : 'สำเร็จ';
      const itemsList = s.items?.map(i => `${i.name} [${i.qty} ชิ้น]`).join(' | ') || '';
      
      csv += `"${dDate}","${dTime}","${billId}","${customer}","${seller}","${status}","${s.totalQty}","${s.subTotal || 0}","${s.discountAmount || 0}","${s.tax || 0}","${s.grandTotal || 0}","${itemsList}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handlePrint = async () => {
    if (!selectedReceipt) return;
    
    try {
      // 1. ดึงการตั้งค่าหัวบิล
      const docRef = doc(db, 'settings', 'receipt');
      const docSnap = await getDoc(docRef);
      const printSettings = docSnap.exists() ? docSnap.data() : { shopName: 'Sis&Rich', address: '' };

      // 2. ตั้งค่ารหัสสั่งการเครื่องพิมพ์ (ESC/POS)
      const dHeight = "\x1B\x21\x10"; // Double height
      const normal = "\x1B\x21\x00"; 
      const center = "\x1B\x61\x01"; 
      const left = "\x1B\x61\x00"; 
      const bold = "\x1B\x45\x01"; 
      const resetBold = "\x1B\x45\x00";

      // 3. จัดหน้าบิลแบบ Text
      let text = center + dHeight + bold + printSettings.shopName + "\n";
      text += normal + bold + "RECEIPT" + resetBold + "\n";
      text += (printSettings.address || "").replace(/\\n/g, "\n") + "\n\n";
      
      text += left;
      text += `Date: ${selectedReceipt.timestamp?.toDate().toLocaleString('th-TH') || new Date().toLocaleString('th-TH')}\n`;
      text += `Receipt No.: ${selectedReceipt.billId || selectedReceipt.id.slice(0, 8).toUpperCase()}\n`;
      text += `Staff: ${selectedReceipt.staff || 'Admin'}\n`;
      text += `Customer: ${selectedReceipt.customer?.name || 'General'}\n`;

      text += "------------------------------------------\n";
      text += "Items/Services           Qty.      Total\n";
      text += "------------------------------------------\n";

      selectedReceipt.items.forEach(item => {
        const displaySKU = (item.sku || "").padEnd(25);
        const displayQty = `${item.qty || 1}x`.padEnd(8);
        const displayTotal = (item.subtotal || item.price).toLocaleString();
        text += `${displaySKU}${displayQty}${displayTotal}\n`;
      });

      text += "------------------------------------------\n";
      text += `Sub-Total: ${selectedReceipt.subTotal?.toLocaleString()}\n`;
      text += bold + `TOTAL: ${selectedReceipt.grandTotal?.toLocaleString()}` + resetBold + "\n";
      text += `Payment: ${selectedReceipt.paymentMethod || 'Cash'}\n`;
      text += `Change: ${selectedReceipt.changeAmount?.toLocaleString() || 0}\n`;
      text += "------------------------------------------\n";
      
      text += center + "\nThank You\n";
      text += (printSettings.receiptFooter || "").replace(/\\n/g, "\n") + "\n\n";

      // 4. ส่งไปที่ Bridge (โหมด Text ความละเอียดสูงสุด)
      await fetch('http://127.0.0.1:8000/print-receipt-text', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          printerName: 'XP-80C'
        })
      });

    } catch (err) {
      console.warn("Native print failed, falling back to browser print", err);
      window.print();
    }
  };

    // Fallback to standard browser print
    window.print();
  };

  const filteredSales = sales.filter(s => {
    const term = searchTerm.toLowerCase();
    const searchMatch = s.id.toLowerCase().includes(term) ||
           (s.billId || '').toLowerCase().includes(term) ||
           (s.customer?.name || '').toLowerCase().includes(term) ||
           (s.seller?.name || '').toLowerCase().includes(term);
           
    let dateMatch = true;
    if (dateFilter && s.timestamp) {
      const year = s.timestamp.getFullYear();
      const month = String(s.timestamp.getMonth() + 1).padStart(2, '0');
      const day = String(s.timestamp.getDate()).padStart(2, '0');
      dateMatch = `${year}-${month}-${day}` === dateFilter;
    }
    
    return searchMatch && dateMatch;
  });

  return (
    <div className="animate-slide-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <style>
        {`
          @media print {
            .sidebar, .top-header, .pos-layout, .card, .hide-on-print, button, nav, .animate-slide-in {
              display: none !important;
            }
            .print-area {
              display: block !important;
              visibility: visible !important;
              position: static;
              width: 72mm !important;
              margin: 0 auto;
              padding: 0;
              background: white !important;
              color: black !important;
              font-family: 'Courier New', Courier, monospace;
            }
            @page { margin: 0; size: auto; }
          }
        `}
      </style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1A202C', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={28} color="#2B6CB0" />
            ประวัติการขาย และจัดการบิล (Sales History)
          </h2>
          <p style={{ color: '#718096', fontSize: '14px', marginTop: '4px' }}>ดูประวัติ พิมพ์ใบเสร็จย้อนหลัง หรือยกเลิกบิลเพื่อคืนสต็อก</p>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', background: 'white', marginBottom: '24px' }}>
        <div style={{ flex: 1, display: 'flex', gap: '16px', maxWidth: '800px' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4A5568', marginBottom: '8px' }}>ค้นหา (Search)</label>
            <div className="input-icon-wrapper" style={{ margin: 0 }}>
              <Search className="icon" size={18} />
              <input 
                type="text" 
                className="input" 
                placeholder="รหัสบิล, ชื่อลูกค้า, ชื่อเซลล์..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{ margin: 0 }}
              />
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4A5568', marginBottom: '8px' }}>วันที่ (Date)</label>
            <input 
              type="date" 
              className="input" 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value)} 
              style={{ margin: 0 }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ flex: 1, padding: '0', background: 'white', overflowY: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F7FAFC' }}>
              <th style={{ padding: '16px' }}>วันที่ / เวลา</th>
              <th style={{ padding: '16px' }}>รหัสบิล (Bill ID)</th>
              <th style={{ padding: '16px' }}>ลูกค้า (Customer)</th>
              <th style={{ padding: '16px' }}>ยอดรวม (Total)</th>
              <th style={{ padding: '16px' }}>สถานะ (Status)</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>จัดการ (Action)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: '#A0AEC0' }}>กำลังโหลดข้อมูล...</td></tr>
            ) : filteredSales.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: '#A0AEC0' }}>ไม่พบประวัติการขาย</td></tr>
            ) : filteredSales.map(sale => (
              <tr key={sale.id} style={{ borderBottom: '1px solid #EDF2F7', opacity: sale.status === 'voided' ? 0.6 : 1 }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#2D3748' }}>{sale.timestamp.toLocaleDateString('th-TH')}</div>
                  <div style={{ fontSize: '11px', color: '#718096' }}>{sale.timestamp.toLocaleTimeString('th-TH')}</div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 'bold', color: '#3182CE' }}>
                  {sale.billId || sale.id.slice(0,8).toUpperCase()}
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A5568' }}>
                  {sale.customer?.name || 'Walk-in'}
                  <div style={{ fontSize: '11px', color: '#A0AEC0' }}>Seller: {sale.seller?.name || '-'}</div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 'bold', color: '#2D3748' }}>
                  ฿{(sale.grandTotal || 0).toLocaleString()}
                  <div style={{ fontSize: '11px', color: '#718096', fontWeight: 'normal' }}>{sale.totalQty} items</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {sale.status === 'voided' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FED7D7', color: '#C53030', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      <AlertCircle size={12} /> ยกเลิกแล้ว (Voided)
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#C6F6D5', color: '#2F855A', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      <CheckCircle size={12} /> สำเร็จ (Completed)
                    </span>
                  )}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      className="btn-icon" 
                      style={{ padding: '8px', background: '#EBF8FF', color: '#3182CE' }} 
                      title="ดูรายละเอียด/พิมพ์ใบเสร็จ"
                      onClick={() => setSelectedReceipt(sale)}
                    >
                      <FileText size={16} />
                    </button>
                    {sale.status !== 'voided' && (
                      <button 
                        className="btn-icon" 
                        style={{ padding: '8px', background: '#FFF5F5', color: '#E53E3E' }} 
                        title="ยกเลิกบิล (Void)"
                        onClick={() => handleVoid(sale)}
                        disabled={isProcessing}
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Integrated POS Receipt Modal */}
      <ReceiptModal 
        receiptData={selectedReceipt} 
        onClose={() => setSelectedReceipt(null)}
        onPrint={handlePrint}
      />

    </div>
  );
}

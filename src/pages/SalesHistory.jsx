import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { History, Search, Download, FileText, XCircle, Printer, CheckCircle, AlertCircle, X } from 'lucide-react';

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
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area {
              position: absolute; left: 0; top: 0; width: 100%;
              max-width: 80mm; background: white; padding: 10px;
              color: black !important; font-family: monospace;
            }
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

      {/* View / Print Modal */}
      {selectedReceipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card animate-slide-in" style={{ width: '400px', backgroundColor: '#fff', padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', background: '#F7FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', color: '#2D3748' }}>
                <FileText size={18} /> รายละเอียดบิล
              </h3>
              <button className="btn-icon" style={{ padding: '4px' }} onClick={() => setSelectedReceipt(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Print Area Replica */}
            <div className="print-area" style={{ padding: '20px', background: 'white', position: 'relative' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px', fontFamily: 'monospace' }}>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>SIS & RICH</h2>
                <div style={{ fontSize: '12px' }}>ใบเสร็จรับเงิน / Receipt (Reprint)</div>
                <div style={{ fontSize: '10px' }}>{selectedReceipt.timestamp?.toLocaleString('th-TH')}</div>
                <div style={{ fontSize: '10px' }}>Bill No: {selectedReceipt.billId || selectedReceipt.id.slice(0, 8).toUpperCase()}</div>
                <div style={{ fontSize: '10px' }}>Cashier: {selectedReceipt.staff || 'Admin'}</div>
                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>Seller: {selectedReceipt.seller?.name || '-'}</div>
                {selectedReceipt.status === 'voided' && (
                  <div style={{ color: 'red', fontWeight: 'bold', border: '1px solid red', margin: '10px 0', padding: '5px' }}>*** ยกเลิก (VOIDED) ***</div>
                )}
              </div>
              
              <div style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', padding: '10px 0', margin: '10px 0', fontFamily: 'monospace' }}>
                {selectedReceipt.items?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                    <div style={{ flex: 1, paddingRight: '10px' }}>
                      <div>{item.name}</div>
                      <div style={{ fontSize: '10px' }}>{item.qty} x {(item.price || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {(item.subtotal || (item.qty * item.price) || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginBottom: '5px', fontFamily: 'monospace' }}>
                <span>TOTAL:</span>
                <span>{(selectedReceipt.grandTotal || 0).toLocaleString()} THB</span>
              </div>
              
              <div style={{ fontSize: '12px', marginBottom: '10px', fontFamily: 'monospace' }}>
                Customer: {selectedReceipt.customer?.name || 'Walk-in'}
              </div>
            </div>

            <div style={{ padding: '16px', display: 'flex', gap: '8px', borderTop: '1px solid #E2E8F0' }}>
              <button className="btn" style={{ flex: 1, background: '#2D3748', color: 'white', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={() => window.print()}>
                <Printer size={18} /> พิมพ์ใหม่ (Reprint)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

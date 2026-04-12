import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp, getDoc, where } from 'firebase/firestore';
import { History, Search, Download, XCircle, Printer, CheckCircle, AlertCircle, X, FileText, RefreshCw, Edit2, Lock } from 'lucide-react';
import ReceiptModal from '../components/POS/ReceiptModal';
import html2canvas from 'html2canvas';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [isLinking, setIsLinking] = useState(null); 
  
  // Edit Bill State
  const [editingSale, setEditingSale] = useState(null);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [editForm, setEditForm] = useState({ newMethod: 'cash', reason: '' });
  const [employees, setEmployees] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  useEffect(() => {
    // Initial load: Last 100 sales
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

  const fetchSalesInRange = async () => {
    if (!startDate || !endDate) return alert("กรุณาระบุช่วงวันที่ให้ครบถ้วน (Start & End Date)");
    setLoading(true);
    setIsFetching(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'sales'),
        where('timestamp', '>=', start),
        where('timestamp', '<=', end),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(query(q)); // Force execution
      const fetched = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setSales(fetched);
    } catch (err) {
      console.error(err);
      if (err.message.includes('requires an index')) {
        alert("ระบบต้องการการตั้งค่า Index เพิ่มเติม (Firestore Index). กรุณาติดต่อผู้ดูแลระบบหรือคลิกลิงก์ใน Console เพื่อสร้าง Index สำหรับช่วงวันที่");
      } else {
        alert("เกิดข้อผิดพลาดในการดึงข้อมูล: " + err.message);
      }
    }
    setLoading(false);
    setIsFetching(false);
  };

  // Fetch active shift to allow quick reconciliation
  useEffect(() => {
    const q = query(collection(db, 'shifts'), where('status', '==', 'open'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveShift({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setActiveShift(null);
      }
    });
    return () => unsub();
  }, []);

  // Fetch employees to verify Admin PIN
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleLinkToShift = async (saleId) => {
    if (!activeShift) return alert("กรุณาเปิดกะก่อนนำยอดเข้า");
    setIsLinking(saleId);
    try {
      await updateDoc(doc(db, 'sales', saleId), {
        shiftId: activeShift.id
      });
      // Not using alert here to keep it smooth, visual state will update automatically
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsLinking(null);
    }
  };

  const handleEditSale = async () => {
    if (!editingSale || !editForm.reason || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const saleRef = doc(db, 'sales', editingSale.id);
      const oldMethod = editingSale.payments?.[0]?.method || 'cash';
      const amount = editingSale.grandTotal || 0;
      
      // 1. Update Sale Document
      const updatedPayments = editingSale.payments.map((p, i) => i === 0 ? { ...p, method: editForm.newMethod } : p);
      
      await updateDoc(saleRef, {
        payments: updatedPayments,
        editedAt: serverTimestamp(),
        editReason: editForm.reason,
        lastEditedBy: 'Admin'
      });

      // 2. Adjust Shift Totals (Crucial!)
      if (editingSale.shiftId && oldMethod !== editForm.newMethod) {
        try {
          const shiftRef = doc(db, 'shifts', editingSale.shiftId);
          const shiftSnap = await getDoc(shiftRef);
          
          if (shiftSnap.exists()) {
            const shiftData = shiftSnap.data();
            const pms = shiftData.paymentSummary || shiftData.payments || {};
            
            // Standardize methods for logic
            const stdOld = (['transfer', 'online', 'promptpay'].includes(oldMethod)) ? 'transfer' : 
                            (['cash', 'เงินสด'].includes(oldMethod)) ? 'cash' : oldMethod;
            const stdNew = (['transfer', 'online', 'promptpay'].includes(editForm.newMethod)) ? 'transfer' : 
                            (['cash', 'เงินสด'].includes(editForm.newMethod)) ? 'cash' : editForm.newMethod;

            // Remove old amount from both summary and specific counters
            if (pms[stdOld] !== undefined) pms[stdOld] = Math.max(0, (pms[stdOld] || 0) - amount);
            if (stdOld === 'cash') {
              shiftData.cashSales = Math.max(0, (shiftData.cashSales || 0) - amount);
              shiftData.netCashSales = Math.max(0, (shiftData.netCashSales || 0) - amount);
            }
            if (stdOld === 'transfer') shiftData.transferSales = Math.max(0, (shiftData.transferSales || 0) - amount);

            // Add new amount
            pms[stdNew] = (pms[stdNew] || 0) + amount;
            if (stdNew === 'cash') {
              shiftData.cashSales = (shiftData.cashSales || 0) + amount;
              shiftData.netCashSales = (shiftData.netCashSales || 0) + amount;
            }
            if (stdNew === 'transfer') shiftData.transferSales = (shiftData.transferSales || 0) + amount;

            // Sync back to Firestore
            await updateDoc(shiftRef, {
              payments: pms,
              paymentSummary: pms,
              cashSales: shiftData.cashSales || 0,
              netCashSales: shiftData.netCashSales || 0,
              transferSales: shiftData.transferSales || 0,
              endingCashSystem: (shiftData.startingCash || 0) + (shiftData.netCashSales || 0)
            });
          }
        } catch (shiftErr) {
          console.error("Failed to update shift during sale edit:", shiftErr);
        }
      }

      // 3. System Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'pos_edit',
        action: 'แก้ไขบิล (Edit Bill)',
        detail: `บิล ${editingSale.billId || editingSale.id.slice(0,8)} แก้ไขวิธีชำระจาก ${oldMethod} เป็น ${editForm.newMethod} (เหตุผล: ${editForm.reason})`,
        operator: 'Admin',
        timestamp: serverTimestamp()
      });

      alert('แก้ไขข้อมูลบิลและยอดกะสำเร็จแล้ว');
      setEditingSale(null);
      setIsAdminVerified(false);
      setAdminPin('');
      setEditForm({ newMethod: 'cash', reason: '' });
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

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

      // 4. Update Shift Totals (If linked to a shift)
      if (sale.shiftId) {
        try {
          const shiftRef = doc(db, 'shifts', sale.shiftId);
          const shiftSnap = await getDoc(shiftRef);
          if (shiftSnap.exists()) {
            const shiftData = shiftSnap.data();
            const amount = sale.grandTotal || 0;
            const pms = shiftData.paymentSummary || shiftData.payments || {};

            // Deduct each payment method used in the voided sale
            (sale.payments || [{ method: sale.paymentMethod || 'cash', amount }]).forEach(p => {
              const m = (p.method || 'cash').toLowerCase();
              if (pms[m] !== undefined) pms[m] = Math.max(0, (pms[m] || 0) - p.amount);

              if (m === 'cash') shiftData.netCashSales = Math.max(0, (shiftData.netCashSales || 0) - p.amount);
              if (['transfer', 'online', 'promptpay'].includes(m)) {
                shiftData.transferSales = Math.max(0, (shiftData.transferSales || 0) - p.amount);
              }
            });

            await updateDoc(shiftRef, {
              paymentSummary: pms,
              payments: pms,
              netCashSales: shiftData.netCashSales || 0,
              transferSales: shiftData.transferSales || 0,
              totalSales: Math.max(0, (shiftData.totalSales || 0) - amount),
              netSales: Math.max(0, (shiftData.netSales || 0) - amount),
              totalBills: Math.max(0, (shiftData.totalBills || 0) - 1),
              voidedBills: increment(1),
              totalItemsSold: Math.max(0, (shiftData.totalItemsSold || 0) - (sale.totalQty || 0)),
              endingCashSystem: (shiftData.startingCash || 0) + (shiftData.netCashSales || 0)
            });
          }
        } catch (shiftErr) {
          console.error("Failed to update shift totals during void:", shiftErr);
          // We don't block the whole void process if shift update fails, but we log it.
        }
      }

      // 5. System Audit Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'pos',
        action: 'ยกเลิกบิล (Void Bill)',
        detail: `บิล ${sale.billId || sale.id.slice(0, 8).toUpperCase()} ยอด ฿${(sale.grandTotal || 0).toLocaleString()}`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      alert('ยกเลิกบิลสำเร็จ คืนสต็อกและปรับปรุงยอดกะเรียบร้อย');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการยกเลิกบิล: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (filteredSales.length === 0) return alert("ไม่มีข้อมูลที่ตรงตามเงื่อนไขเพื่อส่งออก");
    
    let csv = '\uFEFF'; 
    csv += "วันที่,เวลา,รหัสบิล,ลูกค้า,พนักงานขาย,สถานะ,วิธีชำระ,จำนวนชิ้นรวม,ยอดรวม(บาท),ลดราคาโปรโมชั่น(บาท),ภาษี(บาท),ยอดสุทธิ(บาท),กำไรขั้นต้น(ประมาณการ),รายการสินค้า(SKU x QTY),รายละเอียดทั้งหมด\n";
    
    filteredSales.forEach(s => {
      const dDate = s.timestamp.toLocaleDateString('th-TH');
      const dTime = s.timestamp.toLocaleTimeString('th-TH');
      const billId = s.billId || s.id.slice(0,8).toUpperCase();
      const customer = s.customer?.name || 'Walk-in';
      const seller = s.seller?.name || 'General Staff';
      const status = s.status === 'voided' ? 'ยกเลิก (VOID)' : 'สำเร็จ';
      
      const paymentMethods = s.payments?.map(p => {
        let label = p.method;
        if (p.method === 'cash') label = 'เงินสด';
        else if (p.method === 'transfer') label = 'โอน';
        else if (p.method === 'credit') label = 'บัตร';
        else if (p.method === 'storeCredit') label = 'วอลเล็ท';
        return `${label}${s.payments.length > 1 ? ` (฿${p.amount})` : ''}`;
      }).join(' + ') || '-';

      const itemsSimple = s.items?.map(i => `${i.name} [x${i.qty}]`).join('; ') || '';
      const itemsFull = s.items?.map(i => `${i.name} (SKU: ${i.sku || '-'}) x${i.qty} @ ฿${i.price}`).join(' | ') || '';

      // Estimate profit if cost was available
      const totalCost = s.items?.reduce((acc, i) => acc + (i.costPrice * i.qty || 0), 0) || 0;
      const profit = (s.grandTotal || 0) - totalCost;
      
      csv += `"${dDate}","${dTime}","${billId}","${customer}","${seller}","${status}","${paymentMethods}","${s.totalQty}","${s.subTotal || 0}","${s.discount || 0}","${s.tax || 0}","${s.grandTotal || 0}","${profit}","${itemsSimple}","${itemsFull}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = startDate && endDate ? `Sales_Full_Report_${startDate}_to_${endDate}.csv` : `Sales_History_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.href = url;
    a.download = fileName;
    a.click();
  };

  const handlePrint = async () => {
    if (selectedReceipt) {
      try {
        // ให้เวลา DOM เรนเดอร์ ReceiptModal เล็กน้อย
        await new Promise(resolve => setTimeout(resolve, 150));
        const receiptElement = document.querySelector('.print-area');
        if (!receiptElement) return alert("❌ ไม่พบเทมเพลตบิล");

        const canvas = await html2canvas(receiptElement, { 
          scale: 4.0, 
          useCORS: true, 
          backgroundColor: '#ffffff' 
        });
        const imageData = canvas.toDataURL('image/png');

        await fetch('http://127.0.0.1:8000/print-receipt', {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            printerName: 'XP-80C', 
            image: imageData, 
            billId: selectedReceipt.billId || selectedReceipt.id.slice(0, 8).toUpperCase()
          })
        });
      } catch (err) {
        console.error("Graphical print failed:", err);
        window.print();
      }
    }
  };


  const filteredSales = sales.filter(s => {
    const term = searchTerm.toLowerCase();
    const searchMatch = s.id.toLowerCase().includes(term) ||
           (s.billId || '').toLowerCase().includes(term) ||
           (s.customer?.name || '').toLowerCase().includes(term) ||
           (s.seller?.name || '').toLowerCase().includes(term);
    
    // Client-side quick filter for visual comfort (Real range filtering happens via fetchSalesInRange)
    let dateMatch = true;
    if (startDate && endDate && !isFetching) {
      const sDate = new Date(startDate); sDate.setHours(0,0,0,0);
      const eDate = new Date(endDate); eDate.setHours(23,59,59,999);
      dateMatch = s.timestamp >= sDate && s.timestamp <= eDate;
    }

    return searchMatch && dateMatch;
  });

  // Reset to page 1 when searching or filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentSales = filteredSales.slice(indexOfFirstItem, indexOfLastItem);

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

      <div className="card" style={{ padding: '24px', background: 'white', marginBottom: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 2, minWidth: '300px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#1A202C', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔍 ค้นหาบิล (Search)
            </label>
            <div className="input-icon-wrapper" style={{ margin: 0 }}>
              <Search className="icon" size={18} />
              <input 
                type="text" 
                className="input" 
                placeholder="รหัสบิล, ชื่อลูกค้า, ชื่อเซลล์..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{ margin: 0, borderRadius: '10px' }}
              />
            </div>
          </div>
          
          <div style={{ flex: 1.5, display: 'flex', gap: '10px', minWidth: '320px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#4A5568', marginBottom: '8px' }}>เริ่ม (Start Date)</label>
              <input 
                type="date" 
                className="input" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                style={{ margin: 0, borderRadius: '10px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#4A5568', marginBottom: '8px' }}>ถึง (End Date)</label>
              <input 
                type="date" 
                className="input" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                style={{ margin: 0, borderRadius: '10px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn" 
              onClick={fetchSalesInRange}
              disabled={loading || !startDate || !endDate}
              style={{ 
                background: '#2B6CB0', 
                color: 'white', 
                padding: '10px 20px', 
                borderRadius: '10px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading && isFetching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              ดึงข้อมูลตามช่วง
            </button>

            <button 
              className="btn"
              onClick={handleExport}
              disabled={filteredSales.length === 0}
              style={{ 
                background: '#38A169', 
                color: 'white', 
                padding: '10px 20px', 
                borderRadius: '10px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Download size={16} />
              ส่งออก Excel (CSV)
            </button>
          </div>

        </div>
        {(startDate || endDate) && (
           <div style={{ marginTop: '12px', fontSize: '12px', color: '#718096', fontStyle: 'italic' }}>
              * ข้อมูลที่แสดงในรายการอาจมีจำนวนจำกัด กรุณากด "ดึงข้อมูลตามช่วง" เพื่อดูข้อมูลละเอียดทั้งหมด
           </div>
        )}
      </div>

      <div className="card" style={{ flex: 1, padding: '0', background: 'white', overflowY: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F7FAFC' }}>
              <th style={{ padding: '16px' }}>วันที่ / เวลา</th>
              <th style={{ padding: '16px' }}>รหัสบิล (Bill ID)</th>
              <th style={{ padding: '16px' }}>ลูกค้า (Customer)</th>
              <th style={{ padding: '16px' }}>ยอดรวม (Total)</th>
              <th style={{ padding: '16px' }}>ชำระโดย (Payment)</th>
              <th style={{ padding: '16px' }}>สถานะ (Status)</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>จัดการ (Action)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: '#A0AEC0' }}>กำลังโหลดข้อมูล...</td></tr>
            ) : currentSales.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: '#A0AEC0' }}>ไม่พบประวัติการขาย</td></tr>
            ) : currentSales.map(sale => (
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {sale.payments && sale.payments.length > 0 ? (
                      sale.payments.map((p, idx) => {
                        let label = p.method;
                        let emoji = '💰';
                        let color = '#718096';
                        let bg = '#F7FAFC';

                        if (p.method === 'cash') { label = 'เงินสด'; emoji = '💵'; color = '#38A169'; bg = '#F0FFF4'; }
                        else if (p.method === 'transfer') { label = 'โอน'; emoji = '📱'; color = '#3182CE'; bg = '#EBF8FF'; }
                        else if (p.method === 'credit') { label = 'บัตร'; emoji = '💳'; color = '#805AD5'; bg = '#F5F3FF'; }
                        else if (p.method === 'storeCredit') { label = 'วอลเล็ท'; emoji = '👛'; color = '#DD6B20'; bg = '#FFFAF0'; }

                        return (
                          <span key={idx} style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            background: bg, 
                            color: color, 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            border: `1px solid ${color}20`
                          }}>
                            {emoji} {label}
                            {sale.payments.length > 1 && <span style={{ opacity: 0.8, fontSize: '10px' }}> (฿{p.amount.toLocaleString()})</span>}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '11px', color: '#A0AEC0' }}>-</span>
                    )}
                  </div>
                </td>
                <td style={{ 
                  padding: '14px 16px', 
                  background: !sale.shiftId && sale.status !== 'voided' ? '#FFFBEB' : 'transparent',
                  transition: 'background 0.3s'
                }}>
                  {sale.status === 'voided' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FED7D7', color: '#C53030', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      <AlertCircle size={12} /> ยกเลิกแล้ว (Voided)
                    </span>
                  ) : !sale.shiftId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEFCBF', color: '#B7791F', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        <AlertCircle size={12} /> นอกกะ (No Shift)
                      </span>
                      {activeShift && (
                        <button 
                          className="btn" 
                          onClick={() => handleLinkToShift(sale.id)}
                          disabled={isLinking === sale.id}
                          style={{ 
                            fontSize: '10px', 
                            padding: '4px 8px', 
                            background: '#1A202C', 
                            color: 'white',
                            height: 'auto',
                            width: 'fit-content'
                          }}
                        >
                          {isLinking === sale.id ? '...' : (
                            <><RefreshCw size={10} className="animate-spin" /> ลงกะ #{activeShift.shiftNumber}</>
                          )}
                        </button>
                      )}
                    </div>
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
                      <>
                        <button 
                          className="btn-icon" 
                          style={{ padding: '8px', background: '#f0f9ff', color: '#0369a1' }} 
                          title="แก้ไขวิธีชำระ (Edit Payment)"
                          onClick={() => {
                            setEditingSale(sale);
                            setIsAdminVerified(false);
                            setEditForm({ 
                              newMethod: sale.payments?.[0]?.method || 'cash',
                              reason: ''
                            });
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-icon" 
                          style={{ padding: '8px', background: '#FFF5F5', color: '#E53E3E' }} 
                          title="ยกเลิกบิล (Void)"
                          onClick={() => handleVoid(sale)}
                          disabled={isProcessing}
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', padding: '20px', background: 'white', borderTop: '1px solid #EDF2F7', borderRadius: '0 0 16px 16px' }}>
          <button 
            className="btn btn-outline" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            ย้อนกลับ
          </button>
          
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#4A5568' }}>
            หน้า {currentPage} จาก {totalPages}
          </div>
          
          <button 
            className="btn btn-outline" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            ถัดไป
          </button>
        </div>
      )}

      {/* Integrated POS Receipt Modal */}
      <ReceiptModal 
        receiptData={selectedReceipt} 
        onClose={() => setSelectedReceipt(null)}
        onPrint={handlePrint}
      />

      {/* Admin Edit Modal */}
      {editingSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
           <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '450px', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Edit2 size={20} />
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>แก้ไขวิธีชำระเงิน</h3>
                 </div>
                 <button onClick={() => setEditingSale(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              {!isAdminVerified ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                   <div style={{ width: '60px', height: '60px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <Lock size={24} color="#64748b" />
                   </div>
                   <h4 style={{ margin: '0 0 8px', fontSize: '16px', color: '#1e293b' }}>ยืนยันสิทธิ์ผู้ดูแล</h4>
                   <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b' }}>กรุณาใส่รหัสผ่านแอดมินเพื่อดำเนินการ</p>
                   <input 
                     type="password" 
                     placeholder="รหัสผ่านผู้ดูแล..." 
                     className="input" 
                     value={adminPin}
                     onChange={(e) => {
                       const val = e.target.value;
                       setAdminPin(val);
                       const isAdmin = val === 'sis8888' || employees.some(emp => emp.role === 'admin' && emp.pin === val);
                       if (isAdmin) {
                         setIsAdminVerified(true);
                       }
                     }}
                     style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '8px' }}
                     autoFocus
                   />
                </div>
              ) : (
                <div style={{ padding: '24px' }}>
                   <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>กำลังแก้ไขบิล:</div>
                      <div style={{ fontWeight: '900', color: '#0f172a', fontSize: '16px' }}>{editingSale.billId || editingSale.id.slice(0,8).toUpperCase()}</div>
                      <div style={{ fontSize: '14px', color: '#0ea5e9', fontWeight: 'bold' }}>ยอดสุทธิ: ฿{(editingSale.grandTotal || 0).toLocaleString()}</div>
                   </div>

                   <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>เปลี่ยนวิธีชำระเป็น:</label>
                      <select 
                        className="input" 
                        value={editForm.newMethod} 
                        onChange={(e) => setEditForm({...editForm, newMethod: e.target.value})}
                      >
                        <option value="cash">💵 เงินสด (Cash)</option>
                        <option value="transfer">📱 โอนเงิน (Bank Transfer)</option>
                        <option value="credit">💳 เครดิตการ์ด (Credit Card)</option>
                        <option value="storeCredit">👛 วอลเล็ท (Store Credit)</option>
                      </select>
                   </div>

                   <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>ระบุเหตุผลการแก้ไข (บังคับ):</label>
                      <textarea 
                        className="input" 
                        rows="3" 
                        placeholder="เช่น พนักงานกดเงินผิด, ลูกค้าเปลี่ยนจากเงินสดเป็นโอน..."
                        value={editForm.reason}
                        onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                        style={{ height: 'auto', resize: 'none', padding: '12px' }}
                      />
                   </div>

                   <button 
                     className="btn" 
                     disabled={!editForm.reason || isProcessing}
                     onClick={handleEditSale}
                     style={{ width: '100%', background: '#0f172a', color: 'white', padding: '14px', borderRadius: '12px', fontSize: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}
                   >
                     {isProcessing ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขบิล'}
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

    </div>
  );
}

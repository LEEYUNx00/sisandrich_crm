import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { auth } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, query, where,
  orderBy, getDocs, onSnapshot, serverTimestamp, getDoc
} from 'firebase/firestore';
import {
  Clock, DollarSign, TrendingUp, TrendingDown, Lock, Unlock,
  Printer, Plus, Minus, AlertCircle, CheckCircle, FileText, RefreshCw, X, Users
} from 'lucide-react';

export default function ShiftManagement() {
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [shiftSales, setShiftSales] = useState([]);

  // Open Shift Form
  const [openCash, setOpenCash] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Cash In/Out
  const [showCashIn, setShowCashIn] = useState(false);
  const [showCashOut, setShowCashOut] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashRemark, setCashRemark] = useState('');

  // Close Shift Form
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [endingCashEmp, setEndingCashEmp] = useState('');
  const [closedSummary, setClosedSummary] = useState(null); // หน้าสรุปหลังปิดกะ

  // Transactions during shift
  const [cashMoves, setCashMoves] = useState([]);

  // Shift History
  const [shiftHistory, setShiftHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'history'
  const [selectedShiftId, setSelectedShiftId] = useState(null); // ID of history shift to view
  const [selectedShiftData, setSelectedShiftData] = useState(null); 
  const [detailedSales, setDetailedSales] = useState([]); // Sales for history shift
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [orphanSales, setOrphanSales] = useState([]); // Sales with no shiftId

  const currentUser = auth.currentUser;
  const currentEmail = currentUser?.email || 'Staff';
  const currentName = currentEmail.split('@')[0];

  // ───────────────────────────────────────────────
  // 1. Load Active Shift on Mount
  // ───────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'shifts'), where('status', '==', 'open'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const shift = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setActiveShift(shift);

        // Load cash movements
        const movesRef = collection(db, 'shifts', shift.id, 'cashMoves');
        const moveQ = query(movesRef, orderBy('createdAt', 'asc'));
        getDocs(moveQ).then(ms => setCashMoves(ms.docs.map(d => ({ id: d.id, ...d.data() }))));

        // Load sales for this shift
        const salesQ = query(
          collection(db, 'sales'),
          where('shiftId', '==', shift.id)
        );
        getDocs(salesQ).then(ss => setShiftSales(ss.docs.map(d => ({ id: d.id, ...d.data() }))));
      } else {
        setActiveShift(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Shift listener error:", error);
      alert("ไม่สามารถโหลดข้อมูลกะได้: " + error.message);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load shift history
  useEffect(() => {
    if (activeTab === 'history') {
      setLoading(true);
      // 🔥 ปรับใหม่: ดึงข้อมูลโดยไม่ใช้ orderBy เพื่อเลี่ยงปัญหาเรื่อง Index (Zero-Config)
      const q = query(collection(db, 'shifts'), where('status', '==', 'closed'));
      getDocs(q)
        .then(snap => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // เรียงลำดับเวลาปิดกะล่าสุดขึ้นก่อนด้วย JavaScript
          docs.sort((a, b) => {
            const dateA = a.closedAt?.toDate?.() || 0;
            const dateB = b.closedAt?.toDate?.() || 0;
            return dateB - dateA;
          });
          setShiftHistory(docs);
          setLoading(false);
        })
        .catch(err => {
          console.error("History fetch error:", err);
          alert("ไม่สามารถโหลดประวัติได้: " + err.message);
          setLoading(false);
        });
    }
  }, [activeTab]);

  // ───────────────────────────────────────────────
  // 1.5. Listen for Orphan Sales (No shiftId)
  // ───────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'sales'),
      where('shiftId', '==', null),
      where('status', '!=', 'voided')
    );
    const unsub = onSnapshot(q, (snap) => {
      const sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrphanSales(sales);
    });
    return () => unsub();
  }, []);

  const linkOrphanSalesToShift = async () => {
    if (!activeShift) return alert("กรุณาเปิดกะก่อนนำยอดเข้ากะ");
    if (orphanSales.length === 0) return;
    
    setProcessing(true);
    try {
      const promises = orphanSales.map(sale => {
        return updateDoc(doc(db, 'sales', sale.id), {
          shiftId: activeShift.id
        });
      });
      await Promise.all(promises);
      alert(`นำเข้ายอดจำนวน ${orphanSales.length} บิล เรียบร้อยแล้ว`);
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการนำเข้ายอด: " + e.message);
    }
    setProcessing(false);
  };

  // ───────────────────────────────────────────────
  // 2. Open Shift
  // ───────────────────────────────────────────────
  const handleOpenShift = async () => {
    if (!openCash || isNaN(Number(openCash))) return alert('กรุณากรอกยอดเงินทอนเริ่มต้น');
    setProcessing(true);
    try {
      const shiftNum = await getNextShiftNumber();
      const newShift = await addDoc(collection(db, 'shifts'), {
        shiftNumber: shiftNum,
        status: 'open',
        openedBy: currentName,
        openedByEmail: currentEmail,
        openedAt: serverTimestamp(),
        startingCash: Number(openCash),
        cashIn: 0,
        cashOut: 0,
        endingCashEmp: null,
        closedBy: null,
        closedAt: null,
      });
      setOpenCash('');
      setConfirming(false);
    } catch (e) {
      alert('เกิดข้อผิดพลาด: ' + e.message);
    }
    setProcessing(false);
  };

  const getNextShiftNumber = async () => {
    const now = new Date();
    // ตั้งต้นที่เวลา 00:00:00 ของวันนี้
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // ค้นหาเฉพาะกะที่เปิดในวันนี้
    const q = query(
      collection(db, 'shifts'), 
      where('openedAt', '>=', startOfDay),
      orderBy('openedAt', 'desc')
    );
    
    const snap = await getDocs(q);
    
    // สร้าง Prefix วันที่ (DDMMYY พุทธศักราช)
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear() + 543).slice(-2);
    const datePrefix = `${dd}${mm}${yy}`;
    
    // นับจำนวนกะของวันนี้ที่มีอยู่แล้ว
    const countToday = snap.size;
    return `${datePrefix}-${countToday + 1}`;
  };

  // ───────────────────────────────────────────────
  // 3. Cash In / Cash Out
  // ───────────────────────────────────────────────
  const handleCashMove = async (type) => {
    if (!cashAmount || isNaN(Number(cashAmount)) || Number(cashAmount) <= 0) return alert('กรุณากรอกจำนวนเงิน');
    setProcessing(true);
    try {
      const amt = Number(cashAmount);
      const field = type === 'in' ? 'cashIn' : 'cashOut';
      await updateDoc(doc(db, 'shifts', activeShift.id), {
        [field]: (activeShift[field] || 0) + amt,
      });
      await addDoc(collection(db, 'shifts', activeShift.id, 'cashMoves'), {
        type,
        amount: amt,
        remark: cashRemark || (type === 'in' ? 'นำเงินเข้า' : 'นำเงินออก'),
        by: currentName,
        createdAt: serverTimestamp(),
      });
      setCashAmount('');
      setCashRemark('');
      setShowCashIn(false);
      setShowCashOut(false);

      // Reload moves
      const movesRef = collection(db, 'shifts', activeShift.id, 'cashMoves');
      const moveQ = query(movesRef, orderBy('createdAt', 'asc'));
      getDocs(moveQ).then(ms => setCashMoves(ms.docs.map(d => ({ id: d.id, ...d.data() }))));
    } catch (e) {
      alert('เกิดข้อผิดพลาด: ' + e.message);
    }
    setProcessing(false);
  };

  // ───────────────────────────────────────────────
  // 4. Close Shift
  // ───────────────────────────────────────────────
  const handleCloseShift = async () => {
    if (endingCashEmp === '' || isNaN(Number(endingCashEmp))) return alert('กรุณากรอกยอดเงินสดที่นับได้จริง');
    setProcessing(true);
    try {
      const summary = calcSummary();
      await updateDoc(doc(db, 'shifts', activeShift.id), {
        status: 'closed',
        closedBy: currentName,
        closedByEmail: currentEmail,
        closedAt: serverTimestamp(),
        endingCashEmp: Number(endingCashEmp),
        endingCashSystem: summary.endingCashSystem,
        cashDiff: summary.cashDiff,
        overshoot: summary.overshoot,
        totalSales: summary.netSales,
        totalBills: summary.completedBills,
        voidedBills: summary.voidedBills,
        grossSales: summary.grossSales,
        discount: summary.discount,
        netSales: summary.netSales,
        paymentSummary: summary.payments,
        // New stats
        topItem: summary.topItem,
        totalItemsSold: summary.totalItemsSold,
        avgPricePerItem: summary.avgPricePerItem,
        totalInvestment: summary.totalInvestment,
        netCashSales: summary.netCashSales,
        transferSales: summary.transferSales,
      });

      // เก็บข้อมูลสรุปไว้โชว์ก่อนปิดหน้าจอ
      setClosedSummary(summary);
      setShowCloseForm(false);
      setEndingCashEmp('');

      // ส่งไป Print ด้วย
      await printShiftReport(summary);
    } catch (e) {
      alert('เกิดข้อผิดพลาด: ' + e.message);
    }
    setProcessing(false);
  };

  // ───────────────────────────────────────────────
  // 4.5. View History Details
  // ───────────────────────────────────────────────
  const handleViewShiftDetails = async (shift) => {
    setSelectedShiftId(shift.id);
    setSelectedShiftData(shift);
    setFetchingDetails(true);
    try {
      const q = query(collection(db, 'sales'), where('shiftId', '==', shift.id));
      const snap = await getDocs(q);
      const sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort sales by time
      sales.sort((a,b) => (a.timestamp?.toDate?.() || 0) - (b.timestamp?.toDate?.() || 0));
      setDetailedSales(sales);
    } catch (e) {
      alert("ไม่สามารถโหลดรายละเอียดการขายได้: " + e.message);
    }
    setFetchingDetails(false);
  };

  // ───────────────────────────────────────────────
  // 5. Calculate Summary
  // ───────────────────────────────────────────────
  const calcSummary = () => {
    const completedSales = shiftSales.filter(s => s.status !== 'voided');
    const voidedSales = shiftSales.filter(s => s.status === 'voided');

    const grossSales = completedSales.reduce((acc, s) => acc + (s.subTotal || s.grandTotal || 0), 0);
    const discount = completedSales.reduce((acc, s) => acc + (s.discountAmount || 0), 0);
    const netSales = completedSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);

    // Payment breakdown
    const payments = {};
    completedSales.forEach(s => {
      (s.payments || [{ method: s.paymentMethod || 'cash', amount: s.grandTotal }]).forEach(p => {
        const method = (p.method || 'cash').toLowerCase();
        payments[method] = (payments[method] || 0) + (p.amount || 0);
      });
    });

    const cashSales = payments['cash'] || payments['เงินสด'] || 0;
    const transferSales = payments['transfer'] || payments['โอนเงิน'] || 0;
    const startingCash = activeShift?.startingCash || 0;
    const cashIn = activeShift?.cashIn || 0;
    const cashOut = activeShift?.cashOut || 0;
    
    // 🔥 Advanced Item Analysis
    const itemStats = {};
    completedSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const key = item.id || item.name;
        if (!itemStats[key]) {
          itemStats[key] = { name: item.name, qty: 0, total: 0 };
        }
        itemStats[key].qty += (item.qty || 0);
        itemStats[key].total += (item.price * item.qty || 0);
      });
    });

    const sortedItems = Object.values(itemStats).sort((a, b) => b.qty - a.qty);
    const topItem = sortedItems[0] || null;
    const totalItemsSold = sortedItems.reduce((acc, i) => acc + i.qty, 0);
    const avgPricePerItem = totalItemsSold > 0 ? netSales / totalItemsSold : 0;

    // ยอดเงินทุนรวม (ต้องคืนคนเติม)
    const totalInvestment = startingCash + cashIn;
    // ยอดเงินสดสุทธิที่เกิดจากการขาย (หักค่าใช้จ่ายออกไปแล้ว)
    const netCashSales = cashSales - cashOut;

    const endingCashSystem = totalInvestment + netCashSales;
    const endingEmp = Number(endingCashEmp) || 0;
    const cashDiff = endingEmp - endingCashSystem;

    return {
      completedBills: completedSales.length,
      voidedBills: voidedSales.length,
      grossSales,
      discount,
      netSales,
      payments,
      cashSales,
      transferSales,
      startingCash,
      cashIn,
      cashOut,
      totalInvestment,
      netCashSales,
      endingCashSystem,
      cashDiff,
      overshoot: cashDiff,
      topItem,
      totalItemsSold,
      avgPricePerItem,
    };
  };

  // ───────────────────────────────────────────────
  // 6. Print Shift Report (Native ESC/POS text)
  // ───────────────────────────────────────────────
  const printShiftReport = async (summary) => {
    try {
      const docRef = doc(db, 'settings', 'receipt');
      const snap = await getDoc(docRef);
      const ps = snap.exists() ? snap.data() : { shopName: 'Sis&Rich' };

      const bold = "\x1B\x45\x01";
      const resetBold = "\x1B\x45\x00";
      const center = "\x1B\x61\x01";
      const left = "\x1B\x61\x00";
      const dHeight = "\x1B\x21\x10";
      const normal = "\x1B\x21\x00";
      const sep = "================================\n";
      const dashedSep = "--------------------------------\n";

      const fmtCash = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
      const padLine = (label, value, width = 32) => {
        const lbl = label.padEnd(width - String(value).length);
        return `${lbl}${value}\n`;
      };

      const now = new Date();
      const openedAt = activeShift?.openedAt?.toDate?.() || new Date();

      let text = center + dHeight + bold + ps.shopName + "\n" + normal + resetBold;
      text += center + "Report: Shift Summary\n";
      text += `Store: ${ps.shopName}\n`;
      text += `Date: ${now.toLocaleDateString('th-TH')}\n`;
      text += `Shift: #${activeShift?.shiftNumber || 1}\n`;
      text += `Shift Period: ${openedAt.toLocaleString('th-TH')}\n         - ${now.toLocaleString('th-TH')}\n`;
      text += `Shift Status: Close\n`;
      text += sep;
      text += left;
      text += padLine("Opened By", activeShift?.openedBy || '-');
      text += padLine("Open Time", openedAt.toLocaleString('th-TH'));
      text += padLine("Closed By", currentName);
      text += padLine("Close Time", now.toLocaleString('th-TH'));
      text += dashedSep;
      text += padLine("Starting Cash", fmtCash(summary.startingCash));
      text += padLine("Cash-In (Refill)", fmtCash(summary.cashIn));
      text += padLine("Cash-Out (Expenses)", fmtCash(summary.cashOut));
      text += dashedSep;
      text += bold + padLine("TOTAL INVESTMENT", fmtCash(summary.totalInvestment)) + resetBold;
      text += padLine("TOTAL CASH SALES", fmtCash(summary.cashSales));
      text += dashedSep;
      // Payment methods
      const methods = [
        ['Cash', 'cash'], ['Transfer', 'transfer'], ['Credit', 'credit'],
        ['Debit', 'debit'], ['Gift/Voucher', 'voucher'], ['Online/MBanking', 'online'],
        ['Other', 'other']
      ];
      methods.forEach(([label, key]) => {
        text += padLine(label, fmtCash(summary.payments?.[key] || 0));
      });
      text += dashedSep;
      text += padLine("Ending Cash (Emp)", fmtCash(Number(endingCashEmp)));
      text += padLine("Ending Cash (Sys)", fmtCash(summary.endingCashSystem));
      text += bold + padLine("Overshoot/Short", fmtCash(summary.overshoot)) + resetBold;
      text += padLine("Cash Diff (Start-End)", fmtCash(summary.endingCashSystem - summary.startingCash));
      text += sep;
      text += center + "Bill/Order Summary\n" + left;
      text += padLine("Complete", summary.completedBills);
      text += padLine("Void", summary.voidedBills);
      text += sep;
      text += center + "Sales Summary\n" + left;
      text += padLine("Item/Pkg", fmtCash(summary.grossSales));
      text += padLine("Gross Sales", fmtCash(summary.grossSales));
      text += padLine("D/C (Promo/Order)", fmtCash(summary.discount));
      text += bold + padLine("Net Sales", fmtCash(summary.netSales)) + resetBold;
      text += padLine("Total Sales", fmtCash(summary.netSales));
      text += sep;
      text += center + `Print Time: ${now.toLocaleString('th-TH')}\nEnd of Report\n`;

      await fetch('http://127.0.0.1:8000/print-receipt-text', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, printerName: 'XP-80C' })
      });
    } catch (err) {
      console.warn('Shift report print failed:', err);
    }
  };

  // ───────────────────────────────────────────────
  // 7. UI Render
  // ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div className="spinner"></div>
    </div>
  );

  const summary = activeShift ? calcSummary() : null;

  return (
    <div className="animate-slide-in" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* ── หน้าสรุปหลังปิดกะ (Closed Summary View) ── */}
      {closedSummary && (
        <div className="card animate-scale-up" style={{ maxWidth: '600px', margin: '0 auto', padding: '40px', border: '2px solid #38A169', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', background: '#C6F6D5', color: '#38A169', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={32} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>ปิดกะสำเร็จ!</h2>
            <p style={{ color: '#718096' }}>รายงานถูกบันทึกและส่งข้อมูลไปที่เครื่องพิมพ์แล้ว</p>
          </div>

          <div style={{ background: '#F7FAFC', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#4A5568' }}>ยอดขายสุทธิ</span>
              <b style={{ color: '#38A169', fontSize: '18px' }}>฿{closedSummary.netSales.toLocaleString()}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#4A5568' }}>เงินที่ควรมีในลิ้นชัก (ระบบ)</span>
              <b>฿{closedSummary.endingCashSystem.toLocaleString()}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0' }}>
              <span style={{ color: '#4A5568' }}>เงินที่พนักงานนับได้จริง</span>
              <b>฿{Number(closedSummary.endingCashEmp || 0).toLocaleString()}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontWeight: 'bold' }}>เงินขาด / เกิน</span>
              <b style={{ color: closedSummary.overshoot >= 0 ? '#38A169' : '#E53E3E', fontSize: '20px' }}>
                {closedSummary.overshoot >= 0 ? '+' : ''}฿{closedSummary.overshoot.toLocaleString()}
              </b>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
             <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => printShiftReport(closedSummary)}>
                <Printer size={18} /> พิมพ์รายงานอีกครั้ง
             </button>
             <button className="btn" style={{ flex: 1, background: '#1A202C', color: 'white' }} onClick={() => setClosedSummary(null)}>
                ตกลง / กลับหน้าหลัก
             </button>
          </div>
        </div>
      )}

      {/* Tab navigation - Only show if not in summary mode */}
      {!closedSummary && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              className={`btn ${activeTab === 'current' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('current')}
              style={{ padding: '10px 24px' }}
            >
              <Clock size={16} /> กะปัจจุบัน
            </button>
            <button
              className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('history')}
              style={{ padding: '10px 24px' }}
            >
              <FileText size={16} /> ประวัติกะ
            </button>
          </div>

          {/* 🚨 Orphan Sales Alert Notice */}
          {orphanSales.length > 0 && (
            <div className="card animate-pulse" style={{ 
              background: '#FFFBEB', 
              border: '1px solid #F6E05E', 
              marginBottom: '20px', 
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#F6E05E', color: '#856404', padding: '8px', borderRadius: '50%' }}>
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 'bold', color: '#856404', margin: 0 }}>พบยอดขายนอกกะ! (Orphan Sales)</h4>
                  <p style={{ fontSize: '13px', color: '#744210', margin: '2px 0 0 0' }}>
                    มีรายการขายจำนวน <b>{orphanSales.length} บิล</b> (รวม ฿{orphanSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0).toLocaleString()}) ที่เกิดขึ้นหลังปิดกะรอบที่แล้ว
                  </p>
                </div>
              </div>
              
              {activeShift ? (
                <button 
                  className="btn" 
                  style={{ background: '#856404', color: 'white', fontSize: '13px' }}
                  onClick={linkOrphanSalesToShift}
                  disabled={processing}
                >
                  <RefreshCw size={14} className={processing ? 'animate-spin' : ''} /> นำเข้ากะปัจจุบัน
                </button>
              ) : (
                <span style={{ fontSize: '11px', color: '#975A16', background: '#FEFCBF', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  * กรุณาเปิดกะก่อนกดนำเข้ายอด
                </span>
              )}
            </div>
          )}

          {/* ── Tab: Current Shift ─────────────── */}
          {activeTab === 'current' && (
            <>
              {/* ── NO ACTIVE SHIFT ── */}
              {!activeShift ? (
                <div className="card" style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center', padding: '48px 32px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#FFF5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px dashed #FEB2B2' }}>
                    <Unlock size={36} color="#E53E3E" />
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#2D3748', marginBottom: '8px' }}>ยังไม่ได้เปิดกะ</h2>
                  <p style={{ color: '#718096', marginBottom: '28px' }}>กรุณาเปิดกะและกรอกยอดเงินทอนเริ่มต้นก่อนเริ่มขายครับ</p>
                  {!confirming ? (
                    <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '16px' }} onClick={() => setConfirming(true)}>
                      <Unlock size={20} /> เปิดกะใหม่ (Open Shift)
                    </button>
                  ) : (
                    <div style={{ textAlign: 'left' }}>
                      <div className="input-group">
                        <label style={{ fontWeight: 'bold' }}>💵 เงินทอนเริ่มต้น (Starting Cash) — บาท</label>
                        <input
                          type="number"
                          className="input"
                          placeholder="เช่น 2000"
                          value={openCash}
                          onChange={e => setOpenCash(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <p style={{ fontSize: '12px', color: '#718096', marginBottom: '16px' }}>* ยอดนี้คือเงินที่ใส่ไว้ในลิ้นชักเพื่อทอนลูกค้า</p>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirming(false)}>ยกเลิก</button>
                        <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleOpenShift} disabled={processing}>
                          {processing ? 'กำลังเปิดกะ...' : '✅ ยืนยันเปิดกะ'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── ACTIVE SHIFT DASHBOARD ── */
                <div>
                  {/* Shift Header Info */}
                  {/* 🟢 Premium Active Shift Card */}
                  <div className="card" style={{ 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
                    border: '1px solid #E2E8F0',
                    borderLeft: '5px solid var(--primary-red)',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
                    padding: '28px',
                    marginBottom: '24px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#48BB78', display: 'inline-block' }}></span>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#48BB78', textTransform: 'uppercase', letterSpacing: '1px' }}>กะที่กำลังดำเนินอยู่</span>
                        </div>
                        <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#2D3748', margin: '0 0 6px 0' }}>Shift #{activeShift.shiftNumber}</h2>
                        <div style={{ fontSize: '15px', color: '#718096', fontWeight: '500' }}>
                          เปิดโดย: <span style={{ color: '#2D3748', fontWeight: 'bold' }}>{activeShift.openedBy}</span> · 
                          เวลา: <span style={{ color: '#2D3748', fontWeight: 'bold' }}>{activeShift.openedAt?.toDate?.().toLocaleString('th-TH') || '-'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          className="btn"
                          style={{ background: '#38A169', color: 'white', padding: '10px 20px' }}
                          onClick={() => { setShowCashIn(true); setShowCashOut(false); }}
                        >
                          <TrendingUp size={16} /> Cash In
                        </button>
                        <button
                          className="btn"
                          style={{ background: '#E53E3E', color: 'white', padding: '10px 20px' }}
                          onClick={() => { setShowCashOut(true); setShowCashIn(false); }}
                        >
                          <TrendingDown size={16} /> Cash Out
                        </button>
                        <button
                          className="btn"
                          style={{ background: '#D91A1A', color: 'white', padding: '10px 20px', fontWeight: 'bold' }}
                          onClick={() => setShowCloseForm(true)}
                        >
                          <Lock size={16} /> ปิดกะ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cash In/Out Modal Inline */}
                  {(showCashIn || showCashOut) && (
                    <div className="card" style={{ marginBottom: '20px', border: `2px solid ${showCashIn ? '#38A169' : '#E53E3E'}`, background: showCashIn ? '#F0FFF4' : '#FFF5F5' }}>
                      <h3 style={{ fontWeight: 'bold', color: showCashIn ? '#276749' : '#C53030', marginBottom: '16px' }}>
                        {showCashIn ? '💵 นำเงินเข้า (Cash-In)' : '💸 นำเงินออก (Cash-Out)'}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label>จำนวนเงิน (บาท)</label>
                          <input type="number" className="input" placeholder="0.00" value={cashAmount} onChange={e => setCashAmount(e.target.value)} autoFocus />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label>หมายเหตุ / รายละเอียด</label>
                          <input type="text" className="input" placeholder={showCashOut ? "เช่น ค่าส่งของ, ซื้อน้ำ" : "เช่น Refill เงินทอน"} value={cashRemark} onChange={e => setCashRemark(e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-outline" onClick={() => { setShowCashIn(false); setShowCashOut(false); setCashAmount(''); setCashRemark(''); }}>ยกเลิก</button>
                        <button
                          className="btn"
                          style={{ background: showCashIn ? '#38A169' : '#E53E3E', color: 'white' }}
                          onClick={() => handleCashMove(showCashIn ? 'in' : 'out')}
                          disabled={processing}
                        >
                          {processing ? 'กำลังบันทึก...' : 'ยืนยัน'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Summary Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                    <StatCard label="ยอดขายสุทธิ" value={`฿${summary.netSales.toLocaleString()}`} color="#38A169" icon={<TrendingUp size={20} />} />
                    <StatCard label="จำนวนบิล" value={`${summary.completedBills} บิล`} color="#3182CE" icon={<CheckCircle size={20} />} />
                    <StatCard label="ยกเลิกบิล" value={`${summary.voidedBills} บิล`} color="#E53E3E" icon={<AlertCircle size={20} />} />
                    <StatCard label="เงินสดในระบบ" value={`฿${summary.endingCashSystem.toLocaleString()}`} color="#D69E2E" icon={<DollarSign size={20} />} />
                  </div>

                  {/* Two Column: Payment Methods + Cash Moves */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

                    {/* Payment Breakdown */}
                    <div className="card">
                      <h3 style={{ fontWeight: 'bold', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={18} color="#D91A1A" /> ช่องทางการชำระเงิน
                      </h3>
                      {[
                        { key: 'cash', label: 'เงินสด (Cash)' },
                        { key: 'transfer', label: 'โอนเงิน (Transfer)' },
                        { key: 'credit', label: 'บัตรเครดิต (Credit)' },
                        { key: 'debit', label: 'บัตรเดบิต (Debit)' },
                        { key: 'voucher', label: 'บัตรกำนัล / Gift' },
                        { key: 'online', label: 'ออนไลน์ / MBanking' },
                        { key: 'other', label: 'อื่นๆ (Other)' },
                      ].map(({ key, label }) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #EDF2F7', fontSize: '13px' }}>
                          <span style={{ color: '#4A5568' }}>{label}</span>
                          <span style={{ fontWeight: summary.payments?.[key] > 0 ? 'bold' : 'normal', color: summary.payments?.[key] > 0 ? '#2D3748' : '#CBD5E0' }}>
                            {(summary.payments?.[key] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Cash Reconciliation */}
                    <div className="card">
                      <h3 style={{ fontWeight: 'bold', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={18} color="#D91A1A" /> สรุปเงินสด
                      </h3>
                      {[
                        { label: 'เงินเริ่มต้นกะ', value: summary.startingCash, color: '#2D3748' },
                        { label: 'เงินเข้า (Cash-In)', value: summary.cashIn, color: '#38A169' },
                        { label: 'ยอดขายเงินสด', value: summary.cashSales, color: '#3182CE' },
                        { label: 'เงินออก (Cash-Out)', value: -summary.cashOut, color: '#E53E3E' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #EDF2F7', fontSize: '13px' }}>
                          <span style={{ color: '#4A5568' }}>{label}</span>
                          <span style={{ fontWeight: 'bold', color }}>{value >= 0 ? '+' : ''}{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontSize: '15px', fontWeight: 'bold', borderTop: '2px solid #2D3748', marginTop: '4px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>เงินสดที่ควรมีในลิ้นชัก</span>
                          <span style={{ fontSize: '11px', color: '#718096', fontWeight: 'normal' }}>(ทุน {summary.totalInvestment.toLocaleString()} + ขาย {summary.netCashSales.toLocaleString()})</span>
                        </div>
                        <span style={{ color: '#D69E2E' }}>฿{summary.endingCashSystem.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cash Move Log */}
                  {cashMoves.length > 0 && (
                    <div className="card" style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontWeight: 'bold', marginBottom: '14px' }}>📋 รายการเคลื่อนไหวเงินสด</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: '#F7FAFC' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>ประเภท</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>จำนวนเงิน</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>หมายเหตุ</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>โดย</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cashMoves.map(m => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{ background: m.type === 'in' ? '#C6F6D5' : '#FED7D7', color: m.type === 'in' ? '#276749' : '#C53030', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                  {m.type === 'in' ? '⬆ เงินเข้า' : '⬇ เงินออก'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>฿{m.amount?.toLocaleString()}</td>
                              <td style={{ padding: '8px 12px', color: '#4A5568' }}>{m.remark || '-'}</td>
                              <td style={{ padding: '8px 12px', color: '#718096' }}>{m.by}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Close Shift Form */}
                  {showCloseForm && (
                    <div className="card" style={{ border: '2px solid #D91A1A', background: '#FFF5F5' }}>
                      <h3 style={{ fontWeight: 'bold', color: '#C53030', marginBottom: '16px', fontSize: '18px' }}>🔒 ปิดกะ (Close Shift)</h3>
                      <div style={{ background: 'white', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#4A5568' }}>
                          <span>เงินสดที่ควรมีในระบบ</span>
                          <b style={{ color: '#D69E2E' }}>฿{summary.endingCashSystem.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontWeight: 'bold', color: '#2D3748' }}>💵 ยอดเงินสดที่นับได้จริง (Ending Cash - Emp)</label>
                          <input
                            type="number"
                            className="input"
                            placeholder="นับเงินในลิ้นชักแล้วกรอกตรงนี้"
                            value={endingCashEmp}
                            onChange={e => setEndingCashEmp(e.target.value)}
                            autoFocus
                            style={{ fontSize: '18px', fontWeight: 'bold' }}
                          />
                        </div>
                        {endingCashEmp !== '' && !isNaN(Number(endingCashEmp)) && (
                          <div style={{
                            marginTop: '12px', padding: '12px', borderRadius: '8px', textAlign: 'center',
                            background: Number(endingCashEmp) - summary.endingCashSystem >= 0 ? '#F0FFF4' : '#FFF5F5',
                            border: `1px solid ${Number(endingCashEmp) - summary.endingCashSystem >= 0 ? '#C6F6D5' : '#FED7D7'}`
                          }}>
                            <div style={{ fontSize: '12px', color: '#718096' }}>เงินขาด/เกิน (Overshoot/Short)</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: Number(endingCashEmp) - summary.endingCashSystem >= 0 ? '#38A169' : '#E53E3E' }}>
                              {Number(endingCashEmp) - summary.endingCashSystem >= 0 ? '+' : ''}
                              ฿{(Number(endingCashEmp) - summary.endingCashSystem).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowCloseForm(false); setEndingCashEmp(''); }}>ยกเลิก</button>
                        <button
                          className="btn"
                          style={{ flex: 2, background: '#D91A1A', color: 'white', fontWeight: 'bold' }}
                          onClick={handleCloseShift}
                          disabled={processing}
                        >
                          {processing ? '⏳ กำลังปิดกะ...' : '🔒 ยืนยันปิดกะ + พิมพ์รายงาน'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

      {/* ── Tab: Shift History ─────────────── */}
      {activeTab === 'history' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '20px' }}>📋 ประวัติกะและการวิเคราะห์ยอดขาย</h3>
            <div style={{ fontSize: '13px', color: '#718096' }}>แสดง {shiftHistory.length} กะล่าสุด</div>
          </div>

          {shiftHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed #E2E8F0', borderRadius: '16px' }}>
              <p style={{ color: '#A0AEC0', fontSize: '16px' }}>ยังไม่มีประวัติกะที่ปิดแล้วในระบบ</p>
              <p style={{ color: '#CBD5E0', fontSize: '12px', marginTop: '8px' }}>* หากมีการปิดกะแล้วแต่ไม่ขึ้น อาจเป็นเพราะกำลังรอสร้าง Database Index ในหน้า Console</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '950px' }}>
                <thead>
                  <tr style={{ background: '#F7FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>กะที่ / เวลา</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>พนักงาน (เปิด/ปิด)</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>สรุปเงินสด</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>ยอดขายสุทธิ</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>สถิติขายสินค้า</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>ขาด/เกิน</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftHistory.map(shift => (
                    <tr key={shift.id} style={{ borderBottom: '1px solid #EDF2F7', verticalAlign: 'top' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold', color: '#3182CE', fontSize: '15px' }}>#{shift.shiftNumber}</div>
                        <div style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>
                          เปิด: {shift.openedAt?.toDate?.().toLocaleString('th-TH')}<br />
                          ปิด: {shift.closedAt?.toDate?.().toLocaleString('th-TH')}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold' }}>{shift.openedBy}</div>
                        <div style={{ fontSize: '11px', color: '#A0AEC0' }}>→ {shift.closedBy || '-'}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ fontSize: '12px' }}>ทุน: ฿{(shift.totalInvestment || 0).toLocaleString()}</div>
                        <div style={{ fontSize: '12px', color: '#38A169' }}>สด: ฿{(shift.netCashSales || 0).toLocaleString()}</div>
                        <div style={{ fontSize: '12px', color: '#805AD5' }}>โอน: ฿{(shift.transferSales || 0).toLocaleString()}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#2D3748' }}>฿{(shift.netSales || 0).toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: '#718096' }}>({shift.totalBills || 0} บิล / {shift.totalItemsSold || 0} ชิ้น)</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {shift.topItem ? (
                          <div style={{ background: '#FFFBEB', padding: '6px', borderRadius: '8px', border: '1px solid #FEF3C7', display: 'inline-block', minWidth: '120px' }}>
                            <div style={{ fontSize: '10px', color: '#D69E2E', fontWeight: 'bold' }}>แชมป์ขายดี 🏆</div>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{shift.topItem.name}</div>
                            <div style={{ fontSize: '10px', color: '#718096' }}>{shift.topItem.qty} ชิ้น | เฉลี่ย ฿{Math.round(shift.avgPricePerItem || 0)}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ 
                          fontWeight: 'bold', fontSize: '15px', 
                          color: (shift.overshoot || 0) >= 0 ? '#38A169' : '#E53E3E' 
                        }}>
                          {(shift.overshoot || 0) >= 0 ? '+' : ''}{(shift.overshoot || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#CBD5E0' }}>นับจริง: ฿{(shift.endingCashEmp || 0).toLocaleString()}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => handleViewShiftDetails(shift)}>
                          🔍 ดูละเอียด
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Shift Detailed Report Modal ─────────────── */}
      {selectedShiftId && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content animate-scale-up" style={{ width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '20px' }}>
            
            {/* Modal Header */}
            <div style={{ background: '#1A202C', color: 'white', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>รายงานสรุปกะละเอียด # {selectedShiftData?.shiftNumber}</h2>
                <p style={{ opacity: 0.7, fontSize: '14px' }}>ช่วงเวลา: {selectedShiftData?.openedAt?.toDate?.().toLocaleString('th-TH')} - {selectedShiftData?.closedAt?.toDate?.().toLocaleString('th-TH')}</p>
              </div>
              <button onClick={() => setSelectedShiftId(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}>
                <X size={24} />
              </button>
            </div>

            {fetchingDetails ? (
              <div style={{ padding: '100px', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
                <p style={{ marginTop: '20px', color: '#718096' }}>กำลังวิเคราะห์ข้อมูลการขายขอบคุณ...</p>
              </div>
            ) : (
              <div style={{ padding: '32px' }}>
                
                {/* 1. Marketing Analytics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                  
                  {/* Revenue Source */}
                  <div className="card" style={{ borderTop: '4px solid #3182CE' }}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '16px', color: '#2D3748' }}>💰 วิเคราะห์รายได้</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <FlexRow label="ยอดขายรวม (Net)" value={`฿${selectedShiftData?.netSales?.toLocaleString()}`} bold />
                      <FlexRow label="จำนวนบิลทั้งหมด" value={`${selectedShiftData?.totalBills} บิล`} />
                      <FlexRow label="เฉลี่ยต่อบิล" value={`฿${Math.round(selectedShiftData?.netSales / selectedShiftData?.totalBills || 0).toLocaleString()}`} />
                      <FlexRow label="ส่วนลดรวม" value={`฿${selectedShiftData?.discount?.toLocaleString()}`} color="#E53E3E" />
                    </div>
                  </div>

                  {/* Customer Segment */}
                  <div className="card" style={{ borderTop: '4px solid #805AD5' }}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '16px', color: '#2D3748' }}>👥 วิเคราะห์กลุ่มลูกค้า</h4>
                    {(() => {
                      const members = detailedSales.filter(s => s.customer?.id && s.customer.id !== 'walk-in').length;
                      const walkins = detailedSales.length - members;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <FlexRow label="ลูกค้าสมาชิก" value={`${members} ราย`} color="#805AD5" bold />
                          <FlexRow label="ลูกค้า Walk-in" value={`${walkins} ราย`} />
                          <div style={{ marginTop: '8px', height: '8px', background: '#EDF2F7', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                            <div style={{ width: `${(members/detailedSales.length)*100}%`, background: '#805AD5' }}></div>
                            <div style={{ width: `${(walkins/detailedSales.length)*100}%`, background: '#CBD5E0' }}></div>
                          </div>
                          <p style={{ fontSize: '11px', color: '#718096', textAlign: 'center', marginTop: '4px' }}>
                            สมาชิกคิดเป็น {Math.round((members/detailedSales.length)*100 || 0)}% ของยอดขาย
                          </p>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Trends */}
                  <div className="card" style={{ borderTop: '4px solid #D69E2E' }}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '16px', color: '#2D3748' }}>📈 แนวโน้มการขาย (Trends)</h4>
                    {(() => {
                      const hourly = {};
                      detailedSales.forEach(s => {
                        const h = s.timestamp?.toDate?.().getHours();
                        if (h !== undefined) hourly[h] = (hourly[h] || 0) + 1;
                      });
                      const peakHour = Object.entries(hourly).sort((a,b) => b[1] - a[1])[0];
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <FlexRow label="จำนวนสินค้าที่ขายได้" value={`${selectedShiftData?.totalItemsSold || 0} ชิ้น`} />
                          <FlexRow label="ราคาเฉลี่ยสินค้า" value={`฿${Math.round(selectedShiftData?.avgPricePerItem || 0)}`} />
                          <FlexRow label="ช่วงเวลา Peak" value={peakHour ? `${peakHour[0]}:00 - ${Number(peakHour[0])+1}:00` : '-'} color="#D69E2E" bold />
                          <p style={{ fontSize: '11px', color: '#718096' }}>* ช่วงเวลานี้มีลูกค้าเข้าร้านหนาแน่นที่สุด</p>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* 3. Advanced Business Insights (New Premium Section) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', marginBottom: '32px' }}>
                  
                  {/* Category Insights */}
                  <div className="card" style={{ borderLeft: '4px solid #48BB78' }}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '16px' }}>📂 รายได้แยกตามหมวดหมู่ (Category Insights)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(() => {
                        const catSales = {};
                        detailedSales.forEach(s => {
                          (s.items || []).forEach(it => {
                            // Find category from products state if available, or fallback
                            const category = it.category || 'อื่นๆ';
                            if (!catSales[category]) catSales[category] = 0;
                            catSales[category] += (it.price * it.qty);
                          });
                        });
                        return Object.entries(catSales).sort((a,b) => b[1] - a[1]).map(([cat, total]) => (
                          <div key={cat}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                <span>{cat}</span>
                                <span style={{ fontWeight: 'bold' }}>฿{total.toLocaleString()}</span>
                             </div>
                             <div style={{ height: '6px', background: '#F0FFF4', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(total/selectedShiftData?.netSales)*100}%`, background: '#48BB78', height: '100%' }}></div>
                             </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>

                  {/* Basket & Payment Distribution */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    
                    {/* Basket Analysis */}
                    <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                       <div style={{ fontSize: '12px', color: '#718096', marginBottom: '8px' }}>🛒 Basket Analysis</div>
                       <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2D3748' }}>
                          {(selectedShiftData?.totalItemsSold / selectedShiftData?.totalBills || 0).toFixed(1)}
                       </div>
                       <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#4A5568' }}>สินค้า / บิล</div>
                       <p style={{ fontSize: '10px', color: '#A0AEC0', marginTop: '10px' }}>* ปริมาณเฉลี่ยที่ลูกค้าซื้อต่อครั้ง</p>
                    </div>

                    {/* Payment Distribution */}
                    <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                       <div style={{ fontSize: '12px', color: '#718096', marginBottom: '8px' }}>💳 ช่องทางชำระเงิน</div>
                       {(() => {
                          const cashP = (selectedShiftData?.netCashSales / selectedShiftData?.netSales) * 100 || 0;
                          const transferP = (selectedShiftData?.transferSales / selectedShiftData?.netSales) * 100 || 0;
                          return (
                            <>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38A169' }}>สด {Math.round(cashP)}%</div>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#805AD5' }}>โอน {Math.round(transferP)}%</div>
                              <div style={{ fontSize: '10px', color: '#A0AEC0', marginTop: '10px' }}>* สัดส่วนยอดเงินที่ได้รับ</div>
                            </>
                          )
                       })()}
                    </div>

                  </div>
                </div>

                {/* 4. Top Customers (CRM Insight) */}
                <div className="card" style={{ marginBottom: '32px', background: 'linear-gradient(to right, #FFF5F7, #FFF)' }}>
                   <h4 style={{ fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={18} color="#D53F8C" /> ลูกค้าที่มียอดซื้อสูงสุด (Top Spenders)
                   </h4>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                      {(() => {
                         const topCustomers = {};
                         detailedSales.forEach(s => {
                            const cid = s.customer?.id || 'walk-in';
                            const cname = s.customer?.name || 'Walk-in Customer';
                            if (!topCustomers[cid]) topCustomers[cid] = { name: cname, total: 0, bills: 0 };
                            topCustomers[cid].total += s.grandTotal;
                            topCustomers[cid].bills += 1;
                         });
                         return Object.values(topCustomers).sort((a,b) => b.total - a.total).slice(0, 4).map((c, i) => (
                           <div key={c.name + i} style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #FED7D7' }}>
                              <div style={{ fontSize: '10px', color: '#D53F8C', fontWeight: 'bold' }}>RANK #{i+1}</div>
                              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2D3748' }}>฿{c.total.toLocaleString()}</div>
                              <div style={{ fontSize: '11px', color: '#718096' }}>{c.bills} บิลในกะนี้</div>
                           </div>
                         ))
                      })()}
                   </div>
                </div>

                {/* 2. Product Breakdown (Existing) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '32px' }}>
                  <div className="card">
                    <h4 style={{ fontWeight: 'bold', marginBottom: '16px' }}>📦 สรุปยอดขายรายสินค้า</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#718096', borderBottom: '1px solid #EDF2F7' }}>
                          <th style={{ paddingBottom: '10px' }}>ชื่อสินค้า</th>
                          <th style={{ paddingBottom: '10px', textAlign: 'center' }}>จำนวน</th>
                          <th style={{ paddingBottom: '10px', textAlign: 'right' }}>รวมยอด</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const items = {};
                          detailedSales.forEach(s => {
                            (s.items || []).forEach(it => {
                              const k = it.id || it.name;
                              if (!items[k]) items[k] = { name: it.name, qty: 0, total: 0 };
                              items[k].qty += it.qty;
                              items[k].total += (it.price * it.qty);
                            });
                          });
                          return Object.values(items).sort((a,b) => b.qty - a.qty).map(it => (
                            <tr key={it.name} style={{ borderBottom: '1px solid #F7FAFC' }}>
                              <td style={{ padding: '8px 0' }}>{it.name}</td>
                              <td style={{ padding: '8px 0', textAlign: 'center' }}>{it.qty}</td>
                              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>฿{it.total.toLocaleString()}</td>
                            </tr>
                          ))
                        })()}
                      </tbody>
                    </table>
                  </div>

                  <div className="card" style={{ background: '#F7FAFC', border: 'none' }}>
                     <h4 style={{ fontWeight: 'bold', marginBottom: '16px' }}>🧾 รายการบิล (Transactions)</h4>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {detailedSales.map(s => (
                          <div key={s.id} style={{ background: 'white', padding: '12px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{s.billId}</div>
                                <div style={{ fontSize: '11px', color: '#718096' }}>
                                   {s.timestamp?.toDate?.().toLocaleTimeString('th-TH')} · {s.customer?.name || 'Walk-in'}
                                </div>
                             </div>
                             <div style={{ fontWeight: 'bold', color: '#2D3748' }}>฿{s.grandTotal?.toLocaleString()}</div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #EDF2F7', paddingTop: '24px' }}>
                   <button className="btn btn-primary" onClick={() => setSelectedShiftId(null)}>ออกรายการสรุป</button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', background: `${color}15`, color, margin: '0 auto 10px' }}>
        {icon}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function FlexRow({ label, value, color = '#4A5568', bold = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
      <span style={{ color: '#718096' }}>{label}</span>
      <span style={{ fontWeight: bold ? 'bold' : 'normal', color }}>{value}</span>
    </div>
  );
}

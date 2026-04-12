
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function checkMismatch() {
  const shiftId = '120469-1';
  console.log("Checking shift:", shiftId);
  
  const q = query(collection(db, 'sales'), where('shiftId', '==', shiftId));
  const snap = await getDocs(q);
  
  let totalNet = 0;
  let totalPayments = 0;
  
  snap.forEach(doc => {
    const s = doc.data();
    if (s.status === 'voided') return;
    
    const grand = s.grandTotal || 0;
    const salePayments = s.payments || [{ method: s.paymentMethod || 'cash', amount: s.grandTotal || 0 }];
    const pSum = salePayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    
    totalNet += grand;
    totalPayments += pSum;
    
    if (Math.abs(pSum - grand) > 1) {
       console.log("MISMATCH FOUND IN BILL:", doc.id);
       console.log("GrandTotal:", grand);
       console.log("PaymentsSum:", pSum);
       console.log("Payments Array:", JSON.stringify(s.payments));
       console.log("PaymentMethod Field:", s.paymentMethod);
    }
  });
  
  console.log("FINAL SUMS:");
  console.log("Net Sales (from GrandTotals):", totalNet);
  console.log("Payment Total (from payments array):", totalPayments);
}

checkMismatch();

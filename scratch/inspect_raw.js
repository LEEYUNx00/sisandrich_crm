
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

async function inspect() {
  const shiftId = '110469-1'; // ID from screenshot
  const shiftRef = doc(db, 'shifts', shiftId);
  const snap = await getDoc(shiftRef);
  
  if (snap.exists()) {
    console.log("SHIFT DATA:", JSON.stringify(snap.data(), null, 2));
    
    const salesQ = query(collection(db, 'sales'), where('shiftId', '==', shiftId));
    const salesSnap = await getDocs(salesQ);
    const sales = salesSnap.docs.map(d => d.data());
    
    const totalGrand = sales.filter(s => s.status !== 'voided').reduce((acc, s) => acc + (s.grandTotal || 0), 0);
    const totalDiscount = sales.filter(s => s.status !== 'voided').reduce((acc, s) => acc + (s.discount || s.discountAmount || 0), 0);
    
    console.log("SALES COUNT:", sales.length);
    console.log("SUM GRAND TOTAL:", totalGrand);
    console.log("SUM DISCOUNT:", totalDiscount);
    
    const pms = sales.filter(s => s.status !== 'voided').reduce((acc, s) => {
       const ps = s.payments || [{method: s.paymentMethod, amount: s.grandTotal}];
       ps.forEach(p => {
          acc[p.method] = (acc[p.method] || 0) + p.amount;
       });
       return acc;
    }, {});
    console.log("RECALCULATED PAYMENTS:", pms);
  } else {
    console.log("SHIFT NOT FOUND");
  }
}

inspect();

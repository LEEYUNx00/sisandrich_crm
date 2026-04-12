
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, Timestamp, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA1BuDDAyPD1dZoB0PZnd04MeJ7McTZ3cc",
  authDomain: "sisandrichcrm.firebaseapp.com",
  projectId: "sisandrichcrm",
  storageBucket: "sisandrichcrm.firebasestorage.app",
  messagingSenderId: "174596544744",
  appId: "1:174596544744:web:1eb3466914f30894aa915d",
  measurementId: "G-58BBHSRVTY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixSales() {
  const receipts = ['RC260412-0951-419', 'RC260412-0948-494', 'RC260412-0948-524'];
  
  for (const rc of receipts) {
    console.log(`Searching for ${rc}...`);
    const q = query(collection(db, 'sales'), where('billId', '==', rc));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.log(`Not found: ${rc}`);
      continue;
    }
    
    const saleDoc = snap.docs[0];
    const saleData = saleDoc.data();
    const oldTimestamp = saleData.timestamp;
    
    // Create new timestamp: change 12 to 11
    let date;
    if (oldTimestamp.toDate) {
      date = oldTimestamp.toDate();
    } else {
      date = new Date(oldTimestamp.seconds * 1000);
    }
    date.setDate(11); 
    const newTimestamp = Timestamp.fromDate(date);
    
    console.log(`Updating ${rc} date to 2026-04-11...`);
    
    // Find shift for 11th
    // Based on the billId RC260411, it seems they use YYYYMMDD style in receipt
    // Let's assume there is a shift for 2026-04-11
    const shiftsQ = query(collection(db, 'shifts'), where('date', '==', '2026-04-11'));
    const shiftSnap = await getDocs(shiftsQ);
    let targetShiftId = null;
    
    if (!shiftSnap.empty) {
      targetShiftId = shiftSnap.docs[0].id;
      console.log(`Found shift for 11th: ${targetShiftId}`);
    } else {
      console.log('No shift found for 11th precisely with date field. Trying to find any shift opened on that day...');
      // Fallback or just use a known shift ID if possible
    }
    
    const updateData = { timestamp: newTimestamp };
    if (targetShiftId) updateData.shiftId = targetShiftId;
    
    await updateDoc(doc(db, 'sales', saleDoc.id), updateData);
    console.log(`Successfully updated ${rc}`);
    
    // Reconcile shifts
    const oldShiftId = saleData.shiftId;
    if (oldShiftId) {
      const oldShiftRef = doc(db, 'shifts', oldShiftId);
      const oldSnap = await getDoc(oldShiftRef);
      if (oldSnap.exists()) {
        const data = oldSnap.data();
        const amount = saleData.grandTotal || 0;
        const method = (saleData.payments?.[0]?.method || 'Cash').toLowerCase();
        
        let update = {};
        if (method === 'transfer') update.transferSales = (data.transferSales || 0) - amount;
        else update.netCashSales = (data.netCashSales || 0) - amount;
        update.totalSales = (data.totalSales || 0) - amount;
        
        await updateDoc(oldShiftRef, update);
        console.log(`Removed ฿${amount} (${method}) from shift ${oldShiftId}`);
      }
    }

    if (targetShiftId) {
      const newShiftRef = doc(db, 'shifts', targetShiftId);
      const newSnap = await getDoc(newShiftRef);
      if (newSnap.exists()) {
        const data = newSnap.data();
        const amount = saleData.grandTotal || 0;
        const method = (saleData.payments?.[0]?.method || 'Cash').toLowerCase();

        let update = {};
        if (method === 'transfer') update.transferSales = (data.transferSales || 0) + amount;
        else update.netCashSales = (data.netCashSales || 0) + amount;
        update.totalSales = (data.totalSales || 0) + amount;

        await updateDoc(newShiftRef, update);
        console.log(`Added ฿${amount} (${method}) to shift ${targetShiftId}`);
      }
    }
  }
}

fixSales().then(() => console.log('Done')).catch(console.error);

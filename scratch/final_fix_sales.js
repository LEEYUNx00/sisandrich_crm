
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

async function finalFix() {
  const receipts = ['RC260412-0951-419', 'RC260412-0948-494', 'RC260412-0948-524'];
  const shift11Id = 'YojtdwnUKfnbGFEK3fKI';
  const shift12Id = 'R6VeviSm3AJDhcLZZXoz';

  for (const rc of receipts) {
    console.log(`Processing ${rc}...`);
    const q = query(collection(db, 'sales'), where('billId', '==', rc));
    const snap = await getDocs(q);
    if (snap.empty) { console.log(`Not found: ${rc}`); continue; }

    const saleDoc = snap.docs[0];
    const saleData = saleDoc.data();
    const amount = saleData.grandTotal || 0;
    const method = (saleData.payments?.[0]?.method || 'Cash').toLowerCase();

    // 1. Update Sale Document
    const date = saleData.timestamp.toDate ? saleData.timestamp.toDate() : new Date(saleData.timestamp.seconds * 1000);
    date.setDate(11);
    await updateDoc(doc(db, 'sales', saleDoc.id), {
      timestamp: Timestamp.fromDate(date),
      shiftId: shift11Id
    });
    console.log(`Updated ${rc} timestamp and shiftId.`);

    // 2. Remove from Shift 12 (if it was there)
    const s12Ref = doc(db, 'shifts', shift12Id);
    const s12Snap = await getDoc(s12Ref);
    if (s12Snap.exists()) {
      const d = s12Snap.data();
      let up = { totalSales: (d.totalSales || 0) - amount };
      if (method === 'transfer') up.transferSales = (d.transferSales || 0) - amount;
      else up.netCashSales = (d.netCashSales || 0) - amount;
      await updateDoc(s12Ref, up);
      console.log(`Removed ฿${amount} from Shift 12.`);
    }

    // 3. Add to Shift 11
    const s11Ref = doc(db, 'shifts', shift11Id);
    const s11Snap = await getDoc(s11Ref);
    if (s11Snap.exists()) {
      const d = s11Snap.data();
      let up = { totalSales: (d.totalSales || 0) + amount };
      if (method === 'transfer') up.transferSales = (d.transferSales || 0) + amount;
      else up.netCashSales = (d.netCashSales || 0) + amount;
      await updateDoc(s11Ref, up);
      console.log(`Added ฿${amount} to Shift 11.`);
    }
  }
}

finalFix().then(() => console.log('Final Fix Done')).catch(console.error);

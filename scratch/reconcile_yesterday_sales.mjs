import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, Timestamp, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA1BuDDAyPD1dZoB0PZnd04MeJ7McTZ3cc",
  authDomain: "sisandrichcrm.firebaseapp.com",
  projectId: "sisandrichcrm",
  storageBucket: "sisandrichcrm.firebasestorage.app",
  messagingSenderId: "174596544744",
  appId: "1:174596544744:web:1eb3466914f30894aa915d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const shiftId = "YojtdwnUKfnbGFEK3fKI"; // The ID of Shift #110469-1
const targetDateStart = new Date("2026-04-11T00:00:00");
const targetDateEnd = new Date("2026-04-12T00:00:00");

async function run() {
  try {
    // 1. Fetch sales for April 11
    const q = query(
      collection(db, "sales"),
      where("timestamp", ">=", Timestamp.fromDate(targetDateStart)),
      where("timestamp", "<", Timestamp.fromDate(targetDateEnd))
    );
    
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log("No sales found for April 11.");
      process.exit(0);
    }

    console.log(`Found ${snap.size} sales. Updating...`);
    
    const batch = writeBatch(db);
    let totalSales = 0;
    let payments = { cash: 0, transfer: 0, credit: 0, debit: 0, voucher: 0, online: 0, other: 0 };
    let ordersCount = 0;

    snap.docs.forEach(saleDoc => {
      const data = saleDoc.data();
      if (data.status !== 'voided') {
        const grandTotal = data.grandTotal || 0;
        totalSales += grandTotal;
        ordersCount++;
        
        // Sum up payments
        if (data.paymentType) {
          payments[data.paymentType] = (payments[data.paymentType] || 0) + grandTotal;
        }
      }
      
      // Update the sale
      batch.update(doc(db, "sales", saleDoc.id), {
        shiftId: shiftId
      });
    });

    // 2. Update the Shift Summary
    batch.update(doc(db, "shifts", shiftId), {
      totalSales: totalSales,
      ordersCount: ordersCount,
      payments: payments,
      endingCashSystem: 2000 + (payments.cash || 0), // Assuming starting cash was 2000
      netCashSales: payments.cash || 0
    });

    await batch.commit();
    console.log(`SUCCESS: Linked ${snap.size} sales to Shift #110469-1 and updated shift summary.`);
    process.exit(0);
  } catch (e) {
    console.error("ERROR reconciling sales: ", e);
    process.exit(1);
  }
}

run();

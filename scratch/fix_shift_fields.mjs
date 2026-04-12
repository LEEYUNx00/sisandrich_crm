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

const shiftId = "YojtdwnUKfnbGFEK3fKI"; // Shift #110469-1
const targetDateStart = new Date("2026-04-11T00:00:00");
const targetDateEnd = new Date("2026-04-12T00:00:00");

async function run() {
  try {
    const q = query(
      collection(db, "sales"),
      where("timestamp", ">=", Timestamp.fromDate(targetDateStart)),
      where("timestamp", "<", Timestamp.fromDate(targetDateEnd))
    );
    
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log("No sales found.");
      process.exit(0);
    }

    let netSales = 0;
    let totalBills = 0;
    let totalItemsSold = 0;
    let discount = 0;
    let netCashSales = 0;
    let transferSales = 0;
    let payments = { cash: 0, transfer: 0, credit: 0, debit: 0, voucher: 0, online: 0, other: 0 };

    snap.docs.forEach(saleDoc => {
      const data = saleDoc.data();
      if (data.status !== 'voided') {
        const grandTotal = data.grandTotal || 0;
        netSales += grandTotal;
        totalBills++;
        discount += (data.discount || 0);
        
        // Sum items
        if (data.items && Array.isArray(data.items)) {
          data.items.forEach(item => {
            totalItemsSold += (item.qty || 1);
          });
        }
        
        // Payment split
        if (data.paymentType === 'cash') netCashSales += grandTotal;
        if (data.paymentType === 'transfer') transferSales += grandTotal;
        if (data.paymentType) {
          payments[data.paymentType] = (payments[data.paymentType] || 0) + grandTotal;
        }
      }
    });

    const startingCash = 2000;
    const endingCashSystem = startingCash + netCashSales;

    const shiftUpdate = {
      netSales: netSales,
      totalBills: totalBills,
      totalItemsSold: totalItemsSold,
      discount: discount,
      totalInvestment: startingCash,
      netCashSales: netCashSales,
      transferSales: transferSales,
      payments: payments,
      startingCash: startingCash,
      endingCashSystem: endingCashSystem,
      endingCashEmp: endingCashSystem, // Assume matched for historical
      overshoot: 0,
      avgPricePerItem: totalItemsSold > 0 ? (netSales / totalItemsSold) : 0,
    };

    await updateDoc(doc(db, "shifts", shiftId), shiftUpdate);
    
    console.log(`SUCCESS: Fixed Shift ${shiftId} with ${totalBills} bills.`);
    process.exit(0);
  } catch (e) {
    console.error("ERROR: ", e);
    process.exit(1);
  }
}

run();

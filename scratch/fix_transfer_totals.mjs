import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, Timestamp } from "firebase/firestore";

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
    
    let netCashSales = 0;
    let transferSales = 0;
    let paymentsSummary = { cash: 0, transfer: 0, credit: 0, debit: 0, voucher: 0, online: 0, other: 0 };

    snap.docs.forEach(saleDoc => {
      const data = saleDoc.data();
      if (data.status !== 'voided') {
        const salePayments = data.payments || [];
        
        // If data.payments exists, iterate through it
        if (Array.isArray(salePayments) && salePayments.length > 0) {
          salePayments.forEach(p => {
            const method = String(p.method || '').toLowerCase();
            const amount = Number(p.amount || 0);
            
            if (method === 'cash') {
              netCashSales += amount;
              paymentsSummary.cash += amount;
            } else if (method === 'transfer' || method === 'promptpay' || method === 'online') {
              transferSales += amount;
              paymentsSummary.transfer += amount; // We treat these as transfer for the summary view
            } else {
              paymentsSummary[method] = (paymentsSummary[method] || 0) + amount;
            }
          });
        } else if (data.paymentType) {
          // Fallback if no payments array but paymentType exists
          const method = String(data.paymentType).toLowerCase();
          const amount = data.grandTotal || 0;
          if (method === 'cash') {
            netCashSales += amount;
            paymentsSummary.cash += amount;
          } else if (method === 'transfer' || method === 'promptpay' || method === 'online') {
            transferSales += amount;
            paymentsSummary.transfer += amount;
          }
        }
      }
    });

    const startingCash = 2000;
    const endingCashSystem = startingCash + netCashSales;

    await updateDoc(doc(db, "shifts", shiftId), {
      netCashSales: netCashSales,
      transferSales: transferSales,
      payments: paymentsSummary,
      endingCashSystem: endingCashSystem,
      endingCashEmp: endingCashSystem,
      overshoot: 0
    });

    console.log(`SUCCESS: Updated Transfer Sales to ${transferSales} and Cash Sales to ${netCashSales}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();

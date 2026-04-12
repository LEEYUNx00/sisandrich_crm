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
    
    let netSales = 0;
    let totalBills = 0;
    let totalItemsSold = 0;
    let discount = 0;
    let netCashSales = 0;
    let transferSales = 0;
    let paymentsSummary = { cash: 0, transfer: 0, credit: 0, debit: 0, voucher: 0, online: 0, other: 0 };
    let itemCounts = {};

    snap.docs.forEach(saleDoc => {
      const data = saleDoc.data();
      if (data.status !== 'voided' && data.shiftId === shiftId) {
        const grandTotal = data.grandTotal || 0;
        netSales += grandTotal;
        totalBills++;
        discount += (data.discount || 0);

        // Process Items
        if (data.items && Array.isArray(data.items)) {
          data.items.forEach(item => {
            totalItemsSold += (item.qty || 1);
            const itemName = item.name || "Unknown";
            itemCounts[itemName] = (itemCounts[itemName] || 0) + (item.qty || 1);
          });
        }

        // Process Payments
        const salePayments = data.payments || [];
        if (Array.isArray(salePayments) && salePayments.length > 0) {
          salePayments.forEach(p => {
            const method = String(p.method || '').toLowerCase();
            const amount = Number(p.amount || 0);
            if (method === 'cash') {
              netCashSales += amount;
              paymentsSummary.cash += amount;
            } else if (method === 'transfer' || method === 'promptpay' || method === 'online') {
              transferSales += amount;
              paymentsSummary.transfer += amount;
            } else {
              paymentsSummary[method] = (paymentsSummary[method] || 0) + amount;
            }
          });
        }
      }
    });

    // Find top item
    let topItem = null;
    let maxQty = 0;
    for (const [name, qty] of Object.entries(itemCounts)) {
      if (qty > maxQty) {
        maxQty = qty;
        topItem = { name, qty };
      }
    }

    const startingCash = 2000;
    const endingCashSystem = startingCash + netCashSales;

    const shiftData = {
      netSales: netSales,
      totalBills: totalBills,
      totalItemsSold: totalItemsSold,
      discount: discount,
      totalInvestment: startingCash,
      netCashSales: netCashSales,
      transferSales: transferSales,
      payments: paymentsSummary,
      startingCash: startingCash,
      endingCashSystem: endingCashSystem,
      endingCashEmp: endingCashSystem,
      overshoot: 0,
      topItem: topItem,
      avgPricePerItem: totalItemsSold > 0 ? (netSales / totalItemsSold) : 0,
    };

    await updateDoc(doc(db, "shifts", shiftId), shiftData);

    console.log(`RECALCULATED: Shift ${shiftId} now has ${totalBills} bills and ฿${netSales.toLocaleString()} in net sales.`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();

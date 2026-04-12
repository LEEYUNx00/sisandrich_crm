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

const shiftId = "YojtdwnUKfnbGFEK3fKI";
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
    
    let itemCounts = {};

    snap.docs.forEach(saleDoc => {
      const data = saleDoc.data();
      if (data.status !== 'voided' && data.items) {
        data.items.forEach(item => {
          const name = item.name || "Unknown";
          if (!itemCounts[name]) itemCounts[name] = 0;
          itemCounts[name] += (item.qty || 1);
        });
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

    if (topItem) {
      await updateDoc(doc(db, "shifts", shiftId), {
        topItem: topItem
      });
      console.log(`Updated Top Item: ${topItem.name} (${topItem.qty})`);
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();

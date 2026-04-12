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
const targetBillIds = [
  "RC260412-0951-419",
  "RC260412-0948-494",
  "RC260412-0948-524"
];

async function run() {
  try {
    const batch = writeBatch(db);
    let updatedCount = 0;

    for (const billId of targetBillIds) {
      const q = query(collection(db, "sales"), where("billId", "==", billId));
      const snap = await getDocs(q);
      
      snap.forEach(saleDoc => {
        const currentData = saleDoc.data();
        const currentTS = currentData.timestamp.toDate();
        
        // Change date to April 11, 2026 while keeping hours/minutes
        const newDate = new Date(currentTS);
        newDate.setFullYear(2026);
        newDate.setMonth(3); // April is 3
        newDate.setDate(11);
        
        batch.update(doc(db, "sales", saleDoc.id), {
          timestamp: Timestamp.fromDate(newDate),
          shiftId: shiftId
        });
        updatedCount++;
      });
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`SUCCESS: Moved ${updatedCount} bills to April 11 and linked to Shift ${shiftId}`);
    } else {
      console.log("No matching bills found.");
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();

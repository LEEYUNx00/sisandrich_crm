
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, getDocs, Timestamp } from "firebase/firestore";

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

async function inspectSales() {
  console.log("Listing sales from April 12, 2026...");
  const q = collection(db, 'sales');
  const snap = await getDocs(q);
  
  snap.docs.forEach(doc => {
    const data = doc.data();
    const ts = data.timestamp?.toDate ? data.timestamp.toDate() : null;
    if (ts && ts.getDate() === 12 && ts.getMonth() === 3 && ts.getFullYear() === 2026) {
      console.log(`Doc: ${doc.id} | Receipt: ${data.receiptId || data.receiptNo || 'N/A'} | Time: ${ts.toLocaleTimeString()}`);
    }
  });
}

inspectSales().then(() => console.log('Done')).catch(console.error);

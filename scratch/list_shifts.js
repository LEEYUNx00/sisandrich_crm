
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function listShifts() {
  const q = collection(db, 'shifts');
  const snap = await getDocs(q);
  console.log(`Checking ${snap.docs.length} shifts...`);
  snap.docs.forEach(doc => {
    const data = doc.data();
    const openTs = data.openedAt?.toDate ? data.openedAt.toDate() : (data.openedAt?.seconds ? new Date(data.openedAt.seconds * 1000) : null);
    console.log(`Shift ID: ${doc.id} | Date: ${data.date} | Opened: ${openTs ? openTs.toLocaleString() : 'N/A'}`);
  });
}

listShifts().then(() => console.log('Done')).catch(console.error);

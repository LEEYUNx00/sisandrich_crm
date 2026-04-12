
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

async function inspectRaw() {
  const q = collection(db, 'sales');
  const snap = await getDocs(q);
  console.log("Found " + snap.docs.length + " sales total.");
  if (snap.docs.length > 0) {
    console.log("Sample Data from first doc:");
    console.log(JSON.stringify(snap.docs[0].data(), null, 2));
  }
}

inspectRaw().then(() => console.log('Done')).catch(console.error);

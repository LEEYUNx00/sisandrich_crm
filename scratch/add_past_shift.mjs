import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

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

// Data for April 11, 2026
const openedAt = new Date("2026-04-11T08:30:34");
const closedAt = new Date("2026-04-11T20:00:00");

const shiftData = {
  shiftNumber: "110469-1",
  openedBy: "sisadmin",
  openedAt: Timestamp.fromDate(openedAt),
  closedBy: "sisadmin",
  closedAt: Timestamp.fromDate(closedAt),
  status: "closed",
  startingCash: 2000,
  endingCashActual: 2000,
  endingCashSystem: 2000,
  netCashSales: 0,
  totalSales: 0,
  ordersCount: 0,
  payments: {
    cash: 0,
    transfer: 0,
    credit: 0
  }
};

async function run() {
  try {
    const docRef = await addDoc(collection(db, "shifts"), shiftData);
    console.log("SUCCESS: Document written with ID: ", docRef.id);
    process.exit(0);
  } catch (e) {
    console.error("ERROR adding document: ", e);
    process.exit(1);
  }
}

run();

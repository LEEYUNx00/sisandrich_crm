
import { db } from './firebase-node.js';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function checkFields() {
  const q = query(collection(db, 'products'), limit(5));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    console.log(`ID: ${doc.id}, Data:`, doc.data());
  });
}

checkFields();

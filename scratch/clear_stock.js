
import { db } from './firebase-node.js';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

async function clearStock() {
  console.log("Starting stock clearing process...");
  const snapshot = await getDocs(collection(db, 'products'));
  const total = snapshot.size;
  console.log(`Found ${total} products.`);
  
  const CHUNK_SIZE = 400;
  const docs = snapshot.docs;
  
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    
    chunk.forEach(d => {
      batch.update(doc(db, 'products', d.id), {
        stock1st: 0,
        stock3rd: 0
      });
    });
    
    await batch.commit();
    console.log(`Updated ${Math.min(i + CHUNK_SIZE, total)} / ${total}`);
  }
  
  console.log("Stock cleared successfully for both Floor 1 and Floor 3.");
}

clearStock();


const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccount = require('c:/Users/liliy/Desktop/sisandrich/WEB_CRM_POS/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkImageSize() {
  const productsRef = db.collection('products');
  const snapshot = await productsRef.where('sku', '==', 'SR002734').get();
  
  if (snapshot.empty) {
    console.log('No matching product found.');
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.image) {
      const img = data.image;
      if (img.startsWith('data:image')) {
        // Base64 string
        const base64Content = img.split(',')[1];
        const sizeInBytes = Math.ceil((base64Content.length * 3) / 4);
        const sizeInKb = (sizeInBytes / 1024).toFixed(2);
        console.log(`Product: ${data.name} (SKU: ${data.sku})`);
        console.log(`Image Type: Base64 (Data URL)`);
        console.log(`Size: ${sizeInKb} KB`);
      } else {
        // URL
        console.log(`Product: ${data.name} (SKU: ${data.sku})`);
        console.log(`Image Type: URL`);
        console.log(`URL: ${img}`);
        console.log(`Please check the file size in Firebase Storage console or via HTTP head request.`);
      }
    } else {
      console.log('Product has no image.');
    }
  });
}

checkImageSize();

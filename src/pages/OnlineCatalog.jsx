import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Search, ImageIcon, Edit3, Upload, Link as LinkIcon, X } from 'lucide-react';

export default function OnlineCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest

  const [editingProduct, setEditingProduct] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imgType, setImgType] = useState('upload');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [categoryPrefixes, setCategoryPrefixes] = useState([
    { name: 'เครื่องประดับ', prefix: '00' },
    { name: 'แหวน', prefix: '01' },
    { name: 'สร้อยคอ', prefix: '02' },
    { name: 'ต่างหู', prefix: '03' },
    { name: 'สร้อยข้อมือ', prefix: '04' },
    { name: 'เสื้อผ้า', prefix: '05' },
    { name: 'กระเป๋า', prefix: '06' },
    { name: 'อื่นๆ', prefix: '99' }
  ]);

  useEffect(() => {
    const fetchCats = async () => {
       try {
           const docRef = doc(db, 'settings', 'product_categories');
           const docSnap = await getDoc(docRef);
           if (docSnap.exists() && docSnap.data().prefixes) {
               setCategoryPrefixes(docSnap.data().prefixes);
           }
       } catch (err) {
           console.error("Error fetching categories:", err);
       }
    };
    fetchCats();
  }, []);

  const subCategories = ['All', ...new Set(products.map(p => p.subCategory).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSubCat = selectedSubCategory === 'All' || p.subCategory === selectedSubCategory;
    return matchSearch && matchCat && matchSubCat;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
    const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
    return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
         const img = new Image();
         img.src = event.target.result;
         img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 800;
            if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
            else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            setEditingProduct({...editingProduct, image: compressedBase64});
         };
      };
      reader.readAsDataURL(file);
    }
    if (e) e.target.value = null;
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsUploading(true);
    try {
      let imageUrl = editingProduct.image;
      if (imgType === 'upload' && editingProduct.image && editingProduct.image.startsWith('data:image')) {
          const storageRef = ref(storage, `products/${editingProduct.sku || Date.now()}_${Date.now()}.jpg`);
          const uploadTask = await uploadString(storageRef, editingProduct.image, 'data_url');
          imageUrl = await getDownloadURL(uploadTask.ref);
      }
      const productRef = doc(db, 'products', editingProduct.id);
      await updateDoc(productRef, {
        name: editingProduct.name,
        category: editingProduct.category,
        subCategory: editingProduct.subCategory || '',
        image: imageUrl
      });
      setEditingProduct(null);
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2D3748' }}>สต็อกสินค้าในร้าน (Online Catalog)</h2>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>ค้นหาสินค้า</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#A0AEC0' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="พิมพ์ชื่อสินค้า หรือ รหัส SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', marginBottom: 0 }}
            />
          </div>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>หมวดหมู่หลัก (Category)</label>
          <select className="input" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ marginBottom: 0 }}>
            <option value="All">ทุกหมวดหมู่หลัก</option>
            {categoryPrefixes.map(c => <option key={c.name} value={c.name}>{c.name} ({c.prefix})</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>หมวดหมู่ย่อย (Sub-Category)</label>
          <select className="input" value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)} style={{ marginBottom: 0 }}>
            {subCategories.map(sc => <option key={sc} value={sc}>{sc === 'All' ? 'ทุกหมวดหมู่ย่อย' : sc}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>เรียงลำดับ</label>
          <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ marginBottom: 0 }}>
            <option value="newest">อัปเดตล่าสุด (ใหม่-เก่า)</option>
            <option value="oldest">อัปเดตนานแล้ว (เก่า-ใหม่)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>กำลังโหลดข้อมูลสินค้า...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {sortedProducts.map(p => (
            <div key={p.id} className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'relative' }}>
              <button 
                onClick={() => setEditingProduct({...p})} 
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', zIndex: 10 }}
                title="แก้ไขด่วน"
              >
                <Edit3 size={18} color="#4A5568" />
              </button>
              <div style={{ height: '220px', backgroundColor: '#F7FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #E2E8F0' }}>
                {p.image ? (
                  <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={48} color="#CBD5E0" />
                )}
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>{p.sku}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#2D3748', marginBottom: '8px', flex: 1, lineHeight: '1.4' }}>{p.name}</h3>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {p.category && <span style={{ fontSize: '10px', padding: '2px 8px', background: '#EBF8FF', color: '#3182CE', borderRadius: '4px' }}>{p.category}</span>}
                  {p.subCategory && <span style={{ fontSize: '10px', padding: '2px 8px', background: '#FAF5FF', color: '#805AD5', borderRadius: '4px' }}>{p.subCategory}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '12px', color: '#A0AEC0' }}>ราคา</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#38A169' }}>
                    ฿{(p.price || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#718096', background: '#fff', borderRadius: '12px' }}>
              ไม่พบสินค้าที่ค้นหา
            </div>
          )}
        </div>
      )}

      {/* QUICK EDIT MODAL */}
      {editingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card animate-slide-in" style={{ width: '400px', maxWidth: '100%', padding: '24px', backgroundColor: '#fff', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2D3748' }}>อัปเดตสินค้า (ด่วน)</h3>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#718096" /></button>
            </div>
            <form onSubmit={handleUpdateProduct}>
              <div style={{ marginBottom: '20px', textAlign: 'center', background: '#F7FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ width: '120px', height: '120px', margin: '0 auto 16px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', background: '#EDF2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editingProduct.image ? (
                    <img src={editingProduct.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={32} color="#CBD5E0" />
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                  <button type="button" onClick={() => setImgType('upload')} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: imgType === 'upload' ? '#E6FFFA' : '#fff', color: imgType === 'upload' ? '#38A169' : '#4A5568', borderColor: imgType === 'upload' ? '#38A169' : '#E2E8F0', flex: 1, justifyContent: 'center' }}>
                    <Upload size={14} /> อัปโหลด/ถ่ายรูป
                  </button>
                  <button type="button" onClick={() => setImgType('url')} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: imgType === 'url' ? '#EBF8FF' : '#fff', color: imgType === 'url' ? '#3182CE' : '#4A5568', borderColor: imgType === 'url' ? '#3182CE' : '#E2E8F0', flex: 1, justifyContent: 'center' }}>
                    <LinkIcon size={14} /> ลิงก์ URL
                  </button>
                </div>
                {imgType === 'upload' ? (
                  <div>
                    <input type="file" accept="image/*" id="quick-upload" style={{ display: 'none' }} onChange={handleFileChange} />
                    <label htmlFor="quick-upload" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', background: '#3182CE', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', width: '100%' }}>
                      📸 ถ่ายรูปจากมือถือ
                    </label>
                  </div>
                ) : (
                  <input type="text" className="input" placeholder="วางลิงก์รูปภาพ..." value={editingProduct.image || ''} onChange={(e) => setEditingProduct({...editingProduct, image: e.target.value})} style={{ fontSize: '12px', marginBottom: 0 }} />
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>ชื่อสินค้า</label>
                <input type="text" className="input" value={editingProduct.name || ''} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>หมวดหมู่หลัก</label>
                  <select className="input" value={editingProduct.category || ''} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}>
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    {categoryPrefixes.map(c => <option key={c.name} value={c.name}>{c.name} ({c.prefix})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>หมวดหมู่ย่อย</label>
                  <select className="input" value={editingProduct.subCategory || ''} onChange={(e) => setEditingProduct({...editingProduct, subCategory: e.target.value})}>
                    <option value="">-- เลือกหมวดหมู่ย่อย --</option>
                    {["Evil eyes", "หัวใจ", "จี้เล็ก", "มุก", "หยดน้ำ", "สายฝอ", "เพรช", "อื่นๆ"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 'bold' }} disabled={isUploading}>
                {isUploading ? 'กำลังอัปโหลด...' : '✅ ยืนยันการอัปเดต'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Check, X, Sparkles, Upload, Link, AlertCircle, ArrowLeft, Settings, Trash2, Printer } from 'lucide-react';
import { db, storage } from '../../firebase';
import { addDoc, collection, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';


export default function AddProductView({ products = [], setView }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'เครื่องประดับ',
    subCategory: '',
    price: '',
    cost: '',
    stockMode: 'Restricted', // ตั้งเป็น Restricted (ล็อคตามสต็อก) เป็นค่าเริ่มต้นเพื่อความปลอดภัย
    initialLocation: '1st', // '1st' | '3rd'
    stockQty: '0',
    image: '',
    imgType: 'url', // 'url' | 'upload'
    barcode: '',
    shelf1st: '',
    shelf3rd: '',
    remark: ''
  });
  
  const [imgPreview, setImgPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isNameAuto, setIsNameAuto] = useState(true); 
  const [isBarcodeAuto, setIsBarcodeAuto] = useState(true);
  const [nameSuggestions, setNameSuggestions] = useState([]); // แนะนำตามชื่อ
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [printQty, setPrintQty] = useState(3); // จำนวนดวงที่จะพิมพ์

  const allSubCats = ["Evil eyes", "หัวใจ", "จี้เล็ก", "มุก", "หยดน้ำ", "สายฝอ", "เพรช", "มินิมอล", "แฟชั่น", "โคฟเวอร์", "ทะเล", "การ์ตูน", "โบว์", "อื่นๆ"];


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
  const [isCategoryConfigOpen, setIsCategoryConfigOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatPrefix, setNewCatPrefix] = useState('');
  const [localCats, setLocalCats] = useState([]); // Local state for Modal reordering

  useEffect(() => {
    const fetchCats = async () => {
       try {
           const docRef = doc(db, 'settings', 'product_categories');
           const docSnap = await getDoc(docRef);
           if (docSnap.exists() && docSnap.data().prefixes) {
               let data = docSnap.data().prefixes;
               
               // ระบบ Auto-Migration: แปลงตัวย่อเป็นตัวเลขให้คุณโดยอัตโนมัติ
               let needsUpdate = false;
               const migrationMap = {
                   'JW': '00', 'RNG': '01', 'NKL': '02', 'ER': '03', 
                   'BR': '04', 'CL': '05', 'BG': '06', 'ETC': '99'
               };
               
               const migratedData = data.map(cat => {
                   if (migrationMap[cat.prefix]) {
                       needsUpdate = true;
                       return { ...cat, prefix: migrationMap[cat.prefix] };
                   }
                   return cat;
               });

               if (needsUpdate) {
                   await setDoc(docRef, { prefixes: migratedData }, { merge: true });
                   setCategoryPrefixes(migratedData);
                   console.log("Auto-migrated categories to numeric codes! 🎉");
               } else {
                   setCategoryPrefixes(migratedData);
               }
           }
       } catch (err) {
           console.error("Error fetching categories:", err);
       }
    };
    fetchCats();
  }, []);

  useEffect(() => {
     if (isCategoryConfigOpen) {
         setLocalCats([...categoryPrefixes]);
     }
  }, [isCategoryConfigOpen, categoryPrefixes]);

  const handleAddLocalCategory = (e) => {
      e.preventDefault();
      if(!newCatName.trim() || !newCatPrefix.trim()) return;
      
      const exists = localCats.find(c => c.name === newCatName.trim());
      if(exists) {
          alert("หมวดหมู่นี้มีอยู่แล้ว");
          return;
      }

      const updated = [...localCats, { name: newCatName.trim(), prefix: newCatPrefix.trim().toUpperCase() }];
      setLocalCats(updated);
      setNewCatName('');
      setNewCatPrefix('');
  };

  const handleDeleteLocalCategory = (index) => {
     if(localCats.length <= 1) {
         alert('ต้องมีหมวดหมู่อย่างน้อย 1 หมวด');
         return;
     }
     const updated = localCats.filter((_, i) => i !== index);
     setLocalCats(updated);
  };

  const moveUp = (index) => {
     if (index === 0) return;
     const newList = [...localCats];
     [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
     setLocalCats(newList);
  };

  const moveDown = (index) => {
     if (index === localCats.length - 1) return;
     const newList = [...localCats];
     [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
     setLocalCats(newList);
  };

  const handleCommitCategoryChanges = async () => {
     try {
         await setDoc(doc(db, 'settings', 'product_categories'), { prefixes: localCats }, { merge: true });
         setCategoryPrefixes(localCats);
         // If the current category in formData was deleted, reset it to the first available
         if (!localCats.some(cat => cat.name === formData.category)) {
             setFormData(prev => ({...prev, category: localCats[0]?.name || ''}));
         }
         setIsCategoryConfigOpen(false);
         alert("บันทึกการแก้ไขหมวดหมู่แล้ว 🎉");
     } catch (err) {
         alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
     }
  };

  const generateSku = (cat, prefixesInfo) => {
    const found = Array.isArray(prefixesInfo) ? prefixesInfo.find(c => c.name === cat) : null;
    const catCode = found ? found.prefix : '00'; // ให้ตัวย่อที่เก็บอยู่กลายเป็นรหัสตัวเลข (เช่น 01)
    
    const skuBase = `SR${catCode}`; // เช่น SR01
    
    // ค้นหาสินค้าที่มีรหัสขึ้นต้นด้วย SR01 เพื่อรันเลขต่อ 4 หลัก (เช่น SR010001)
    const relatedProducts = products.filter(p => p.sku && p.sku.startsWith(skuBase));
    let maxIndex = 0;
    
    relatedProducts.forEach(p => {
      // ตัด SR01 ออกเพื่อเอา 4 หลักสุดท้ายมาเช็คเลขสูงสุด
      const numPart = p.sku.slice(skuBase.length); 
      const num = parseInt(numPart);
      if (!isNaN(num) && num > maxIndex) maxIndex = num;
    });

    // คืนค่าเป็น SR + รหัสหมวดหมู่ + เลข 4 หลัก (เช่น SR010001)
    return `${skuBase}${(maxIndex + 1).toString().padStart(4, '0')}`;
  };

  useEffect(() => {
    if (formData.category) {
      setFormData(prev => ({ ...prev, sku: generateSku(formData.category, categoryPrefixes) }));
    }
  }, [formData.category, products, categoryPrefixes]);

  const handleManualGenSku = () => {
    setFormData(prev => ({ ...prev, sku: generateSku(formData.category, categoryPrefixes) }));
  };

  // ระบบ Auto-Name และ Auto-Barcode: อัปเดตชื่อและบาร์โค้ดตาม SKU และราคาอัตโนมัติ
  useEffect(() => {
    if (isNameAuto) {
      setFormData(prev => ({ 
        ...prev, 
        name: `${prev.sku}${prev.price ? ` / ${prev.price}` : ''}` 
      }));
    }
  }, [formData.sku, formData.price, isNameAuto]);

  useEffect(() => {
    if (isBarcodeAuto) {
      setFormData(prev => ({ ...prev, barcode: prev.sku }));
    }
  }, [formData.sku, isBarcodeAuto]);


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

            // ปรับขนาดความกว้าง/สูงสูงสุด 800px เพื่อความประหยัดเนื้อที่
            const MAX_SIZE = 800;
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // บีบอัดคุณภาพลดขนาดไฟล์ (0.6 / 60%) แปลงเป็น JPEG
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            
            setImgPreview(compressedBase64);
            setFormData(prev => ({ ...prev, image: compressedBase64 }));
         };
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (formData.imgType === 'url' && formData.image) {
      setImgPreview(formData.image);
    } else if (formData.imgType === 'url' && !formData.image) {
      setImgPreview('');
    }
  }, [formData.image, formData.imgType]);

  // ค้นหาสินค้าที่ใกล้เคียงเมื่อมีการพิมพ์ชื่อ (สำหรับ Auto-fill)
  useEffect(() => {
    if (formData.name.trim().length >= 2 && !isNameAuto) {
       const matches = products.filter(p => 
           p.name?.toLowerCase().includes(formData.name.toLowerCase()) || 
           p.sku?.toLowerCase().includes(formData.name.toLowerCase())
       ).slice(0, 5); // เอาแค่ 5 รายการแรก
       setNameSuggestions(matches);
       setShowSuggestions(matches.length > 0);
    } else {
       setShowSuggestions(false);
    }
  }, [formData.name, products, isNameAuto]);

  const selectSuggestion = (p) => {
      setFormData(prev => ({
          ...prev,
          name: p.name,
          cost: p.cost || '',
          price: p.price || '',
          category: p.category || prev.category,
          subCategory: p.subCategory || prev.subCategory
      }));
      setShowSuggestions(false);
      setIsNameAuto(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = Number(formData.price);
    const cost = Number(formData.cost);
    const qty = Number(formData.stockQty);
    const barcode = formData.barcode || formData.sku; // Use SKU as fallback barcode

    setIsUploading(true);
    try {
      let imageUrl = formData.image || 'https://via.placeholder.com/300?text=No+Image';

      if (formData.imgType === 'upload' && formData.image && formData.image.startsWith('data:image')) {
         // Create a safe reference path
         const storageRef = ref(storage, `products/${formData.sku || Date.now()}_${Date.now()}.jpg`);
         const uploadTask = await uploadString(storageRef, formData.image, 'data_url');
         imageUrl = await getDownloadURL(uploadTask.ref);
      }

      const productData = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        subCategory: formData.subCategory || '',
        price: price,
        cost: cost || 0,
        stockMode: formData.stockMode,
        stock1st: formData.initialLocation === '1st' ? qty : 0,
        stock3rd: formData.initialLocation === '3rd' ? qty : 0,
        image: imageUrl,
        shelf1st: formData.shelf1st || '',
        shelf3rd: formData.shelf3rd || '',
        remark: formData.remark || '',
        barcode: barcode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'products'), productData);
      alert("เพิ่มสินค้าสำเร็จ! 🎉");
      setView('locations'); // Redirect to inventory list
    } catch (error) {
      alert("ไม่สามารถเพิ่มสินค้าได้: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="animate-slide-in">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area {
              position: absolute; left: 0; top: 0;
              width: 102mm; 
              display: grid !important; 
              grid-template-columns: repeat(3, 32.5mm); /* ล็อค 3 ดวงต่อม้วน */
              gap: 1mm;
              background: white;
            }
            .barcode-label {
              width: 32mm; height: 25mm;
              display: flex !important; flex-direction: column;
              align-items: center; justify-content: center;
              text-align: center;
              overflow: hidden;
              box-sizing: border-box;
            }
            .barcode-text { 
              font-family: 'Libre Barcode 39 Text', cursive !important; 
              font-size: 24px !important; 
              color: black !important;
              margin: 0px 0; 
              line-height: 1;
              transform: scaleX(0.7); 
              transform-origin: center;
              white-space: nowrap;
            }
            .barcode-info { font-size: 8px; font-weight: bold; width: 100%; border-bottom: 0.5px solid #000; margin-bottom: 1px; color: black !important; }
            .barcode-code { font-size: 9px; font-weight: bold; color: black !important; }
            .barcode-price { font-size: 11px; font-weight: 900; color: black !important; margin-top: 1px; padding-top: 1px; border-top: 0.5px solid #000; width: 100%; }
          }
        `}
      </style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button className="btn-icon" onClick={() => setView('locations')} style={{ borderRadius: '50%', padding: '10px', background: '#F3F4F6' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-dark)' }}>เพิ่มข้อมูลสินค้าใหม่เข้าคลัง (Add Product)</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* LEFT COLUMN: IMAGE UPLOAD */}
        <div className="card" style={{ padding: '20px', backgroundColor: '#fff', height: 'max-content' }}>
          <h4 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 'bold', color: '#4A5568' }}>รูปภาพสินค้า</h4>
          
          <div style={{ width: '100%', height: '240px', background: '#F7FAFC', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px dashed #E2E8F0', marginBottom: '16px' }}>
            {imgPreview ? (
              <img src={imgPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#A0AEC0' }}>
                <Upload size={36} style={{ margin: '0 auto 8px', color: '#CBD5E0' }} />
                <p style={{ fontSize: '13px' }}>ไม่มีรูปภาพ</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '4px', padding: '4px', background: '#F7FAFC', borderRadius: '8px', marginBottom: '12px' }}>
            <button 
              type="button"
              className="btn" 
              style={{ 
                flex: 1, 
                padding: '6px', 
                fontSize: '12px', 
                background: formData.imgType === 'url' ? '#ffffff' : 'transparent', 
                color: formData.imgType === 'url' ? '#2D3748' : '#4A5568', 
                borderColor: 'transparent',
                boxShadow: formData.imgType === 'url' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: formData.imgType === 'url' ? '600' : '500'
              }} 
              onClick={() => { setFormData(prev => ({ ...prev, imgType: 'url', image: '' })); setImgPreview(''); }}
            >
              <Link size={14} style={{ marginRight: '4px', display: 'inline' }} /> แบบใส่ URL
            </button>
            <button 
              type="button"
              className="btn" 
              style={{ 
                flex: 1, 
                padding: '6px', 
                fontSize: '12px', 
                background: formData.imgType === 'upload' ? '#ffffff' : 'transparent', 
                color: formData.imgType === 'upload' ? '#2D3748' : '#4A5568', 
                borderColor: 'transparent',
                boxShadow: formData.imgType === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: formData.imgType === 'upload' ? '600' : '500'
              }} 
              onClick={() => { setFormData(prev => ({ ...prev, imgType: 'upload', image: '' })); setImgPreview(''); setTimeout(() => document.getElementById('fileUpload')?.click(), 100); }}
            >
              <Upload size={14} style={{ marginRight: '4px', display: 'inline' }} /> อัพโหลดไฟล์
            </button>
          </div>

          {formData.imgType === 'url' ? (
            <div>
              <input 
                type="url" 
                className="input" 
                placeholder="วางลิงก์รูปภาพ (URL) ที่นี่..." 
                value={formData.image || ''} 
                style={{ fontSize: '13px', marginBottom: 0 }}
                onChange={(e) => setFormData(p => ({ ...p, image: e.target.value }))}
              />
            </div>
          ) : (
            <div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
                id="fileUpload" 
              />
              <label htmlFor="fileUpload" style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'center', background: '#EBF8FF', color: '#3182CE', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                 เลือกไฟล์ภาพ
              </label>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAILS FORM */}
        <div className="card" style={{ padding: '24px', backgroundColor: '#fff' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#4A5568', margin: 0 }}>หมวดหมู่สินค้า</label>
                  <button type="button" className="btn-icon" onClick={() => setIsCategoryConfigOpen(true)} title="ตั้งค่าหมวดหมู่และตัวย่อ" style={{ padding: '4px', background: '#F7FAFC' }}>
                     <Settings size={14} style={{ color: '#4A5568' }} />
                  </button>
                </div>
                <select 
                  className="input" 
                  value={formData.category} 
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ background: '#F7FAFC' }}
                >
                  {categoryPrefixes.map(c => (
                    <option key={c.name} value={c.name}>{c.name} ({c.prefix})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>รหัสสินค้า (SKU)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="input" 
                    value={formData.sku} 
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required 
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={handleManualGenSku} 
                    style={{ padding: '8px', minWidth: 'max-content', background: '#E6FFFA', borderColor: '#38A169', color: '#38A169' }}
                    title="สุ่มรหัสใหม่"
                  >
                    <Sparkles size={16} /> บูรณาการ
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>บาร์โค้ด (Barcode)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="เช่น SR001570" 
                      value={formData.barcode} 
                      onChange={(e) => {
                        setIsBarcodeAuto(false); // ปิด Auto สถ้าผู้ใช้แก้เอง
                        setFormData({ ...formData, barcode: e.target.value.toUpperCase() });
                      }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      onClick={() => setIsBarcodeAuto(true)} 
                      style={{ padding: '8px', minWidth: 'max-content', background: isBarcodeAuto ? '#38B2AC' : '#F7FAFC', border: isBarcodeAuto ? 'none' : '1px solid #CBD5E0', color: isBarcodeAuto ? '#fff' : '#4A5568' }}
                    >
                      {isBarcodeAuto ? 'Sync ON' : 'Sync OFF'}
                    </button>
                  </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>หมวดหมู่ย่อย (Sub-Category)</label>
                <input 
                  list="add-sub-category-list"
                  type="text" 
                  className="input" 
                  placeholder="เช่น แหวนเพชร, สร้อยอิตาลี" 
                  value={formData.subCategory || ''} 
                  onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                />
                <datalist id="add-sub-category-list">
                  {allSubCats.map((cat, idx) => (
                    <option key={idx} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#4A5568', margin: 0 }}>ชื่อสินค้า (Product Name)</label>
                <button type="button" title="ตั้งชื่อตาม รหัสสินค้า / ราคา" onClick={() => setIsNameAuto(true)} style={{ padding: '3px 8px', fontSize: '11px', background: isNameAuto ? '#3182CE' : '#E2E8F0', color: isNameAuto ? '#fff' : '#4A5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                   Auto Name {isNameAuto ? 'ON' : 'OFF'}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="เช่น สร้อยคอทองคำ 1 บาท" 
                  value={formData.name} 
                  onChange={(e) => {
                    setIsNameAuto(false);
                    setFormData({ ...formData, name: e.target.value });
                  }}
                  required 
                  style={{ marginBottom: 0 }}
                />
                
                {showSuggestions && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, border: '1px solid #E2E8F0', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ fontSize: '11px', padding: '8px 12px', background: '#F7FAFC', color: '#718096', borderBottom: '1px solid #EDF2F7', fontWeight: 'bold' }}>พบสินค้าใกล้เคียง (คลิกเพื่อดึงข้อมูล)</div>
                    {nameSuggestions.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => selectSuggestion(p)}
                        style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #F7FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F0FFF4'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontSize: '13px' }}>
                           <span style={{ fontWeight: 'bold', color: '#2D3748' }}>{p.sku}</span>
                           <span style={{ marginLeft: '8px', color: '#4A5568' }}>{p.name}</span>
                        </div>
                        <div style={{ color: '#38A169', fontWeight: 'bold', fontSize: '12px' }}>฿{p.price}.-</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>ต้นทุน (Cost)</label>
                <input 
                  type="number" 
                  className="input" 
                  placeholder="0" 
                  value={formData.cost} 
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>ราคาขาย (Price)</label>
                <input 
                  type="number" 
                  className="input" 
                  placeholder="0" 
                  value={formData.price} 
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>ชั้นวาง (Floor 1)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="เช่น A1" 
                  value={formData.shelf1st || ''} 
                  onChange={(e) => setFormData({ ...formData, shelf1st: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>ชั้นวาง (Floor 3)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="เช่น WH-A1" 
                  value={formData.shelf3rd || ''} 
                  onChange={(e) => setFormData({ ...formData, shelf3rd: e.target.value })} 
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>หมายเหตุ / โน๊ตอื่น ๆ (Remark)</label>
              <input 
                type="text" 
                className="input" 
                placeholder="เช่น สั่งจองพิเศษ, ปล่อยหลุดจำนำ" 
                value={formData.remark || ''} 
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })} 
              />
            </div>

            <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #EDF2F7', paddingBottom: '8px', color: '#2D3748' }}>
              📦 จัดการสต็อกเริ่มต้น (Initial Assignment)
            </h4>

            <div style={{ padding: '16px', background: '#F7FAFC', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>สต็อกใส่ใน:</label>
                  <select 
                    className="input" 
                    value={formData.initialLocation} 
                    onChange={(e) => setFormData({ ...formData, initialLocation: e.target.value })}
                    style={{ background: '#fff' }}
                  >
                    <option value="1st">หน้าร้าน - ชั้น 1</option>
                    <option value="3rd">คลังสินค้า - ชั้น 3</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>จำนวนตั้งต้น</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={formData.stockQty} 
                    style={{ background: '#fff' }}
                    onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })} 
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4A5568' }}>โหมดจัดการสต็อก (Stock Mode)</label>
              <select 
                className="input" 
                value={formData.stockMode} 
                onChange={(e) => setFormData({ ...formData, stockMode: e.target.value })}
                style={{ background: '#FFF5F5', border: '1px solid #FEB2B2' }} // เน้นสีให้เป็นจุดสำคัญ
              >
                <option value="No Stock">No Stock (ไม่มีการนับสต็อก/บริการ)</option>
                <option value="Overselling">Overselling (นับสต็อกแต่ขายติดลบได้)</option>
                <option value="Restricted">Restricted (ล็อคตามสต็อกจริง - ขายไม่ได้ถ้าหมด)</option>
              </select>
              <p style={{ fontSize: '11px', color: '#718096', marginTop: '6px' }}>
                <AlertCircle size={12} style={{ display: 'inline', marginTop: '-2px', marginRight: '4px' }} /> 
                {formData.stockMode === 'Restricted' && "ล็อคการจำหน่ายเมื่อสินค้าเหลือ 0 เหมาะสำหรับสินค้ามีราคาสูง"}
                {formData.stockMode === 'Overselling' && "ยอมให้ขายสินค้าได้แม้จำนวนจะเป็น 0 เหมาะสำหรับงานจอง/Pre-order"}
                {formData.stockMode === 'No Stock' && "ไม่คำนวณจำนวนสินค้า เหมาะสำหรับค่าบริการหรือของจิปาถะ"}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setView('locations')} style={{ padding: '10px 24px' }} disabled={isUploading}>ยกเลิก</button>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '4px' }}>
                <input 
                  type="number" 
                  min="1" 
                  value={printQty} 
                  onChange={e => setPrintQty(Number(e.target.value))} 
                  style={{ width: '60px', padding: '6px', fontSize: '13px', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'bold' }} 
                  title="จำนวนที่จะพิมพ์"
                />
                <button type="button" className="btn btn-outline" onClick={() => window.print()} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#fff', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <Printer size={16} /> พิมพ์ ({printQty})
                </button>
              </div>
              <button type="submit" disabled={isUploading} className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', opacity: isUploading ? 0.7 : 1 }}>
                {isUploading ? 'กำลังอัปโหลดรหัสสินค้า...' : <><Check size={18} /> บันทึกและเพิ่มสินค้า</>}
              </button>
            </div>

            {/* Hidden Barcode Labels for Printing */}
            <div className="print-area" style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
               {[...Array(printQty)].map((_, i) => (
                 <div key={i} className="barcode-label">
                    <div className="barcode-info">SiS&RICH</div>
                    <div className="barcode-code">{formData.barcode || formData.sku}</div>
                    <div className="barcode-text">*{formData.barcode || formData.sku}*</div>
                    <div className="barcode-price">
                      {Number(formData.price || 0).toLocaleString()} .-
                    </div>
                 </div>
               ))}
            </div>

          </form>
        </div>
      </div>

            {/* ------------------------------------------------------------------
          CATEGORY CONFIG MODAL
         ------------------------------------------------------------------ */}
      {isCategoryConfigOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card animate-slide-in" style={{ width: '450px', maxWidth: '95%', maxHeight: '80vh', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2D3748' }}>⚙️ ตั้งค่าหมวดหมู่และตัวย่อ (SKU)</h3>
                <p style={{ fontSize: '13px', color: '#718096' }}>หมวดหมู่ที่ใช้แบ่งและสร้างรหัสอัตโนมัติ</p>
              </div>
              <button className="btn-icon" onClick={() => setIsCategoryConfigOpen(false)} style={{ color: '#4A5568' }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {localCats.map((c, idx) => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid #EDF2F7', borderRadius: '8px', background: '#F9FAFB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button type="button" className="btn-icon" disabled={idx === 0} onClick={() => moveUp(idx)} style={{ padding: '2px', color: idx === 0 ? '#CBD5E0' : '#4A5568' }}>▲</button>
                        <button type="button" className="btn-icon" disabled={idx === localCats.length - 1} onClick={() => moveDown(idx)} style={{ padding: '2px', color: idx === localCats.length - 1 ? '#CBD5E0' : '#4A5568' }}>▼</button>
                      </div>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#2D3748' }}>{c.name}</span>
                        <span style={{ fontSize: '12px', color: '#718096', marginLeft: '8px' }}>(ตัวย่อ: {c.prefix})</span>
                      </div>
                    </div>
                    <button type="button" className="btn-icon" onClick={() => handleDeleteLocalCategory(idx)} title="ลบหมวดหมู่นี้" style={{ padding: '6px', color: '#E53E3E' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ background: '#F7FAFC', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#4A5568' }}>เพิ่มผู้หมวดหมู่ใหม่</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input type="text" className="input" placeholder="ชื่อหมวดหมู่ (เช่น อุปกรณ์เสริม)" value={newCatName} onChange={e => setNewCatName(e.target.value)} style={{ marginBottom: '8px', padding: '8px 12px' }} required />
                    <input type="text" className="input" placeholder="ตัวย่อภาษาอังกฤษ (เช่น ACC)" value={newCatPrefix} onChange={e => setNewCatPrefix(e.target.value)} style={{ marginBottom: 0, padding: '8px 12px', textTransform: 'uppercase' }} required />
                  </div>
                  <button type="button" onClick={handleAddLocalCategory} className="btn btn-primary" style={{ padding: '10px', height: '100%' }}>
                     <Check size={16} /> บันทึกเพิ่ม
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #eee', gap: '12px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsCategoryConfigOpen(false)}>ยกเลิก</button>
              <button type="button" className="btn btn-primary" onClick={handleCommitCategoryChanges} style={{ background: '#38A169', borderColor: '#38A169' }}>บันทึกการแก้ไข</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

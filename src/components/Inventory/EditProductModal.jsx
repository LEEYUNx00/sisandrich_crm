import React, { useState } from 'react';
import { Link, Upload, CheckCircle } from 'lucide-react';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';

export default function EditProductModal({ products = [], editingProduct, setEditingProduct, handleUpdateProduct, handleDeleteProduct }) {
    const [imgType, setImgType] = useState('url'); // 'url' | 'upload'
    const [isUploading, setIsUploading] = useState(false);
    const [isNameAuto, setIsNameAuto] = useState(false); // ปิดไว้ก่อนสำหรับของเก่า ถ้าอยากใช้ค่อยกดเปิด
    const [isBarcodeAuto, setIsBarcodeAuto] = useState(false);
    
    // ระบบ Auto-Name 
    React.useEffect(() => {
      if (isNameAuto && editingProduct) {
        setEditingProduct(prev => {
          if (!prev) return prev;
          return { 
            ...prev, 
            name: `${prev.sku}${prev.price ? ` / ${prev.price}` : ''}` 
          };
        });
      }
    }, [editingProduct?.price, isNameAuto]); // ใช้ ?. เพื่อป้องกัน Error หน้าขาว
  
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
      if (e) e.target.value = null; // Clear input
    };

    const onUpdateSubmit = async (e) => {
      e.preventDefault();
      setIsUploading(true);
      try {
        let imageUrl = editingProduct.image;
        if (imgType === 'upload' && editingProduct.image && editingProduct.image.startsWith('data:image')) {
            const storageRef = ref(storage, `products/${editingProduct.sku || Date.now()}_${Date.now()}.jpg`);
            const uploadTask = await uploadString(storageRef, editingProduct.image, 'data_url');
            imageUrl = await getDownloadURL(uploadTask.ref);
        }
        // Update product state with new URL before parent saves to firestore
        // Wait, handleUpdateProduct reads from editingProduct. So we mutate it or pass the URL.
        // Actually, handleUpdateProduct in Inventory.jsx uses editingProduct.image directly.
        // We can pass the updated editingProduct object to a customized handler OR update the state first.
        
        // Since setEditingProduct is sync/async, the safest way is to make sure editingProduct is updated.
        // Let's create a temporary object and update state, then call handleUpdateProduct.
        const updatedProduct = { ...editingProduct, image: imageUrl };
        
        // Let's call a modified custom event structure or we can mutate setEditingProduct.
        setEditingProduct(updatedProduct);
        
        // Delay slightly to ensure state is set (or use higher order function).
        // Since setEditingProduct is set, inside handleUpdateProduct in Inventory.jsx:
        // const productRef = doc(db, 'products', editingProduct.id);
        // It reads from editingProduct.
        // To be completely safe, let's just use updatedProduct in place.
        // Wait, handleUpdateProduct takes 'e' as argument and reads editingProduct from parent scope.
        await handleUpdateProduct(e, updatedProduct); 
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: " + err.message);
      } finally {
        setIsUploading(false);
      }
    };

    if (!editingProduct) return null;

    const allSubCats = ["Evil eyes", "หัวใจ", "จี้เล็ก", "มุก", "หยดน้ำ", "สายฝอ", "เพรช", "อื่นๆ"];


  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card animate-slide-in" style={{ width: '450px', maxWidth: '90%', padding: '24px', backgroundColor: '#fff', borderRadius: '12px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>แก้ไขข้อมูลสินค้า</h3>
        <form onSubmit={onUpdateSubmit}>
          <div style={{ marginBottom: '16px', padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            {editingProduct.image ? (
              <img src={editingProduct.image} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0', margin: '0 auto 8px', display: 'block' }} />
            ) : (
              <div style={{ width: '60px', height: '60px', background: '#EDF2F7', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <span style={{ fontSize: '11px', color: '#718096' }}>ไม่มีรูปภาพ</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <button type="button" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: imgType === 'url' ? '#EBF8FF' : '#fff', color: imgType === 'url' ? '#3182CE' : '#4A5568', borderColor: imgType === 'url' ? '#3182CE' : '#E2E8F0' }} onClick={() => setImgType('url')}><Link size={12} /> ลิงก์รูปภาพ</button>
              <button type="button" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: imgType === 'upload' ? '#E6FFFA' : '#fff', color: imgType === 'upload' ? '#38A169' : '#4A5568', borderColor: imgType === 'upload' ? '#38A169' : '#E2E8F0' }} onClick={() => { setImgType('upload'); setTimeout(() => document.getElementById('edit-img-upload')?.click(), 100); }}><Upload size={12} /> อัปโหลดไฟล์</button>
            </div>
            {imgType === 'url' ? (
              <input type="text" className="input" placeholder="วางลิงก์รูปภาพ..." value={editingProduct.image || ''} onChange={(e) => setEditingProduct({...editingProduct, image: e.target.value})} style={{ fontSize: '12px', marginBottom: 0 }} />
            ) : (
              <div>
                <input type="file" accept="image/*" id="edit-img-upload" style={{ display: 'none' }} onChange={handleFileChange} />
                <label htmlFor="edit-img-upload" style={{ display: 'block', padding: '6px 12px', border: '1px dashed #CBD5E0', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '12px', backgroundColor: '#fff', color: '#718096', marginTop: '4px' }}>
                  📁 คลิกเพื่ออัปโหลดไฟล์รูปภาพ (บีบอัดให้อัตโนมัติ)
                </label>
              </div>
            )}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>ชื่อสินค้า</label>
              <button type="button" onClick={() => setIsNameAuto(!isNameAuto)} style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px', border: 'none', background: isNameAuto ? '#3182CE' : '#E2E8F0', color: isNameAuto ? '#fff' : '#4A5568', cursor: 'pointer', fontWeight: '600' }}>
                 Auto Name {isNameAuto ? 'ON' : 'OFF'}
              </button>
            </div>
            <input 
              type="text" 
              className="input" 
              value={editingProduct.name} 
              onChange={(e) => {
                setIsNameAuto(false);
                setEditingProduct({...editingProduct, name: e.target.value});
              }}
              required
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#718096' }}>รหัส (SKU) - *แก้ไขไม่ได้*</label>
              <input 
                type="text" 
                className="input" 
                value={editingProduct.sku} 
                readOnly
                style={{ backgroundColor: '#F7FAFC', cursor: 'not-allowed', color: '#A0AEC0' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>หมวดหมู่ (Category)</label>
              <input 
                type="text" 
                className="input" 
                value={editingProduct.category} 
                onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#718096' }}>บาร์โค้ด (Barcode) - *แก้ไขไม่ได้*</label>
              <input 
                type="text" 
                className="input" 
                value={editingProduct.barcode || ''} 
                readOnly
                style={{ backgroundColor: '#F7FAFC', cursor: 'not-allowed', color: '#A0AEC0' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>หมวดหมู่ย่อย (Sub-Category)</label>
              <input 
                list="sub-category-list"
                type="text" 
                className="input" 
                value={editingProduct.subCategory || ''} 
                onChange={(e) => setEditingProduct({...editingProduct, subCategory: e.target.value})}
              />
              <datalist id="sub-category-list">
                {allSubCats.map((cat, idx) => (
                  <option key={idx} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>ต้นทุน (Cost)</label>
              <input 
                type="number" 
                className="input" 
                value={editingProduct.cost || ''} 
                onChange={(e) => setEditingProduct({...editingProduct, cost: e.target.value})}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>ราคาขาย (Price)</label>
              <input 
                type="number" 
                className="input" 
                value={editingProduct.price} 
                onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>สต็อกหน้าร้าน (ชั้น 1)</label>
              <input 
                type="number" 
                className="input" 
                value={editingProduct.stock1st} 
                onChange={(e) => setEditingProduct({...editingProduct, stock1st: e.target.value})}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>สต็อกเก็บของ (ชั้น 3)</label>
              <input 
                type="number" 
                className="input" 
                value={editingProduct.stock3rd} 
                onChange={(e) => setEditingProduct({...editingProduct, stock3rd: e.target.value})}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>ชั้นวาง (Floor 1)</label>
              <input 
                type="text" 
                className="input" 
                placeholder="เช่น A1-B2" 
                value={editingProduct.shelf1st || editingProduct.shelf || ''} 
                onChange={(e) => setEditingProduct({...editingProduct, shelf1st: e.target.value, shelf: ''})}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>ชั้นวาง (Floor 3)</label>
              <input 
                type="text" 
                className="input" 
                placeholder="เช่น WH-A1" 
                value={editingProduct.shelf3rd || ''} 
                onChange={(e) => setEditingProduct({...editingProduct, shelf3rd: e.target.value})}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--primary-dark)' }}>
              โหมด (Stock Mode)
            </label>
            <select
              className="input"
              value={editingProduct.stockMode || 'Stock Control [Overselling]'}
              onChange={(e) => setEditingProduct({...editingProduct, stockMode: e.target.value})}
              style={{ cursor: 'pointer', backgroundColor: '#F7FAFC' }}
            >
              <option value="No Stock Control">No Stock Control (ไม่ตัดสต็อก ขายได้เรื่อยๆ)</option>
              <option value="Stock Control [Overselling]">Stock Control [Overselling] (ระบบตัดสต็อก ติดลบได้)</option>
              <option value="Stock Control [Restricted]">Stock Control [Restricted] (ระบบบล็อกเมื่อสต็อกหมดเป็น 0)</option>
            </select>
            {editingProduct.stockMode === 'No Stock Control' && <span style={{ fontSize: '12px', color: '#718096', display: 'block', marginTop: '4px' }}>เหมาะกับสินค้าที่ไม่ต้องนับจำนวนหรือมีปริมาณเยอะมาก</span>}
            {(!editingProduct.stockMode || editingProduct.stockMode === 'Stock Control [Overselling]') && <span style={{ fontSize: '12px', color: '#718096', display: 'block', marginTop: '4px' }}>เหมาะกับร้านที่ส่งของทัน แม้ของหมด</span>}
            {editingProduct.stockMode === 'Stock Control [Restricted]' && <span style={{ fontSize: '12px', color: '#E53E3E', display: 'block', marginTop: '4px' }}>ระบบจะบล็อกการขาย เมื่อสินค้าหมด (สำหรับของจำนวนจำกัด)</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-outline" style={{ color: 'var(--primary-red)', borderColor: 'var(--primary-red)' }} onClick={handleDeleteProduct}>
              ลบสินค้า
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-outline" disabled={isUploading} onClick={() => setEditingProduct(null)}>
                ยกเลิก
              </button>
              <button type="submit" className="btn btn-primary" disabled={isUploading}>
                {isUploading ? 'กำลังประมวลผล...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

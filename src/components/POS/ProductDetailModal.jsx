import React, { useState, useEffect } from 'react';
import { X, Edit3, Save, Package, Image as ImageIcon, Trash2, Link, Upload } from 'lucide-react';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';

export default function ProductDetailModal({ 
  product, 
  isOpen, 
  onClose, 
  onUpdate, 
  onDelete 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [imgType, setImgType] = useState('url');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({ ...product });
      setIsEditing(false);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let imageUrl = formData.image;
      if (imgType === 'upload' && formData.image && formData.image.startsWith('data:image')) {
          const storageRef = ref(storage, `products/${formData.sku || Date.now()}_${Date.now()}.jpg`);
          const uploadTask = await uploadString(storageRef, formData.image, 'data_url');
          imageUrl = await getDownloadURL(uploadTask.ref);
      }
      
      const updatedProduct = { ...formData, image: imageUrl };
      await onUpdate(updatedProduct);
      setIsEditing(false);
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

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
            setFormData({ ...formData, image: compressedBase64 });
         };
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isEditing ? '#f8fafc' : 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: isEditing ? '#3182ce' : '#f1f5f9', padding: '8px', borderRadius: '12px', color: isEditing ? 'white' : '#64748b' }}>
              <Package size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                {isEditing ? 'แก้ไขข้อมูลสินค้า' : 'รายละเอียดสินค้า'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>SKU: {product.sku}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!isEditing ? (
            /* View Mode */
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '24px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', position: 'relative', aspectRatio: '1/1' }}>
                {product.image ? (
                  <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <ImageIcon size={48} strokeWidth={1} style={{ marginBottom: '12px' }} />
                    <span style={{ fontSize: '14px' }}>ไม่มีรูปภาพสินค้า</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>ชื่อสินค้า</label>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{product.name}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                    <label style={{ fontSize: '11px', color: '#0369a1', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>ราคาขาย</label>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#0369a1' }}>฿{(product.price || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                    <label style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>สต็อก (F1)</label>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#166534' }}>{(product.stock1st || 0).toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>ชิ้น</span></div>
                  </div>
                </div>

                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>หมวดหมู่:</span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{product.category || 'ทั่วไป'}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>ต้นทุน:</span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>฿{(product.cost || 0).toLocaleString()}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>ชั้นวาง (F1):</span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{product.shelf1st || product.shelf || '-'}</span>
                   </div>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <form onSubmit={handleUpdateSubmit} style={{ padding: '24px' }}>
              {/* Image Editor */}
              <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                 <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white' }}>
                      {formData.image ? (
                        <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><ImageIcon size={24}/></div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                       <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <button type="button" onClick={() => setImgType('url')} style={{ flex: 1, padding: '6px', fontSize: '12px', border: '1px solid', borderRadius: '8px', background: imgType === 'url' ? '#ebf8ff' : 'white', color: imgType === 'url' ? '#3182ce' : '#64748b', borderColor: imgType === 'url' ? '#3182ce' : '#e2e8f0', cursor: 'pointer' }}>URL</button>
                          <button type="button" onClick={() => setImgType('upload')} style={{ flex: 1, padding: '6px', fontSize: '12px', border: '1px solid', borderRadius: '8px', background: imgType === 'upload' ? '#f0fdf4' : 'white', color: imgType === 'upload' ? '#166534' : '#64748b', borderColor: imgType === 'upload' ? '#166534' : '#e2e8f0', cursor: 'pointer' }}>Upload</button>
                       </div>
                       {imgType === 'url' ? (
                         <input type="text" className="input" placeholder="วางลิงก์รูปภาพ..." value={formData.image || ''} onChange={(e) => setFormData({...formData, image: e.target.value})} style={{ fontSize: '12px', height: '32px', marginBottom: 0 }} />
                       ) : (
                         <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: '11px', color: '#64748b' }} />
                       )}
                    </div>
                 </div>
              </div>

              {/* Basic Fields */}
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '4px' }}>ชื่อสินค้า</label>
                  <input type="text" className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '4px' }}>ราคาขาย (฿)</label>
                    <input type="number" className="input" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '4px' }}>ต้นทุน (฿)</label>
                    <input type="number" className="input" value={formData.cost || ''} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '4px' }}>หมวดหมู่</label>
                    <input type="text" className="input" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '4px' }}>ชั้นวาง (F1)</label>
                    <input type="text" className="input" value={formData.shelf1st || formData.shelf || ''} onChange={e => setFormData({...formData, shelf1st: e.target.value, shelf: ''})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                   <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '4px' }}>สต็อกหน้าร้าน (F1)</label>
                    <input type="number" className="input" value={formData.stock1st || 0} onChange={e => setFormData({...formData, stock1st: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '4px' }}>สต็อกคลัง (F3)</label>
                    <input type="number" className="input" value={formData.stock3rd || 0} onChange={e => setFormData({...formData, stock3rd: Number(e.target.value)})} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '4px' }}>Stock Mode</label>
                  <select className="input" value={formData.stockMode || 'Stock Control [Overselling]'} onChange={e => setFormData({...formData, stockMode: e.target.value})}>
                    <option value="No Stock Control">No Stock Control</option>
                    <option value="Stock Control [Overselling]">Stock Control [Overselling]</option>
                    <option value="Stock Control [Restricted]">Stock Control [Restricted]</option>
                  </select>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid #edf2f7', display: 'flex', gap: '12px' }}>
          {!isEditing ? (
            <>
              <button 
                onClick={onDelete}
                style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '14px', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '700' }}
              >
                <Trash2 size={18} /> ลบสินค้า
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                style={{ flex: 1, background: '#3182ce', color: 'white', border: 'none', borderRadius: '14px', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '900', boxShadow: '0 4px 6px -1px rgba(49, 130, 206, 0.2)' }}
              >
                <Edit3 size={18} /> แก้ไขข้อมูล (Edit Data)
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="btn btn-outline"
                style={{ flex: 1, padding: '12px', borderRadius: '14px' }}
                disabled={isUploading}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleUpdateSubmit}
                style={{ flex: 2, background: '#10b981', color: 'white', border: 'none', borderRadius: '14px', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '900', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                disabled={isUploading}
              >
                {isUploading ? 'กำลังบันทึก...' : <><Save size={18} /> บันทึกการเปลี่ยนแปลง</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

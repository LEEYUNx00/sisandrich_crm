import os

path = r"c:\Users\liliy\Desktop\sisandrich\WEB_CRM_POS\src\components\Inventory\EditProductModal.jsx"
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Add imports
    if "import { Link, Upload }" not in text:
        text = text.replace("import React from 'react';", "import React, { useState } from 'react';\nimport { Link, Upload } from 'lucide-react';")

    # 2. Add State & handleFileChange
    marker = "if (!editingProduct) return null;"
    methods = """  const [imgType, setImgType] = useState('url'); // 'url' | 'upload'

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
  };

  if (!editingProduct) return null;"""
    
    if "const [imgType, setImgType]" not in text:
        text = text.replace(marker, methods)

    # 3. Add layout inside Form
    form_marker = "<form onSubmit={handleUpdateProduct}>"
    form_html = """<form onSubmit={handleUpdateProduct}>
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
              <button type="button" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: imgType === 'upload' ? '#E6FFFA' : '#fff', color: imgType === 'upload' ? '#38A169' : '#4A5568', borderColor: imgType === 'upload' ? '#38A169' : '#E2E8F0' }} onClick={() => setImgType('upload')}><Upload size={12} /> อัปโหลดไฟล์</button>
            </div>
            {imgType === 'url' ? (
              <input type="text" className="input" placeholder="วางลิงก์รูปภาพ..." value={editingProduct.image || ''} onChange={(e) => setEditingProduct({...editingProduct, image: e.target.value})} style={{ fontSize: '12px', marginBottom: 0 }} />
            ) : (
              <div>
                <input type="file" accept="image/*" id="edit-img-upload" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>
            )}
          </div>"""
    
    if "รูปจากลิงก์" not in text and "<label htmlFor=\"edit-img-upload\"" not in text:
        text = text.replace(form_marker, form_html)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Success")

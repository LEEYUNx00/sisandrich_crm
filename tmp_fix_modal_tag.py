import os

path = r"c:\Users\liliy\Desktop\sisandrich\WEB_CRM_POS\src\components\Inventory\EditProductModal.jsx"
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    marker = 'id="edit-img-upload" style={{ display: \'none\' }} onChange={handleFileChange} />'
    index = text.find(marker)
    if index != -1:
        div_index = text.find('</div>', index)
        if div_index != -1:
            before = text[:index + len(marker)]
            after = text[div_index:]
            
            insert_html = """
                <label htmlFor="edit-img-upload" style={{ display: 'block', padding: '6px 12px', border: '1px dashed #CBD5E0', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '12px', backgroundColor: '#fff', color: '#718096', marginTop: '4px' }}>
                  📁 คลิกเพื่ออัปโหลดไฟล์รูปภาพ (บีบอัดให้อัตโนมัติ)
                </label>
              """
            new_text = before + insert_html + after
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_text)
            print("Manual Split Success!")
        else:
            print("div_index not found")
    else:
        print("marker not found")

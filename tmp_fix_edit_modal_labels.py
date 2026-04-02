import os

path = r"c:\Users\liliy\Desktop\sisandrich\WEB_CRM_POS\src\components\Inventory\EditProductModal.jsx"
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Update Click Trigger for Button
    btn_old = "onClick={() => setImgType('upload')}><Upload size={12} /> อัปโหลดไฟล์</button>"
    btn_new = "onClick={() => { setImgType('upload'); setTimeout(() => document.getElementById('edit-img-upload')?.click(), 100); }}><Upload size={12} /> อัปโหลดไฟล์</button>"
    if btn_old in text:
        text = text.replace(btn_old, btn_new)

    # 2. Inject Label
    old_div = """              <div>
                <input type="file" accept="image/*" id="edit-img-upload" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>"""
    new_div = """              <div>
                <input type="file" accept="image/*" id="edit-img-upload" style={{ display: 'none' }} onChange={handleFileChange} />
                  📁 คลิกเพื่ออัปโหลดไฟล์รูปภาพ (บีบอัดให้อัตโนมัติ)
                </label>
              </div>"""
    if old_div in text:
        text = text.replace(old_div, new_div)
    else:
         print("old_div node not found accurately inside file container.")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Success")

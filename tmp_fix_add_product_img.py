import os

path = r"c:\Users\liliy\Desktop\sisandrich\WEB_CRM_POS\src\components\Inventory\AddProductView.jsx"
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Update Click Trigger for AddProductView
    old_click = "onClick={() => { setFormData(prev => ({ ...prev, imgType: 'upload', image: '' })); setImgPreview(''); }}"
    new_click = "onClick={() => { setFormData(prev => ({ ...prev, imgType: 'upload', image: '' })); setImgPreview(''); setTimeout(() => document.getElementById('fileUpload')?.click(), 100); }}"
    
    if old_click in text:
        text = text.replace(old_click, new_click)
    else:
         print("old_click not found inside file container.")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Success")

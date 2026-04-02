import os

path = r"c:\Users\liliy\Desktop\sisandrich\WEB_CRM_POS\src\components\Inventory\EditProductModal.jsx"
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    breaking_node = "const [imgPreview, setImgPreview] = useState(editingProduct.image || '');"
    if breaking_node in text:
         text = text.replace(breaking_node, "")
    else:
         # Fuzzy match
         if "setImgPreview" in text:
              import re
              text = re.sub(r'const\s+\[imgPreview,\s*setImgPreview\]\s*=\s*useState\(editingProduct\.image\s*\|\|\s*\'\'\);', '', text)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Success")

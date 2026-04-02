import os

path = r"c:\Users\liliy\Desktop\sisandrich\WEB_CRM_POS\src\components\Inventory\EditProductModal.jsx"
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

split_marker = '<div style={{ display: \'flex\', gap: \'16px\', marginBottom: \'24px\' }}>'
split_index = text.rfind(split_marker)

print("split_index:", split_index)
if split_index != -1:
    delete_index = text.find('handleDeleteProduct', split_index)
    print("delete_index:", delete_index)
    if delete_index != -1:
        div_marker = '<div style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\' }}>'
        div_index = text.rfind(div_marker, 0, delete_index) # explicit slice!
        print("div_index:", div_index)
        if div_index != -1:
            new_text = text[:split_index] + text[div_index:]
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_text)
            print("Success")

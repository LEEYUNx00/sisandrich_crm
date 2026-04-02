import os

path = r"c:\Users\liliy\Desktop\sisandrich\WEB_CRM_POS\src\components\Inventory\ProductListView.jsx"
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. State addition
    if "const [previewImage, setPreviewImage]" not in text:
        state_marker = "const [currentPage, setCurrentPage] = useState(1);"
        if state_marker in text:
            text = text.replace(state_marker, state_marker + "\n  const [previewImage, setPreviewImage] = useState(null);")

    # 2. Add onclick handler to IMG
    img_old = "<img src={p.image} alt={p.name} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0' }} />"
    img_new = "<img src={p.image} alt={p.name} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'transform 0.15s' }} onClick={() => setPreviewImage(p.image)} onMouseOver={e => e.currentTarget.style.transform='scale(1.13)'} onMouseOut={e => e.currentTarget.style.transform='scale(1)'} />"
    if img_old in text:
        text = text.replace(img_old, img_new)

    # 3. Add Modal Overlay
    overlay_marker = "      {viewingLogsProduct && ("
    if overlay_marker in text:
        overlay_html = """
      {/* 🖼️ Image Preview Overlay */}
      {previewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }} onClick={() => setPreviewImage(null)}>
          <div style={{ position: 'relative', maxWidth: '85vw', maxHeight: '85vh', display: 'flex', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} />
            <button style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setPreviewImage(null)}>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>×</span>
            </button>
          </div>
        </div>
      )}
"""
        text = text.replace(overlay_marker, overlay_html + overlay_marker)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Success")
else:
    print("Invalid path")

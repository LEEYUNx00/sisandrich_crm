import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Search, ArrowUpDown, Filter, Download, Plus, ArrowLeft, Archive, Store, Layers, FileDown, FileUp, ClipboardList, PenLine, ArrowRightLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

import LocationsView from '../components/Inventory/LocationsView';
import ProductListView from '../components/Inventory/ProductListView';
import AddProductView from '../components/Inventory/AddProductView';

export default function Inventory() {
  // activeView: 'locations' | 'products'
  const [activeView, setActiveView] = useState('locations');
  // selectedLocation: 'total' | '1st' | '3rd'
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);

  const [locations, setLocations] = useState({
    '1st': { ref: 'ST-001', name: 'สต็อกหน้าร้าน (ชั้น 1)', desc: 'จุดขายหน้าร้าน ชั้น 1' },
    '3rd': { ref: 'WH-001', name: 'สต็อกเก็บของ (ชั้น 3)', desc: 'คลังเก็บสินค้า ชั้น 3' }
  });
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [locationFormData, setLocationFormData] = useState({ ref: '', name: '', desc: '' });
  const [importPreview, setImportPreview] = useState(null);
  const [selectedImportItems, setSelectedImportItems] = useState([]);
  const [transferProduct, setTransferProduct] = useState(null);
  const [transferQty, setTransferQty] = useState('');
  const [importProgress, setImportProgress] = useState(null); // { current, total }

  // Fetch real-time data from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!transferProduct) return;
    const qty = parseInt(transferQty);
    if (isNaN(qty) || qty <= 0) return;

    const availableStock = selectedLocation === '3rd' ? (transferProduct.stock3rd || 0) : (transferProduct.stock1st || 0);
    if (qty > availableStock) {
      alert(`โอนย้ายไม่ได้! มีสต็อกไม่พอ (มีแค่ ${availableStock} ชิ้น)`);
      return;
    }

    try {
      const productRef = doc(db, 'products', transferProduct.id);
      await updateDoc(productRef, {
        stock1st: selectedLocation === '3rd' ? (transferProduct.stock1st || 0) + qty : transferProduct.stock1st - qty,
        stock3rd: selectedLocation === '3rd' ? transferProduct.stock3rd - qty : (transferProduct.stock3rd || 0) + qty
      });

      // Add System Audit Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'inventory',
        action: 'โอนย้ายสต็อก',
        detail: `สินค้า: ${transferProduct.name} (SKU: ${transferProduct.sku}) โอน ${qty} ชิ้น จากชั้น ${selectedLocation === '3rd' ? '3 -> 1' : '1 -> 3'}`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      setTransferProduct(null);
      alert('โอนย้ายสต็อกสำเร็จ!');
    } catch (error) {
      alert("Error updates: " + error.message);
    }
  };

  const handleUpdateProduct = async (e, customData = null) => {
    e.preventDefault();
    const data = customData || editingProduct;
    if (!data) return;
    try {
      const productRef = doc(db, 'products', data.id);
      await updateDoc(productRef, {
        name: data.name,
        sku: data.sku,
        category: data.category,
        price: Number(data.price),
        cost: Number(data.cost) || 0,
        shelf1st: data.shelf1st || '',
        shelf3rd: data.shelf3rd || '',
        stock1st: Number(data.stock1st),
        stock3rd: Number(data.stock3rd),
        stockMode: data.stockMode || 'Stock Control [Overselling]',
        image: data.image || ''
      });

      // Add System Audit Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'inventory',
        action: 'แก้ไขข้อมูลสินค้า',
        detail: `สินค้า: ${data.name} (SKU: ${data.sku}) ถูกแก้ไขข้อมูล`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      setEditingProduct(null);
    } catch (error) {
      alert("Error updating product: " + error.message);
    }
  };


  const handleDeleteProduct = async () => {
    if (window.confirm('คุณต้องการลบสินค้านี้ใช่หรือไม่?')) {
      try {
        const delProduct = { ...editingProduct };
        await deleteDoc(doc(db, 'products', delProduct.id));
        
        // Add System Audit Log
        await addDoc(collection(db, 'system_logs'), {
          type: 'inventory',
          action: 'ลบสินค้า',
          detail: `สินค้า: ${delProduct.name} (SKU: ${delProduct.sku}) ถูกลบออกจากระบบ`,
          operator: 'Admin Staff',
          timestamp: serverTimestamp()
        });

        setEditingProduct(null);
      } catch (error) {
        alert("Error deleting product: " + error.message);
      }
    }
  };

  const handleEditLocation = (locId) => {
    setEditingLocationId(locId);
    setLocationFormData(locations[locId]);
  };

  const handleSaveLocation = (e) => {
    e.preventDefault();
    setLocations({
      ...locations,
      [editingLocationId]: locationFormData
    });
    setEditingLocationId(null);
  };

  const handleDownloadCSV = (locId) => {
    const stockColsNames = Object.values(locations).map(l => l.ref).join(',');
    let csvStr = `No.,Image URL,SKU,Barcode,Product Name,Category,Sub-Category,Cost,Price,${stockColsNames},Total Stock,Stock Mode,Shelf Floor 1,Shelf Floor 3,Remark\n`;
    
    let index = 1;
    products.forEach(p => {
       const stock = locId === '1st' ? (p.stock1st || 0) : (p.stock3rd || 0);
       const totalStock = (p.stock1st || 0) + (p.stock3rd || 0);

       if (locId === 'total' || stock > 0) {
         const stockValues = Object.keys(locations).map(key => {
             return key === '1st' ? (p.stock1st || 0) : (p.stock3rd || 0);
         }).join(',');

         const imgUrl = p.image || '';
         const barcode = p.barcode || '';
         const subCategory = p.subCategory || '';
         const remark = p.remark || '';
         const s1 = p.shelf1st || p.shelf || '';
         const s3 = p.shelf3rd || '';

         csvStr += `${index},"${imgUrl}","${p.sku}","${barcode}","${p.name}","${p.category}","${subCategory}",${p.cost || 0},${p.price || 0},${stockValues},${totalStock},"${p.stockMode || 'Stock Control [Overselling]'}","${s1}","${s3}","${remark}"\n`;
         index++;
       }
    });

    const blob = new Blob(["\ufeff" + csvStr], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `inventory_${locId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getValue = (row, ...options) => {
    const key = Object.keys(row).find(k => options.some(opt => String(k).toLowerCase().trim() === String(opt).toLowerCase().trim()));
    return key ? row[key] : null;
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    let updatedCount = 0;
    let addedCount = 0;
    try {
      const itemsToProcess = importPreview.filter((_, i) => selectedImportItems.includes(i));
      setImportProgress({ current: 0, total: itemsToProcess.length });

      const CHUNK_SIZE = 400; // Batch รองรับสูงสุด 500
      for (let i = 0; i < itemsToProcess.length; i += CHUNK_SIZE) {
        const chunk = itemsToProcess.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach(item => {
           if (item.type === 'update') {
               batch.update(doc(db, 'products', item.id), item.newData);
               updatedCount++;
           } else {
               batch.set(doc(collection(db, 'products')), item.newData);
               addedCount++;
           }
        });

        await batch.commit();
        setImportProgress({ current: Math.min(i + CHUNK_SIZE, itemsToProcess.length), total: itemsToProcess.length });
      }

      // Add System Audit Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'inventory',
        action: 'นำเข้าไฟล์สาขา (Import)',
        detail: `นำเข้าสำเร็จ: เพิ่มใหม่ ${addedCount} รายการ, อัปเดต ${updatedCount} รายการ`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      setImportPreview(null);
      setImportProgress(null);
      alert(`นำเข้าไฟล์สำเร็จ!\n- อัปเดตรายการเดิม: ${updatedCount} รายการ\n- เพิ่มรายการใหม่: ${addedCount} รายการ`);
    } catch (error) {
      setImportProgress(null);
      alert("เกิดข้อผิดพลาดในการนำเข้าไฟล์: " + error.message);
    }
  };

  const handleImportCSV = (locId) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx, .xls, .csv';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rows = XLSX.utils.sheet_to_json(ws);
          if (!rows.length) { alert("ไฟล์ว่างเปล่า"); return; }

          let diffs = [];
          for (const row of rows) {
              const rawSku = getValue(row, 'SKU', 'รหัสสินค้า', 'รหัส (SKU)', '商品编码', '产品编号');
              if (!rawSku || String(rawSku).trim() === "") continue;
              const sku = String(rawSku).trim();

              const existing = products.find(p => p.sku?.trim().toLowerCase() === sku.toLowerCase());

              const stockVal = Number(getValue(row, 'Stock Branch', 'Stock', 'สต็อก', '庫存', '库存', 'Stock Branch 1', 'Stock Branch 3')) || 0;
              
              const has1stRef = getValue(row, locations['1st'].ref) !== null;
              const has3rdRef = getValue(row, locations['3rd'].ref) !== null;

              const fallback1st = Number(getValue(row, 'Stock Branch 1', 'หน้าร้าน (สาขา 1)', 'สต็อกหน้าร้าน (ชั้น 1)', '1楼库存')) || 0;
              const fallback3rd = Number(getValue(row, 'Stock Branch 3', 'คลังเก็บ (ชั้น 3)', 'สต็อกเก็บของ (ชั้น 3)', '3楼库存')) || 0;

              // --- 1. Get raw values from Row ---
              const rowName = getValue(row, 'Product Name', 'ชื่อสินค้า', 'Name', '商品名称');
              const rowBarcode = getValue(row, 'Barcode', 'บาร์โค้ด', '条码');
              const rowCategory = getValue(row, 'Category', 'หมวดหมู่', '分类', '类别');
              const rowSubCategory = getValue(row, 'Sub-Category', 'หมวดหมู่ย่อย', '子类别');
              const rowCost = getValue(row, 'Cost', 'ต้นทุน', 'ต้นทุน (Cost)', 'ต้นทุน(Cost)', '成本');
              const rowPrice = getValue(row, 'Price', 'ราคา', 'ราคาขาย', '价格');
              const rowStockMode = getValue(row, 'Stock Mode', 'โหมดสต็อก', '库存模式');
              const rowImage = getValue(row, 'Image URL', 'รูปภาพ', 'รูปภาพสินค้า', '图片');
              const rowShelf1st = getValue(row, 'Shelf Floor 1', 'ชั้นวาง-ชั่น1', '1楼货架');
              const rowShelf3rd = getValue(row, 'Shelf Floor 3', 'ชั้นวาง-ชั้น3', '3楼货架');
              const rowRemark = getValue(row, 'Remark', 'หมายเหตุ', '备注');

              // --- 2. Initialize productData (Prefer Existing > Row > Default) ---
              const productData = {
                sku: sku,
                barcode: (rowBarcode !== null && String(rowBarcode).trim() !== "") ? String(rowBarcode).trim() : (existing?.barcode || ''),
                name: (rowName !== null && String(rowName).trim() !== "") ? String(rowName).trim() : (existing?.name || 'สินค้าใหม่'),
                category: (rowCategory !== null && String(rowCategory).trim() !== "") ? String(rowCategory).trim() : (existing?.category || 'เครื่องประดับ'),
                subCategory: (rowSubCategory !== null && String(rowSubCategory).trim() !== "") ? String(rowSubCategory).trim() : (existing?.subCategory || ''),
                cost: (rowCost !== null && !isNaN(Number(rowCost))) ? Number(rowCost) : (existing?.cost || 0),
                price: (rowPrice !== null && !isNaN(Number(rowPrice))) ? Number(rowPrice) : (existing?.price || 0),
                stockMode: (rowStockMode !== null) ? String(rowStockMode) : (existing?.stockMode || 'Stock Control [Overselling]'),
                image: (rowImage !== null && String(rowImage).trim() !== "") ? String(rowImage).trim() : (existing?.image || ''),
                shelf1st: (rowShelf1st !== null && String(rowShelf1st).trim() !== "") ? String(rowShelf1st).trim() : (existing?.shelf1st || existing?.shelf || ''),
                shelf3rd: (rowShelf3rd !== null && String(rowShelf3rd).trim() !== "") ? String(rowShelf3rd).trim() : (existing?.shelf3rd || ''),
                remark: (rowRemark !== null && String(rowRemark).trim() !== "") ? String(rowRemark).trim() : (existing?.remark || ''),
                updatedAt: serverTimestamp()
              };

              // --- 3. Handle Special Floor Import (locId Logic) ---
              const generalShelf = getValue(row, 'Shelf', 'Shelf/Rack', 'เลขแทร็ก', 'ชั้นวาง', '货架', '货位');
              if (generalShelf !== null && String(generalShelf).trim() !== "") {
                const shelfVal = String(generalShelf).trim();
                if (locId === '1st') productData.shelf1st = shelfVal;
                if (locId === '3rd') productData.shelf3rd = shelfVal;
              }
              
              // Ensure we don't zero out the OTHER floor's stock if we are doing a floor-specific import
              if (has1stRef) {
                productData.stock1st = Number(getValue(row, locations['1st'].ref)) || 0;
              } else {
                // If importing for 1st floor, use the stock value from file. Otherwise keep existing.
                productData.stock1st = locId === '1st' ? stockVal : (existing?.stock1st || 0);
                // Fallback for general import (no locId)
                if (!locId && fallback1st) productData.stock1st = fallback1st;
              }

              if (has3rdRef) {
                productData.stock3rd = Number(getValue(row, locations['3rd'].ref)) || 0;
              } else {
                productData.stock3rd = locId === '3rd' ? stockVal : (existing?.stock3rd || 0);
                if (!locId && fallback3rd) productData.stock3rd = fallback3rd;
              }

              if (existing) {
                  let changedFields = [];
                  if (existing.name !== productData.name) changedFields.push(`ชื่อสินค้า: "${existing.name}" -> "${productData.name}"`);
                  if (existing.category !== productData.category) changedFields.push(`หมวดหมู่: "${existing.category}" -> "${productData.category}"`);
                  if (existing.subCategory !== productData.subCategory) changedFields.push(`หมวดหมู่ย่อย: "${existing.subCategory}" -> "${productData.subCategory}"`);
                  if (existing.barcode !== productData.barcode) changedFields.push(`บาร์โค้ด: "${existing.barcode}" -> "${productData.barcode}"`);
                  if (Number(existing.price) !== productData.price) changedFields.push(`ราคา: ฿${existing.price?.toLocaleString() || 0} -> ฿${productData.price.toLocaleString()}`);
                  if (Number(existing.cost) !== productData.cost) changedFields.push(`ต้นทุน: ฿${existing.cost?.toLocaleString() || 0} -> ฿${productData.cost.toLocaleString()}`);
                  if (Number(existing.stock1st) !== productData.stock1st) changedFields.push(`สต็อกหน้าร้าน: ${existing.stock1st || 0} -> ${productData.stock1st}`);
                  if (Number(existing.stock3rd) !== productData.stock3rd) changedFields.push(`สต็อกเก็บของ: ${existing.stock3rd || 0} -> ${productData.stock3rd}`);
                  if (existing.stockMode !== productData.stockMode) changedFields.push(`โหมดสต็อก: "${existing.stockMode}" -> "${productData.stockMode}"`);
                  if (existing.image !== productData.image) changedFields.push(`อัปเดตลิงก์รูปภาพใหม่`);
                  if (existing.shelf1st !== productData.shelf1st) changedFields.push(`ชั้นวาง1: "${existing.shelf1st || '-'}" -> "${productData.shelf1st}"`);
                  if (existing.shelf3rd !== productData.shelf3rd) changedFields.push(`ชั้นวาง3: "${existing.shelf3rd || '-'}" -> "${productData.shelf3rd}"`);
                  if (existing.remark !== productData.remark) changedFields.push(`หมายเหตุ: "${existing.remark}" -> "${productData.remark}"`);

                  if (changedFields.length > 0) {
                      diffs.push({ type: 'update', id: existing.id, sku: existing.sku, name: existing.name, image: existing.image, changes: changedFields, newData: productData });
                  }
              } else {
                  productData.createdAt = serverTimestamp();
                  diffs.push({ type: 'add', sku: productData.sku, name: productData.name, image: productData.image, newData: productData });
              }
          }

          if (diffs.length === 0) {
             alert("ข้อมูลในไฟล์ตรงกับระบบปัจจุบันแล้ว ไม่มีอะไรต้องอัปเดต");
             return;
          }

          setImportPreview(diffs);
          setSelectedImportItems(diffs.map((_, i) => i)); 
        } catch (error) {
          alert("เกิดข้อผิดพลาดในการโหลดไฟล์: " + error.message);
        }
      };
      reader.readAsArrayBuffer(file);
    };
    fileInput.click();
  };

  const handleDownloadTemplate = () => {
    // อ้างอิงจากรหัสคลังสินค้าที่สามารถแก้ไขได้แบบไดนามิก
    const stockCols = Object.values(locations).map(l => l.ref).join(',');
    const csvStr = `No.,Image URL,SKU,Barcode,Product Name,Category,Sub-Category,Cost,Price,${stockCols},Total Stock,Stock Mode,Shelf Floor 1,Shelf Floor 3,Remark\n`;
    const blob = new Blob(["\ufeff" + csvStr], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `inventory_import_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTransferBulk = () => {
    alert("ระบบกำลังพัฒนา: หากต้องการโอนย้ายสินค้า ให้กดที่เมนู 'สต็อก (Stock)' ของคลังที่ต้องการ แล้วเลือกโอนย้ายทีละรายการ");
  };

  const handleCreateMockProduct = async () => {
    const jewelryTypes = ['แหวนเพชร', 'สร้อยคอทองคำ', 'ต่างหูมุก', 'สร้อยข้อมือทอง', 'จี้เงินแท้', 'กำไลข้อมือ'];
    const type = jewelryTypes[Math.floor(Math.random() * jewelryTypes.length)];
    const id = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const name = prompt("เพิ่มข้อมูลเครื่องประดับตัวอย่าง (ชื่อสินค้า):", `${type} หลุดจำนำ รหัส JW-${id}`);
    if (!name) return;
    try {
      await addDoc(collection(db, 'products'), {
        name,
        sku: 'JW-' + id,
        category: name.split(' ')[0] || 'เครื่องประดับ',
        price: Math.floor(Math.random() * 50) * 1000 + 2900,
        cost: Math.floor(Math.random() * 20) * 1000 + 1000,
        stock1st: Math.floor(Math.random() * 3),
        stock3rd: Math.floor(Math.random() * 5),
        stockMode: 'Stock Control [Overselling]',
        image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&auto=format&fit=crop&q=60'
      });
    } catch (error) {
      alert("Error adding product: " + error.message);
    }
  };

  const [hideOutOfStock, setHideOutOfStock] = useState(false);

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    
    if (hideOutOfStock && selectedLocation !== 'total') {
      const stock = selectedLocation === '1st' ? (p.stock1st || 0) : (p.stock3rd || 0);
      return stock > 0;
    }
    return true;
  });

  const openLocation = (loc) => {
    setSelectedLocation(loc);
    setActiveView('products');
    setSearchTerm(''); // Clear search when switching view
    setHideOutOfStock(loc !== 'total'); // Default to hiding out of stock when viewing a specific floor
  };

  // ---------------------------------------------
  // VIEW 1: Locations List
  // ---------------------------------------------
  const renderProgressModal = () => {
    if (!importProgress) return null;
    const { current, total } = importProgress;
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card animate-slide-in" style={{ width: '400px', padding: '24px', backgroundColor: '#fff', textAlign: 'center', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '18px', color: '#2D3748' }}>📥 กำลังนำเข้าข้อมูลเข้าระบบ</h3>
          <p style={{ fontSize: '13px', color: '#718096', marginBottom: '20px' }}>กรุณาอย่าปิดหรือรีเฟรชหน้านี้ ระบบกำลังประมวลผล</p>
          
          <div style={{ width: '100%', height: '10px', backgroundColor: '#EDF2F7', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ width: `${percent}%`, height: '100%', backgroundColor: '#48BB78', transition: 'width 0.3s ease' }}></div>
          </div>
          
          <div style={{ fontWeight: 'bold', color: '#2F855A', fontSize: '16px' }}>
            {current.toLocaleString()} / {total.toLocaleString()} รายการ ({percent}%)
          </div>
        </div>
      </div>
    );
  };

  if (activeView === 'locations') {
    return (
      <>
        {renderProgressModal()}
        <LocationsView 
        locations={locations}
        products={products}
        handleDownloadTemplate={handleDownloadTemplate}
        openLocation={openLocation}
        handleEditLocation={handleEditLocation}
        handleTransferBulk={handleTransferBulk}
        handleDownloadCSV={handleDownloadCSV}
        handleImportCSV={handleImportCSV}
        editingLocationId={editingLocationId}
        setEditingLocationId={setEditingLocationId}
        locationFormData={locationFormData}
        setLocationFormData={setLocationFormData}
        handleSaveLocation={handleSaveLocation}
        importPreview={importPreview}
        setImportPreview={setImportPreview}
        selectedImportItems={selectedImportItems}
        setSelectedImportItems={setSelectedImportItems}
        handleConfirmImport={handleConfirmImport}
      />
      </>
    );
  }

  if (activeView === 'add_product') {
    return <AddProductView products={products} setView={setActiveView} />
  }

  // ---------------------------------------------
  // VIEW 2: Product List for Selected Location
  // ---------------------------------------------
  return (
    <>
    {renderProgressModal()}
    <ProductListView 
      selectedLocation={selectedLocation}
      locations={locations}
      handleCreateMockProduct={handleCreateMockProduct}
      handleDownloadCSV={handleDownloadCSV}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      hideOutOfStock={hideOutOfStock}
      setHideOutOfStock={setHideOutOfStock}
      loading={loading}
      products={products}
      filteredProducts={filteredProducts}
      setTransferProduct={setTransferProduct}
      setTransferQty={setTransferQty}
      setEditingProduct={setEditingProduct}
      setActiveView={setActiveView}
      editingProduct={editingProduct}
      handleUpdateProduct={handleUpdateProduct}
      handleDeleteProduct={handleDeleteProduct}
      transferProduct={transferProduct}
      transferQty={transferQty}
      handleConfirmTransfer={handleConfirmTransfer}
    />
    </>
  );
}

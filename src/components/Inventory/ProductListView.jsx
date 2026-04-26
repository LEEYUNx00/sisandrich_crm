import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Download, Search, ArrowRightLeft, PenLine, Pencil, Check, X, Layers, AlertCircle, ShoppingBag, DollarSign, TrendingUp, Printer } from 'lucide-react';
import EditProductModal from './EditProductModal';
import TransferModal from './TransferModal';
import AddProductModal from './AddProductModal';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, writeBatch, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function ProductListView({
  selectedLocation, locations, handleCreateMockProduct, handleDownloadCSV, 
  searchTerm, setSearchTerm, hideOutOfStock, setHideOutOfStock, loading, products, filteredProducts,
  setTransferProduct, setTransferQty, setEditingProduct, setActiveView,
  editingProduct, handleUpdateProduct, handleDeleteProduct,
  transferProduct, transferQty, handleConfirmTransfer
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'min_alert'
  const [editingMinQtyId, setEditingMinQtyId] = useState(null);
  const [minQtyInput, setMinQtyInput] = useState('');
  const [adjustingProduct, setAdjustingProduct] = useState(null); // { product, type: 'add'|'withdraw' }
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [bulkStockMode, setBulkStockMode] = useState(''); // โหมดสต็อกที่จะปรับเป็นกลุ่ม
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingLogsProduct, setViewingLogsProduct] = useState(null);
  const [productLogs, setProductLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewImage, setPreviewImage] = useState(null);
  
  // Printing State
  const [printingProduct, setPrintingProduct] = useState(null);
  const [printForm, setPrintForm] = useState({ name: '', sku: '', price: '', qty: 3 });
  const [printSettings, setPrintSettings] = useState({
    barcodeWidth: '32mm',
    barcodeHeight: '25mm',
    showShopNameOnBarcode: true,
    shopName: 'Sis&Rich'
  });

  useEffect(() => {
    const fetchPrintSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'receipt');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPrintSettings(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching print settings:", error);
      }
    };
    fetchPrintSettings();
  }, []);

  const getLocationTitle = () => {
    if (selectedLocation === 'total') return 'สต็อกรวมทั้งหมด (Total Stock)';
    if (selectedLocation === '1st') return locations['1st']?.name;
    if (selectedLocation === '3rd') return locations['3rd']?.name;
    return '';
  };

  // ------------------------------------------------------------------
  // METRICS COMPUTATIONS
  // ------------------------------------------------------------------
  const getProductStock = (p) => {
    if (selectedLocation === 'total') return (p.stock1st || 0) + (p.stock3rd || 0);
    if (selectedLocation === '1st') return p.stock1st || 0;
    return p.stock3rd || 0;
  };

  const totalItems = products.length;
  const outOfStockItems = products.filter(p => getProductStock(p) <= 0).length;
  const lowStockItems = products.filter(p => {
    const stock = getProductStock(p);
    const min = p.minQty || 5; 
    return stock > 0 && stock <= min;
  }).length;
  
  const totalValue = products.reduce((sum, p) => {
    const stock = getProductStock(p);
    return sum + (stock * (p.cost || 0));
  }, 0);

  useEffect(() => {
    if (!viewingLogsProduct) {
       setProductLogs([]);
       return;
    }
    setLoadingLogs(true);
    const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
       const fetched = snapshot.docs.map(doc => ({
           id: doc.id,
           ...doc.data(),
           timestamp: doc.data().timestamp?.toDate() || new Date()
       }));
       const filtered = fetched.filter(log => 
          log.detail && (
            log.detail.includes(viewingLogsProduct.sku) || 
            log.detail.includes(viewingLogsProduct.name)
          )
       );
       setProductLogs(filtered);
       setLoadingLogs(false);
    }, () => {
       setLoadingLogs(false);
    });
    return () => unsubscribe();
  }, [viewingLogsProduct]);

  useEffect(() => {
     setCurrentPage(1);
  }, [activeTab, searchTerm]);
 
  // ------------------------------------------------------------------
  // INLINE ACTIONS (FIRESTORE)
  // ------------------------------------------------------------------
  const handleUpdateStockMode = async (productId, newMode) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        stockMode: newMode,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      alert("อัปเดตโหมดสต็อกไม่สำเร็จ: " + error.message);
    }
  };

  const handleSaveMinQty = async (p) => {
    const newVal = Number(minQtyInput);
    if (isNaN(newVal) || newVal < 0) return;
    try {
      await updateDoc(doc(db, 'products', p.id), {
        minQty: newVal,
        updatedAt: serverTimestamp()
      });
      setEditingMinQtyId(null);
    } catch (error) {
      alert("อัปเดตไม่สำเร็จ: " + error.message);
    }
  };

  const handleConfirmQuickAdjust = async (e) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const qty = Number(adjustQty);
    if (isNaN(qty) || qty <= 0) return;

    const p = adjustingProduct.product;
    const type = adjustingProduct.type;
    const targetField = selectedLocation === '3rd' ? 'stock3rd' : 'stock1st';
    const currentStock = p[targetField] || 0;

    let newStock = currentStock;
    if (type === 'add') newStock = currentStock + qty;
    if (type === 'withdraw') {
      if (currentStock < qty && p.stockMode === 'Stock Control [Restricted]') {
        alert("ตัดยอดไม่สำเร็จ: จำนวนสต็อกไม่เพียงพอ (จำกัดการติดลบ)");
        return;
      }
      newStock = currentStock - qty;
    }

    try {
      // 1. Update Product
      await updateDoc(doc(db, 'products', p.id), {
        [targetField]: newStock,
        updatedAt: serverTimestamp()
      });

      // 2. Add History Log for detailed metrics
      await addDoc(collection(db, 'inventory_logs'), {
        productId: p.id,
        sku: p.sku || '',
        name: p.name || '',
        type: type, // 'add', 'withdraw'
        amount: qty,
        location: selectedLocation,
        reason: adjustReason,
        timestamp: serverTimestamp()
      });

      setAdjustingProduct(null);
      setAdjustQty('');
      setAdjustReason('');
    } catch (error) {
      alert("ปรับสต็อกไม่สำเร็จ: " + error.message);
    }
  };

  const handlePrintLabel = (p) => {
    setPrintForm({
      name: p.name || '',
      sku: p.barcode || p.sku || '',
      price: p.price || '',
      qty: 3
    });
    setPrintingProduct(p);
  };

  const executePrint = async () => {
    try {
      await fetch('http://localhost:8000/print-barcode', {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Printer: 'TSC TTP-247',
          Barcode: printForm.sku,
          Name: `${printForm.sku}/${printForm.price}.-`,
          Price: printForm.price,
          Qty: printForm.qty
        })
      });
      alert('ส่งคำสั่งพิมพ์ไปยัง TSC TTP-247 สำเร็จ');
      setPrintingProduct(null);
    } catch (err) {
      console.warn("Bridge print-barcode failed, fallback...", err);
      window.print();
    }
  };

  const handleApplyAllStockModeTrigger = (e) => {
    const newMode = e.target.value;
    if (!newMode) return;
    
    const itemsToUpdate = tabFilteredProducts; 
    if (itemsToUpdate.length === 0) {
      alert("ไม่มีรายการสินค้าให้ปรับปรุง");
      e.target.value = "";
      return;
    }

    setBulkStockMode(newMode);
    e.target.value = ""; // reset
  };

  const handleConfirmBulkStockMode = async () => {
    const itemsToUpdate = tabFilteredProducts;
    try {
      const batch = writeBatch(db);
      itemsToUpdate.forEach(item => {
        const ref = doc(db, 'products', item.id);
        batch.update(ref, { 
          stockMode: bulkStockMode,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      alert(`ปรับโหมดสต็อกสินค้าสำเร็จ 👏 (${itemsToUpdate.length} รายการ)`);
      setBulkStockMode(''); // ปิด Modal
    } catch (error) {
      alert("ข้อผิดพลาดในการปรับโหมดทั้งหมด: " + error.message);
    }
  };

  // ------------------------------------------------------------------
  // FILTERING BY TAB
  // ------------------------------------------------------------------
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest'); 
  const [showOutOfStock, setShowOutOfStock] = useState(true); // Toggle to hide/show 0 stock in 'All' tab

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  // ------------------------------------------------------------------
  // FILTERING & SORTING LOGIC
  // ------------------------------------------------------------------
  const tabFilteredProducts = filteredProducts
    .filter(p => {
      const stock = getProductStock(p);
      const min = p.minQty || 5;

      // 1. Tab Status Filter
      if (activeTab === 'min_alert') {
        if (stock > min) return false;
      } else if (activeTab === 'out_of_stock') {
        if (stock > 0) return false;
      } else if (activeTab === 'all') {
        // ในหน้า All เรากรองตาม showOutOfStock toggle
        if (!showOutOfStock && stock <= 0) return false;
      }
      
      // 2. Category Filter
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'latest') {
        const timeA = a.updatedAt?.toDate?.()?.getTime() || 0;
        const timeB = b.updatedAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      }
      if (sortBy === 'stock_high') return getProductStock(b) - getProductStock(a);
      if (sortBy === 'stock_low') return getProductStock(a) - getProductStock(b);
      if (sortBy === 'sku') return (a.sku || '').localeCompare(b.sku || '');
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

  const ITEMS_PER_PAGE = 100;
  const totalPages = Math.ceil(tabFilteredProducts.length / ITEMS_PER_PAGE);
  const currentItems = tabFilteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
 
  return (
    <div className="animate-slide-in">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .barcode-print-row, .barcode-print-row * { visibility: visible; }
            .barcode-print-row {
              position: absolute; left: 0; top: 0;
              width: 102mm; /* 32mm * 3 labels + 3mm gap * 2 slots = 102mm */
              height: 25mm;
              display: flex !important;
              gap: 3mm; /* ระยะห่างระหว่างดวง (แนวนอน) 3 มม. ตามสเปค */
              background: white;
            }
            .barcode-item {
              width: 33mm; /* ขยับเพื่อให้ลงตัวกับกระดาษ 3 ดวง */
              height: 25mm;
              display: flex !important; flex-direction: column;
              align-items: center; justify-content: center;
              text-align: center;
              padding: 0 1px;
              overflow: hidden;
              box-sizing: border-box;
            }
            .barcode-text { 
              font-family: 'Libre Barcode 39 Text', cursive !important; 
              font-size: 26px !important; 
              margin: -1px 0; 
              line-height: 1;
              transform: scaleX(0.7);
              transform-origin: center;
              white-space: nowrap;
            }
            .barcode-price { font-size: 11px; font-weight: 900; width: 100%; border-top: 0.5px solid #000; padding-top: 1px; margin-top: 1px; }
            .barcode-code { font-size: 8px; font-weight: bold; }
            .barcode-shop { font-size: 7px; font-weight: bold; opacity: 0.8; }
          }
        `}
      </style>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-icon" onClick={() => setActiveView('locations')} style={{ borderRadius: '50%', padding: '10px', backgroundColor: '#F3F4F6' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-dark)' }}>{getLocationTitle()}</h2>
            <p style={{ fontSize: '14px', color: '#718096' }}>จัดการและนับจำนวนสต็อกสินค้าแบบเรียลไทม์</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setActiveView('add_product')}>
            <Plus size={18} /> สินค้าใหม่
          </button>
          <button className="btn btn-primary" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handleDownloadCSV(selectedLocation)}>
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      {/* DASHBOARD SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fff', borderLeft: '4px solid #3182CE', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ background: '#EBF8FF', padding: '8px', borderRadius: '10px', color: '#3182CE' }}><Layers size={20} /></div>
          <div>
            <p style={{ fontSize: '12px', color: '#718096', fontWeight: '500', marginBottom: '2px' }}>รายการทั้งหมด</p>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#2D3748' }}>{totalItems} <span style={{ fontSize: '11px', color: '#718096', fontWeight: 'normal' }}>Sku</span></h3>
          </div>
        </div>

        <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fff', borderLeft: '4px solid #D69E2E', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ background: '#FEFCBF', padding: '8px', borderRadius: '10px', color: '#D69E2E' }}><AlertCircle size={20} /></div>
          <div>
            <p style={{ fontSize: '12px', color: '#718096', fontWeight: '500', marginBottom: '2px' }}>ใกล้หมด (Low)</p>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#D69E2E' }}>{lowStockItems}</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fff', borderLeft: '4px solid #E53E3E', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ background: '#FFF5F5', padding: '8px', borderRadius: '10px', color: '#E53E3E' }}><ShoppingBag size={20} /></div>
          <div>
            <p style={{ fontSize: '12px', color: '#718096', fontWeight: '500', marginBottom: '2px' }}>สินค้าหมด (Out)</p>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#E53E3E' }}>{outOfStockItems}</h3>
          </div>
        </div>

        <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fff', borderLeft: '4px solid #38A169', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ background: '#E6FFFA', padding: '8px', borderRadius: '10px', color: '#38A169' }}><DollarSign size={20} /></div>
          <div>
            <p style={{ fontSize: '12px', color: '#718096', fontWeight: '500', marginBottom: '2px' }}>มูลค่าคลังสินค้า</p>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#38A169' }}>฿{totalValue.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="card" style={{ padding: '16px', marginBottom: '16px', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', padding: '4px', background: '#F7FAFC', borderRadius: '8px' }}>
              <button className={`btn ${activeTab === 'all' ? 'btn-primary' : ''}`} style={{ padding: '6px 16px', fontSize: '12px', background: activeTab === 'all' ? 'var(--primary-red)' : 'transparent', color: activeTab === 'all' ? 'white' : '#4A5568', borderColor: 'transparent' }} onClick={() => setActiveTab('all')}>ทั้งหมด (All)</button>
              <button className={`btn ${activeTab === 'min_alert' ? 'btn-danger' : ''}`} style={{ padding: '6px 16px', fontSize: '12px', background: activeTab === 'min_alert' ? '#E53E3E' : 'transparent', color: activeTab === 'min_alert' ? 'white' : '#4A5568', borderColor: 'transparent' }} onClick={() => setActiveTab('min_alert')}>⚠️ ใกล้หมด</button>
              <button className={`btn ${activeTab === 'out_of_stock' ? 'btn-danger' : ''}`} style={{ padding: '6px 16px', fontSize: '12px', background: activeTab === 'out_of_stock' ? '#2D3748' : 'transparent', color: activeTab === 'out_of_stock' ? 'white' : '#4A5568', borderColor: 'transparent' }} onClick={() => setActiveTab('out_of_stock')}>🚫 หมดสต็อก</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select className="input" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', marginBottom: 0 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">📁 ทุกหมวดหมู่</option>
                {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
              </select>
              <select className="input" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', marginBottom: 0 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="latest">⏱️ แก้ไขล่าสุด</option>
                <option value="stock_high">📦 มากไปน้อย</option>
                <option value="stock_low">📦 น้อยไปมาก</option>
                <option value="sku">🔢 SKU</option>
                <option value="name">🔤 ชื่อสินค้า</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <div className="input-icon-wrapper">
                <Search className="icon" size={18} />
                <input type="text" className="input" placeholder="ค้นหา SKU หรือชื่อสินค้า..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE LIST */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#718096' }}>กำลังโหลดข้อมูล...</div>
        ) : (
          <div className="table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F7FAFC' }}>
                <tr>
                  <th>#</th>
                  <th>รูปภาพ</th>
                  <th>สินค้า / SKU</th>
                  <th>ยอดสต็อก</th>
                  <th>Shelf</th>
                  <th>Stock Mode</th>
                  <th style={{ textAlign: 'right' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((p, index) => {
                  const stock = getProductStock(p);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                      <td>{index + 1}</td>
                      <td>
                        {p.image && <img src={p.image} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} onClick={() => setPreviewImage(p.image)} />}
                      </td>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>SKU: {p.sku}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: stock <= 0 ? '#E53E3E' : '#2B6CB0' }}>{stock}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: '500' }}>
                          {selectedLocation === 'total' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                               <span style={{ fontSize: '11px', color: '#718096' }}>F1: {p.shelf1st || p.shelf || '-'}</span>
                               <span style={{ fontSize: '11px', color: '#718096' }}>F3: {p.shelf3rd || '-'}</span>
                            </div>
                          ) : (
                            <>
                              {selectedLocation === '1st' ? (p.shelf1st || p.shelf || '-') : (p.shelf3rd || '-')}
                              {(selectedLocation === '1st' && p.shelf3rd) && (
                                <div style={{ fontSize: '10px', color: '#38A169', marginTop: '2px' }}>
                                  (Also in F3: {p.shelf3rd})
                                </div>
                              )}
                              {(selectedLocation === '3rd' && (p.shelf1st || p.shelf)) && (
                                <div style={{ fontSize: '10px', color: '#3182CE', marginTop: '2px' }}>
                                  (Also in F1: {p.shelf1st || p.shelf})
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <select className="input" style={{ padding: '4px', fontSize: '12px', width: '140px', marginBottom: 0 }} value={p.stockMode || ''} onChange={(e) => handleUpdateStockMode(p.id, e.target.value)}>
                           <option value="No Stock Control">No Stock</option>
                           <option value="Stock Control [Overselling]">Overselling</option>
                           <option value="Stock Control [Restricted]">Restricted</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                           <button className="btn" style={{ padding: '6px', background: '#EBF8FF', color: '#3182CE' }} onClick={() => setViewingLogsProduct(p)}>Detail</button>
                           {selectedLocation !== 'total' && (
                             <>
                               <button className="btn" style={{ padding: '6px', background: '#E6FFFA', color: '#38A169' }} onClick={() => setAdjustingProduct({ product: p, type: 'add' })}>+</button>
                               <button className="btn" style={{ padding: '6px', background: '#FFF5F5', color: '#E53E3E' }} onClick={() => setAdjustingProduct({ product: p, type: 'withdraw' })}>-</button>
                               <button className="btn-icon" onClick={() => setTransferProduct(p)}><ArrowRightLeft size={16} /></button>
                               <button className="btn-icon" style={{ background: '#E6FFFA' }} onClick={() => handlePrintLabel(p)}><Printer size={16} style={{ color: '#38A169' }} /></button>
                             </>
                           )}
                           <button className="btn-icon" onClick={() => setEditingProduct(p)}><PenLine size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div style={{ padding: '12px', borderTop: '1px solid #eee', textAlign: 'center' }}>
                <button className="btn btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>ก่อนหน้า</button>
                <span style={{ margin: '0 15px' }}>หน้า {currentPage} จาก {totalPages}</span>
                <button className="btn btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>ถัดไป</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      <EditProductModal products={products} editingProduct={editingProduct} setEditingProduct={setEditingProduct} handleUpdateProduct={handleUpdateProduct} handleDeleteProduct={handleDeleteProduct} />
      <TransferModal transferProduct={transferProduct} setTransferProduct={setTransferProduct} transferQty={transferQty} setTransferQty={setTransferQty} selectedLocation={selectedLocation} locations={locations} handleConfirmTransfer={handleConfirmTransfer} />
      
      {/* QUICK ADJUST MODAL */}
      {adjustingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '350px', padding: '24px', background: '#fff' }}>
             <h3>{adjustingProduct.type === 'add' ? 'เพิ่มสต็อก' : 'ลดสต็อก'}</h3>
             <form onSubmit={handleConfirmQuickAdjust}>
                <input type="number" className="input" placeholder="จำนวน" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} required />
                <input type="text" className="input" placeholder="เหตุผล" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                   <button type="button" className="btn btn-outline" onClick={() => setAdjustingProduct(null)}>ยกเลิก</button>
                   <button type="submit" className="btn btn-primary">ยืนยัน</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW */}
      {previewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="" style={{ maxWidth: '90%', maxHeight: '90%' }} />
        </div>
      )}

      {/* LOGS MODAL */}
      {viewingLogsProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '600px', maxHeight: '80vh', padding: '24px', background: '#fff', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3>ประวัติ: {viewingLogsProduct.name}</h3>
              <button onClick={() => setViewingLogsProduct(null)}><X /></button>
            </div>
            {productLogs.map(log => (
              <div key={log.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: 'bold' }}>{log.action}</div>
                <div style={{ fontSize: '12px', color: '#718096' }}>{log.timestamp.toLocaleString()}</div>
                <div>{log.detail}</div>
              </div>
            ))}
            {productLogs.length === 0 && <p>ไม่มีประวัติ</p>}
          </div>
        </div>
      )}

      {/* PRINT LABEL MODAL (TSC TTP) */}
      {printingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card animate-slide-in" style={{ width: '450px', padding: 0, background: '#fff', borderRadius: '16px', overflow: 'hidden' }}>
             <div style={{ padding: '20px', background: '#F7FAFC', borderBottom: '1px solid #EDF2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>🏷️ สร้างบาร์โค้ดด่วน (Quick Label)</h3>
                <button onClick={() => setPrintingProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
             </div>
             
             <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>ข้อความ/ชื่อสินค้า (บนสติกเกอร์)</label>
                   <input type="text" className="input" value={printForm.name} onChange={e => setPrintForm({...printForm, name: e.target.value})} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                   <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>รหัส (Barcode)</label>
                      <input type="text" className="input" value={printForm.sku} onChange={e => setPrintForm({...printForm, sku: e.target.value})} />
                   </div>
                   <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>ราคา (Price)</label>
                      <input type="number" className="input" value={printForm.price} onChange={e => setPrintForm({...printForm, price: e.target.value})} />
                   </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>จำนวนดวงที่ต้องการ (ชุดละ 3 ดวง)</label>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="range" min="3" max="99" step="3" style={{ flex: 1 }} value={printForm.qty} onChange={e => setPrintForm({...printForm, qty: Number(e.target.value)})} />
                      <span style={{ fontSize: '18px', fontWeight: 'bold', minWidth: '40px' }}>{printForm.qty}</span>
                   </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                   <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setPrintingProduct(null)}>ยกเลิก</button>
                   <button type="button" className="btn btn-primary" style={{ flex: 2, background: '#2D3748' }} onClick={executePrint}>
                      <Printer size={18} /> พิมพ์สติกเกอร์ทันที
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Hidden Barcode Label for Printing (Three per row for TSC 3-across paper) */}
      {printingProduct && (
        <div 
          className="barcode-print-row" 
          style={{ 
            display: 'none', /* Hidden by style tag above during normal view */
            width: '102mm',
            flexWrap: 'wrap'
          }}
        >
           {[...Array(printForm.qty)].map((_, i) => (
              <div key={i} className="barcode-item">
                 {printSettings.showShopNameOnBarcode && <div className="barcode-shop">{printSettings.shopName}</div>}
                 <div className="barcode-code">{printForm.sku}</div>
                 <div className="barcode-text">*{printForm.sku}*</div>
                 <div className="barcode-price">
                   {Number(printForm.price).toLocaleString()} .-
                 </div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
}

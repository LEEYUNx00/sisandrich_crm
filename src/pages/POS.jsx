import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import html2canvas from 'html2canvas';
import { collection, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Plus, Minus, Trash2, Printer, CheckCircle, ShoppingCart, User, ScanLine, X, BadgePercent, Send, CreditCard, Gift, Beer, Smartphone, MoreHorizontal, Briefcase } from 'lucide-react';

// Sub-components
import ProductItem from '../components/POS/ProductItem';
import PaymentModal from '../components/POS/PaymentModal';
import MethodSelectorModal from '../components/POS/MethodSelectorModal';
import ReceiptModal from '../components/POS/ReceiptModal';
import CustomerPromptModal from '../components/POS/CustomerPromptModal';
import AddMemberModal from '../components/POS/AddMemberModal';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // New features state
  const [showCustomerPrompt, setShowCustomerPrompt] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ nickname: '', phone: '', gender: 'Male' });

  // Promotions
  const [promotions, setPromotions] = useState([]);
  const [selectedPromotion, setSelectedPromotion] = useState('');

  // Customer Search in Modal
  const [modalCustomerSearch, setModalCustomerSearch] = useState('');
  
  // Receipt / Print State
  const [receiptData, setReceiptData] = useState(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [payments, setPayments] = useState([]); // Array of { method, amount, id }
  const [currentMethod, setCurrentMethod] = useState('cash'); 
  const [currentAmount, setCurrentAmount] = useState(0); 
  const [inputBuffer, setInputBuffer] = useState('');
  const [tempCustomerId, setTempCustomerId] = useState(null);
  const [noteCounts, setNoteCounts] = useState({ 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 500: 0, 1000: 0 });

  // Firestore Data States
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [limitCount, setLimitCount] = useState(32); // แสดงทีละ 32 รายการ
  const [employees, setEmployees] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);

  // Printer Bridge Connection Status
  const [bridgeStatus, setBridgeStatus] = useState('Checking...');

  // Ref for scanner input
  const searchInputRef = useRef(null);

  // Fetch from Firebase Live Data
  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), snapshot => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      
      // Extract unique categories
      const uniqueCats = ['All', ...new Set(prods.map(p => p.category || 'Other').filter(Boolean))];
      setCategories(uniqueCats);
    });
    
    const unsubCustomers = onSnapshot(collection(db, 'customers'), snapshot => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPromotions = onSnapshot(collection(db, 'promotions'), snapshot => {
      setPromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubEmployees = onSnapshot(collection(db, 'employees'), snapshot => {
      const empList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(empList.filter(e => e.status === 'Active'));
    });

    // 📡 Ping Printer Bridge every 5 seconds (Using 127.0.0.1 for maximum reliability)
    const checkBridge = async () => {
      try {
        await fetch('http://127.0.0.1:8000/', { method: 'HEAD', mode: 'no-cors' });
        setBridgeStatus('Connected');
      } catch (err) {
        setBridgeStatus('Disconnected');
      }
    };
    checkBridge();
    const bridgeInterval = setInterval(checkBridge, 5000);

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubPromotions();
      unsubEmployees();
      clearInterval(bridgeInterval);
    };
  }, []);

  // Filter Logic with Search and Category
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Decide if we should show the list (Only if searching or category selected)
  const shouldShowList = searchTerm.trim().length > 0 || (selectedCategory !== 'All');
  
  // Slice for Pagination
  const displayProducts = filteredProducts.slice(0, limitCount);
  const hasMore = filteredProducts.length > limitCount;

  const addToCart = (product) => {
    // 🛡️ ระบบเช็คสต็อกอัจฉริยะ (Smart Stock Check)
    const stockMode = product.stockMode || 'Stock Control [Restricted]';
    const isRestricted = stockMode === 'Restricted' || stockMode === 'Stock Control [Restricted]';
    const currentStock = product.stock1st || 0;
    
    if (isRestricted && currentStock <= 0) {
      return alert(`❌ สินค้าหมด! (โหมด Restricted: ไม่สามารถขายสินค้าที่ไม่มีในสต็อกได้)`);
    }
    
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        if (isRestricted && exists.qty >= currentStock) {
          alert(`⚠️ ขออภัย: สินค้าชิ้นนี้เหลือในสต็อกเพียง ${currentStock} ชิ้นเท่านั้น`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // ค้นหาสินค้าที่ตรงกับ Barcode หรือ SKU เป๊ะๆ (สำหรับการสแกน)
    const matchedProduct = products.find(p => 
      p.barcode?.toLowerCase() === searchTerm.toLowerCase() || 
      p.sku?.toLowerCase() === searchTerm.toLowerCase()
    );

    if (matchedProduct) {
      addToCart(matchedProduct);
      setSearchTerm(''); // เคลียร์ช่องค้นหาเพื่อรอสแกนชิ้นต่อไป
      // เล็งโฟกัสกลับไปที่ช่องเดิม
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      // ไม่บังคับ Alert เพื่อไม่ให้ขัดจังหวะ แต่อาจจะแค่เก็บ searchTerm ไว้
    }
  };

  const updateQty = (id, delta) => {
    const productData = products.find(p => p.id === id);
    if (!productData) return;
    const stockMode = productData.stockMode || 'Stock Control [Restricted]';
    const isRestricted = stockMode === 'Restricted' || stockMode === 'Stock Control [Restricted]';
    const currentStock = productData.stock1st || 0;

    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (isRestricted && newQty > currentStock) {
          alert(`⚠️ ไม่สามารถขายเกินจำนวนสต็อกจริงได้ (${currentStock} ชิ้น)`);
          return item; 
        }
        return { ...item, qty: newQty > 0 ? newQty : 1 };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const getTotal = () => cart.reduce((sum, item) => sum + ((item.price || 0) * item.qty), 0);
  const getTax = () => 0; // สมมติว่าราคารวม VAT แล้ว หรือยังไม่คำนวณภาษีแยก

  const getDiscountAmount = () => {
    if (!selectedPromotion) return 0;
    const promo = promotions.find(p => p.id === selectedPromotion);
    if (!promo || !promo.is_active) return 0;
    if (promo.discount_type === 'amount') return Number(promo.discount_value);
    if (promo.discount_type === 'percent') return (getTotal() * Number(promo.discount_value)) / 100;
    return 0;
  };

  const getGrandTotal = () => Math.max(0, getTotal() - getDiscountAmount() + getTax());

  // Keypad & Payment Logic
  const handleKeypadPress = (val) => {
    let maxLimit = Infinity;
    if (currentMethod === 'storeCredit') {
      const customer = customers.find(c => c.id === tempCustomerId);
      const usedCredit = payments.filter(p => p.method === 'storeCredit').reduce((s, p) => s + p.amount, 0);
      maxLimit = (customer?.storeCredit || 0) - usedCredit;
    }

    if (val === 'clear') {
      setInputBuffer('');
      setCurrentAmount(0);
      setNoteCounts({ 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 500: 0, 1000: 0 });
    } else if (val === '.') {
      if (!inputBuffer.includes('.')) setInputBuffer(prev => prev + '.');
    } else {
      const newBuffer = inputBuffer + val;
      const parsed = parseFloat(newBuffer) || 0;
      
      if (parsed > maxLimit) {
        setCurrentAmount(maxLimit);
        setInputBuffer(String(maxLimit));
      } else {
        setInputBuffer(newBuffer);
        setCurrentAmount(parsed);
      }
    }
  };

  const setExactAmount = () => {
    const totalNeeded = Math.max(0, getGrandTotal() - payments.reduce((sum, p) => sum + p.amount, 0));
    let finalAmount = totalNeeded;
    
    if (currentMethod === 'storeCredit') {
      const customer = customers.find(c => c.id === tempCustomerId);
      const usedCredit = payments.filter(p => p.method === 'storeCredit').reduce((s, p) => s + p.amount, 0);
      const available = (customer?.storeCredit || 0) - usedCredit;
      finalAmount = Math.min(totalNeeded, available);
    }

    setCurrentAmount(finalAmount);
    setInputBuffer(String(finalAmount));
    setNoteCounts({ 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 500: 0, 1000: 0 });
  };

  const addCashNote = (amount) => {
    let maxLimit = Infinity;
    if (currentMethod === 'storeCredit') {
      const customer = customers.find(c => c.id === tempCustomerId);
      const usedCredit = payments.filter(p => p.method === 'storeCredit').reduce((s, p) => s + p.amount, 0);
      maxLimit = (customer?.storeCredit || 0) - usedCredit;
    }

    const newAmount = currentAmount + amount;
    const finalAmount = Math.min(newAmount, maxLimit);

    setNoteCounts(prev => ({ ...prev, [amount]: prev[amount] + 1 }));
    setCurrentAmount(finalAmount);
    setInputBuffer(String(finalAmount));
  };

  // Intercept the checkout button click
  const handleCheckoutClick = () => {
    if (cart.length === 0) return alert('ไม่มีสินค้าในตะกร้า!');
    // Directly go to payment - we will handle customer/seller selection there
    setTempCustomerId(selectedCustomer);
    setNoteCounts({ 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 500: 0, 1000: 0 });
    setCurrentAmount(0);
    setPayments([]);
    setInputBuffer('');
    setShowPaymentModal(true);
  };

  const addPaymentEntry = () => {
    if (currentAmount <= 0) return;

    if (currentMethod === 'storeCredit') {
      const customerData = tempCustomerId ? customers.find(c => c.id === tempCustomerId) : null;
      const currentCredit = customerData?.storeCredit || 0;
      
      const usedCredit = payments.filter(p => p.method === 'storeCredit').reduce((s, p) => s + p.amount, 0);
      const remainingCredit = currentCredit - usedCredit;

      if (currentAmount > remainingCredit) {
         return alert(`⚠️ ยอดเครดิตวอลเล็ทไม่เพียงพอ! (คงเหลือให้ใช้ได้: ฿${remainingCredit.toLocaleString()})`);
      }
    }

    const newEntry = {
      id: Date.now() + Math.random(), // Ensure uniqueness
      method: currentMethod,
      amount: currentAmount,
      noteCounts: currentMethod === 'cash' ? { ...noteCounts } : null
    };
    setPayments(prev => [...prev, newEntry]);
    
    // Reset for next entry
    setCurrentAmount(0);
    setInputBuffer('');
    setNoteCounts({ 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 500: 0, 1000: 0 });
  };

  const removePaymentEntry = (id) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const getPaidTotal = () => {
    return payments.reduce((sum, p) => sum + p.amount, 0) + currentAmount;
  };

  const handleRegisterCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.nickname || !customerForm.phone) return;
    try {
       let maxId = 0;
       customers.forEach(c => {
         if (c.memberId && c.memberId.startsWith('SSR')) {
           const num = parseInt(c.memberId.replace('SSR', ''), 10);
           if (!isNaN(num) && num > maxId) maxId = num;
         }
       });
       const nextIdStr = `SSR${String(maxId + 1).padStart(5, '0')}`;
       
       const newCustomer = {
         memberId: nextIdStr,
         name: customerForm.nickname,
         nickname: customerForm.nickname,
         phone: customerForm.phone,
         gender: customerForm.gender || 'Male',
         points: 0,
         totalSpend: 0,
         totalVisit: 0,
         createdAt: serverTimestamp()
       };
       const added = await addDoc(collection(db, 'customers'), newCustomer);
       setSelectedCustomer(added.id);
       setShowAddMemberModal(false);
       setCustomerForm({ nickname: '', phone: '', gender: 'Male' });
       // Auto proceed to checkout after registering or stay? Let's stay so they see the discount section
       // If they want to checkout right away we could call processCheckout()
    } catch(err) {
       alert("พบปัญหาในการสมัครสมาชิก: " + err.message);
    }
  };

  const handleQuickQN = async () => {
    try {
      let qnMember = customers.find(c => c.memberId === 'QNSSR88');
      let targetId = qnMember?.id;
      
      if (!qnMember) {
        setIsProcessing(true);
        const newDoc = {
          memberId: 'QNSSR88',
          name: 'ลูกค้าจร (Quick QN)',
          nickname: 'Guest',
          phone: '-',
          gender: 'Other',
          points: 0,
          totalSpend: 0,
          totalVisit: 0,
          createdAt: serverTimestamp()
        };
        const res = await addDoc(collection(db, 'customers'), newDoc);
        targetId = res.id;
        setIsProcessing(false);
      }
      
      setShowCustomerPrompt(false);
      setTempCustomerId(targetId);
      setNoteCounts({ 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 500: 0, 1000: 0 });
      setCurrentAmount(0);
      setPayments([]);
      setInputBuffer('');
      setShowPaymentModal(true);
    } catch (err) {
      alert(err.message);
      setIsProcessing(false);
    }
  };

  // Core Firebase Check Out Logic
  const processCheckout = async (directCustomerId = null) => {
    if (cart.length === 0) return alert('ไม่มีสินค้าในตะกร้า!');
    setIsProcessing(true);

    try {
      // 1. Process Product Stock Deduction & History Log
      const batchLogRef = collection(db, 'inventory_logs');
      const productPromises = cart.map(async (item) => {
        const productRef = doc(db, 'products', item.id);
        
        // ถ้าเป็นโหมด No Stock จะไม่ไปตัดสต็อกเลย (เหมาะสำหรับค่าบริการ)
        if (item.stockMode === 'No Stock') {
           // Skip deduction
        } else {
           await updateDoc(productRef, {
             stock1st: increment(-item.qty),
             updatedAt: serverTimestamp()
           });
        }

        // บันทึกลงใน inventory_logs ว่าถูกขายไป
        await addDoc(batchLogRef, {
          productId: item.id,
          sku: item.sku || '',
          name: item.name || '',
          type: 'sale',
          amount: item.qty,
          location: '1st',
          reason: 'POS Sale',
          timestamp: serverTimestamp()
        });
      });
      await Promise.all(productPromises);

      // 2. Process Customer CRM update & Store Credit Deductions
      const targetId = directCustomerId || selectedCustomer;
      let customerInfo = { id: 'walk-in', name: 'Walk-in Customer' };
      
      const finalPayments = [...payments, ...(currentAmount > 0 ? [{ method: currentMethod, amount: currentAmount }] : [])];
      
      if (targetId) {
        const customerData = customers.find(c => c.id === targetId);
        customerInfo = { id: customerData.id, name: customerData.name };

        const customerRef = doc(db, 'customers', targetId);
        const addedSpend = getGrandTotal();
        const earnedPoints = Math.floor(addedSpend / 100); 
        
        const updateObj = {
          totalSpend: increment(addedSpend),
          points: increment(earnedPoints),
          totalVisit: increment(1),
          lastVisit: serverTimestamp()
        };
        
        const usedStoreCredit = finalPayments.filter(p => p.method === 'storeCredit').reduce((s, p) => s + p.amount, 0);
        if (usedStoreCredit > 0) {
           updateObj.storeCredit = increment(-usedStoreCredit);
           
           // Record usage log
           await addDoc(collection(db, 'system_logs'), {
             type: 'pos',
             action: 'ใช้เครดิทจ่ายเงิน (POS Credit Pay)',
             detail: `ใช้เครดิต ฿${usedStoreCredit.toLocaleString()} ชำระเงินบิล POS (${customerInfo.name})`,
             operator: 'Admin Staff',
             timestamp: serverTimestamp()
           });
        }
        
        await updateDoc(customerRef, updateObj);
      }

      // 3. Save Sales Report Document
      const promoData = selectedPromotion ? promotions.find(p => p.id === selectedPromotion) : null;
      
      const now = new Date();
      const fDate = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const fTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const rCode = Math.floor(100 + Math.random() * 900);
      const billIdStr = `RC${fDate}-${fTime}-${rCode}`;

      const newReceipt = {
        billId: billIdStr,
        items: cart.map(item => ({ 
          id: item.id, 
          name: item.name, 
          sku: item.sku, 
          qty: item.qty, 
          price: item.price,
          subtotal: item.price * item.qty 
        })),
        totalQty: cart.reduce((sum, item) => sum + item.qty, 0),
        subTotal: getTotal(),
        tax: getTax(),
        discountAmount: getDiscountAmount(),
        promotion_id: selectedPromotion || null,
        promotion_name: promoData ? promoData.name : null,
        grandTotal: getGrandTotal(),
        payments: finalPayments,
        totalPaid: getPaidTotal(),
        changeAmount: Math.max(0, getPaidTotal() - getGrandTotal()),
        customer: customerInfo,
        seller: selectedSeller ? { id: selectedSeller.id, name: selectedSeller.name } : { id: 'generic', name: 'General Staff' },
        staff: 'Admin Staff',
        timestamp: serverTimestamp(),
      };

      const saleRef = await addDoc(collection(db, 'sales'), newReceipt);
      const generatedReceipt = { ...newReceipt, id: saleRef.id, printedDate: new Date() };

      // 4. Add System Audit Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'pos',
        action: 'การขาย (Checkout)',
        detail: `บิล ${billIdStr} ยอด ฿${getGrandTotal().toLocaleString()} (${customerInfo.name}) | เซลล์: ${selectedSeller?.name || 'ทั่วไป'}`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      setIsSuccess(true);
      setReceiptData(generatedReceipt); // ส่งไปเพื่อเปิด Modal พิมพ์ใบเสร็จ
      
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("เกิดข้อผิดพลาดในการชำระเงิน: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseReceipt = () => {
    setCart([]);
    setSelectedCustomer('');
    setIsSuccess(false);
    setReceiptData(null);
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const printReceipt = async () => {
    // 📸 ถ่ายรูปภาพบิลดีไซน์จริง (Mirror of Management Preview)
    if (bridgeStatus === 'Connected' && receiptData) {
      try {
        console.log("📸 Capturing Receipt Layout...");
        
        // รอให้ Modal เสถียรก่อนแป๊บนึง (100ms) เพื่อป้องกันหน้าขาว
        await new Promise(resolve => setTimeout(resolve, 100));

        // ค้นหาต้นฉบับบิลที่จัดหน้าไว้แล้ว (อยู่ใน ReceiptModal)
        const receiptElement = document.querySelector('.print-area');
        if (!receiptElement) {
          return alert("❌ ไม่พบเทมเพลตบิล กรุณาลองกด 'พิมพ์ใบเสร็จ' อีกครั้งครับ");
        }

        // ถ่ายภาพระดับสตูดิโอ (เพิ่มความทนทานต่อ CORS)
        const canvas = await html2canvas(receiptElement, {
          scale: 2.2,
          useCORS: true,
          allowTaint: false, // ห้ามใช้รูปที่ติด Proxy เพื่อไม่ให้ Canvas เสีย (Tainted)
          backgroundColor: '#ffffff',
          logging: true,
          // ถ้ามีรูปที่โหลดไม่ได้ ให้ตัวโปรแกรมรันต่อไปได้
          removeContainer: true
        });

        let imageData = null;
        try {
          imageData = canvas.toDataURL('image/png');
        } catch (canvasErr) {
          console.error("Canvas is tainted, sending empty image or fallback", canvasErr);
          // ถ้าถ่ายรูปไม่ได้จริงๆ ให้ใช้ระบบพิมพ์ปกติของเบราว์เซอร์
          return window.print();
        }

        // ส่งรูปภาพไปที่โปรแกรมสะพาน SIS_RICH_Bridge.exe (ใช้ IP 127.0.0.1)
        const response = await fetch('http://localhost:8000/print-receipt', {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            printerName: 'XP-80C',
            image: imageData,
            billId: receiptData.billId
          })
        });
        
        if (response.ok) {
           console.log("✅ Direct PRINT via EXE mirrored successfully!");
           return; 
        }
      } catch (err) {
        console.warn("Direct mirror print failed, fallback to standard...", err);
      }
    }

    // 🔄 Fallback: ถ้าลืมเปิดโปรแกรม EXE ให้ใช้ระบบปกติเบราว์เซอร์
    window.print();
  };

  return (
    <>
      <style>
        {`
          @media print {
            .sidebar, .top-header, .pos-layout, .card, .hide-on-print, button, nav {
              display: none !important;
            }
            .print-area {
              display: block !important;
              visibility: visible !important;
              position: static;
              width: 72mm !important;
              margin: 0 auto;
              padding: 0;
              background: white !important;
              color: black !important;
              font-family: 'Courier New', Courier, monospace;
            }
            @page { margin: 0; size: auto; }
          }
        `}
      </style>

      {/* POS Layout Container (Ultra Compact) */}
      <div className={`animate-slide-in pos-layout ${receiptData ? 'hide-on-print' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: 'calc(100vh - 85px)', overflow: 'hidden' }}>
        
        {/* Main POS Grid - Wider Product Area */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) minmax(380px, 1fr)', gap: '20px', flex: 1, overflow: 'hidden' }}>
          
          <div className="pos-left" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingLeft: '4px' }}>
            
            {/* Integrated Status & Category Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', whiteSpace: 'nowrap', msOverflowStyle: 'none', scrollbarWidth: 'none', flex: 1 }}>
                 {categories.map(cat => (
                   <button 
                     key={cat} 
                     onClick={() => { setSelectedCategory(cat); setLimitCount(32); }}
                     className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                     style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '20px', minWidth: 'fit-content' }}
                   >
                     {cat}
                   </button>
                 ))}
              </div>

              {/* Discrete Remote Status */}
              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                 <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '15px', 
                    background: bridgeStatus === 'Connected' ? '#F0FFF4' : '#FFF5F5', 
                    border: `1px solid ${bridgeStatus === 'Connected' ? '#68D391' : '#FEB2B2'}`,
                    fontSize: '10px', fontWeight: 'bold', color: bridgeStatus === 'Connected' ? '#2F855A' : '#C53030'
                 }}>
                    <Printer size={12} /> {bridgeStatus}
                 </div>
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#48BB78', alignSelf: 'center' }} title="Online"></div>
              </div>
            </div>

          <div className="card" style={{ marginBottom: '12px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <form onSubmit={handleBarcodeSubmit} style={{ flex: 1, margin: 0 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <div className="input-icon-wrapper">
                  <Search className="icon" size={18} />
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    className="input" 
                    placeholder="สแกนรหัส หรือ ค้นชื่อสินค้า/SKU..." 
                    value={searchTerm}
                    style={{ height: '40px' }}
                    onChange={(e) => { 
                      const val = e.target.value;
                      // Thai to English mapping for common characters
                      const thToEn = {
                        'ห':'s','พ':'r','ะ':'t','ั':'u','ี':'i','ย':'o','บ':'p','ล':'[','ฃ':']',
                        'ฟ':'a','ห':'s','ก':'d','ด':'f','เ':'g','้':'h','่':'j','า':'k','ส':'l','ว':';','ง':'\'',
                        'ผ':'z','ป':'x','แ':'c','อ':'v','ิ':'b','ื':'n','ท':'m','ม':',','ใ':'.','ฝ':'/',
                        '๐':'0','๑':'1','๒':'2','๓':'3','๔':'4','๕':'5','๖':'6','๗':'7','๘':'8','๙':'9',
                        'ๅ':'1','/':'2','-':'3','ภ':'4','ถ':'5','ุ':'6','ู':'7','ค':'8','ต':'9','จ':'0'
                      };
                      const corrected = val.split('').map(char => thToEn[char] || char).join('');
                      setSearchTerm(corrected); 
                      if (corrected) setLimitCount(32); 
                    }}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Product Grid - Compact Format */}
          <div className="pos-products" style={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
            gap: '8px', 
            paddingRight: '8px', 
            paddingLeft: '4px',
            alignContent: 'start' 
          }}>
            {!shouldShowList ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 40px', color: '#A0AEC0', textAlign: 'center' }}>
                <Search size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
                <h3 style={{ fontSize: '18px', color: '#718096', marginBottom: '8px' }}>เริ่มการขาย (Browse Products)</h3>
                <p style={{ fontSize: '14px' }}>กรุณาเลือก **"กลุ่ม/ประเภทสินค้า"** ด้านบน <br/>หรือ **"พิมพ์ค้นหา"** เพื่อแสดงรายการสินค้า</p>
              </div>
            ) : displayProducts.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>ไม่พบรหัสสินค้าที่ตรงกับการค้นหา</div>
            ) : (
              <>
                {displayProducts.map(p => {
                  const inCart = cart.find(item => item.id === p.id)?.qty || 0;
                  return (
                    <ProductItem 
                      key={p.id} 
                      product={p} 
                      onAddToCart={addToCart} 
                      quantityInCart={inCart}
                    />
                  );
                })}
                
                {hasMore && (
                  <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center' }}>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => setLimitCount(prev => prev + 32)}
                      style={{ width: '200px', fontSize: '13px' }}
                    >
                      ดูเพิ่ม... (Load More)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right side: Cart & CheckoutPanel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', backgroundColor: '#fff' }}>
          
          {/* Cart Header */}

          {/* Cart Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#EDF2F7', fontSize: '12px', fontWeight: 'bold', color: '#4A5568' }}>
            <span>รายการสินค้า ({cart.length})</span>
            <div style={{ display: 'flex', width: '130px', justifyContent: 'space-between' }}>
               <span>จำนวน</span>
               <span>รวม (฿)</span>
            </div>
          </div>

          {/* Cart Items List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#A0AEC0', marginTop: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ShoppingCart size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p>สแกนบาร์โค้ด หรือ กดเลือกสินค้า<br/>เพื่อเพิ่มลงในตะกร้า</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #EDF2F7', background: '#fff' }}>
                    
                    <div style={{ flex: 1, paddingRight: '8px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
                         <h4 style={{ fontSize: '12px', color: '#2D3748', fontWeight: 'bold', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                         <span style={{ fontSize: '10px', color: '#718096', background: '#F7FAFC', padding: '0 4px', borderRadius: '4px', border: '1px solid #EDF2F7', flexShrink: 0 }}>{item.sku}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                        <button style={{ border: 'none', background: 'transparent', padding: '4px 6px', cursor: 'pointer', color: '#4A5568' }} onClick={() => updateQty(item.id, -1)}><Minus size={12}/></button>
                        <span style={{ fontSize: '12px', width: '20px', textAlign: 'center', fontWeight: 'bold', color: '#2B6CB0' }}>{item.qty}</span>
                        <button style={{ border: 'none', background: 'transparent', padding: '4px 6px', cursor: 'pointer', color: '#4A5568' }} onClick={() => updateQty(item.id, 1)}><Plus size={12}/></button>
                      </div>
                      
                      <div style={{ fontWeight: 'bold', width: '55px', textAlign: 'right', color: '#2D3748', fontSize: '14px' }}>
                        {(item.price * item.qty).toLocaleString()}
                      </div>

                      <button className="btn-icon" style={{ padding: '4px', color: '#E53E3E', background: '#FFF5F5' }} onClick={() => removeFromCart(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary Header - Compact */}
          <div style={{ padding: '12px 16px 0 16px', borderTop: '1px solid #E2E8F0', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#718096' }}>
              <span>ยอดรวม (Subtotal)</span>
              <span>฿{getTotal().toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#718096' }}>ส่วนลด (Discount)</span>
              <select className="input" style={{ width: '120px', margin: 0, padding: '2px 6px', fontSize: '11px', height: '24px' }} value={selectedPromotion} onChange={(e) => setSelectedPromotion(e.target.value)}>
                <option value="">ไม่มีส่วนลด</option>
                {promotions.filter(p => p.is_active).map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {selectedPromotion && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#E53E3E' }}>
                <span>มูลค่าลด</span>
                <span style={{ fontWeight: 'bold' }}>- ฿{getDiscountAmount().toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingBottom: '12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2D3748' }}>รวมทั้งสิ้น (Total)</span>
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#38A169' }}>฿{getGrandTotal().toLocaleString()}</span>
            </div>
            
            <button 
              className="btn" 
              style={{ width: '100%', fontSize: '16px', padding: '12px', background: isProcessing ? '#A0AEC0' : '#38A169', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '12px' }} 
              onClick={handleCheckoutClick}
              disabled={isProcessing || cart.length === 0}
            >
               {isProcessing ? 'กำลังชำระเงิน...' : 'ชำระเงิน (Check Out)'}
            </button>
          </div>
        </div>

      </div> {/* End of Main POS Grid */}

    </div> {/* End of POS Layout Container */}

      {/* Customer CRM Choice Modal */}
      <CustomerPromptModal
        isOpen={showCustomerPrompt}
        onClose={() => { setShowCustomerPrompt(false); setModalCustomerSearch(''); }}
        customers={customers}
        modalCustomerSearch={modalCustomerSearch}
        setModalCustomerSearch={setModalCustomerSearch}
        onQuickQN={handleQuickQN}
        onAddMember={() => { setShowCustomerPrompt(false); setShowAddMemberModal(true); setModalCustomerSearch(''); }}
        onSelectCustomer={(id) => {
          setSelectedCustomer(id);
          setTempCustomerId(id);
          setShowCustomerPrompt(false);
          setModalCustomerSearch('');
          setNoteCounts({ 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 500: 0, 1000: 0 });
          setCurrentAmount(0);
          setPayments([]);
          setInputBuffer('');
          setShowPaymentModal(true);
        }}
      />

      {/* Add New Member Modal */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        customerForm={customerForm}
        setCustomerForm={setCustomerForm}
        onSubmit={handleRegisterCustomer}
      />

      {/* Payment Step Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        cart={cart}
        getTotal={getTotal}
        getTax={getTax}
        getDiscountAmount={getDiscountAmount}
        getGrandTotal={getGrandTotal}
        tempCustomerId={tempCustomerId}
        customers={customers}
        payments={payments}
        removePaymentEntry={removePaymentEntry}
        currentMethod={currentMethod}
        currentAmount={currentAmount}
        handleKeypadPress={handleKeypadPress}
        setExactAmount={setExactAmount}
        addCashNote={addCashNote}
        noteCounts={noteCounts}
        addPaymentEntry={addPaymentEntry}
        getPaidTotal={getPaidTotal}
        isProcessing={isProcessing}
        processCheckout={processCheckout}
        setShowMethodSelector={setShowMethodSelector}
        selectedPromotion={selectedPromotion}
        employees={employees}
        selectedSeller={selectedSeller}
        setSelectedSeller={setSelectedSeller}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        setTempCustomerId={setTempCustomerId}
      />

      {/* Method Selector Modal */}
      <MethodSelectorModal
        isOpen={showMethodSelector}
        onClose={() => setShowMethodSelector(false)}
        onSelect={(methodId) => {
          setCurrentMethod(methodId);
          setShowMethodSelector(false);
        }}
      />

      {/* Receipt Print Modal Overlay */}
      <ReceiptModal
        receiptData={receiptData}
        onClose={handleCloseReceipt}
        onPrint={printReceipt}
      />
    </>
  );
}

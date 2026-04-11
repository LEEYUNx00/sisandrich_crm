import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, setDoc, writeBatch } from 'firebase/firestore';
import { Search, Plus, Filter, Download, Users, User, Star, Award, Crown, Gift, Calendar, Share2, Wallet, X, CheckCircle, Copy, Edit, Trash2, History, ChevronRight, ShoppingBag, Trophy, Banknote, FileDown, FileUp } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CRM() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'ranking', 'config', 'wheel'
  
  // Spend Report Filter State
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortOrder, setSortOrder] = useState('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState(null);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Top-up State
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupType, setTopupType] = useState('deposit');
  const [topupCustomer, setTopupCustomer] = useState(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupNotes, setTopupNotes] = useState('');

  // Import/Export State
  const [importPreview, setImportPreview] = useState(null);
  const [selectedImportItems, setSelectedImportItems] = useState([]);
  const [importProgress, setImportProgress] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // App Settings State (Coupons, Tiers, Wheel)
  const [membershipConfig, setMembershipConfig] = useState({ 
    coupons: [
      { id: 1, name: 'ส่วนลด 5% สินค้าใหม่', points: 100 },
      { id: 2, name: 'คูปองเงินสด 500 บาท', points: 1000 }
    ],
    tierMultipliers: { VIP: 1, VVIP: 1.5, SVIP: 2, SSVIP: 3 } 
  });
  const [wheelConfig, setWheelConfig] = useState([
    { id: 1, label: 'รางวัลที่ 1', probability: 20, active: true },
    { id: 2, label: 'รางวัลที่ 2', probability: 20, active: true },
    { id: 3, label: 'รางวัลที่ 3', probability: 20, active: true },
    { id: 4, label: 'รางวัลที่ 4', probability: 20, active: true },
    { id: 5, label: 'ขอบคุณที่ร่วมสนุก', probability: 20, active: true },
  ]);
  
  // New Customer Form State
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    dob: '',
    gender: 'Male', // Default
    channel: 'Walk-in',
    notes: ''
  });

  // Fetch real-time data from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customerList);
      setLoading(false);
    });

    // Load Configs
    const loadConfigs = async () => {
      const mDoc = await getDocs(query(collection(db, 'app_settings'), where('__name__', '==', 'membership')));
      if (!mDoc.empty) setMembershipConfig(mDoc.docs[0].data());
      
      const wDoc = await getDocs(query(collection(db, 'app_settings'), where('__name__', '==', 'wheel')));
      if (!wDoc.empty) setWheelConfig(wDoc.docs[0].data().segments);
    };
    loadConfigs();

    return () => unsubscribe();
  }, []);

  const saveMembershipConfig = async (newConfig) => {
    try {
      const { id, ...data } = newConfig; // remove id if present
      await setDoc(doc(db, 'app_settings', 'membership'), data);
      alert("✅ บันทึกการตั้งค่าสิทธิประโยชน์สำเร็จ!");
    } catch(err) {
      alert("Error: " + err.message);
    }
  };

  const saveWheelConfig = async (newSegments) => {
    try {
      await setDoc(doc(db, 'app_settings', 'wheel'), { segments: newSegments });
      alert("✅ บันทึกข้อมูลวงล้อสำเร็จ!");
    } catch(err) {
      alert("Error: " + err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!formData.nickname || !formData.phone) {
      return alert('กรุณากรอกชื่อเล่นและเบอร์โทรศัพท์');
    }
    
    try {
      const nextNum = customers.length > 0 
        ? Math.max(...customers.map(c => {
            const match = c.memberId?.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          })) + 1 
        : 1;
      const memberId = `MSR${nextNum.toString().padStart(4, '0')}`;

      const customerRef = await addDoc(collection(db, 'customers'), {
        memberId: memberId,
        nickname: formData.nickname,
        name: formData.nickname, 
        phone: formData.phone,
        dob: formData.dob,
        gender: formData.gender,
        channel: formData.channel,
        notes: formData.notes,
        type: 'Silver', 
        totalSpend: 0,
        points: 0,
        totalVisit: 0,
        lastVisit: null,
        walletBalance: 0, 
        createdAt: serverTimestamp()
      });

      // Add System Audit Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'crm',
        action: 'สมัครสมาชิก',
        detail: `ลูกค้า: ${formData.nickname} (ID: ${memberId})`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      alert("✅ สมัครสมาชิกสำเร็จ! รหัสประจำตัว: " + memberId);
      setIsModalOpen(false);
      setFormData({ nickname: '', phone: '', dob: '', gender: 'Male', channel: 'Walk-in', notes: '' });
    } catch(err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editingCustomer.nickname || !editingCustomer.phone) {
      return alert('กรุณากรอกชื่อเล่นและเบอร์โทรศัพท์');
    }
    
    try {
      const customerRef = doc(db, 'customers', editingCustomer.id);
      await updateDoc(customerRef, {
        nickname: editingCustomer.nickname,
        name: editingCustomer.nickname, 
        phone: editingCustomer.phone,
        dob: editingCustomer.dob || '',
        gender: editingCustomer.gender || 'Male',
        channel: editingCustomer.channel || 'Walk-in',
        notes: editingCustomer.notes || '',
        updatedAt: serverTimestamp()
      });

      alert("✅ อัปเดตข้อมูลสำเร็จ!");
      setIsEditModalOpen(false);
    } catch(err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleDeleteCustomer = async (id, nickname) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้า "${nickname}"?`)) {
      try {
        await deleteDoc(doc(db, 'customers', id));
        alert("🗑️ ลบข้อมูลลูกค้าเรียบร้อยแล้ว");
      } catch(err) {
        alert("เกิดข้อผิดพลาดในการลบ: " + err.message);
      }
    }
  };

  const handleTopupSubmit = async (e) => {
    e.preventDefault();
    if (!topupAmount || isNaN(topupAmount) || Number(topupAmount) <= 0) {
       return alert('❌ กรุณากรอกจำนวนเงินให้ถูกต้อง');
    }
    
    try {
      const customerRef = doc(db, 'customers', topupCustomer.id);
      const currentBalance = topupCustomer.storeCredit || 0;
      const amountNum = Number(topupAmount);

      if (topupType === 'withdraw' && amountNum > currentBalance) {
         return alert(`❌ ยอดเงินไม่พอให้ถอน/ปรับลด (มีแค่ ฿${currentBalance.toLocaleString()})`);
      }

      const newCredit = topupType === 'deposit' 
        ? currentBalance + amountNum 
        : currentBalance - amountNum;
        
      await updateDoc(customerRef, {
        storeCredit: newCredit,
        updatedAt: serverTimestamp()
      });

      // Optionally record to system_logs or history collection
      await addDoc(collection(db, 'system_logs'), {
        type: 'crm',
        action: topupType === 'deposit' ? 'เติมเครดิท (Deposit)' : 'ถอนเครดิท (Withdraw)',
        detail: `${topupType === 'deposit' ? 'เติมเงิน' : 'ลดเงิน'} ฿${amountNum.toLocaleString()} ให้กับ ${topupCustomer.nickname || topupCustomer.name} (${topupNotes || 'ไม่มีหมายเหตุ'})`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      alert(`✅ ${topupType === 'deposit' ? 'เติมเงิน' : 'ถอนเงิน/ปรับลดยอด'} จำนวน ฿${amountNum.toLocaleString()} เรียบร้อยแล้ว!`);
      setIsTopupModalOpen(false);
      setTopupAmount('');
      setTopupNotes('');
      setTopupType('deposit');
    } catch(err) {
      alert("เกิดข้อผิดพลาดในการทำรายการ: " + err.message);
    }
  };

  const handleHistoryClick = async (customer) => {
    setSelectedHistoryCustomer(customer);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryOrders([]);

    try {
      const salesRef = collection(db, 'sales');
      // Remove orderBy from query to avoid index requirement
      const q = query(
        salesRef, 
        where('customer.id', '==', customer.id)
      );
      
      const querySnapshot = await getDocs(q);
      let orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort in JavaScript instead of Firestore query
      orders.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return timeB - timeA;
      });

      setHistoryOrders(orders);
    } catch (error) {
      console.error("Error fetching history:", error);
      // Fallback for missing index or other error: fetch all and filter if needed, 
      // but usually we want the index. To be safe for now without demanding index:
      alert("ไม่สามารถดึงข้อมูลประวัติได้ (อาจต้องรอการตั้งค่า Index ใน Firestore): " + error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // -------------------------
  // 📥 IMPORT / EXPORT LOGIC
  // -------------------------
  
  const handleExportMembers = () => {
    if (customers.length === 0) return alert("ไม่มีข้อมูลสมาชิกเพื่อส่งออก");
    
    // Header Column (Standardized)
    const headers = [
      "Member ID", "Nickname", "Phone", "Gender", "Birth Date", 
      "Total Spend", "Points", "Store Credit", "Total Visits", 
      "Channel", "Notes", "Register Date", "Last Visit"
    ];

    const formatDate = (date) => {
      if (!date) return '';
      const d = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    const data = customers.map(c => [
      c.memberId || '',
      c.nickname || '',
      c.phone || '',
      c.gender || 'Male',
      c.dob || '',
      c.totalSpend || 0,
      c.points || 0,
      c.storeCredit || 0,
      c.totalVisit || 0,
      c.channel || 'Walk-in',
      (c.notes || '').replace(/\n/g, ' '),
      formatDate(c.createdAt),
      formatDate(c.lastVisit)
    ]);

    const csvContent = "\uFEFF" + [headers, ...data].map(e => e.map(x => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sisandrich_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getValue = (row, ...options) => {
    const key = Object.keys(row).find(k => options.some(opt => String(k).toLowerCase().trim() === String(opt).toLowerCase().trim()));
    return key ? row[key] : null;
  };

  const handleImportMembers = () => {
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
          
          if (!rows.length) { 
            alert("ไฟล์ว่างเปล่า"); 
            return; 
          }

          let diffs = [];
          for (const row of rows) {
            const phone = String(getValue(row, 'Phone', 'เบอร์โทร', 'โทรศัพท์', '手机号') || '').trim();
            if (!phone) continue;

            const memberIdFromFile = String(getValue(row, 'Member ID', 'รหัสสมาชิก', 'รหัสประจำตัว') || '').trim();
            const registerDateStr = getValue(row, 'Register Date', 'วันสมัครสมาชิก', 'วันที่สมัคร');
            const lastVisitStr = getValue(row, 'Last Visit', 'วันเข้าใช้งานล่าสุด', 'เข้าใช้งานล่าสุด');
            
            const memberData = {
              nickname: String(getValue(row, 'Nickname', 'ชื่อเล่น', 'Name', '昵称') || '').trim(),
              phone: phone,
              gender: getValue(row, 'Gender', 'เพศ', '性别') || 'Male',
              dob: String(getValue(row, 'Birth Date', 'วันเกิด', '生日') || '').trim(),
              totalSpend: Number(getValue(row, 'Total Spend', 'ยอดซื้อรวม', '消费总额')) || 0,
              points: Number(getValue(row, 'Points', 'คะแนน', '积分')) || 0,
              storeCredit: Number(getValue(row, 'Store Credit', 'เครดิต', '余額')) || 0,
              totalVisit: Number(getValue(row, 'Total Visits', 'จำนวนครั้งที่มา', '到店次数')) || 0,
              channel: getValue(row, 'Channel', 'ช่องทาง', '来源') || 'Walk-in',
              notes: String(getValue(row, 'Notes', 'หมายเหตุ', '备注') || '').trim(),
              updatedAt: serverTimestamp()
            };

            const parseDateString = (str) => {
              if (!str) return null;
              // Handle DD/MM/YYYY HH:mm format
              const parts = String(str).split(' ');
              const dateParts = parts[0].split('/');
              if (dateParts.length === 3) {
                 const day = parseInt(dateParts[0]);
                 const month = parseInt(dateParts[1]) - 1;
                 let year = parseInt(dateParts[2]);
                 // Handle YY to YYYY if needed (assuming 20xx)
                 if (year < 100) year += 2000;
                 
                 const d = new Date(year, month, day);
                 if (parts[1]) {
                    const timeParts = parts[1].split(':');
                    if (timeParts.length >= 2) {
                       d.setHours(parseInt(timeParts[0]));
                       d.setMinutes(parseInt(timeParts[1]));
                    }
                 }
                 return isNaN(d.getTime()) ? new Date(str) : d;
              }
              return new Date(str);
            };

            if (registerDateStr) {
               const d = parseDateString(registerDateStr);
               if (d && !isNaN(d.getTime())) memberData.createdAt = d;
            }
            if (lastVisitStr) {
               const d = parseDateString(lastVisitStr);
               if (d && !isNaN(d.getTime())) memberData.lastVisit = d;
            }

            // If file has Member ID, it's safer to find by ID if it exists
            const existing = customers.find(c => 
              (memberIdFromFile && c.memberId === memberIdFromFile) || 
              (c.phone === phone)
            );

            if (existing) {
              // Compare if anything changed
              let changedFields = [];
              if (existing.nickname !== memberData.nickname) changedFields.push(`ชื่อ: ${existing.nickname} -> ${memberData.nickname}`);
              if (Number(existing.totalSpend) !== memberData.totalSpend) changedFields.push(`ยอดซื้อ: ${existing.totalSpend} -> ${memberData.totalSpend}`);
              if (Number(existing.points) !== memberData.points) changedFields.push(`แต้ม: ${existing.points} -> ${memberData.points}`);

              if (changedFields.length > 0) {
                diffs.push({ type: 'update', id: existing.id, phone: phone, name: existing.nickname, changes: changedFields, newData: memberData });
              }
            } else {
              memberData.createdAt = serverTimestamp();
              diffs.push({ type: 'add', phone: phone, name: memberData.nickname, newData: memberData });
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

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    try {
      const itemsToProcess = importPreview.filter((_, i) => selectedImportItems.includes(i));
      setImportProgress({ current: 0, total: itemsToProcess.length });

      let nextNum = customers.length > 0 
        ? Math.max(...customers.map(c => {
            const match = c.memberId?.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          })) + 1 
        : 1;

      const CHUNK_SIZE = 400;
      for (let i = 0; i < itemsToProcess.length; i += CHUNK_SIZE) {
        const chunk = itemsToProcess.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach(item => {
          if (item.type === 'update') {
            batch.update(doc(db, 'customers', item.id), item.newData);
          } else {
            const memberId = `MSR${nextNum.toString().padStart(4, '0')}`;
            const finalData = { ...item.newData, memberId, name: item.newData.nickname };
            batch.set(doc(collection(db, 'customers')), finalData);
            nextNum++;
          }
        });

        await batch.commit();
        setImportProgress({ current: Math.min(i + CHUNK_SIZE, itemsToProcess.length), total: itemsToProcess.length });
      }

      await addDoc(collection(db, 'system_logs'), {
        type: 'crm',
        action: 'นำเข้าข้อมูลสมาชิก (Bulk Import)',
        detail: `นำเข้าสำเร็จ: ${itemsToProcess.length} รายการ`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      setImportPreview(null);
      setImportProgress(null);
      alert(`นำเข้าสมาชิกสำเร็จ ${itemsToProcess.length} รายการ!`);
    } catch (error) {
       setImportProgress({ current: 0, total: 0 });
       alert("เกิดข้อผิดพลาดในการนำเข้า: " + error.message);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Member ID", "Nickname", "Phone", "Gender", "Birth Date", "Total Spend", "Points", "Store Credit", "Total Visits", "Channel", "Notes", "Register Date", "Last Visit"
    ];
    const example = [
      "", "เจมส์", "0812345678", "Male", "1990-12-30", "5000", "50", "0", "2", "TikTok", "ชอบถามเรื่องแหวน", "15/01/2024 10:30", "10/04/2026 11:55"
    ];
    const csvContent = "\uFEFF" + [headers, example].map(e => e.map(x => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "member_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------
  // 📊 CALCULATIONS & STATS
  // -------------------------
  const filteredCustomers = customers.filter(c => 
    (c.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.phone?.includes(searchTerm) ||
     c.memberId?.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    if (sortOrder === 'desc') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    if (sortOrder === 'asc') return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    return (a.nickname || '').localeCompare(b.nickname || '');
  });

  const totalVisits = filteredCustomers.reduce((sum, c) => sum + (c.totalVisit || 0), 0);
  const totalSpend = filteredCustomers.reduce((sum, c) => sum + (c.totalSpend || 0), 0);
  const avgSpend = totalVisits > 0 ? (totalSpend / totalVisits) : 0;

  // Pagination Logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Calculate Tiers Logic (Based on Total Spend)
  const getTier = (spend = 0) => {
    if (spend >= 500000) return { name: 'SSVIP', color: '#805AD5', bg: '#FAF5FF', icon: <Crown size={16}/> };
    if (spend >= 100000) return { name: 'SVIP', color: '#DD6B20', bg: '#FFFAF0', icon: <Crown size={16}/> };
    if (spend >= 50000) return { name: 'VVIP', color: '#D69E2E', bg: '#FFFFF0', icon: <Award size={16}/> };
    if (spend >= 10000) return { name: 'VIP', color: '#3182CE', bg: '#EBF8FF', icon: <Star size={16}/> };
    return { name: 'Silver', color: '#718096', bg: '#EDF2F7', icon: <User size={16}/> };
  };

  const stats = {
    total: customers.length,
    tiers: { Silver: 0, VIP: 0, VVIP: 0, SVIP: 0, SSVIP: 0 },
    channels: { 'Walk-in': 0, 'TikTok': 0, 'Instagram': 0, 'Facebook': 0, 'Line': 0, 'Friend': 0, 'Other': 0 }
  };

  customers.forEach(c => {
    const tierName = getTier(c.totalSpend).name;
    stats.tiers[tierName] = (stats.tiers[tierName] || 0) + 1;
    const channel = c.channel || 'Walk-in';
    stats.channels[channel] = (stats.channels[channel] || 0) + 1;
  });

  const topChannels = Object.entries(stats.channels).sort((a,b) => b[1] - a[1]);

  return (
    <>
      <div className="animate-slide-in" style={{ paddingBottom: '40px' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '950', color: '#1A202C', marginBottom: '6px', letterSpacing: '-0.5px' }}>Customer Relationship (CRM)</h2>
            <p style={{ color: '#718096', fontSize: '14px' }}>ระบบบริหารจัดการลูกค้าสัมพันธ์และสิทธิประโยชน์สมาชิก</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#666' }} onClick={handleDownloadTemplate} title="โหลดแม่แบบ CSV สำหรับนำเข้า">
               <FileDown size={14} /> Template
            </button>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #E2E8F0', borderRadius: '12px' }} onClick={handleExportMembers}>
               <Download size={16} /> ส่งออก (Export)
            </button>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #E2E8F0', borderRadius: '12px' }} onClick={handleImportMembers}>
               <FileUp size={16} /> นำเข้า (Import)
            </button>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #E2E8F0', borderRadius: '12px' }} onClick={() => setShowLinkModal(true)}>
               <Share2 size={16} /> ลิงก์สมัครสมาชิก
            </button>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#047857', borderRadius: '12px', padding: '10px 20px', fontWeight: 'bold' }} onClick={() => setIsModalOpen(true)}>
               <Plus size={16} /> เริ่มสมัครสมาชิกใหม่
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #EDF2F7', paddingBottom: '12px' }}>
          <TabButton active={activeTab === 'list'} icon={<Users size={18}/>} label="รายชื่อสมาชิก" onClick={() => { setActiveTab('list'); setCurrentPage(1); }} />
          <TabButton active={activeTab === 'ranking'} icon={<History size={18}/>} label="รายงานยอดใช้จ่าย" onClick={() => setActiveTab('ranking')} />
          <TabButton active={activeTab === 'redemptions'} icon={<Gift size={18}/>} label="ประวัติการแลกแต้ม" onClick={() => setActiveTab('redemptions')} />
          <TabButton active={activeTab === 'config'} icon={<Award size={18}/>} label="สิทธิประโยชน์" onClick={() => setActiveTab('config')} />
          <TabButton active={activeTab === 'wheel'} icon={<Trophy size={18}/>} label="วงล้อนำโชค" onClick={() => setActiveTab('wheel')} />
        </div>

        {activeTab === 'list' && (
          <div className="animate-fade-in">
            {/* --- SUMMARY OVERVIEW CARDS --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
               <div className="card" style={{ background: 'linear-gradient(135deg, #48BB78 0%, #38A169 100%)', padding: '24px', borderRadius: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(72, 187, 120, 0.3)' }}>
                  <div>
                     <div style={{ fontSize: '36px', fontWeight: '900', lineHeight: '1' }}>{totalVisits.toLocaleString()}</div>
                     <div style={{ fontSize: '13px', fontWeight: 'bold', opacity: 0.9, marginTop: '8px', letterSpacing: '1px' }}>TOTAL VISITS</div>
                  </div>
                  <Users size={48} style={{ opacity: 0.3 }} />
               </div>
               <div className="card" style={{ background: 'linear-gradient(135deg, #4299E1 0%, #3182CE 100%)', padding: '24px', borderRadius: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(66, 153, 225, 0.3)' }}>
                  <div>
                     <div style={{ fontSize: '32px', fontWeight: '900', lineHeight: '1' }}>฿{totalSpend.toLocaleString()}</div>
                     <div style={{ fontSize: '13px', fontWeight: 'bold', opacity: 0.9, marginTop: '8px', letterSpacing: '1px' }}>TOTAL SPEND</div>
                  </div>
                  <Banknote size={48} style={{ opacity: 0.3 }} />
               </div>
               <div className="card" style={{ background: 'linear-gradient(135deg, #F56565 0%, #E53E3E 100%)', padding: '24px', borderRadius: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(245, 101, 101, 0.3)' }}>
                  <div>
                     <div style={{ fontSize: '32px', fontWeight: '900', lineHeight: '1' }}>฿{Math.round(avgSpend).toLocaleString()}</div>
                     <div style={{ fontSize: '13px', fontWeight: 'bold', opacity: 0.9, marginTop: '8px', letterSpacing: '1px' }}>AVG. SPEND / VISIT</div>
                  </div>
                  <Trophy size={48} style={{ opacity: 0.3 }} />
               </div>
            </div>

            {/* Filter Bar */}
            <div className="card" style={{ padding: '0', background: 'white', borderRadius: '20px', marginBottom: '24px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', background: '#2D3748', color: '#E2E8F0', fontSize: '12px', fontWeight: 'bold', display: 'flex', gap: '2px', overflowX: 'auto' }}>
                 <button style={{ padding: '8px 16px', borderRadius: '6px', background: '#4A5568', color: 'white', border: 'none', whiteSpace: 'nowrap' }}>Customer Group</button>
                 <button style={{ padding: '8px 16px', borderRadius: '6px', background: 'transparent', color: '#CBD5E0', border: 'none', whiteSpace: 'nowrap' }}>Gender</button>
                 <button style={{ padding: '8px 16px', borderRadius: '6px', background: 'transparent', color: '#CBD5E0', border: 'none', whiteSpace: 'nowrap' }}>Age</button>
                 <button style={{ padding: '8px 16px', borderRadius: '6px', background: 'transparent', color: '#CBD5E0', border: 'none', whiteSpace: 'nowrap' }}>Birthday</button>
                 <button style={{ padding: '8px 16px', borderRadius: '6px', background: 'transparent', color: '#CBD5E0', border: 'none', whiteSpace: 'nowrap' }}>Rewards Reminder</button>
                 <button style={{ padding: '8px 16px', borderRadius: '6px', background: 'transparent', color: '#CBD5E0', border: 'none', whiteSpace: 'nowrap' }}>Top 10 Spenders</button>
              </div>
              <div style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} size={20} />
                  <input 
                    type="text" 
                    placeholder="ค้นหารายชื่อสมาชิก, เบอร์โทร หรือ รหัสสมาชิก..." 
                    className="input"
                    style={{ paddingLeft: '48px', marginBottom: 0, borderRadius: '14px', height: '52px', border: '2px solid #EDF2F7' }}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" style={{ borderRadius: '12px', height: '52px' }}><Filter size={18} /> ตัวกรอง</button>
                  <select className="input" style={{ width: '150px', marginBottom: 0, height: '52px', border: '2px solid #EDF2F7', borderRadius: '14px' }} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                    <option value="desc">สมัครล่าสุด</option>
                    <option value="asc">สมัครเก่าสุด</option>
                    <option value="alphabet">ชื่อ A-Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tier Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                  { t: 'Silver', icon: <User size={20}/>, c: '#718096', bg: '#f7fafc' },
                  { t: 'VIP', icon: <Star size={20}/>, c: '#3182CE', bg: '#ebf8ff' },
                  { t: 'VVIP', icon: <Award size={20}/>, c: '#D69E2E', bg: '#fffff0' },
                  { t: 'SVIP', icon: <Crown size={20}/>, c: '#DD6B20', bg: '#fffaf0' },
                  { t: 'SSVIP', icon: <Crown size={20}/>, c: '#805AD5', bg: '#faf5ff' },
                ].map(tier => (
                  <div key={tier.t} className="card" style={{ padding: '16px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tier.bg, color: tier.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {tier.icon}
                     </div>
                     <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{tier.t}</h4>
                        <div style={{ fontSize: '18px', fontWeight: '900' }}>{stats.tiers[tier.t].toLocaleString()}</div>
                     </div>
                  </div>
                ))}
            </div>

            {/* Members Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#A0AEC0' }}>Loading Data...</div>
            ) : filteredCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#A0AEC0' }}>ไม่พบข้อมูลลูกค้า</div>
            ) : (
              <div className="card" style={{ padding: '0', background: 'white', borderRadius: '20px', overflow: 'hidden' }}>
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F7FAFC', color: '#4A5568', fontSize: '12px' }}>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>สมาชิก (Member)</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>ระดับ / เพศ</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>สรุปยอดซื้อ (Spend summary)</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>แต้มสะสม</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>เครดิตเงินสด</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCustomers.map(c => {
                        const tier = getTier(c.totalSpend);
                        const avg = c.totalSpend / (c.totalVisit || 1);
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                             <td style={{ padding: '20px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EDF2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0AEC0', fontSize: '16px', fontWeight: 'bold' }}>
                                     {c.nickname ? c.nickname.charAt(0).toUpperCase() : <User size={16}/>}
                                  </div>
                                  <div>
                                     <div style={{ fontSize: '15px', fontWeight: '700', color: '#1A202C' }}>{c.nickname || c.name}</div>
                                     <div style={{ fontSize: '12px', color: '#3182CE', fontWeight: 'bold' }}>{c.memberId || 'SSR-----'}</div>
                                     <div style={{ fontSize: '12px', color: '#A0AEC0' }}>{c.phone}</div>
                                  </div>
                                </div>
                             </td>
                             <td style={{ padding: '20px 16px' }}>
                                <div style={{ marginBottom: '4px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', background: tier.bg, color: tier.color }}>{tier.name}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#4A5568' }}>เพศ {c.gender || 'Male'}</div>
                             </td>
                             <td style={{ padding: '20px 16px', textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: '#1A202C', fontWeight: '600' }}>
                                  ฿{c.totalSpend?.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '11px', color: '#718096' }}>
                                  มาทั้งหมด {c.totalVisit || 0} ครั้ง
                                </div>
                                <div style={{ fontSize: '11px', color: '#A0AEC0' }}>
                                  เฉลี่ย ฿{Math.round(avg).toLocaleString()} / ครั้ง
                                </div>
                             </td>
                             <td style={{ padding: '20px 16px', textAlign: 'right' }}>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#D69E2E' }}>
                                  {c.points?.toLocaleString() || 0} <span style={{ fontSize: '10px' }}>PTS</span>
                                </div>
                             </td>
                             <td style={{ padding: '20px 16px', textAlign: 'right' }}>
                                <div style={{ fontSize: '16px', fontWeight: '900', color: '#38A169' }}>
                                  ฿{c.storeCredit?.toLocaleString() || 0}
                                </div>
                             </td>
                             <td style={{ padding: '20px 16px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                   <button className="btn-icon" onClick={() => handleHistoryClick(c)} style={{ padding: '6px', background: '#F0FFF4', color: '#38A169', border: '1px solid #C6F6D5' }}><History size={16} /></button>
                                   <button className="btn-icon" onClick={() => { setTopupCustomer(c); setTopupType('deposit'); setIsTopupModalOpen(true); }} style={{ padding: '6px', background: '#F5F3FF', color: '#805AD5', border: '1px solid #EDE9FE' }}><Wallet size={16} /></button>
                                   <button className="btn-icon" onClick={() => { setEditingCustomer(c); setIsEditModalOpen(true); }} style={{ padding: '6px', background: '#EBF8FF', color: '#3182CE', border: '1px solid #BEE3F8' }}><Edit size={16} /></button>
                                   <button className="btn-icon" onClick={() => handleDeleteCustomer(c.id, c.nickname || c.name)} style={{ padding: '6px', background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7' }}><Trash2 size={16} /></button>
                                </div>
                             </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ padding: '20px 32px', borderTop: '1px solid #EDF2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '13px', color: '#718096' }}>
                    แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} จาก {filteredCustomers.length} รายการ
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="btn btn-outline" 
                      disabled={currentPage === 1} 
                      onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                      style={{ padding: '6px 12px', minWidth: 'auto', borderRadius: '8px', height: '36px' }}
                    >
                      ย้อนกลับ
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                       let pageNum = currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
                       if (pageNum <= 0) pageNum = i + 1;
                       if (pageNum > totalPages) return null;
                       return (
                        <button 
                          key={pageNum} 
                          onClick={() => { setCurrentPage(pageNum); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                          style={{ 
                            width: '36px', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: currentPage === pageNum ? '#2D3748' : 'white',
                            color: currentPage === pageNum ? 'white' : '#718096',
                            fontWeight: 'bold',
                            border: currentPage === pageNum ? 'none' : '1px solid #E2E8F0'
                          }}
                        >
                          {pageNum}
                        </button>
                       );
                    })}
                    <button 
                      className="btn btn-outline" 
                      disabled={currentPage === totalPages} 
                      onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                      style={{ padding: '6px 12px', minWidth: 'auto', borderRadius: '8px', height: '36px' }}
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ranking' && <RankingTab customers={customers} />}
        {activeTab === 'redemptions' && <RedemptionsTab />}
        {activeTab === 'config' && <ConfigTab config={membershipConfig} onSave={(c) => { setMembershipConfig(c); saveMembershipConfig(c); }} />}
        {activeTab === 'wheel' && <WheelTab config={wheelConfig} onSave={(w) => { setWheelConfig(w); saveWheelConfig(w); }} />}
      </div>

      {/* --- ADD MODAL --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card animate-slide-in" style={{ width: '500px', background: 'white', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: '#F7FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={20} color="#047857" /> ลงทะเบียนสมาชิกใหม่</h2>
                 <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#A0AEC0' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddCustomer} style={{ padding: '24px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>ชื่อเล่นสมาชิก *</label>
                       <input type="text" className="input" name="nickname" value={formData.nickname} onChange={handleInputChange} required placeholder="เช่น น้องหญิง" />
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>เบอร์โทรศัพท์ *</label>
                       <input type="tel" className="input" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="081-234-5678" />
                    </div>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>เพศ (Gender)</label>
                       <select className="input" name="gender" value={formData.gender} onChange={handleInputChange}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                       </select>
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>วันเกิด</label>
                       <input type="date" className="input" name="dob" value={formData.dob} onChange={handleInputChange} />
                    </div>
                 </div>
                 <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>ช่องทางที่รู้จักร้าน</label>
                    <select className="input" name="channel" value={formData.channel} onChange={handleInputChange}>
                       <option value="Walk-in">Walk-in</option>
                       <option value="TikTok">TikTok</option>
                       <option value="Instagram">Instagram</option>
                       <option value="Facebook">Facebook</option>
                       <option value="Line">LINE OA</option>
                       <option value="Friend">เพื่อนแนะนำ</option>
                       <option value="Other">อื่นๆ</option>
                    </select>
                 </div>
                 <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>หมายเหตุ (Notes)</label>
                    <textarea className="input" name="notes" value={formData.notes} onChange={handleInputChange} rows="2"></textarea>
                 </div>
                 <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2, background: '#047857' }}>บันทึกสมาชิก</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && editingCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card animate-slide-in" style={{ width: '500px', background: 'white', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: '#F0F9FF', borderBottom: '1px solid #BAE6FD', display: 'flex', justifyContent: 'space-between' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0369A1' }}>แก้ไขข้อมูลสมาชิก</h2>
                 <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateCustomer} style={{ padding: '24px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>ชื่อเล่น *</label>
                       <input type="text" className="input" value={editingCustomer.nickname} onChange={e => setEditingCustomer({...editingCustomer, nickname: e.target.value})} required />
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>เบอร์โทร *</label>
                       <input type="tel" className="input" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} required />
                    </div>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>เพศ</label>
                       <select className="input" value={editingCustomer.gender || 'Male'} onChange={e => setEditingCustomer({...editingCustomer, gender: e.target.value})}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                       </select>
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>วันเกิด</label>
                       <input type="date" className="input" value={editingCustomer.dob || ''} onChange={e => setEditingCustomer({...editingCustomer, dob: e.target.value})} />
                    </div>
                 </div>
                 <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold' }}>หมายเหตุ</label>
                    <textarea className="input" value={editingCustomer.notes || ''} onChange={e => setEditingCustomer({...editingCustomer, notes: e.target.value})} rows="2"></textarea>
                 </div>
                 <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditModalOpen(false)}>ยกเลิก</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2, background: '#0369A1' }}>อัปเดตข้อมูล</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {showHistoryModal && selectedHistoryCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
           <div className="card animate-slide-in" style={{ width: '750px', maxWidth: '95vw', background: 'white', padding: 0, borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              
              {/* Header */}
              <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #38A169 0%, #2F855A 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <History size={24} color="#FFFFFF" />
                    </div>
                    <div>
                       <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF' }}>ประวัติการเข้าใช้บริการ</h2>
                       <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>ของลูกค้า: {selectedHistoryCustomer.nickname} ({selectedHistoryCustomer.memberId})</p>
                    </div>
                 </div>
                 <button onClick={() => setShowHistoryModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFFFFF' }}>
                    <X size={20} />
                 </button>
              </div>

              <div style={{ padding: '32px', maxHeight: '70vh', overflowY: 'auto' }}>
                 
                 {/* Quick Summary Row */}
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: '#F0FFF4', borderRadius: '16px', border: '1px solid #C6F6D5' }}>
                       <div style={{ fontSize: '11px', color: '#38A169', fontWeight: 'bold', marginBottom: '4px' }}>ยอดซื้อรวม (CUMULATIVE)</div>
                       <div style={{ fontSize: '20px', fontWeight: '900', color: '#2F855A' }}>฿{selectedHistoryCustomer.totalSpend?.toLocaleString()}</div>
                    </div>
                    <div style={{ padding: '16px', background: '#FAF5FF', borderRadius: '16px', border: '1px solid #E9D8FD' }}>
                       <div style={{ fontSize: '11px', color: '#805AD5', fontWeight: 'bold', marginBottom: '4px' }}>เครดิตคงเหลือ (CREDIT)</div>
                       <div style={{ fontSize: '20px', fontWeight: '900', color: '#6B46C1' }}>฿{selectedHistoryCustomer.storeCredit?.toLocaleString() || '0'}</div>
                    </div>
                    <div style={{ padding: '16px', background: '#EBF8FF', borderRadius: '16px', border: '1px solid #BEE3F8' }}>
                       <div style={{ fontSize: '11px', color: '#3182CE', fontWeight: 'bold', marginBottom: '4px' }}>แต้มปัจจุบัน (POINTS)</div>
                       <div style={{ fontSize: '20px', fontWeight: '900', color: '#2B6CB0' }}>{selectedHistoryCustomer.points?.toLocaleString()} pts</div>
                    </div>
                    <div style={{ padding: '16px', background: '#FFF5F5', borderRadius: '16px', border: '1px solid #FED7D7' }}>
                       <div style={{ fontSize: '11px', color: '#E53E3E', fontWeight: 'bold', marginBottom: '4px' }}>เข้าใชบริการรวม (VISITS)</div>
                       <div style={{ fontSize: '20px', fontWeight: '900', color: '#C53030' }}>{selectedHistoryCustomer.totalVisit || 0} ครั้ง</div>
                    </div>
                 </div>

                 <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#4A5568', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingBag size={18} /> รายการสั่งซื้อล่าสุด
                 </h4>

                 {historyLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#A0AEC0' }}>
                       <div className="spinner" style={{ marginBottom: '12px' }}></div>
                       กำลังโหลดประวัติการซื้อ...
                    </div>
                 ) : historyOrders.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', background: '#F8FAFC', borderRadius: '16px', border: '2px dashed #E2E8F0' }}>
                       <Calendar size={48} color="#CBD5E0" style={{ margin: '0 auto 16px' }} />
                       <div style={{ color: '#718096', fontWeight: 'bold' }}>ยังไม่พบประวัติการสั่งซื้อในระบบ</div>
                       <div style={{ fontSize: '12px', color: '#A0AEC0' }}>ประวัติจะเริ่มปรากฏเมื่อมีการทำรายการผ่าน POS</div>
                    </div>
                 ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       {historyOrders.map((order, idx) => (
                          <div key={order.id} style={{ 
                             display: 'flex', 
                             alignItems: 'center', 
                             justifyContent: 'space-between', 
                             padding: '16px 20px', 
                             background: '#FFFFFF', 
                             border: '1px solid #EDF2F7', 
                             borderRadius: '16px',
                             transition: 'all 0.2s'
                          }}
                          className="hover-bg-blue"
                          >
                             <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#F7FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#718096', fontWeight: 'bold', fontSize: '14px' }}>
                                   {historyOrders.length - idx}
                                </div>
                                <div>
                                   <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2D3748' }}>
                                      {order.timestamp?.toDate ? order.timestamp.toDate().toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                      <span style={{ fontSize: '11px', color: '#A0AEC0', marginLeft: '8px', fontWeight: 'normal' }}>
                                         {order.timestamp?.toDate ? order.timestamp.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}
                                      </span>
                                   </div>
                                    <div style={{ fontSize: '12px', color: '#718096' }}>
                                       {order.status === 'voided' ? (
                                         <span style={{ color: '#E53E3E', fontWeight: 'bold' }}>บิลนี้ถูกยกเลิกแล้ว</span>
                                       ) : (
                                         `${order.totalQty || 0} รายการ • ชำระโดย ${order.payments?.[0]?.method || 'ไม่ระบุ'}`
                                       )}
                                    </div>
                                </div>
                             </div>
                             <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: order.status === 'voided' ? '#CBD5E0' : '#3182CE', textDecoration: order.status === 'voided' ? 'line-through' : 'none' }}>
                                   {order.status === 'voided' ? '' : '+ '}฿{order.grandTotal?.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#D69E2E' }}>
                                   {order.status === 'voided' ? 'POINTS VOIDED' : `ได้รับ ${Math.floor(order.grandTotal / 100)} Points`}
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              <div style={{ padding: '24px 32px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'center' }}>
                 <button 
                   className="btn btn-primary" 
                   style={{ width: '200px', height: '48px', borderRadius: '12px', background: '#4A5568' }} 
                   onClick={() => setShowHistoryModal(false)}
                 >
                    ตกลง
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- LINK MODAL --- */}
      {showLinkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card animate-slide-in" style={{ width: '400px', background: 'white', padding: '30px', borderRadius: '16px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: '#3182CE' }}><Share2 size={48} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>ลิงก์สำหรับสมัครสมาชิก</h3>
              <p style={{ fontSize: '13px', color: '#718096', marginBottom: '24px' }}>ให้ลูกค้าสแกนเพื่อกรอกข้อมูลด้วยตนเอง</p>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', background: '#F7FAFC', marginBottom: '24px' }}>
                 <input type="text" value={`${window.location.origin}/register`} readOnly style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '14px', outline: 'none' }} />
                 <button className="btn-icon" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register`); alert('Copied!'); }}><Copy size={16}/></button>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowLinkModal(false)}>ตกลง</button>
           </div>
        </div>
      )}

      {/* --- STORE CREDIT MODAL --- */}
      {isTopupModalOpen && topupCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card animate-slide-in" style={{ width: '450px', background: 'white', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: topupType === 'deposit' ? '#FAF5FF' : '#FFF5F5', borderBottom: '1px solid', borderColor: topupType === 'deposit' ? '#E9D8FD' : '#FED7D7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ background: topupType === 'deposit' ? '#805AD5' : '#E53E3E', padding: '6px', borderRadius: '8px', color: 'white' }}><Banknote size={20} /></div>
                   <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: topupType === 'deposit' ? '#553C9A' : '#9B2C2C', margin: 0 }}>จัดการเครดิตเงินสด</h2>
                 </div>
                 <button onClick={() => setIsTopupModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={20} /></button>
              </div>
              
              <div style={{ padding: '24px', background: '#F7FAFC', borderBottom: '1px solid #EDF2F7' }}>
                 <div style={{ fontSize: '12px', color: '#718096', fontWeight: 'bold', marginBottom: '4px' }}>สมาชิก (MEMBER)</div>
                 <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2D3748' }}>{topupCustomer.nickname || topupCustomer.name} <span style={{ fontSize: '12px', color: '#A0AEC0' }}>({topupCustomer.phone})</span></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '12px', background: 'white', borderRadius: '12px', border: '1px dashed #CBD5E0' }}>
                    <div style={{ fontSize: '12px', color: '#718096', fontWeight: 'bold' }}>ยอดคงเหลือเดิม:</div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#38A169' }}>฿{topupCustomer.storeCredit?.toLocaleString() || 0}</div>
                 </div>
              </div>

              <form onSubmit={handleTopupSubmit} style={{ padding: '24px' }}>
                 <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                     <button type="button" onClick={() => setTopupType('deposit')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: topupType === 'deposit' ? '2px solid #805AD5' : '1px solid #EDF2F7', background: topupType === 'deposit' ? '#FAF5FF' : 'white', color: topupType === 'deposit' ? '#805AD5' : '#718096', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>➕ เติมเงิน</button>
                     <button type="button" onClick={() => setTopupType('withdraw')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: topupType === 'withdraw' ? '2px solid #E53E3E' : '1px solid #EDF2F7', background: topupType === 'withdraw' ? '#FFF5F5' : 'white', color: topupType === 'withdraw' ? '#E53E3E' : '#718096', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>➖ ถอนเงิน/ลด</button>
                 </div>
                 <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '8px' }}>จำนวนเงิน (บาท) *</label>
                    <input type="number" className="input" autoFocus placeholder="ระบุจำนวนเงิน..." value={topupAmount} onChange={e => setTopupAmount(e.target.value)} required style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', height: '56px' }} />
                 </div>
                 <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4A5568', marginBottom: '8px' }}>หมายเหตุ (ตัวเลือก)</label>
                    <input type="text" className="input" placeholder={topupType === 'deposit' ? "เช่น โบนัสโปรโมชั่น..." : "เช่น ลูกค้าขอคืนเงิน, ตั้งค่าผิดพลาด..."} value={topupNotes} onChange={e => setTopupNotes(e.target.value)} />
                 </div>
                 <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsTopupModalOpen(false)}>ยกเลิก</button>
                    <button type="submit" className="btn" style={{ flex: 2, background: topupType === 'deposit' ? '#805AD5' : '#E53E3E', color: 'white', fontWeight: 'bold' }}>{topupType === 'deposit' ? 'ยืนยันการเติมเงิน' : 'ยืนยันการถอน/ปรับลด'}</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* --- IMPORT PREVIEW MODAL --- */}
      {importPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div className="card animate-slide-in" style={{ width: '820px', maxWidth: '95vw', background: 'white', padding: 0, borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #2D3748 0%, #1A202C 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileUp size={24} color="#FFFFFF" />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '900', margin: 0 }}>ตรวจสอบข้อมูลสมาชิกที่เตรียมนำเข้า</h2>
                  <p style={{ fontSize: '13px', opacity: 0.8, margin: 0 }}>พบรายการเปลี่ยนแปลงทั้งหมด {importPreview.length} รายการ</p>
                </div>
              </div>
              <button onClick={() => setImportPreview(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '32px', maxHeight: '60vh', overflowY: 'auto', background: '#F8FAFC' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {importPreview.map((item, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '16px 20px', 
                    background: '#FFFFFF', 
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: item.type === 'add' ? '#C6F6D5' : '#FEFCBF',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                         <input 
                          type="checkbox" 
                          style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2D3748' }}
                          checked={selectedImportItems.includes(idx)} 
                          onChange={() => {
                            if (selectedImportItems.includes(idx)) {
                              setSelectedImportItems(selectedImportItems.filter(i => i !== idx));
                            } else {
                              setSelectedImportItems([...selectedImportItems, idx]);
                            }
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ 
                            fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '20px',
                            background: item.type === 'add' ? '#F0FFF4' : '#FFFBEB',
                            color: item.type === 'add' ? '#2F855A' : '#B7791F',
                            border: `1px solid ${item.type === 'add' ? '#C6F6D5' : '#FEFCBF'}`
                          }}>
                            {item.type === 'add' ? 'NEW MEMBER' : 'UPDATE DATA'}
                          </span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#1A202C' }}>{item.name || 'ไม่ระบุชื่อ'}</div>
                        <div style={{ fontSize: '13px', color: '#718096', fontWeight: '500' }}>{item.phone}</div>
                      </div>
                    </div>
                    {item.changes && (
                      <div style={{ textAlign: 'right', background: '#FEFCBF', padding: '8px 12px', borderRadius: '10px', border: '1px solid #FAF089' }}>
                        {item.changes.map((c, i) => (
                          <div key={i} style={{ fontSize: '11px', color: '#744210', fontWeight: 'bold' }}>• {c}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '24px 32px', background: 'white', borderTop: '1px solid #EDF2F7', display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button 
                className="btn btn-outline" 
                style={{ width: '180px', height: '48px', borderRadius: '12px' }} 
                onClick={() => setImportPreview(null)}
              >
                ยกเลิก
              </button>
              <button 
                className="btn btn-primary" 
                style={{ width: '280px', height: '48px', background: '#2D3748', borderRadius: '12px', fontWeight: 'bold' }}
                onClick={handleConfirmImport}
                disabled={selectedImportItems.length === 0}
              >
                ยืนยันการนำเข้า ({selectedImportItems.length} รายการ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- IMPORT PROGRESS MODAL --- */}
      {importProgress && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div className="card" style={{ width: '420px', background: 'white', padding: '40px', textAlign: 'center', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div className="spinner" style={{ width: '60px', height: '60px', margin: '0 auto 28px', borderColor: '#2D3748', borderTopColor: 'transparent' }}></div>
            <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#1A202C', marginBottom: '10px' }}>กำลังบันทึกข้อมูลสมาชิก...</h3>
            <p style={{ fontSize: '14px', color: '#718096', marginBottom: '32px', lineHeight: '1.6' }}>กรุณารอสักครู่ ระบบกำลังนำเข้าข้อมูลเข้าสู่ Cloud Database<br/>ห้ามปิดหรือรีเฟรชหน้านี้</p>
            
            <div style={{ background: '#F7FAFC', padding: '20px', borderRadius: '20px', border: '1px solid #EDF2F7' }}>
              <div style={{ width: '100%', height: '10px', background: '#E2E8F0', borderRadius: '5px', overflow: 'hidden', marginBottom: '15px' }}>
                <div style={{ width: `${(importProgress.current / importProgress.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #2D3748, #4A5568)', transition: 'width 0.3s' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#718096' }}>PROGRESS</span>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#2D3748' }}>
                  {importProgress.current} / {importProgress.total}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// --- NEW TAB COMPONENTS ---

const TabButton = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      padding: '10px 16px', 
      border: 'none', 
      background: active ? '#EBF8FF' : 'transparent', 
      color: active ? '#2B6CB0' : '#718096', 
      borderRadius: '10px', 
      fontSize: '14px', 
      fontWeight: active ? '900' : 'normal',
      cursor: 'pointer',
      transition: 'all 0.3s'
    }}
  >
    {icon} {label}
  </button>
);

const RankingTab = ({ customers }) => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [displayCustomers, setDisplayCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const applyRanking = async () => {
      setLoading(true);
      
      // If no date range, use pre-calculated totalSpend from customer doc
      if (!dateRange.start && !dateRange.end) {
        const sorted = [...customers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));
        setDisplayCustomers(sorted);
        setLoading(false);
        return;
      }

      try {
        // If date range provided, we MUST aggregate from sales since totalSpend is all-time
        const start = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : new Date(0);
        const end = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : new Date();

        const q = query(
          collection(db, 'sales'),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end)
        );
        
        const snapshot = await getDocs(q);
        const spendMap = {};
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'voided') return; // Skip voided sales in periodic ranking
          
          const cid = data.customer?.id;
          if (cid) {
            spendMap[cid] = (spendMap[cid] || 0) + (data.grandTotal || 0);
          }
        });

        const aggregated = customers.map(c => ({
          ...c,
          periodSpend: spendMap[c.id] || 0
        })).sort((a, b) => b.periodSpend - a.periodSpend);

        setDisplayCustomers(aggregated);
      } catch (err) {
        console.error("Aggregation error:", err);
      } finally {
        setLoading(false);
      }
    };

    applyRanking();
  }, [customers, dateRange]);

  return (
    <div className="animate-fade-in card" style={{ padding: '24px', background: 'white', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
           <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>อันดับยอดซื้อสะสม (Top Spenders)</h3>
           <p style={{ fontSize: '12px', color: '#718096' }}>{dateRange.start ? `ตั้งแต่วันที่ ${dateRange.start} ถึง ${dateRange.end || 'วันนี้'}` : 'ข้อมูลทั้งหมด (All-time)'}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
           <input 
             type="date" 
             className="input" 
             style={{ width: '150px', marginBottom: 0 }} 
             onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
             value={dateRange.start}
           />
           <span style={{ color: '#E2E8F0' }}>–</span>
           <input 
             type="date" 
             className="input" 
             style={{ width: '150px', marginBottom: 0 }} 
             onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
             value={dateRange.end}
           />
           <button className="btn btn-outline" onClick={() => setDateRange({ start: '', end: '' })}>ล้างค่า</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {loading ? (
           <div style={{ textAlign: 'center', padding: '40px', color: '#A0AEC0' }}>กำลังคำนวณสถิติ...</div>
        ) : (
          <table className="table" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F7FAFC' }}>
                <th style={{ padding: '12px' }}>อันดับ</th>
                <th style={{ padding: '12px' }}>สมาชิก</th>
                <th style={{ padding: '12px' }}>เบอร์โทร</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>ยอดซื้อ {dateRange.start ? 'ในช่วงเวลา' : 'สะสม'}</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>แต้มปัจจุบัน</th>
              </tr>
            </thead>
            <tbody>
              {displayCustomers.filter(c => (dateRange.start ? c.periodSpend > 0 : true)).slice(0, 50).map((c, idx) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ 
                      width: '28px', height: '28px', borderRadius: '50%', 
                      background: idx === 0 ? '#FECC2F' : (idx === 1 ? '#C0C0C0' : (idx === 2 ? '#CD7F32' : '#F7FAFC')),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px',
                      color: idx < 3 ? '#fff' : '#4A5568'
                    }}>
                      {idx + 1}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                     <div style={{ fontWeight: 'bold' }}>{c.nickname || c.name}</div>
                     <div style={{ fontSize: '10px', color: '#A0AEC0' }}>{c.memberId}</div>
                  </td>
                  <td style={{ padding: '12px' }}>{c.phone}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', color: '#2B6CB0' }}>
                    ฿{(dateRange.start ? c.periodSpend : c.totalSpend)?.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{c.points?.toLocaleString()} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const ConfigTab = ({ config, onSave }) => {
  const [local, setLocal] = useState(config);
  
  return (
    <div className="animate-fade-in card" style={{ padding: '32px', background: 'white', borderRadius: '16px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>จัดการสิทธิประโยชน์สมาชิก (SIS&RICH MEMBER)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
         <div style={{ border: '1px solid #E2E8F0', padding: '20px', borderRadius: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#8B0000' }}>รายการคูปองส่วนลด</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
               {local.coupons.map((cp, idx) => (
                 <div key={idx} style={{ padding: '12px', background: '#F7FAFC', borderRadius: '12px', border: '1px solid #EDF2F7', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="text" className="input" style={{ marginBottom: 0, flex: 2 }} value={cp.name} 
                      onChange={e => {
                        const newC = [...local.coupons];
                        newC[idx].name = e.target.value;
                        setLocal({...local, coupons: newC});
                      }}
                    />
                    <input type="number" className="input" style={{ marginBottom: 0, flex: 1 }} value={cp.points} 
                      onChange={e => {
                        const newC = [...local.coupons];
                        newC[idx].points = parseInt(e.target.value);
                        setLocal({...local, coupons: newC});
                      }}
                    />
                    <span style={{ fontSize: '10px' }}>pts</span>
                 </div>
               ))}
            </div>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setLocal({...local, coupons: [...local.coupons, {name: 'คูปองใหม่', points: 500}]})}><Plus size={14} /> เพิ่มคูปองใหม่</button>
         </div>

         <div style={{ border: '1px solid #E2E8F0', padding: '20px', borderRadius: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#D4AF37' }}>เกณฑ์การสะสมยอด (Tier Multiplier)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {Object.entries(local.tierMultipliers).map(([tier, val]) => (
                 <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', width: '60px' }}>{tier} :</span>
                    <input type="number" step="0.1" className="input" value={val} style={{ width: '80px', marginBottom: 0 }} 
                       onChange={e => {
                         const newT = {...local.tierMultipliers, [tier]: parseFloat(e.target.value)};
                         setLocal({...local, tierMultipliers: newT});
                       }}
                    />
                    <span style={{ width: '40px', fontSize: '12px' }}>เท่า</span>
                 </div>
               ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '30px', background: '#D4AF37' }} onClick={() => onSave(local)}>บันทึกการตั้งค่า</button>
         </div>
      </div>
    </div>
  );
};

const WheelTab = ({ config, onSave }) => {
  const [local, setLocal] = useState(config);
  
  return (
    <div className="animate-fade-in card" style={{ padding: '32px', background: 'white', borderRadius: '16px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>ตั้งค่าวงล้อลุ้นโชค (Lucky Wheel Configuration)</h3>
      <table className="table" style={{ width: '100%', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#F7FAFC' }}>
            <th style={{ padding: '12px' }}>ชิ้นส่วน (Segment)</th>
            <th style={{ padding: '12px' }}>ข้อความรางวัล</th>
            <th style={{ padding: '12px' }}>โอกาสได้รับ (%)</th>
            <th style={{ padding: '12px' }}>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {local.map((seg, idx) => (
            <tr key={idx}>
              <td style={{ padding: '12px' }}>ช่องที่ {idx + 1}</td>
              <td style={{ padding: '12px' }}>
                 <input type="text" className="input" style={{ marginBottom: 0 }} value={seg.label} 
                   onChange={e => {
                     const newL = [...local];
                     newL[idx].label = e.target.value;
                     setLocal(newL);
                   }}
                 />
              </td>
              <td style={{ padding: '12px' }}>
                 <input type="number" className="input" style={{ width: '100px', marginBottom: 0 }} value={seg.probability} 
                   onChange={e => {
                     const newL = [...local];
                     newL[idx].probability = parseInt(e.target.value);
                     setLocal(newL);
                   }}
                 />
              </td>
              <td style={{ padding: '12px' }}>
                 <button 
                   style={{ background: 'transparent', border: 'none', color: seg.active ? '#38A169' : '#E53E3E', fontWeight: 'bold', cursor: 'pointer' }}
                   onClick={() => {
                     const newL = [...local];
                     newL[idx].active = !newL[idx].active;
                     setLocal(newL);
                   }}
                 >
                   {seg.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                 </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ fontSize: '14px', color: '#E53E3E', fontWeight: 'bold' }}>
            รวมโอกาส: {local.reduce((sum, s) => sum + s.probability, 0)}% (ควรเท่ากับ 100%)
         </div>
         <button className="btn btn-primary" style={{ background: '#8B0000', width: '200px' }} onClick={() => onSave(local)}>บันทึกข้อมูลวงล้อ</button>
      </div>
    </div>
  );
};

const RedemptionsTab = () => {
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'redemptions'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRedemptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="animate-fade-in card" style={{ padding: '24px', background: 'white', borderRadius: '16px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>ประวัติการใช้คะแนนแลกสิทธิพิเศษ</h3>
      
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#A0AEC0' }}>กำลังโหลดข้อมูล...</div>
        ) : (
          <table className="table" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F7FAFC' }}>
                <th style={{ padding: '12px' }}>วัน-เวลา</th>
                <th style={{ padding: '12px' }}>สมาชิก</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>รหัสยืนยัน</th>
                <th style={{ padding: '12px' }}>สิทธิที่แลก</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>คะแนนที่ใช้</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((r, idx) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                  <td style={{ padding: '12px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    {r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString('th-TH') : '-'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>{r.customerName}</div>
                  </td>
                   <td style={{ padding: '12px', textAlign: 'center' }}>
                    <code style={{ background: '#EDF2F7', padding: '4px 8px', borderRadius: '4px', fontStyle: 'normal' }}>{r.claimCode}</code>
                  </td>
                  <td style={{ padding: '12px' }}>{r.couponName}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#E53E3E' }}>
                    -{r.pointsUsed} pts
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ 
                      fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px',
                      background: '#C6F6D5', color: '#2F855A'
                    }}>แลกแล้ว</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

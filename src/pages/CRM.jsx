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
  const [employees, setEmployees] = useState([]);

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
    gender: 'Male',
    channel: 'Walk-in',
    recommenderType: 'none',
    recommenderName: '',
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

      const eDoc = await getDocs(collection(db, 'employees'));
      setEmployees(eDoc.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    loadConfigs();

    return () => unsubscribe();
  }, []);

  const saveMembershipConfig = async (newConfig) => {
    try {
      const { id, ...data } = newConfig; 
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

      await addDoc(collection(db, 'customers'), {
        memberId: memberId,
        nickname: formData.nickname,
        name: formData.nickname, 
        phone: formData.phone,
        dob: formData.dob,
        gender: formData.gender,
        channel: formData.channel,
        referredBy: formData.recommenderType !== 'none' ? formData.recommenderName : null,
        notes: formData.notes,
        type: 'Silver', 
        totalSpend: 0,
        points: 0,
        totalVisit: 0,
        lastVisit: null,
        walletBalance: 0, 
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'system_logs'), {
        type: 'crm',
        action: 'สมัครสมาชิก',
        detail: `ลูกค้า: ${formData.nickname} (ID: ${memberId}) | ผู้แนะนำ: ${formData.recommenderName || 'ไม่มี'}`,
        operator: 'Admin Staff',
        timestamp: serverTimestamp()
      });

      alert("✅ สมัครสมาชิกสำเร็จ! รหัสประจำตัว: " + memberId);
      setIsModalOpen(false);
      setFormData({ nickname: '', phone: '', dob: '', gender: 'Male', channel: 'Walk-in', recommenderType: 'none', recommenderName: '', notes: '' });
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
        referredBy: editingCustomer.recommenderType !== 'none' ? editingCustomer.recommenderName : (editingCustomer.referredBy || null),
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
      const q = query(
        salesRef, 
        where('customer.id', '==', customer.id)
      );
      
      const querySnapshot = await getDocs(q);
      let orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      orders.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return timeB - timeA;
      });

      setHistoryOrders(orders);
    } catch (error) {
      console.error("Error fetching history:", error);
      alert("ไม่สามารถดึงข้อมูลประวัติได้: " + error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExportMembers = () => {
    if (customers.length === 0) return alert("ไม่มีข้อมูลสมาชิกเพื่อส่งออก");
    
    // Header Column (Standardized)
    const headers = [
      "Member ID", "Nickname", "Phone", "Gender", "Birth Date", 
      "Total Spend", "Points", "Store Credit", "Total Visits", 
      "Channel", "Recommender", "Notes", "Register Date", "Last Visit"
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
      c.referredBy || '',
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
            const phone = String(getValue(row, 'Phone', 'เบอร์โทร', 'โทรศัพท์') || '').trim();
            if (!phone) continue;

            const memberIdFromFile = String(getValue(row, 'Member ID', 'รหัสสมาชิก') || '').trim();
            const memberData = {
              nickname: String(getValue(row, 'Nickname', 'ชื่อเล่น', 'Name') || '').trim(),
              phone: phone,
              gender: getValue(row, 'Gender', 'เพศ') || 'Male',
              dob: String(getValue(row, 'Birth Date', 'วันเกิด') || '').trim(),
              totalSpend: Number(getValue(row, 'Total Spend', 'ยอดซื้อรวม')) || 0,
              points: Number(getValue(row, 'Points', 'คะแนน')) || 0,
              storeCredit: Number(getValue(row, 'Store Credit', 'เครดิต')) || 0,
              totalVisit: Number(getValue(row, 'Total Visits', 'จำนวนครั้ง')) || 0,
              referredBy: String(getValue(row, 'Recommender', 'ผู้แนะนำ') || '').trim() || null,
              channel: getValue(row, 'Channel', 'ช่องทาง') || 'Walk-in',
              notes: String(getValue(row, 'Notes', 'หมายเหตุ') || '').trim(),
              updatedAt: serverTimestamp()
            };

            const existing = customers.find(c => 
              (memberIdFromFile && c.memberId === memberIdFromFile) || 
              (c.phone === phone)
            );

            if (existing) {
              diffs.push({ type: 'update', id: existing.id, phone: phone, name: existing.nickname, newData: memberData });
            } else {
              memberData.createdAt = serverTimestamp();
              diffs.push({ type: 'add', phone: phone, name: memberData.nickname, newData: memberData });
            }
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
        ? Math.max(...customers.map(c => parseInt(c.memberId?.match(/\d+/)?.[0] || 0))) + 1 
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
            batch.set(doc(collection(db, 'customers')), { ...item.newData, memberId, name: item.newData.nickname });
            nextNum++;
          }
        });

        await batch.commit();
        setImportProgress({ current: Math.min(i + CHUNK_SIZE, itemsToProcess.length), total: itemsToProcess.length });
      }

      setImportPreview(null);
      setImportProgress(null);
      alert(`นำเข้าสำเร็จ ${itemsToProcess.length} รายการ!`);
    } catch (error) {
       alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Member ID", "Nickname", "Phone", "Gender", "Birth Date", "Total Spend", "Points", "Store Credit", "Total Visits", "Channel", "Recommender", "Notes", "Register Date", "Last Visit"
    ];
    const example = ["", "เจมส์", "0812345678", "Male", "1990-12-30", "5000", "50", "0", "2", "TikTok", "Admin", "หมายเหตุ...", "15/01/2024 10:30", "10/04/2026 11:55"];
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

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getTier = (spend = 0) => {
    if (spend >= 500000) return { name: 'SSVIP', color: '#805AD5', bg: '#FAF5FF', icon: <Crown size={16}/>, bg_card: 'linear-gradient(135deg, #805AD5 0%, #6B46C1 100%)' };
    if (spend >= 100000) return { name: 'SVIP', color: '#DD6B20', bg: '#FFFAF0', icon: <Crown size={16}/>, bg_card: 'linear-gradient(135deg, #DD6B20 0%, #C05621 100%)' };
    if (spend >= 50000) return { name: 'VVIP', color: '#D69E2E', bg: '#FFFFF0', icon: <Award size={16}/>, bg_card: 'linear-gradient(135deg, #D69E2E 0%, #B7791F 100%)' };
    if (spend >= 10000) return { name: 'VIP', color: '#3182CE', bg: '#EBF8FF', icon: <Star size={16}/>, bg_card: 'linear-gradient(135deg, #3182CE 0%, #2B6CB0 100%)' };
    return { name: 'Silver', color: '#718096', bg: '#EDF2F7', icon: <User size={16}/>, bg_card: 'linear-gradient(135deg, #718096 0%, #4A5568 100%)' };
  };

  const stats = {
    total: customers.length,
    tiers: { Silver: 0, VIP: 0, VVIP: 0, SVIP: 0, SSVIP: 0 }
  };
  customers.forEach(c => {
    const tierName = getTier(c.totalSpend).name;
    stats.tiers[tierName] = (stats.tiers[tierName] || 0) + 1;
  });

  return (
    <>
      <div className="animate-slide-in" style={{ paddingBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '950', color: '#1A202C', marginBottom: '6px', letterSpacing: '-0.5px' }}>Customer Relationship (CRM)</h2>
            <p style={{ color: '#718096', fontSize: '14px' }}>ระบบบริหารจัดการลูกค้าสัมพันธ์และสิทธิประโยชน์สมาชิก</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#666' }} onClick={() => setShowLinkModal(true)}><Share2 size={16} /> ลิงก์สมัคร</button>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#666' }} onClick={handleDownloadTemplate}><FileDown size={14} /> Template</button>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #E2E8F0', borderRadius: '12px' }} onClick={handleExportMembers}><Download size={16} /> Export</button>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #E2E8F0', borderRadius: '12px' }} onClick={handleImportMembers}><FileUp size={16} /> Import</button>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#047857', borderRadius: '12px', padding: '10px 20px', fontWeight: 'bold' }} onClick={() => setIsModalOpen(true)}><Plus size={16} /> สมัครสมาชิก</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #EDF2F7', paddingBottom: '12px' }}>
          <TabButton active={activeTab === 'list'} icon={<Users size={18}/>} label="รายชื่อสมาชิก" onClick={() => setActiveTab('list')} />
          <TabButton active={activeTab === 'ranking'} icon={<History size={18}/>} label="รายงานยอดใช้จ่าย" onClick={() => setActiveTab('ranking')} />
          <TabButton active={activeTab === 'config'} icon={<Award size={18}/>} label="สิทธิประโยชน์" onClick={() => setActiveTab('config')} />
          <TabButton active={activeTab === 'wheel'} icon={<Trophy size={18}/>} label="วงล้อนำโชค" onClick={() => setActiveTab('wheel')} />
        </div>

        {activeTab === 'list' && (
          <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
               <StatCard bg="linear-gradient(135deg, #48BB78 0%, #38A169 100%)" value={totalVisits.toLocaleString()} label="TOTAL VISITS" icon={<Users size={48}/>} />
               <StatCard bg="linear-gradient(135deg, #4299E1 0%, #3182CE 100%)" value={`฿${totalSpend.toLocaleString()}`} label="TOTAL SPEND" icon={<Banknote size={48}/>} />
               <StatCard bg="linear-gradient(135deg, #F56565 0%, #E53E3E 100%)" value={`฿${Math.round(avgSpend).toLocaleString()}`} label="AVG. SPEND" icon={<Trophy size={48}/>} />
            </div>

            <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} size={20} />
                  <input type="text" placeholder="ค้นหาชื่อ, เบอร์..." className="input" style={{ paddingLeft: '48px', marginBottom: 0, borderRadius: '14px', height: '52px', border: '2px solid #EDF2F7' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="input" style={{ width: '150px', marginBottom: 0, height: '52px', border: '2px solid #EDF2F7', borderRadius: '14px' }} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                    <option value="desc">สมัครล่าสุด</option>
                    <option value="asc">สมัครเก่าสุด</option>
                </select>
            </div>

            <div className="card" style={{ padding: '0', background: 'white', borderRadius: '20px', overflow: 'hidden' }}>
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F7FAFC', color: '#4A5568', fontSize: '12px' }}>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>สมาชิก</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>ระดับ/เพศ</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>ผู้แนะนำ</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>ยอดซื้อ</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>แต้ม</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'right' }}>เครดิต</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCustomers.map(c => {
                        const tier = getTier(c.totalSpend);
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                             <td style={{ padding: '20px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F7FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0AEC0', fontSize: '16px', fontWeight: 'bold' }}>{c.nickname?.charAt(0)}</div>
                                  <div>
                                     <div style={{ fontSize: '15px', fontWeight: '700', color: '#1A202C' }}>{c.nickname}</div>
                                     <div style={{ fontSize: '12px', color: '#A0AEC0' }}>{c.phone}</div>
                                  </div>
                                </div>
                             </td>
                             <td style={{ padding: '20px 16px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: tier.color }}>{tier.name}</div>
                                <div style={{ fontSize: '11px', color: '#718096' }}>เพศ {c.gender}</div>
                             </td>
                             <td style={{ padding: '20px 16px' }}>
                                 <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0369a1' }}>{c.referredBy || '-'}</div>
                                 <div style={{ fontSize: '10px', color: '#94a3b8' }}>{c.referredBy ? 'Recommender' : 'Direct'}</div>
                             </td>
                             <td style={{ padding: '20px 16px', textAlign: 'right', fontWeight: 'bold' }}>฿{c.totalSpend?.toLocaleString()}</td>
                             <td style={{ padding: '20px 16px', textAlign: 'right' }}>{c.points?.toLocaleString()}</td>
                             <td style={{ padding: '20px 16px', textAlign: 'right', color: '#3182CE', fontWeight: 'bold' }}>฿{c.storeCredit?.toLocaleString() || 0}</td>
                             <td style={{ padding: '20px 16px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                   <button className="btn-icon" onClick={() => handleHistoryClick(c)} style={{ padding: '6px', color: '#38A169' }}><History size={16} /></button>
                                   <button className="btn-icon" onClick={() => { setEditingCustomer(c); setIsEditModalOpen(true); }} style={{ padding: '6px', color: '#3182CE' }}><Edit size={16} /></button>
                                   <button className="btn-icon" onClick={() => handleDeleteCustomer(c.id, c.nickname)} style={{ padding: '6px', color: '#E53E3E' }}><Trash2 size={16} /></button>
                                </div>
                             </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'ranking' && <RankingTab customers={customers} />}
        {activeTab === 'config' && <ConfigTab config={membershipConfig} onSave={(c) => { setMembershipConfig(c); saveMembershipConfig(c); }} />}
        {activeTab === 'wheel' && <WheelTab config={wheelConfig} onSave={(w) => { setWheelConfig(w); saveWheelConfig(w); }} />}
      </div>

      {/* --- ADD MODAL --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card" style={{ width: '500px', background: 'white', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: '#F7FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>ลงทะเบียนสมาชิกใหม่</h2>
                 <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddCustomer} style={{ padding: '24px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <input type="text" className="input" placeholder="ชื่อเล่น" name="nickname" value={formData.nickname} onChange={handleInputChange} required />
                    <input type="tel" className="input" placeholder="เบอร์โทร" name="phone" value={formData.phone} onChange={handleInputChange} required />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <select className="input" name="gender" value={formData.gender} onChange={handleInputChange}>
                       <option value="Male">Male</option>
                       <option value="Female">Female</option>
                    </select>
                    <input type="date" className="input" name="dob" value={formData.dob} onChange={handleInputChange} />
                 </div>
                 <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>ผู้แนะนำ (Recommender)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <select className="input" style={{ width: '120px', marginBottom: 0 }} name="recommenderType" value={formData.recommenderType} onChange={handleInputChange}>
                          <option value="none">ไม่มี</option>
                          <option value="employee">พนักงาน</option>
                          <option value="manual">ระบุเอง</option>
                       </select>
                       {formData.recommenderType === 'employee' && (
                          <select className="input" style={{ flex: 1, marginBottom: 0 }} name="recommenderName" value={formData.recommenderName} onChange={handleInputChange}>
                             <option value="">เลือกพนักงาน...</option>
                             {employees.map(e => <option key={e.id} value={e.nickname || e.name}>{e.nickname || e.name}</option>)}
                          </select>
                       )}
                       {formData.recommenderType === 'manual' && (
                          <input type="text" className="input" style={{ flex: 1, marginBottom: 0 }} placeholder="ระบุชื่อ..." name="recommenderName" value={formData.recommenderName} onChange={handleInputChange} />
                       )}
                    </div>
                 </div>
                 <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '52px', marginTop: '16px' }}>บันทึกข้อมูล</button>
              </form>
           </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && editingCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card" style={{ width: '500px', background: 'white', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: '#F0F9FF', borderBottom: '1px solid #BAE6FD', display: 'flex', justifyContent: 'space-between' }}>
                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0369A1' }}>แก้ไขข้อมูลสมาชิก</h2>
                 <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateCustomer} style={{ padding: '24px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <input type="text" className="input" value={editingCustomer.nickname} onChange={e => setEditingCustomer({...editingCustomer, nickname: e.target.value})} required />
                    <input type="tel" className="input" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} required />
                 </div>
                 <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>ผู้แนะนำ</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <select className="input" style={{ width: '120px', marginBottom: 0 }} 
                         value={editingCustomer.recommenderType || (editingCustomer.referredBy ? 'manual' : 'none')} 
                         onChange={e => setEditingCustomer({...editingCustomer, recommenderType: e.target.value})}>
                          <option value="none">ไม่มี</option>
                          <option value="employee">พนักงาน</option>
                          <option value="manual">ระบุเอง</option>
                       </select>
                       {(editingCustomer.recommenderType === 'employee' || (!editingCustomer.recommenderType && employees.some(e => e.nickname === editingCustomer.referredBy))) && (
                          <select className="input" style={{ flex: 1, marginBottom: 0 }} 
                             value={editingCustomer.recommenderName || editingCustomer.referredBy || ''} 
                             onChange={e => setEditingCustomer({...editingCustomer, recommenderName: e.target.value, referredBy: e.target.value})}>
                             <option value="">เลือกพนักงาน...</option>
                             {employees.map(e => <option key={e.id} value={e.nickname || e.name}>{e.nickname || e.name}</option>)}
                          </select>
                       )}
                       {(editingCustomer.recommenderType === 'manual' || (!editingCustomer.recommenderType && editingCustomer.referredBy && !employees.some(e => e.nickname === editingCustomer.referredBy))) && (
                          <input type="text" className="input" style={{ flex: 1, marginBottom: 0 }} 
                             value={editingCustomer.recommenderName || editingCustomer.referredBy || ''} 
                             onChange={e => setEditingCustomer({...editingCustomer, recommenderName: e.target.value, referredBy: e.target.value})} />
                       )}
                    </div>
                 </div>
                 <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '52px', background: '#0369A1' }}>อัปเดตข้อมูล</button>
              </form>
           </div>
        </div>
      )}

      {/* --- LINK MODAL --- */}
      {showLinkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
           <div className="card" style={{ width: '450px', background: 'white', padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                 <h3 style={{ fontWeight: 'bold' }}>ลิงก์สำหรับสมัครสมาชิก</h3>
                 <button onClick={() => setShowLinkModal(false)} style={{ background: 'transparent', border: 'none' }}><X /></button>
              </div>
              <p style={{ fontSize: '14px', color: '#718096', marginBottom: '16px' }}>ส่งลิงก์นี้ให้ลูกค้าเพื่อให้ลูกค้าสมัครสมาชิกด้วยตนเอง:</p>
              <div style={{ background: '#F7FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                 <code style={{ flex: 1, fontSize: '13px', color: '#2D3748' }}>{window.location.origin}/register</code>
                 <button className="btn-icon" onClick={() => {
                   navigator.clipboard.writeText(`${window.location.origin}/register`);
                   alert("คัดลอกลิงก์แล้ว!");
                 }}><Copy size={16} /></button>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowLinkModal(false)}>ปิดหน้าต่าง</button>
           </div>
        </div>
      )}
    </>
  );
}

const StatCard = ({ bg, value, label, icon }) => (
  <div className="card" style={{ background: bg, padding: '24px', borderRadius: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <div style={{ fontSize: '32px', fontWeight: '900' }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.8 }}>{label}</div>
    </div>
    <div style={{ opacity: 0.3 }}>{icon}</div>
  </div>
);

const TabButton = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', border: 'none', background: active ? '#EDF2F7' : 'transparent', color: active ? '#2D3748' : '#718096', borderRadius: '12px', fontWeight: active ? 'bold' : 'normal', cursor: 'pointer' }}>
    {icon} {label}
  </button>
);

const RankingTab = ({ customers }) => {
  const sorted = [...customers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));
  return (
    <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '20px' }}>
       <h3>อันดับยอดซื้อสะสม</h3>
       <table className="table" style={{ width: '100%', marginTop: '20px' }}>
          <thead>
             <tr style={{ textAlign: 'left', background: '#F7FAFC' }}>
                <th style={{ padding: '12px' }}>อันดับ</th>
                <th style={{ padding: '12px' }}>สมาชิก</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>ยอดรวม</th>
             </tr>
          </thead>
          <tbody>
             {sorted.slice(0, 50).map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                   <td style={{ padding: '12px' }}>{i + 1}</td>
                   <td style={{ padding: '12px' }}>{c.nickname}</td>
                   <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>฿{c.totalSpend?.toLocaleString()}</td>
                </tr>
             ))}
          </tbody>
       </table>
    </div>
  );
};

const ConfigTab = ({ config, onSave }) => {
  const [local, setLocal] = useState(config);
  return (
    <div className="card" style={{ padding: '32px', background: 'white', borderRadius: '20px' }}>
       <h3 style={{ marginBottom: '24px' }}>จัดการสิทธิประโยชน์สมาชิก</h3>
       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div>
             <h4 style={{ fontSize: '14px', marginBottom: '16px', color: '#718096' }}>รายการคูปองส่วนลด</h4>
             {local.coupons.map((cp, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                   <input type="text" className="input" style={{ flex: 1, marginBottom: 0 }} value={cp.name} onChange={e => {
                      const newC = [...local.coupons];
                      newC[idx].name = e.target.value;
                      setLocal({...local, coupons: newC});
                   }} />
                   <input type="number" className="input" style={{ width: '80px', marginBottom: 0 }} value={cp.points} onChange={e => {
                      const newC = [...local.coupons];
                      newC[idx].points = parseInt(e.target.value);
                      setLocal({...local, coupons: newC});
                   }} />
                </div>
             ))}
          </div>
          <div>
             <h4 style={{ fontSize: '14px', marginBottom: '16px', color: '#718096' }}>เกณฑ์การสะสมยอด (Multiplier)</h4>
             {Object.entries(local.tierMultipliers).map(([tier, val]) => (
                <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                   <span>{tier} :</span>
                   <input type="number" step="0.1" className="input" value={val} style={{ width: '100px', marginBottom: 0 }} onChange={e => {
                      setLocal({...local, tierMultipliers: {...local.tierMultipliers, [tier]: parseFloat(e.target.value)}});
                   }} />
                </div>
             ))}
          </div>
       </div>
       <button className="btn btn-primary" style={{ marginTop: '32px', width: '200px' }} onClick={() => onSave(local)}>บันทึกการตั้งค่า</button>
    </div>
  );
};

const WheelTab = ({ config, onSave }) => {
  const [local, setLocal] = useState(config);
  return (
    <div className="card" style={{ padding: '32px', background: 'white', borderRadius: '20px' }}>
       <h3>ตั้งค่าวงล้อลุ้นโชค</h3>
       <table className="table" style={{ width: '100%', marginTop: '20px' }}>
          <thead>
             <tr style={{ textAlign: 'left', background: '#F7FAFC' }}>
                <th style={{ padding: '12px' }}>ช่องข้อมความ</th>
                <th style={{ padding: '12px' }}>ความน่าจะเป็น (%)</th>
                <th style={{ padding: '12px' }}>สถานะ</th>
             </tr>
          </thead>
          <tbody>
             {local.map((seg, idx) => (
                <tr key={idx}>
                   <td style={{ padding: '8px' }}>
                      <input type="text" className="input" value={seg.label} style={{ marginBottom: 0 }} onChange={e => {
                         const nl = [...local]; nl[idx].label = e.target.value; setLocal(nl);
                      }} />
                   </td>
                   <td style={{ padding: '8px' }}>
                      <input type="number" className="input" value={seg.probability} style={{ width: '100px', marginBottom: 0 }} onChange={e => {
                         const nl = [...local]; nl[idx].probability = parseInt(e.target.value); setLocal(nl);
                      }} />
                   </td>
                   <td style={{ padding: '8px' }}>
                      <input type="checkbox" checked={seg.active} onChange={e => {
                         const nl = [...local]; nl[idx].active = e.target.checked; setLocal(nl);
                      }} />
                   </td>
                </tr>
             ))}
          </tbody>
       </table>
       <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => onSave(local)}>บันทึกข้อมูลวงล้อ</button>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { 
  FileText, Search, Filter, Download, Calendar, 
  ShoppingCart, Package, Users, Settings as SettingsIcon,
  PlusCircle, Trash2, Edit3, ArrowRightLeft, CreditCard
} from 'lucide-react';

export default function Reports() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setLogs(fetchLogs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getActionIcon = (type) => {
    switch(type) {
      case 'pos': return <ShoppingCart size={16} color="#38A169" />;
      case 'inventory': return <Package size={16} color="#3182CE" />;
      case 'crm': return <Users size={16} color="#805AD5" />;
      case 'settings': return <SettingsIcon size={16} color="#718096" />;
      default: return <FileText size={16} />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.detail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.operator?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || log.type === typeFilter;
    const matchesDate = !dateFilter || log.timestamp.toISOString().split('T')[0] === dateFilter;
    return matchesSearch && matchesType && matchesDate;
  });

  const handleExport = () => {
    let csv = "Timestamp,Type,Action,Detail,Operator\n";
    filteredLogs.forEach(l => {
      csv += `"${l.timestamp.toLocaleString()}","${l.type}","${l.action}","${l.detail}","${l.operator}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `System_Log_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="animate-slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1A202C' }}>รายงานกิจกรรมระบบ (Detailed System Reports)</h2>
          <p style={{ color: '#718096', fontSize: '14px' }}>ติดตามทุกความเคลื่อนไหว เพิ่ม ลด แก้ไข และการขาย แบบละเอียด</p>
        </div>
        <button className="btn btn-outline" onClick={handleExport} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* Filters Hub */}
      <div className="card" style={{ padding: '20px', background: 'white', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4A5568', marginBottom: '8px' }}>ค้นหากิจกรรม (Search Action / Operator)</label>
          <div className="input-icon-wrapper">
            <Search className="icon" size={18} />
            <input type="text" className="input" placeholder="ค้นหาชื่อพนักงาน, กิจกรรม..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ marginBottom: 0 }} />
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4A5568', marginBottom: '8px' }}>ประเภทกิจกรรม (Type)</label>
          <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ marginBottom: 0 }}>
            <option value="All">ทุกกิจกรรม (All)</option>
            <option value="pos">การขาย (POS)</option>
            <option value="inventory">คลังสินค้า (Inventory)</option>
            <option value="crm">ลูกค้า (CRM)</option>
            <option value="settings">การตั้งค่า (Settings)</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4A5568', marginBottom: '8px' }}>วันที่ (Date)</label>
          <input type="date" className="input" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ marginBottom: 0 }} />
        </div>
      </div>

      {/* Activity Timeline Table */}
      <div className="card" style={{ padding: '0', background: 'white', overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F7FAFC' }}>
              <th style={{ padding: '16px', width: '180px' }}>วัน-เวลา</th>
              <th style={{ padding: '16px', width: '120px' }}>ประเภท</th>
              <th style={{ padding: '16px' }}>กิจกรรม (Action)</th>
              <th style={{ padding: '16px' }}>รายละเอียด (Detail)</th>
              <th style={{ padding: '16px', width: '160px' }}>ผู้ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: '#A0AEC0' }}>กำลังโหลดข้อมูล...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: '#A0AEC0' }}>ไม่พบประวัติกิจกรรมในช่วงนี้</td></tr>
            ) : filteredLogs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#2D3748' }}>{log.timestamp.toLocaleDateString('th-TH')}</div>
                  <div style={{ fontSize: '11px', color: '#718096' }}>{log.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#F7FAFC', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    {getActionIcon(log.type)} {log.type?.toUpperCase()}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#2D3748' }}>{log.action}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A5568' }}>{log.detail}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{log.operator?.charAt(0)}</div>
                    {log.operator}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

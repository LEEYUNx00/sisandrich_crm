import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { 
  FileText, Search, Filter, Download, Calendar, 
  ShoppingCart, Package, Users, Settings as SettingsIcon,
  PlusCircle, Trash2, Edit3, ArrowRightLeft, CreditCard,
  BarChart2, TrendingUp, Activity, Layers, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, sales, inventory, logs
  const [logs, setLogs] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [salesSummary, setSalesSummary] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalBills: 0,
    totalProducts: 0,
    totalCustomers: 0,
    inventoryValue: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    
    // 1. System Logs (Live)
    const qLogs = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })));
    });

    // 2. Inventory Logs (Live)
    const qInv = query(collection(db, 'inventory_logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubInv = onSnapshot(qInv, (snap) => {
      setInventoryLogs(snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })));
    });

    // 3. Overall Stats & Sales Summary
    const fetchData = async () => {
      try {
        const salesSnap = await getDocs(collection(db, 'sales'));
        const productsSnap = await getDocs(collection(db, 'products'));
        const customersSnap = await getDocs(collection(db, 'customers'));

        let total = 0;
        let billsConfirmed = 0;
        let billsVoided = 0;

        salesSnap.forEach(doc => {
          const data = doc.data();
          if (data.status === 'voided') {
            billsVoided++;
          } else {
            billsConfirmed++;
            total += (data.grandTotal || 0);
          }
        });

        let invVal = 0;
        productsSnap.forEach(doc => {
          const data = doc.data();
          invVal += ((data.price || 0) * (data.stock1st || 0));
        });

        setStats({
          totalSales: total,
          totalBills: salesSnap.size,
          confirmedCount: billsConfirmed,
          voidedCount: billsVoided,
          totalProducts: productsSnap.size,
          totalCustomers: customersSnap.size,
          inventoryValue: invVal
        });

        // Group sales by Date
        const dayMap = {};
        salesSnap.forEach(doc => {
          const data = doc.data();
          if (data.status === 'voided') return; // Only show confirmed on graph

          const d = data.timestamp?.toDate().toISOString().split('T')[0];
          if (d) {
            if (!dayMap[d]) dayMap[d] = { date: d, total: 0, bills: 0 };
            dayMap[d].total += data.grandTotal || 0;
            dayMap[d].bills += 1;
          }
        });
        setSalesSummary(Object.values(dayMap).sort((a,b) => b.date.localeCompare(a.date)));

      } catch (err) {
        console.error("Data fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => {
      unsubLogs();
      unsubInv();
    };
  }, []);

  const handleExport = (data, filename) => {
    if (!data.length) return alert("ไม่มีข้อมูลสำหรับการ Export");
    let csv = Object.keys(data[0]).join(",") + "\n";
    data.forEach(row => {
      csv += Object.values(row).map(v => `"${v}"`).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="animate-slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: '#1A202C' }}>Reports & Command Center</h2>
          <p style={{ color: '#718096', fontSize: '14px' }}>วิเคราะห์การขาย คลังสินค้า และกิจกรรมพนักงานแบบครบวงจร</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
           <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('overview')}>📊 ภาพรวม</button>
           <button className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('sales')}>💰 ยอดขาย</button>
           <button className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('inventory')}>📦 คลังสินค้า</button>
           <button className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('logs')}>📋 กิจกรรมระบบ</button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <SummaryCard label="ยอดขายสะสมทั้งหมด" value={`฿${stats.totalSales.toLocaleString()}`} icon={<TrendingUp size={24} />} color="#3182CE" />
            <SummaryCard 
              label="จำนวนบิลทั้งหมด" 
              value={`${stats.totalBills.toLocaleString()} บิล`} 
              subtitleComponent={
                <div style={{ fontSize: '11px', marginTop: '4px', display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#38A169', fontWeight: 'bold' }}>✅ สำเร็จ: {stats.confirmedCount}</span>
                  <span style={{ color: '#E53E3E', fontWeight: 'bold' }}>❌ ยกเลิก: {stats.voidedCount}</span>
                </div>
              }
              icon={<ShoppingCart size={24} />} 
              color="#38A169" 
            />
            <SummaryCard label="มูลค่าสินค้าในคลัง" value={`฿${stats.inventoryValue.toLocaleString()}`} icon={<Package size={24} />} color="#D69E2E" />
            <SummaryCard label="ฐานลูกค้าสมาชิก" value={`${stats.totalCustomers.toLocaleString()} ราย`} icon={<Users size={24} />} color="#805AD5" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
             <div className="card">
                <h3 style={{ fontWeight: 'bold', marginBottom: '20px' }}>🕒 กิจกรรมล่าสุด (Recent Activity)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {logs.slice(0, 6).map(log => (
                     <div key={log.id} style={{ display: 'flex', gap: '12px', padding: '12px', borderBottom: '1px solid #F7FAFC' }}>
                        <div style={{ background: '#EBF8FF', color: '#3182CE', padding: '8px', borderRadius: '10px' }}>
                           <Activity size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                           <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{log.action}</div>
                           <div style={{ fontSize: '12px', color: '#718096' }}>{log.detail}</div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#A0AEC0', textAlign: 'right' }}>
                           {log.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             
             <div className="card" style={{ background: '#1A202C', color: 'white' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '20px' }}>💎 Health Check</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                   <HealthMetric label="Stock Availability" percent={85} color="#48BB78" />
                   <HealthMetric label="Customer Loyalty Rate" percent={62} color="#805AD5" />
                   <HealthMetric label="Sales Target (Monthly)" percent={45} color="#3182CE" />
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h3 style={{ fontWeight: 'bold' }}>📊 รายงานสรุปยอดขายรายวัน</h3>
             <button className="btn btn-outline btn-sm" onClick={() => handleExport(salesSummary, 'Daily_Sales')}>Export CSV</button>
          </div>
          <table className="table" style={{ width: '100%' }}>
             <thead>
                <tr style={{ background: '#F7FAFC' }}>
                   <th style={{ padding: '14px' }}>วันที่ (Date)</th>
                   <th style={{ padding: '14px', textAlign: 'center' }}>จำนวนบิล</th>
                   <th style={{ padding: '14px', textAlign: 'right' }}>ยอดขายรวม</th>
                   <th style={{ padding: '14px', textAlign: 'right' }}>เฉลี่ย/บิล</th>
                </tr>
             </thead>
             <tbody>
                {salesSummary.map(s => (
                  <tr key={s.date}>
                     <td style={{ padding: '12px', fontWeight: 'bold' }}>{new Date(s.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                     <td style={{ padding: '12px', textAlign: 'center' }}>{s.bills} บิล</td>
                     <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#38A169' }}>฿{s.total.toLocaleString()}</td>
                     <td style={{ padding: '12px', textAlign: 'right' }}>฿{Math.round(s.total/s.bills).toLocaleString()}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h3 style={{ fontWeight: 'bold' }}>🔄 ประวัติการเคลื่อนไหวสินค้า</h3>
             <button className="btn btn-outline btn-sm" onClick={() => handleExport(inventoryLogs, 'Inventory_Movement')}>Export CSV</button>
          </div>
          <table className="table" style={{ width: '100%' }}>
             <thead>
                <tr style={{ background: '#F7FAFC' }}>
                   <th style={{ padding: '14px' }}>วัน-เวลา</th>
                   <th style={{ padding: '14px' }}>สินค้า</th>
                   <th style={{ padding: '14px', textAlign: 'center' }}>ประเภท</th>
                   <th style={{ padding: '14px', textAlign: 'center' }}>จำนวน</th>
                   <th style={{ padding: '14px' }}>เหตุผล (Reason)</th>
                </tr>
             </thead>
             <tbody>
                {inventoryLogs.map(log => (
                  <tr key={log.id}>
                     <td style={{ padding: '12px', fontSize: '11px' }}>{log.timestamp.toLocaleString('th-TH')}</td>
                     <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold' }}>{log.name}</div>
                        <div style={{ fontSize: '10px', color: '#718096' }}>SKU: {log.sku}</div>
                     </td>
                     <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                          background: log.type === 'sale' ? '#FFF5F5' : '#F0FFF4',
                          color: log.type === 'sale' ? '#E53E3E' : '#38A169'
                        }}>
                           {log.type === 'sale' ? 'ขายออก' : 'นำเข้า/ปรับ'}
                        </span>
                     </td>
                     <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                        {log.type === 'sale' ? '-' : '+'}{log.amount}
                     </td>
                     <td style={{ padding: '12px', color: '#718096', fontSize: '12px' }}>{log.reason}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h3 style={{ fontWeight: 'bold' }}>📋 บันทึกกิจกรรมพนักงาน</h3>
             <button className="btn btn-outline btn-sm" onClick={() => handleExport(logs, 'System_Logs')}>Export CSV</button>
          </div>
          <table className="table" style={{ width: '100%' }}>
             <thead>
                <tr style={{ background: '#F7FAFC' }}>
                   <th style={{ padding: '14px' }}>วัน-เวลา</th>
                   <th style={{ padding: '14px' }}>ประเภท</th>
                   <th style={{ padding: '14px' }}>กิจกรรม</th>
                   <th style={{ padding: '14px' }}>พนักงาน</th>
                </tr>
             </thead>
             <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                     <td style={{ padding: '12px', fontSize: '11px' }}>{log.timestamp.toLocaleString('th-TH')}</td>
                     <td style={{ padding: '12px' }}>
                        <span style={{ padding: '2px 8px', background: '#F7FAFC', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{log.type?.toUpperCase()}</span>
                     </td>
                     <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold' }}>{log.action}</div>
                        <div style={{ fontSize: '11px', color: '#718096' }}>{log.detail}</div>
                     </td>
                     <td style={{ padding: '12px', fontWeight: 'bold' }}>{log.operator}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color, subtitleComponent }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `5px solid ${color}` }}>
      <div style={{ background: `${color}15`, color: color, padding: '12px', borderRadius: '12px' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#718096', fontWeight: '600' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2D3748' }}>{value}</div>
        {subtitleComponent}
      </div>
    </div>
  );
}

function HealthMetric({ label, percent, color }) {
  return (
    <div style={{ marginBottom: '15px' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
          <span style={{ color: '#A0AEC0' }}>{label}</span>
          <span style={{ fontWeight: 'bold' }}>{percent}%</span>
       </div>
       <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, background: color, height: '100%' }}></div>
       </div>
    </div>
  );
}

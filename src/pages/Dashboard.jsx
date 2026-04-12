import React, { useState, useEffect } from 'react';
import { Banknote, Package, Users, Activity, RefreshCcw } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export default function Dashboard() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date Filtering State
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999))
  });
  const [quickFilter, setQuickFilter] = useState('today'); // 'today' | 'yesterday' | '7days' | '30days' | 'custom'

  // Fetch Live Data
  useEffect(() => {
    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubSales();
      unsubProducts();
      unsubCustomers();
    };
  }, []);

  const isInRange = (ts) => {
    if (!ts) return false;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date >= dateRange.start && date <= dateRange.end;
  };

  const handleQuickFilter = (type) => {
    const now = new Date();
    const end = new Date(now.setHours(23, 59, 59, 999));
    let start = new Date(now.setHours(0, 0, 0, 0));

    if (type === 'yesterday') {
      start = new Date(new Date().setDate(now.getDate() - 1));
      start.setHours(0, 0, 0, 0);
      const yEnd = new Date(start);
      yEnd.setHours(23, 59, 59, 999);
      setDateRange({ start, end: yEnd });
    } else if (type === '7days') {
      start = new Date(new Date().setDate(now.getDate() - 7));
      start.setHours(0, 0, 0, 0);
      setDateRange({ start, end });
    } else if (type === '30days') {
      start = new Date(new Date().setDate(now.getDate() - 30));
      start.setHours(0, 0, 0, 0);
      setDateRange({ start, end });
    } else {
      setDateRange({ start, end });
    }
    setQuickFilter(type);
  };

  // 1. Sales Calculation within range
  const filteredSales = sales.filter(s => isInRange(s.timestamp) && s.status !== 'voided');
  
  const totalSalesAmount = filteredSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);

  // 2. Total Items Sold within range
  const totalItemsSold = filteredSales.reduce((sum, s) => sum + (s.totalQty || 0), 0);

  // 3. New Customers within range
  const newCustomers = customers.filter(c => isInRange(c.createdAt)).length;

  // 4. Low Stock Alerts (Independent of date range)
  const lowStockThreshold = 10;
  const lowStockCount = products
    .filter(p => (Number(p.stock1st) || 0) <= lowStockThreshold)
    .length;

  // 5. Recent Transactions within range
  const recentTransactions = [...filteredSales]
    .sort((a, b) => {
      const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
      const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
      return tb - ta;
    })
    .slice(0, 10); // Show more in range mode

  // 6. Top Selling Products within range
  const topSellingMap = {};
  filteredSales.forEach(sale => {
    (sale.items || []).forEach(item => {
      if (!topSellingMap[item.name]) {
        topSellingMap[item.name] = { name: item.name, category: item.category || 'ทั่วไป', sold: 0 };
      }
      topSellingMap[item.name].sold += (item.qty || 0);
    });
  });
  const topSellingProducts = Object.values(topSellingMap)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const stats = [
    { title: 'ยอดชายรวม', value: `฿${totalSalesAmount.toLocaleString()}`, icon: Banknote, color: '#10b981', bg: '#ecfdf5', label: 'Sales' },
    { title: 'จำนวนที่ขาย', value: totalItemsSold.toLocaleString(), icon: Activity, color: '#3b82f6', bg: '#eff6ff', label: 'Units' },
    { title: 'สมาชิกใหม่', value: newCustomers.toLocaleString(), icon: Users, color: '#8b5cf6', bg: '#f5f3ff', label: 'Members' },
    { title: 'สินค้าใกล้หมด', value: lowStockCount.toLocaleString(), icon: Package, color: '#ef4444', bg: '#fef2f2', label: 'Alerts' },
  ];

  if (loading && customers.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#64748b' }}>
        <RefreshCcw size={24} className="animate-spin" />
        <span style={{ marginLeft: '12px', fontWeight: 'bold' }}>กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  return (
    <div className="animate-slide-in" style={{ padding: '0 10px' }}>
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'end', 
        marginBottom: '24px',
        background: 'white',
        padding: '24px',
        borderRadius: '20px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div>
           <div style={{ fontSize: '12px', fontWeight: '900', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Analytics Preview</div>
           <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0 }}>ภาพรวมระบบ (Dashboard)</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '12px' }}>
           <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              {[
                { id: 'today', label: 'วันนี้' },
                { id: 'yesterday', label: 'เมื่อวาน' },
                { id: '7days', label: '7 วัน' },
                { id: '30days', label: '30 วัน' },
                { id: 'custom', label: 'กำหนดเอง' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    if (f.id === 'custom') {
                      setQuickFilter('custom');
                    } else {
                      handleQuickFilter(f.id);
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    background: quickFilter === f.id ? '#0f172a' : 'transparent',
                    color: quickFilter === f.id ? 'white' : '#64748b',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {f.label}
                </button>
              ))}
           </div>
           
           {quickFilter === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', animation: 'fadeIn 0.3s ease-out' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>เริ่ม:</span>
                    <input 
                      type="date" 
                      style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '700', outline: 'none', color: '#0f172a' }}
                      value={dateRange.start.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        d.setHours(0,0,0,0);
                        setDateRange(prev => ({ ...prev, start: d }));
                      }}
                    />
                 </div>
                 <div style={{ width: '8px', height: '2px', background: '#cbd5e1' }}></div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>สิ้นสุด:</span>
                    <input 
                      type="date" 
                      style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '700', outline: 'none', color: '#0f172a' }}
                      value={dateRange.end.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        d.setHours(23,59,59,999);
                        setDateRange(prev => ({ ...prev, end: d }));
                      }}
                    />
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card" style={{ 
              padding: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '20px',
              border: '1px solid rgba(255,255,255,0.8)',
              background: 'white',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.3s ease, border-color 0.3s ease'
            }} onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = s.color;
            }} onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)';
            }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                background: s.bg, 
                color: s.color, 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: `0 8px 16px -4px ${s.color}20`
              }}>
                <Icon size={28} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.title}</div>
                <div style={{ fontSize: '26px', fontWeight: '950', color: '#0f172a', lineHeight: 1.1, marginTop: '2px' }}>{s.value}</div>
              </div>
              <div style={{ 
                position: 'absolute', 
                right: '-10px', 
                bottom: '-10px', 
                opacity: 0.03, 
                transform: 'rotate(-15deg)' 
              }}>
                <Icon size={80} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Areas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px' }}>
        
        {/* Recent Transactions */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>บันทึกการขายล่าสุด</h3>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{recentTransactions.length} รายการที่กำลังแสดงผล</div>
            </div>
          </div>
          
          <div className="table-container" style={{ margin: 0, borderRadius: 0 }}>
            <table className="table" style={{ borderCollapse: 'separate', borderSpacing: '0 8px', width: '100%', padding: '0 24px 24px 24px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ background: 'transparent', color: '#94a3b8', padding: '12px' }}>เวลา</th>
                  <th style={{ background: 'transparent', color: '#94a3b8', padding: '12px' }}>เลขที่บิล</th>
                  <th style={{ background: 'transparent', color: '#94a3b8', padding: '12px' }}>ยอดสุทธิ</th>
                  <th style={{ background: 'transparent', color: '#94a3b8', padding: '12px', textAlign: 'right' }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(t => (
                  <tr key={t.id} style={{ 
                    transition: 'background 0.2s',
                    opacity: t.status === 'voided' ? 0.6 : 1
                  }}>
                    <td style={{ border: 'none', padding: '16px 12px', fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
                      {t.timestamp?.toDate ? t.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td style={{ border: 'none', padding: '16px 12px', fontWeight: '900', color: '#0f172a' }}>
                      {t.billId || t.id.slice(0, 8)}
                    </td>
                    <td style={{ border: 'none', padding: '16px 12px', color: t.status === 'voided' ? '#94a3b8' : '#10b981', fontWeight: '900', fontSize: '15px' }}>
                      ฿{(t.grandTotal || 0).toLocaleString()}
                    </td>
                    <td style={{ border: 'none', padding: '16px 12px', textAlign: 'right' }}>
                      <span style={{ 
                        padding: '6px 12px', 
                        borderRadius: '8px', 
                        fontSize: '11px', 
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        background: t.status === 'voided' ? '#fee2e2' : '#dcfce7',
                        color: t.status === 'voided' ? '#ef4444' : '#15803d'
                      }}>
                        {t.status === 'voided' ? 'Voided' : 'Success'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontStyle: 'italic' }}>ไม่พบข้อมูลในช่วงที่เลือก</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>อันดับสินค้าขายดี</h3>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>อ้างอิงตามจำนวนยอดขายในช่วงนี้</div>
          </div>
          
          <div style={{ padding: '12px 24px 24px' }}>
            {topSellingProducts.map((p, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                padding: '16px 0', 
                borderBottom: i !== topSellingProducts.length - 1 ? '1px solid #f1f5f9' : 'none' 
              }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  background: i === 0 ? '#fef9c3' : i === 1 ? '#f1f5f9' : i === 2 ? '#fff7ed' : '#f8fafc',
                  color: i === 0 ? '#a16207' : i === 1 ? '#475569' : i === 2 ? '#c2410c' : '#94a3b8',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '14px'
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{p.category}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '900', color: '#3b82f6', fontSize: '16px' }}>{p.sold.toLocaleString()}</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>รายการ</div>
                </div>
              </div>
            ))}
            {topSellingProducts.length === 0 && (
               <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontStyle: 'italic' }}>ยังไม่มีข้อมูลอันดับสินค้า</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


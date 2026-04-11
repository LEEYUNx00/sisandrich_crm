import React, { useState, useEffect } from 'react';
import { Banknote, Package, Users, Activity, UploadCloud, RefreshCcw } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { products as mockProducts, customers as mockCustomers } from '../data/mockData';

export default function Dashboard() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const isToday = (ts) => {
    if (!ts) return false;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // 1. Today's Sales Calculation
  const todaySalesAmount = sales
    .filter(s => isToday(s.timestamp) && s.status !== 'voided')
    .reduce((sum, s) => sum + (s.grandTotal || 0), 0);

  // 2. Total Items Sold Today
  const todayItemsSold = sales
    .filter(s => isToday(s.timestamp) && s.status !== 'voided')
    .reduce((sum, s) => sum + (s.totalQty || 0), 0);

  // 3. New Customers Today
  const newCustomersToday = customers
    .filter(c => isToday(c.createdAt))
    .length;

  // 4. Low Stock Alerts (threshold: 10)
  const lowStockThreshold = 10;
  const lowStockCount = products
    .filter(p => (Number(p.stock1st) || 0) <= lowStockThreshold)
    .length;

  // 5. Recent Transactions (Last 5)
  const recentTransactions = [...sales]
    .sort((a, b) => {
      const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
      const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
      return tb - ta;
    })
    .slice(0, 5);

  // 6. Top Selling Products Aggregation
  const topSellingMap = {};
  sales.filter(s => s.status !== 'voided').forEach(sale => {
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
    { title: 'Today\'s Sales', value: `฿ ${todaySalesAmount.toLocaleString()}`, icon: Banknote, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Total Items Sold', value: todayItemsSold.toLocaleString(), icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'New Customers', value: newCustomersToday.toLocaleString(), icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Low Stock Alerts', value: lowStockCount.toLocaleString(), icon: Package, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  // This function pushes our mock data to Firebase Firestore
  const syncDataToFirebase = async () => {
    try {
      if (!confirm("Are you sure you want to upload all mock mock products and customers to Firebase? This will overwrite existing mock IDs.")) {
        return;
      }
      setIsSyncing(true);

      for (const prod of mockProducts) {
        const prodRef = doc(db, 'products', prod.id);
        await setDoc(prodRef, { ...prod, stock1st: prod.stock || 50 });
      }

      for (const cust of mockCustomers) {
        const custRef = doc(db, 'customers', cust.id);
        await setDoc(custRef, { ...cust, createdAt: new Date() });
      }

      alert("🎉 Data successfully synchronized to Firebase Firestore!");
    } catch (error) {
      console.error("Error syncing data: ", error);
      alert("Error: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading && customers.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Dashboard Data...</div>;
  }

  return (
    <div className="animate-slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
           <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>Dashboard Overview</h2>
           <p style={{ fontSize: '14px', color: '#64748b' }}>ภาพรวมข้อมูลการขายและสต็อกสินค้าแบบ Real-time</p>
        </div>
        <button 
          className="btn btn-outline" 
          onClick={syncDataToFirebase} 
          disabled={isSyncing}
          style={{ fontSize: '13px' }}
        >
          <RefreshCcw size={14} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? "กำลังเชื่อมต่อ..." : "Setup Demo Data"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card stat-card" style={{ transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div className="stat-icon" style={{ background: s.bg, color: s.color === 'text-red-600' ? 'var(--primary-red)' : '' }}>
                <Icon size={28} />
              </div>
              <div className="stat-info">
                <h3 style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>{s.title}</h3>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Recent Transactions (ล่าสุด)</h2>
            <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', color: '#64748b' }}>5 รายการล่าสุด</span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Receipt #</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(t => (
                  <tr key={t.id} style={{ opacity: t.status === 'voided' ? 0.5 : 1 }}>
                    <td>{t.timestamp?.toDate ? t.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td style={{ fontWeight: 'bold' }}>{t.billId || t.id.slice(0, 8)}</td>
                    <td style={{ color: t.status === 'voided' ? '#94a3b8' : '#10b981', fontWeight: 'bold', textDecoration: t.status === 'voided' ? 'line-through' : 'none' }}>
                      ฿{(t.grandTotal || 0).toLocaleString()}
                    </td>
                    <td>
                      {t.status === 'voided' ? (
                        <span className="badge" style={{ background: '#fee2e2', color: '#ef4444' }}>Voided</span>
                      ) : (
                        <span className="badge badge-success">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>ยังไม่มีรายการขายในขณะนี้</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Top Selling Products (ยอดขายดี)</h2>
            <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', color: '#64748b' }}>อ้างอิงตามจำนวนที่ขาย</span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Sold (Qty)</th>
                </tr>
              </thead>
              <tbody>
                {topSellingProducts.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{p.name}</td>
                    <td>{p.category}</td>
                    <td style={{ textAlign: 'center' }}>
                       <span style={{ background: '#EBF8FF', color: '#3182CE', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px' }}>
                          {p.sold.toLocaleString()}
                       </span>
                    </td>
                  </tr>
                ))}
                {topSellingProducts.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>ยังไม่มีข้อมูลการขาย</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


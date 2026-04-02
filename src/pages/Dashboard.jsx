import { Banknote, Package, Users, Activity, UploadCloud } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { products, customers } from '../data/mockData';
import { useState } from 'react';

export default function Dashboard() {
  const [isSyncing, setIsSyncing] = useState(false);

  // This function pushes our mock data to Firebase Firestore
  const syncDataToFirebase = async () => {
    try {
      if (!confirm("Are you sure you want to upload all mock mock products and customers to Firebase? This will overwrite existing mock IDs.")) {
        return;
      }
      setIsSyncing(true);

      // Upload Products
      for (const prod of products) {
        const prodRef = doc(db, 'products', prod.id);
        await setDoc(prodRef, prod);
      }

      // Upload Customers
      for (const cust of customers) {
        const custRef = doc(db, 'customers', cust.id);
        await setDoc(custRef, cust);
      }

      alert("🎉 Data successfully synchronized to Firebase Firestore!");
    } catch (error) {
      console.error("Error syncing data: ", error);
      alert("Error: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const stats = [
    { title: 'Today\'s Sales', value: '฿ 45,200', icon: Banknote, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Total Items Sold', value: '124', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'New Customers', value: '12', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Low Stock Alerts', value: '5', icon: Package, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="animate-slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Dashboard Overview</h2>
        <button 
          className="btn btn-outline" 
          onClick={syncDataToFirebase} 
          disabled={isSyncing}
        >
          <UploadCloud size={16} />
          {isSyncing ? "Syncing to Firebase..." : "Setup Firebase Demo Data"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color === 'text-red-600' ? 'var(--primary-red)' : '' }}>
                <Icon size={28} />
              </div>
              <div className="stat-info">
                <h3>{s.title}</h3>
                <div className="stat-value">{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Recent Transactions</h2>
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
                <tr>
                  <td>14:30</td>
                  <td>INV-00123</td>
                  <td>฿ 12,500</td>
                  <td><span className="badge badge-success">Completed</span></td>
                </tr>
                <tr>
                  <td>13:15</td>
                  <td>INV-00122</td>
                  <td>฿ 4,200</td>
                  <td><span className="badge badge-success">Completed</span></td>
                </tr>
                <tr>
                  <td>12:45</td>
                  <td>INV-00121</td>
                  <td>฿ 1,500</td>
                  <td><span className="badge badge-success">Completed</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Top Selling Products</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Sold</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>สร้อยคอทองคำขาว จี้หัวใจ</td>
                  <td>สร้อย</td>
                  <td>45</td>
                </tr>
                <tr>
                  <td>กำไลข้อมือ หินมงคล</td>
                  <td>กำไล</td>
                  <td>32</td>
                </tr>
                <tr>
                  <td>แหวนเพชรซีก สไตล์มินิมอล</td>
                  <td>แหวน</td>
                  <td>28</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

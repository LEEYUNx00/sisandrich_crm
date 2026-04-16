import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, Settings as SettingsIcon, FileText, BadgePercent, UserCheck, LogOut, Shield, History, Printer, Timer } from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import Inventory from './pages/Inventory';
import CRM from './pages/CRM';
import Promotions from './pages/Promotions';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Employees from './pages/Employees';
import PrintSettings from './pages/PrintSettings';
import Login from './pages/Login';
import Register from './pages/Register';
import ShiftManagement from './pages/ShiftManagement';
import MemberDashboard from './pages/MemberDashboard';
import { db } from './firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useLanguage } from './i18n/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';

const Sidebar = ({ permissions }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const allNavItems = [
    { path: '/', label: t('nav_dashboard', 'Dashboard'), icon: LayoutDashboard, key: 'dashboard' },
    { path: '/pos', label: t('nav_pos', 'POS System'), icon: ShoppingCart, key: 'pos' },
    { path: '/shift', label: t('nav_shift', '⏱ เปิด-ปิดกะ'), icon: Timer, key: 'pos' },
    { path: '/sales-history', label: t('nav_sales_history', 'Sales History'), icon: History, key: 'pos' },
    { path: '/inventory', label: t('nav_inventory', 'Inventory'), icon: Package, key: 'inventory' },
    { path: '/crm', label: t('nav_crm', 'CRM & Customers'), icon: Users, key: 'crm' },
    { path: '/employees', label: t('nav_employees', 'Employees'), icon: UserCheck, key: 'employees' },
    { path: '/promotions', label: t('nav_promotions', 'Promotions'), icon: BadgePercent, key: 'promotions' },
    { path: '/settings/print', label: t('nav_print', '📄 บิล & 🏷️ บาร์โค้ด'), icon: Printer, key: 'settings' },
    { path: '/reports', label: t('nav_reports', 'Reports & Logs'), icon: FileText, key: 'reports' },
    { path: '/settings', label: t('nav_settings', 'Settings'), icon: SettingsIcon, key: 'settings' },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.key === 'dashboard') return true;
    return permissions === 'admin' || permissions?.[item.key];
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        SIS&<span className="brand-highlight">RICH</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

const Header = ({ activeShift }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const getHeaderTitle = () => {
    switch (location.pathname) {
      case '/': return t('header_overview', 'Overview Dashboard');
      case '/pos': return t('header_pos', 'Point of Sale (POS)');
      case '/shift': return t('header_shift', 'เปิด-ปิดกะ (Shift Management)');
      case '/sales-history': return t('header_sales_history', 'Sales History & Void');
      case '/inventory': return t('header_inventory', 'Inventory Management');
      case '/crm': return t('header_crm', 'Customer Relationship (CRM)');
      case '/employees': return t('header_employees', 'Employee Management');
      case '/promotions': return t('header_promotions', 'Promotions & Discounts');
      case '/reports': return t('header_reports', 'Reports & Activity Logs');
      case '/settings/print': return t('header_print', 'จัดการรูปแบบบิลและการพิมพ์');
      case '/settings': return t('header_settings', 'System Settings');
      default: return t('header_default', 'SIS&RICH portal');
    }
  };

  return (
    <header className="top-header">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="header-title" style={{ marginBottom: activeShift ? '0' : '0' }}>
          {getHeaderTitle()}
        </div>
        {activeShift && (
          <div style={{ 
            fontSize: '11px', 
            color: '#3182CE', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            marginTop: '2px',
            fontWeight: '600',
            background: '#EBF8FF',
            padding: '2px 8px',
            borderRadius: '6px',
            width: 'fit-content'
          }}>
            <Timer size={12} />
            <span>{t('shift_label', 'Shift')} #{activeShift.shiftNumber} · {t('shift_started', 'เริ่มกะ')}: {activeShift.openedAt?.toDate?.().toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) || '-'}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F7FAFC', padding: '6px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
           <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#48BB78' }}></div>
           <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4A5568' }}>Online</span>
        </div>
        
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2D3748' }}>{auth.currentUser?.email?.split('@')[0] || t('admin_staff', 'Admin Staff')}</div>
           <div style={{ fontSize: '10px', color: '#718096', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('system_operator', 'System Operator')}</div>
        </div>

        <LanguageSwitcher />

        <button 
          onClick={() => signOut(auth)}
          style={{ 
            background: '#FFF5F5', 
            color: '#E53E3E', 
            border: '1px solid #FED7D7', 
            padding: '8px 12px', 
            borderRadius: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#FEB2B2'; e.currentTarget.style.color = '#fff'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#FFF5F5'; e.currentTarget.style.color = '#E53E3E'; }}
        >
          <LogOut size={16} /> {t('logout', 'Logout')}
        </button>
      </div>
    </header>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeShift, setActiveShift] = useState(null);

  // Active Shift Listener
  useEffect(() => {
    if (!user) {
      setActiveShift(null);
      return;
    }
    const q = query(collection(db, 'shifts'), where('status', '==', 'open'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveShift({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setActiveShift(null);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (u.email === 'sisadmin@sis.com') {
          setUserPermissions('admin');
        } else {
          try {
            const q = query(collection(db, 'employees'), where('email', '==', u.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const data = snap.docs[0].data();
              setUserPermissions(data.permissions || { pos: true });
            } else {
              setUserPermissions({ pos: true }); // Default minimal
            }
          } catch (e) {
            console.error("Permission fetch error:", e);
            setUserPermissions({ pos: true });
          }
        }
      } else {
        setUserPermissions(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Global fix to prevent number inputs from changing value on scroll
  useEffect(() => {
    const handleWheel = (e) => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7FAFC' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const hasPermission = (key) => {
    return userPermissions === 'admin' || userPermissions?.[key];
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route: Registration & Member View */}
        <Route path="/register" element={<Register />} />
        <Route path="/member/:phone" element={<MemberDashboard />} />

        {/* Private Routes Wrapper */}
        <Route path="*" element={
          !user ? (
            <Login />
          ) : (
            <div className="app-container">
              <Sidebar permissions={userPermissions} />
              <main className="main-content">
                <Header activeShift={activeShift} />
                <div className="content-area">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/pos" element={hasPermission('pos') ? <POS /> : <Dashboard />} />
                    <Route path="/shift" element={hasPermission('pos') ? <ShiftManagement /> : <Dashboard />} />
                    <Route path="/sales-history" element={hasPermission('pos') ? <SalesHistory /> : <Dashboard />} />
                    <Route path="/inventory" element={hasPermission('inventory') ? <Inventory /> : <Dashboard />} />
                    <Route path="/crm" element={hasPermission('crm') ? <CRM /> : <Dashboard />} />
                    <Route path="/promotions" element={hasPermission('promotions') ? <Promotions /> : <Dashboard />} />
                    <Route path="/reports" element={hasPermission('reports') ? <Reports /> : <Dashboard />} />
                    <Route path="/employees" element={hasPermission('employees') ? <Employees /> : <Dashboard />} />
                    <Route path="/settings/print" element={hasPermission('settings') ? <PrintSettings /> : <Dashboard />} />
                    <Route path="/settings" element={hasPermission('settings') ? <Settings /> : <Dashboard />} />
                  </Routes>
                </div>
              </main>
            </div>
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

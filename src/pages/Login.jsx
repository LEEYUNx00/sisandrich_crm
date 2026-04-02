import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { LogIn, Lock, Mail, AlertCircle, ShieldCheck, UserPlus } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAutoSetup = async () => {
    setLoading(true);
    try {
      // Create a default admin account
      await createUserWithEmailAndPassword(auth, "sisadmin@sis.com", "sis8888");
      alert("✅ บัญชี Admin ถูกสร้างเรียบร้อย: sisadmin@sis.com / sis8888");
      setEmail("sisadmin@sis.com");
      setPassword("sis8888");
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        alert("ℹ️ บัญชีนี้มีอยู่ในระบบแล้ว คุณสามารถล็อกอินได้เลย");
        setEmail("sisadmin@sis.com");
        setPassword("sis8888");
      } else {
        alert("❌ ไม่สามารถสร้างบัญชีได้: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login detail:", err.code, err.message);
      
      // If user doesn't exist and they are trying the admin account we planned, 
      // try to create it automatically for them.
      if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && email === 'sisadmin@sis.com' && password === 'sis8888') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          return; // Success, onAuthStateChanged will handle the rest
        } catch (createErr) {
          setError('ระบบจำกัดการสร้างบัญชีใหม่ กรุณาเปิดสิทธิ์ที่ Firebase Console');
          console.error("Auto-creation failed:", createErr);
        }
      } else {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือโปรเจคยังไม่เปิดใช้งาน Email Login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #1A365D 0%, #2D3748 100%)',
      padding: '20px'
    }}>
      <div className="card animate-fade-in" style={{ 
        width: '100%', 
        maxWidth: '450px', 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(10px)',
        padding: '50px 40px', 
        borderRadius: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
             width: '80px', 
             height: '80px', 
             background: 'linear-gradient(135deg, #3182CE 0%, #2B6CB0 100%)', 
             borderRadius: '24px', 
             display: 'flex', 
             alignItems: 'center', 
             justifyContent: 'center', 
             margin: '0 auto 20px',
             boxShadow: '0 10px 15px -3px rgba(49, 130, 206, 0.3)'
          }}>
            <ShieldCheck size={40} color="white" />
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: '900', color: '#1A202C', margin: '0 0 8px' }}>
            SIS&<span style={{ color: '#3182CE' }}>RICH</span>
          </h1>
          <p style={{ color: '#718096', fontSize: '14px', fontWeight: '500' }}>Management System & POS v2.0</p>
        </div>

        {error && (
          <div style={{ 
            background: '#FFF5F5', 
            border: '1px solid #FED7D7', 
            padding: '12px 16px', 
            borderRadius: '12px', 
            color: '#C53030', 
            fontSize: '13px', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#4A5568', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Email Address</label>
            <div className="input-icon-wrapper" style={{ margin: 0 }}>
               <Mail className="icon" size={18} color="#A0AEC0" />
               <input 
                 type="email" 
                 className="input" 
                 placeholder="admin@sisandrich.com"
                 value={email}
                 onChange={e => setEmail(e.target.value)}
                 required
                 style={{ borderRadius: '14px', paddingLeft: '45px', background: '#F7FAFC' }}
               />
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#4A5568', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Password</label>
            <div className="input-icon-wrapper" style={{ margin: 0 }}>
               <Lock className="icon" size={18} color="#A0AEC0" />
               <input 
                 type="password" 
                 className="input" 
                 placeholder="••••••••"
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 required
                 style={{ borderRadius: '14px', paddingLeft: '45px', background: '#F7FAFC' }}
               />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ 
              width: '100%', 
              height: '56px', 
              borderRadius: '16px', 
              fontSize: '16px', 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #3182CE 0%, #2B6CB0 100%)',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(49, 130, 206, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            {loading ? (
              <div className="spinner-small"></div>
            ) : (
              <>
                เข้าสู่ระบบ <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', borderTop: '1px solid #EDF2F7', paddingTop: '24px' }}>
           <button 
             onClick={handleAutoSetup}
             style={{ 
               width: '100%', 
               background: 'transparent', 
               border: '2px dashed #CBD5E0', 
               borderRadius: '16px', 
               padding: '12px',
               color: '#718096',
               fontSize: '13px',
               fontWeight: 'bold',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               gap: '10px',
               cursor: 'pointer'
             }}
           >
              <UserPlus size={18} /> ติดตั้งบัญชี Admin ครั้งแรก
           </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <p style={{ fontSize: '12px', color: '#A0AEC0' }}>
            &copy; 2024 SIS&RICH Team. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

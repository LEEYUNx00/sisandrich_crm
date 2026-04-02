import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { User, Phone, Calendar, Heart, Send, CheckCircle, ChevronRight, Star } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    dob: '',
    gender: 'Male',
    channel: 'Direct Link',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [memberId, setMemberId] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nickname || !formData.phone) {
      return alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
    }

    setLoading(true);
    try {
      // 1. Check if phone already exists
      const q = query(collection(db, 'customers'), where('phone', '==', formData.phone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert("ขออภัย! เบอร์โทรศัพท์นี้ถูกใช้งานไปแล้ว หากคุณเคยสมัครแล้วสามารถแจ้งพนักงานที่หน้าร้านได้เลยครับ");
        setLoading(false);
        return;
      }

      // 2. Generate Member ID (Consistent with CRM logic)
      const customersSnap = await getDocs(collection(db, 'customers'));
      const customersList = customersSnap.docs.map(d => d.data());
      
      const nextNum = customersList.length > 0 
        ? Math.max(...customersList.map(c => {
            const match = c.memberId?.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          })) + 1 
        : 1;
      const newMemberId = `SSR${nextNum.toString().padStart(5, '0')}`;

      // 3. Save to Firestore
      await addDoc(collection(db, 'customers'), {
        memberId: newMemberId,
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
        walletBalance: 0,
        createdAt: serverTimestamp()
      });

      // 4. Activity Log
      await addDoc(collection(db, 'system_logs'), {
        type: 'crm',
        action: 'สมัครสมาชิกออนไลน์',
        detail: `ลูกค้า: ${formData.nickname} (ID: ${newMemberId})`,
        operator: 'Online System',
        timestamp: serverTimestamp()
      });

      setMemberId(newMemberId);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'linear-gradient(135deg, #F0F4F8 0%, #D9E2EC 100%)',
        padding: '20px',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div className="card animate-fade-in" style={{ 
          maxWidth: '450px', 
          width: '100%', 
          background: 'white', 
          borderRadius: '32px', 
          padding: '48px 32px', 
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: '#C6F6D5', 
            color: '#2F855A', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px'
          }}>
            <CheckCircle size={40} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#1A365D', marginBottom: '12px' }}>ยินดีต้อนรับสมาชิกใหม่!</h1>
          <p style={{ color: '#4A5568', marginBottom: '32px', lineHeight: '1.6' }}>ขอบคุณสำหรับการลงทะเบียน คุณเป็นสมาชิกของ SIS&RICH เรียบร้อยแล้ว</p>
          
          <div style={{ background: '#F7FAFC', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1px dashed #CBD5E0' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Member ID</span>
            <div style={{ fontSize: '32px', fontWeight: '950', color: '#3182CE', marginTop: '4px' }}>{memberId}</div>
          </div>

          <p style={{ fontSize: '14px', color: '#718096', marginBottom: '40px' }}>แจ้งรหัสนี้หรือเบอร์โทรศัพท์กับพนักงาน<br/>เพื่อรับสิทธิพิเศษและสะสมแต้มได้เลยครับ</p>
          
          <button 
            onClick={() => window.location.href = '/'} 
            style={{ 
              width: '100%', 
              height: '56px', 
              background: '#1A365D', 
              color: 'white', 
              border: 'none', 
              borderRadius: '16px', 
              fontWeight: 'bold', 
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            Visit Website <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1A365D 0%, #2D3748 100%)',
      padding: '40px 20px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '900', color: 'white', marginBottom: '8px' }}>
            SIS&<span style={{ color: '#63B3ED' }}>RICH</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
            <Star size={18} fill="#F6E05E" color="#F6E05E" />
            <span style={{ fontSize: '14px', fontWeight: '600', letterSpacing: '0.05em' }}>MEMBER REGISTRATION</span>
            <Star size={18} fill="#F6E05E" color="#F6E05E" />
          </div>
        </div>

        <div className="card animate-slide-in" style={{ 
          background: 'white', 
          borderRadius: '32px', 
          padding: '40px 32px', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1A202C', marginBottom: '24px', textAlign: 'center' }}>สมัครสมาชิกเพื่อรับสิทธิพิเศษ</h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>ชื่อ-นามสกุล / ชื่อเล่น *</label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '16px', top: '16px', color: '#A0AEC0' }} size={20} />
                <input 
                  type="text" 
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  required
                  placeholder="เช่น คุณแอร์" 
                  style={{ width: '100%', height: '52px', background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', paddingLeft: '50px', fontSize: '15px', outline: 'none', transition: 'all 0.2s' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>เบอร์โทรศัพท์ *</label>
              <div style={{ position: 'relative' }}>
                <Phone style={{ position: 'absolute', left: '16px', top: '16px', color: '#A0AEC0' }} size={20} />
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="081-XXX-XXXX" 
                  style={{ width: '100%', height: '52px', background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', paddingLeft: '50px', fontSize: '15px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>เพศ</label>
                <select 
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  style={{ width: '100%', height: '52px', background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '0 16px', fontSize: '15px', appearance: 'none', outline: 'none' }}
                >
                  <option value="Male">ชาย</option>
                  <option value="Female">หญิง</option>
                  <option value="Other">อื่นๆ</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>วันเกิด</label>
                <div style={{ position: 'relative' }}>
                  <Calendar style={{ position: 'absolute', right: '16px', top: '16px', color: '#A0AEC0', pointerEvents: 'none' }} size={18} />
                  <input 
                    type="date" 
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    style={{ width: '100%', height: '52px', background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '0 16px', fontSize: '15px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#4A5568', marginBottom: '8px', textTransform: 'uppercase' }}>ช่องทางการรู้จักร้าน</label>
              <select 
                name="channel"
                value={formData.channel}
                onChange={handleChange}
                style={{ width: '100%', height: '52px', background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '0 16px', fontSize: '15px', appearance: 'none', outline: 'none' }}
              >
                <option value="Direct Link">ลิงก์สมัครสมาชิก</option>
                <option value="TikTok">TikTok</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="Line">Line OA</option>
                <option value="Friend">เพื่อนแนะนำ</option>
                <option value="Walk-in">วอล์กอิน</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                height: '60px', 
                background: 'linear-gradient(135deg, #3182CE 0%, #2B6CB0 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '18px', 
                fontSize: '18px', 
                fontWeight: '900', 
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(49, 130, 206, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'transform 0.2s'
              }}
            >
              {loading ? (
                <div className="spinner-small" style={{ borderColor: 'white', borderTopColor: 'transparent' }}></div>
              ) : (
                <>ยืนยันสมัครสมาชิก <Send size={20} /></>
              )}
            </button>
          </form>

          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#A0AEC0', lineHeight: '1.4' }}>
              การสมัครสมาชิกหมายความว่าคุณยอมรับเงื่อนไข<br/>การสะสมคะแนนสิทธิพิเศษของ SIS&RICH
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)' }}>
          <Heart size={14} />
          <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.05em' }}>WE LOVE OUR CUSTOMERS</span>
          <Heart size={14} />
        </div>
      </div>
    </div>
  );
}

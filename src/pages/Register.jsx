import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { 
  User, Phone, Calendar, Send, CheckCircle, 
  ChevronRight, Star, Sparkles, Heart,
  Facebook, Instagram, Music, MessageCircle, MapPin, Users 
} from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    dob: '',
    gender: 'Male',
    channel: 'Direct Link',
    notes: '',
    recommenderType: 'employee', // 'employee' | 'manual' | 'none'
    recommenderName: ''
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [memberId, setMemberId] = useState('');

  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDobChange = (day, month, year) => {
    if (day && month && year) {
      const formattedMonth = month.padStart(2, '0');
      const formattedDay = day.padStart(2, '0');
      setFormData(prev => ({ ...prev, dob: `${year}-${formattedMonth}-${formattedDay}` }));
    }
  };

  // Fetch Employees for Recommender Dropdown
  useState(() => {
    const unsub = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nickname || !formData.phone || !formData.dob || !formData.gender || !formData.channel) {
      return alert('กรุณากรอกข้อมูลให้ครบทุกช่อง (รวมถึงวันเกิดด้วยครับ)');
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
      const newMemberId = `MSR${nextNum.toString().padStart(4, '0')}`;

      // 3. Save to Firestore
      await addDoc(collection(db, 'customers'), {
        memberId: newMemberId,
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

  const handleSelect = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (submitted) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'linear-gradient(135deg, #FFF9F9 0%, #FDECEC 100%)',
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
            onClick={() => window.location.href = `/member/${formData.phone}`} 
            style={{ 
              width: '100%', 
              height: '56px', 
              background: 'linear-gradient(135deg, #8B0000 0%, #B22222 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '16px', 
              fontWeight: 'bold', 
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 10px 15px rgba(139, 0, 0, 0.2)',
              marginBottom: '16px'
            }}
          >
            เข้าดูบัตรสมาชิกของฉัน <Sparkles size={20} />
          </button>

        </div>
      </div>
    );
  }

  const genderOptions = [
    { value: 'Male', label: 'ชาย' },
    { value: 'Female', label: 'หญิง' },
    { value: 'Other', label: 'อื่นๆ' }
  ];

  const channelOptions = [
    { value: 'TikTok', label: 'TikTok', icon: <Music size={14} /> },
    { value: 'Facebook', label: 'Facebook', icon: <Facebook size={14} /> },
    { value: 'Instagram', label: 'Instagram', icon: <Instagram size={14} /> },
    { value: 'Line', label: 'Line OA', icon: <MessageCircle size={14} /> },
    { value: 'Friend', label: 'เพื่อนแนะนำ', icon: <Users size={14} /> },
    { value: 'Walk-in', label: 'วอล์กอิน', icon: <MapPin size={14} /> }
  ];

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    { v: '1', l: 'มกราคม' }, { v: '2', l: 'กุมภาพันธ์' }, { v: '3', l: 'มีนาคม' }, 
    { v: '4', l: 'เมษายน' }, { v: '5', l: 'พฤษภาคม' }, { v: '6', l: 'มิถุนายน' },
    { v: '7', l: 'กรกฎาคม' }, { v: '8', l: 'สิงหาคม' }, { v: '9', l: 'กันยายน' },
    { v: '10', l: 'ตุลาคม' }, { v: '11', l: 'พฤศจิกายน' }, { v: '12', l: 'ธันวาคม' }
  ];
  const years = Array.from({ length: 100 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'radial-gradient(circle at center, #5D0000 0%, #2A0000 100%)',
      padding: '28px 16px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#FFFFFF', marginBottom: '6px', letterSpacing: '-1.5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            SIS&<span style={{ 
              background: 'linear-gradient(135deg, #D4AF37 0%, #FFFACD 50%, #B8860B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginLeft: '2px'
            }}>RICH</span>
          </h1>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            color: '#D4AF37'
          }}>
            <div style={{ height: '1px', width: '20px', background: 'linear-gradient(to left, #D4AF37, transparent)' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.25em', color: '#D4AF37' }}>MEMBER REGISTRATION</span>
            <div style={{ height: '1px', width: '20px', background: 'linear-gradient(to right, #D4AF37, transparent)' }}></div>
          </div>
        </div>

        <div className="card animate-slide-in" style={{ 
          background: 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(10px)',
          borderRadius: '32px', 
          padding: '28px 24px', 
          border: '1px solid rgba(212, 175, 55, 0.2)',
          boxShadow: '0 20px 40px rgba(139, 0, 0, 0.08), 0 1px 3px rgba(212, 175, 55, 0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1A1110', marginBottom: '20px', textAlign: 'center', letterSpacing: '-0.5px' }}>สมัครสมาชิกเพื่อรับสิทธิพิเศษ</h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#D4AF37', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ชื่อ-นามสกุล / ชื่อเล่น *</label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '14px', top: '14px', color: '#D4AF37', opacity: 0.6 }} size={16} />
                <input 
                  type="text" 
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  required
                  placeholder="เช่น คุณแอร์" 
                  style={{ width: '100%', height: '44px', background: '#FFFEFA', border: '1px solid #F5E6D3', borderRadius: '12px', paddingLeft: '40px', fontSize: '14px', outline: 'none', transition: 'all 0.3s', color: '#1A1110' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#D4AF37', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>เบอร์โทรศัพท์ *</label>
              <div style={{ position: 'relative' }}>
                <Phone style={{ position: 'absolute', left: '14px', top: '14px', color: '#D4AF37', opacity: 0.6 }} size={16} />
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="081-XXX-XXXX" 
                  style={{ width: '100%', height: '44px', background: '#FFFEFA', border: '1px solid #F5E6D3', borderRadius: '12px', paddingLeft: '40px', fontSize: '14px', outline: 'none', transition: 'all 0.3s', color: '#1A1110' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#D4AF37', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>วันเกิด *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <select 
                  value={birthDay} 
                  onChange={(e) => { setBirthDay(e.target.value); handleDobChange(e.target.value, birthMonth, birthYear); }}
                  required
                  style={{ height: '44px', background: '#FFFEFA', border: '1px solid #F5E6D3', borderRadius: '12px', padding: '0 8px', fontSize: '14px', outline: 'none', appearance: 'none', color: '#1A1110' }}
                >
                  <option value="">วันที่</option>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select 
                  value={birthMonth} 
                  onChange={(e) => { setBirthMonth(e.target.value); handleDobChange(birthDay, e.target.value, birthYear); }}
                  required
                  style={{ height: '44px', background: '#FFFEFA', border: '1px solid #F5E6D3', borderRadius: '12px', padding: '0 8px', fontSize: '14px', outline: 'none', appearance: 'none', color: '#1A1110' }}
                >
                  <option value="">เดือน</option>
                  {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
                <select 
                  value={birthYear} 
                  onChange={(e) => { setBirthYear(e.target.value); handleDobChange(birthDay, birthMonth, e.target.value); }}
                  required
                  style={{ height: '44px', background: '#FFFEFA', border: '1px solid #F5E6D3', borderRadius: '12px', padding: '0 8px', fontSize: '14px', outline: 'none', appearance: 'none', color: '#1A1110' }}
                >
                  <option value="">ค.ศ.</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#D4AF37', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>เพศ *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {genderOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect('gender', opt.value)}
                    style={{ 
                      height: '40px', 
                      borderRadius: '10px', 
                      border: '1px solid', 
                      borderColor: formData.gender === opt.value ? '#8B0000' : '#F5E6D3',
                      background: formData.gender === opt.value ? 'linear-gradient(135deg, #8B0000 0%, #600000 100%)' : '#fff',
                      color: formData.gender === opt.value ? '#fff' : '#666',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      boxShadow: formData.gender === opt.value ? '0 4px 10px rgba(139, 0, 0, 0.2)' : 'none'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#D4AF37', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ช่องทางที่รู้จักเรา *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {channelOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect('channel', opt.value)}
                    style={{ 
                      height: '40px', 
                      borderRadius: '10px', 
                      border: '1px solid', 
                      borderColor: formData.channel === opt.value ? '#8B0000' : '#F5E6D3',
                      background: formData.channel === opt.value ? 'linear-gradient(135deg, #8B0000 0%, #600000 100%)' : '#fff',
                      color: formData.channel === opt.value ? '#fff' : '#666',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#D4AF37', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ผู้แนะนำ (Recommender)</label>
              <select
                className="input"
                style={{ width: '100%', height: '44px', background: '#FFFEFA', border: '1px solid #F5E6D3', borderRadius: '12px', padding: '0 12px', fontSize: '14px', outline: 'none', color: '#1A1110', marginBottom: formData.recommenderType === 'manual' ? '12px' : '0' }}
                value={formData.recommenderType === 'none' ? 'none' : (formData.recommenderType === 'manual' ? 'manual' : formData.recommenderName)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'none') {
                    setFormData(prev => ({ ...prev, recommenderType: 'none', recommenderName: '' }));
                  } else if (val === 'manual') {
                    setFormData(prev => ({ ...prev, recommenderType: 'manual', recommenderName: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, recommenderType: 'employee', recommenderName: val }));
                  }
                }}
              >
                <option value="none">-- ไม่มีผู้แนะนำ --</option>
                <optgroup label="พนักงานร้าน">
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.nickname || emp.name}>{emp.nickname || emp.name}</option>
                  ))}
                </optgroup>
                <option value="manual">➕ ระบุชื่อผู้แนะนำเอง...</option>
              </select>

              {formData.recommenderType === 'manual' && (
                <div style={{ animation: 'slideIn 0.3s ease-out', position: 'relative' }}>
                  <Users style={{ position: 'absolute', left: '14px', top: '14px', color: '#D4AF37', opacity: 0.6 }} size={16} />
                  <input 
                    type="text" 
                    placeholder="พิมพ์ชื่อคนแนะนำ..."
                    value={formData.recommenderName}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommenderName: e.target.value }))}
                    style={{ width: '100%', height: '44px', background: '#FFFEFA', border: '1px solid #F5E6D3', borderRadius: '12px', paddingLeft: '40px', fontSize: '14px', outline: 'none', color: '#1A1110' }}
                  />
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                height: '52px', 
                background: 'linear-gradient(135deg, #8B0000 0%, #B22222 50%, #8B0000 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                fontSize: '16px', 
                fontWeight: '950', 
                cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(139, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.3s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {loading ? (
                <div className="spinner-small" style={{ borderColor: 'white', borderTopColor: 'transparent' }}></div>
              ) : (
                <>ยืนยันสมัครสมาชิก <Send size={20} /></>
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: '#A0AEC0', lineHeight: '1.4' }}>
              การสมัครสมาชิกหมายความว่าคุณยอมรับเงื่อนไข<br/>การสะสมคะแนนสิทธิพิเศษของ SIS&RICH
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
          <Heart size={14} fill="#D4AF37" color="#D4AF37" />
          <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.05em', color: '#FFF' }}>WE LOVE OUR CUSTOMERS</span>
          <Heart size={14} fill="#D4AF37" color="#D4AF37" />
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, onSnapshot, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Crown, Star, Gift, Ticket, History, Home, 
  ChevronRight, Clock, Award, Wallet, Share2, 
  Settings, LogOut, Heart, Smartphone, MapPin,
  Trophy, Sparkles
} from 'lucide-react';

export default function MemberDashboard() {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membershipConfig, setMembershipConfig] = useState(null);
  const [wheelConfig, setWheelConfig] = useState([]);

  // Fetch Customer Data based on phone from URL or state
  useEffect(() => {
    if (!phone) {
       setLoading(false);
       return;
    }

    const q = query(collection(db, 'customers'), where('phone', '==', phone));
    
    // Use onSnapshot for real-time updates when spending/points change
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setCustomer({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
      setLoading(false);
    });

    // Load App Settings
    const unsubM = onSnapshot(doc(db, 'app_settings', 'membership'), (doc) => {
      if (doc.exists()) setMembershipConfig(doc.data());
    });
    const unsubW = onSnapshot(doc(db, 'app_settings', 'wheel'), (doc) => {
      if (doc.exists()) setWheelConfig(doc.data().segments || []);
    });

    return () => { unsubscribe(); unsubM(); unsubW(); };
  }, [phone]);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}><div className="spinner"></div></div>;

  if (!customer && !loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ color: '#8B0000', marginBottom: '10px' }}>ไม่พบข้อมูลสมาชิก</h2>
        <p style={{ color: '#64748B', marginBottom: '20px' }}>กรุณาตรวจสอบเบอร์โทรศัพท์หรือสมัครสมาชิกใหม่</p>
        <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ background: '#8B0000' }}>ไปหน้าสมัครสมาชิก</button>
      </div>
    );
  }

  const getTierDetails = (spend = 0) => {
    if (spend >= 500000) return { name: 'SSVIP MEMBER', color: '#D4AF37', cardBg: 'linear-gradient(135deg, #1A1A1A 0%, #4A4A4A 100%)', text: '#FFFFFF' };
    if (spend >= 100000) return { name: 'SVIP MEMBER', color: '#D4AF37', cardBg: 'linear-gradient(135deg, #5D0000 0%, #8B0000 100%)', text: '#FFFFFF' };
    return { name: 'VIP MEMBER', color: '#D4AF37', cardBg: 'linear-gradient(135deg, #8B0000 0%, #B22222 100%)', text: '#FFFFFF' };
  };

  const tier = getTierDetails(customer.totalSpend);
  const memberSince = customer.createdAt?.toDate ? customer.createdAt.toDate() : new Date();
  const daysTogether = Math.floor((new Date() - memberSince) / (1000 * 60 * 60 * 24)) || 1;

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeTab customer={customer} tier={tier} daysTogether={daysTogether} />;
      case 'rewards': return <RewardsTab customer={customer} config={membershipConfig} />;
      case 'wheel': return <WheelTab customer={customer} config={wheelConfig} onSpin={(reward) => alert(`ยินดีด้วย! คุณได้รับ: ${reward}`)} />;
      case 'followup': return <FollowUpTab />;
      case 'history': return <HistoryTab customer={customer} />;
      default: return <HomeTab customer={customer} tier={tier} daysTogether={daysTogether} />;
    }
  };

  return (
    <div style={{ 
      maxWidth: '480px', 
      margin: '0 auto', 
      minHeight: '100vh', 
      background: 'radial-gradient(circle at center, #5D0000 0%, #2A0000 100%)', 
      paddingBottom: '100px',
      position: 'relative',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header Profile */}
      <div style={{ padding: '40px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#FFFFFF', margin: 0, letterSpacing: '-1px' }}>{customer.nickname}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '1px', background: '#D4AF37' }}></div>
            <p style={{ fontSize: '10px', color: '#D4AF37', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '2.5px', margin: 0 }}>SIS&RICH MEMBER</p>
          </div>
        </div>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #D4AF37', padding: '3px', background: 'rgba(255,255,255,0.05)', boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}>
          <img src={`https://ui-avatars.com/api/?name=${customer.nickname}&background=8B0000&color=fff`} style={{ width: '100%', height: '100%', borderRadius: '50%' }} alt="profile" />
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div style={{ 
        position: 'fixed', 
        bottom: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        width: 'calc(100% - 40px)', 
        maxWidth: '440px', 
        height: '70px', 
        background: 'rgba(26, 17, 16, 0.98)', 
        borderRadius: '24px', 
        display: 'flex', 
        justifyContent: 'space-around', 
        alignItems: 'center',
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
        border: '1px solid rgba(212, 175, 55, 0.2)'
      }}>
        <NavButton active={activeTab === 'home'} icon={<Home size={22}/>} label="หน้าหลัก" onClick={() => setActiveTab('home')} />
        <NavButton active={activeTab === 'rewards'} icon={<Ticket size={22}/>} label="สิทธิพิเศษ" onClick={() => setActiveTab('rewards')} />
        <div onClick={() => setActiveTab('wheel')} style={{ 
          marginTop: '-40px',
          width: '60px', 
          height: '60px', 
          background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)', 
          borderRadius: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 8px 15px rgba(212, 175, 55, 0.3)',
          cursor: 'pointer',
          transform: activeTab === 'wheel' ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.3s',
          zIndex: 1001
        }}>
          <Trophy size={28} />
        </div>
        <NavButton active={activeTab === 'followup'} icon={<Sparkles size={22}/>} label="รอติดตาม" onClick={() => setActiveTab('followup')} />
        <NavButton active={activeTab === 'history'} icon={<History size={22}/>} label="ประวัติ" onClick={() => setActiveTab('history')} />
      </div>
    </div>
  );
}

const HomeTab = ({ customer, tier, daysTogether }) => (
  <div className="animate-fade-in">
    {/* Member Card */}
    <div style={{ 
      width: '100%', 
      height: '220px', 
      background: tier.cardBg, 
      borderRadius: '28px', 
      padding: '24px',
      position: 'relative',
      color: tier.text,
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      overflow: 'hidden',
      marginBottom: '24px'
    }}>
      {/* Texture/Pattern */}
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '50%' }}></div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
           <div style={{ fontSize: '11px', fontWeight: '950', letterSpacing: '3px', color: '#D4AF37', marginBottom: '6px' }}>{tier.name}</div>
           <h2 style={{ fontSize: '32px', fontWeight: '950', margin: 0, letterSpacing: '-1.5px', color: '#FFFFFF' }}>{customer.nickname}</h2>
        </div>
        <div style={{ padding: '6px', background: 'rgba(255,255,255,0.95)', borderRadius: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${customer.memberId}`} style={{ width: '44px', height: '44px' }} alt="qr" />
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
         <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div>
               <div style={{ fontSize: '10px', fontWeight: '950', color: 'rgba(255,255,255,0.7)', letterSpacing: '1.5px', marginBottom: '2px' }}>POINTS BALANCE</div>
               <div style={{ fontSize: '32px', fontWeight: '950', color: '#FFFFFF', lineHeight: 1 }}>{customer.points?.toLocaleString() || 0} <span style={{ fontSize: '12px', fontWeight: '800', color: '#D4AF37' }}>PTS</span></div>
            </div>
            <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }}></div>
            <div>
               <div style={{ fontSize: '10px', fontWeight: '950', color: 'rgba(255,255,255,0.7)', letterSpacing: '1.5px', marginBottom: '2px' }}>STORE CREDIT</div>
               <div style={{ fontSize: '32px', fontWeight: '950', color: '#FFFFFF', lineHeight: 1 }}>฿{customer.storeCredit?.toLocaleString() || 0}</div>
            </div>
         </div>
         <div style={{ fontSize: '13px', fontWeight: '950', color: 'rgba(255,255,255,0.8)', letterSpacing: '1px' }}>{customer.memberId}</div>
      </div>

    </div>

    {/* Membership Info Card */}
    <div style={{ background: 'rgba(255, 253, 249, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '28px', padding: '24px', border: '1px solid rgba(212, 175, 55, 0.3)', marginBottom: '24px', display: 'grid', gridTemplateColumns: '60px 1fr 60px', alignItems: 'center', gap: '16px', boxShadow: '0 15px 30px rgba(0,0,0,0.2)' }}>
       <div style={{ width: '54px', height: '54px', background: '#FFFDF0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
          <Clock size={28} />
       </div>
       <div>
          <div style={{ fontSize: '10px', color: '#D4AF37', fontWeight: '950', letterSpacing: '1.5px', marginBottom: '2px' }}>MEMBER SINCE</div>
          <div style={{ fontSize: '18px', fontWeight: '950', color: '#1A1110' }}>{customer.createdAt?.toDate ? customer.createdAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '4 ธันวาคม 2024'}</div>
          <div style={{ fontSize: '11px', color: '#8B0000', fontWeight: '800', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> รับส่วนลดพิเศษในเดือนเกิด
          </div>
       </div>
       <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(212, 175, 55, 0.1)', paddingLeft: '12px' }}>
          <div style={{ fontSize: '26px', fontWeight: '950', color: '#8B0000', lineHeight: 1 }}>{daysTogether}</div>
          <div style={{ fontSize: '8px', fontWeight: '950', color: '#A0AEC0', marginTop: '4px', textTransform: 'uppercase' }}>Days</div>
       </div>
    </div>

    {/* Progress bar */}
    <div style={{ padding: '0 10px 24px' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '900', color: '#FFFFFF', marginBottom: '10px', opacity: 0.9 }}>
          <span>อีก {365 - (daysTogether % 365)} วัน จะปลดล็อกรางวัลถัดไป 🎁</span>
          <span style={{ color: '#D4AF37' }}>{Math.floor((daysTogether % 365) / 3.65)}%</span>
       </div>
       <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(212,175,55,0.1)' }}>
          <div style={{ width: `${(daysTogether % 365) / 3.65}%`, height: '100%', background: 'linear-gradient(to right, #D4AF37, #FFFFFF)', borderRadius: '10px' }}></div>
       </div>
    </div>

    {/* Action Grid */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
       <ActionCard icon={<Star size={26} color="#D4AF37"/>} title="My Benefits" desc="สิทธิพิเศษของคุณ" />
       <ActionCard icon={<Gift size={26} color="#D4AF37"/>} title="Redeem" desc="แลกคะแนนสะสม" />
    </div>
  </div>
);

const RewardsTab = ({ customer, config }) => {
  const coupons = config?.coupons || [
    { name: "ส่วนลด 5% สำหรับสินค้าใหม่", points: 100 },
    { name: "คูปองส่วนลดวันเกิด", points: 1000 }
  ];

  const handleRedeem = async (cp) => {
    if ((customer.points || 0) < cp.points) {
      alert("คะแนนของคุณไม่เพียงพอ");
      return;
    }

    if (!confirm(`ยืนยันการใช้ ${cp.points} คะแนน เพื่อแลก ${cp.name}?`)) return;

    try {
      // 1. Deduct points
      const newPoints = customer.points - cp.points;
      await updateDoc(doc(db, 'customers', customer.id), {
        points: newPoints
      });

      // 2. Record redemption
      await addDoc(collection(db, 'redemptions'), {
        customerId: customer.id,
        customerName: customer.nickname || customer.name,
        couponName: cp.name,
        pointsUsed: cp.points,
        status: 'Used', // Defaulted to used for now as the customer clicks it
        timestamp: serverTimestamp(),
        claimCode: Math.random().toString(36).substring(7).toUpperCase()
      });

      // 3. Add to history
      await addDoc(collection(db, 'history'), {
        customerId: customer.id,
        type: 'Redeem',
        description: `แลกคูปอง: ${cp.name}`,
        points: -cp.points,
        timestamp: serverTimestamp()
      });

      alert("🎉 แลกสิทธิพิเศษสำเร็จ! กรุณาแจ้งพนักงานเพื่อใช้สิทธิ์");
    } catch (e) {
      alert("เกิดข้อผิดพลาด: " + e.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '10px 0' }}>
      <h3 style={{ fontSize: '22px', fontWeight: '950', color: '#FFFFFF', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', background: 'rgba(212,175,55,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ticket size={24} color="#D4AF37" /> 
        </div>
        สิทธิพิเศษของฉัน
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
         {coupons.map((cp, idx) => (
           <CouponCard key={idx} cp={cp} customer={customer} onRedeem={() => handleRedeem(cp)} />
         ))}
      </div>

      <div style={{ marginTop: '32px' }}>
         <h4 style={{ fontSize: '15px', fontWeight: '950', color: '#D4AF37', marginBottom: '20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Milestone Journey</h4>
         <div style={{ position: 'relative', paddingLeft: '40px' }}>
            <div style={{ position: 'absolute', left: '19px', top: '10px', bottom: '10px', width: '2px', background: 'rgba(212,175,55,0.15)' }}></div>
            
            <MilestoneStep done title="เริ่มเป็นสมาชิก" date="ลงทะเบียนสำเร็จ" />
            <MilestoneStep current title="ยอดซื้อสะสมครบ 100,000" date="รับสิทธิ์ SVIP" />
            <MilestoneStep title="ยอดซื้อสะสมครบ 500,000" date="รับสิทธิ์ SSVIP" />
         </div>
      </div>
    </div>
  );
};

const WheelTab = ({ customer, config, onSpin }) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  const activeSegments = config?.filter(s => s.active) || [];
  
  // Calculate Conic Gradient
  const generateGradient = () => {
    if (activeSegments.length === 0) return '#D4AF37';
    let currentPos = 0;
    const slices = activeSegments.length;
    const colors = ['#8B0000', '#D4AF37', '#4A0404', '#FFFDF9', '#B8860B'];
    
    return `conic-gradient(${activeSegments.map((seg, i) => {
      const color = colors[i % colors.length];
      const start = (i / slices) * 360;
      const end = ((i + 1) / slices) * 360;
      return `${color} ${start}deg ${end}deg`;
    }).join(', ')})`;
  };

  const handleSpinClick = async () => {
    if (spinning) return;
    if ((customer.points || 0) < 100) {
      alert("คะแนนของคุณไม่เพียงพอ (ต้องการ 100 PTS)");
      return;
    }

    setSpinning(true);
    const extraDegrees = 1800 + Math.floor(Math.random() * 360);
    const newRotation = rotation + extraDegrees;
    setRotation(newRotation);

    setTimeout(async () => {
      setSpinning(false);
      // Logic to pick reward based on probabilities would go here
      // For now, pick a random active segment
      const winner = activeSegments[Math.floor(Math.random() * activeSegments.length)];
      onSpin(winner.label);
    }, 3000);
  };

  return (
    <div className="animate-fade-in" style={{ textAlign: 'center', padding: '30px 20px', background: 'rgba(255, 253, 249, 0.95)', borderRadius: '32px', border: '1px solid rgba(212, 175, 55, 0.2)', boxShadow: '0 15px 30px rgba(0,0,0,0.2)' }}>
      <h3 style={{ fontSize: '24px', fontWeight: '950', color: '#8B0000', marginBottom: '30px', letterSpacing: '-0.5px' }}>Lucky Wheel</h3>
      
      <div style={{ position: 'relative', width: '260px', height: '260px', margin: '0 auto 40px' }}>
        {/* Pointer */}
        <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', width: '0', height: '0', borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderTop: '25px solid #8B0000', zIndex: 10 }}></div>
        
        <div style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '50%', 
          border: '10px solid #1A1110', 
          position: 'relative',
          background: generateGradient(),
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          transition: 'transform 3s cubic-bezier(0.1, 0, 0.1, 1)',
          transform: `rotate(${rotation}deg)`
        }}>
          {activeSegments.map((seg, i) => (
            <div key={i} style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              height: '50%', 
              width: '2px', 
              background: 'rgba(212,175,55,0.3)', 
              transformOrigin: 'top',
              transform: `translate(-50%, 0) rotate(${(i+0.5) * (360/activeSegments.length)}deg)`
            }}>
              <span style={{ 
                position: 'absolute', 
                bottom: '40px', 
                left: '50%', 
                transform: 'translate(-50%, 0) rotate(90deg)', 
                fontSize: '9px', 
                fontWeight: '900', 
                color: '#fff',
                whiteSpace: 'nowrap',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}>
                {seg.label}
              </span>
            </div>
          ))}
          
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60px', height: '60px', background: '#FFFDF9', borderRadius: '50%', border: '4px solid #D4AF37', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950', fontSize: '11px', color: '#8B0000' }}>{spinning ? 'WAIT' : 'SPIN'}</div>
        </div>
      </div>
      
      <button 
        onClick={handleSpinClick}
        disabled={spinning}
        style={{ 
          background: spinning ? '#A0AEC0' : 'linear-gradient(135deg, #8B0000 0%, #B22222 100%)', 
          color: 'white', 
          width: '100%', 
          maxWidth: '240px', 
          border: 'none', 
          borderRadius: '16px', 
          fontSize: '18px', 
          fontWeight: '950', 
          padding: '16px', 
          boxShadow: '0 8px 20px rgba(139, 0, 0, 0.3)', 
          cursor: spinning ? 'default' : 'pointer', 
          transition: 'all 0.3s' 
        }}
      >
        {spinning ? 'กำลังหมุน...' : 'เล่นเกมลุ้นโชค'}
      </button>
      <p style={{ marginTop: '20px', fontSize: '11px', color: '#A0AEC0', fontWeight: '800', letterSpacing: '1px' }}>ใช้ 100 คะแนน ต่อการหมุน 1 ครั้ง</p>
    </div>
  );
};

const FollowUpTab = () => (
  <div className="animate-fade-in" style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(255, 253, 249, 0.95)', borderRadius: '32px', border: '1px solid rgba(212, 175, 55, 0.3)', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
     <div style={{ width: '80px', height: '80px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
        <Clock size={40} />
     </div>
     <h3 style={{ fontSize: '24px', fontWeight: '950', color: '#1A1110', marginBottom: '16px', letterSpacing: '-0.5px' }}>เร็วๆ นี้...</h3>
     <p style={{ fontSize: '15px', color: '#718096', lineHeight: '1.7', marginBottom: '32px', fontWeight: '500' }}>ระบบจองคิวและติดตามสถานะสินค้า<br/>กำลังพัฒนาเพื่อให้คุณได้รับประสบการณ์ที่ดีที่สุด</p>
     <div style={{ height: '2px', width: '40px', background: 'linear-gradient(to right, transparent, #D4AF37, transparent)', margin: '0 auto' }}></div>
  </div>
);

const HistoryTab = ({ customer }) => (
  <div className="animate-fade-in">
    <h3 style={{ fontSize: '20px', fontWeight: '950', color: '#FFFFFF', marginBottom: '20px' }}>ประวัติแต้ม & การใช้งาน</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
       <HistoryItem title="ซื้อแหวนเพชร (RNG-001)" points="+450" date="25 มี.ค. 2024" />
       <HistoryItem title="แลกคูปองส่วนลด 5%" points="-100" date="20 มี.ค. 2024" />
       <HistoryItem title="คะแนนต้อนรับสมาชิกใหม่" points="+50" date="1 มี.ค. 2024" />
    </div>
  </div>
);

// Helper Components
const NavButton = ({ active, icon, label, onClick }) => (
  <div onClick={onClick} style={{ textAlign: 'center', cursor: 'pointer', color: active ? '#D4AF37' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
    {icon}
    <div style={{ fontSize: '9px', fontWeight: '900', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
  </div>
);

const ActionCard = ({ icon, title, desc }) => (
  <div style={{ 
    background: 'rgba(255, 253, 249, 0.95)', 
    padding: '24px 16px', 
    borderRadius: '28px', 
    border: '1px solid rgba(212, 175, 55, 0.2)', 
    textAlign: 'center', 
    cursor: 'pointer', 
    transition: 'all 0.3s',
    boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
  }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
     <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>{icon}</div>
     <div style={{ fontSize: '16px', fontWeight: '950', color: '#1A1110', letterSpacing: '-0.5px' }}>{title}</div>
     <div style={{ fontSize: '11px', color: '#A0AEC0', marginTop: '4px', fontWeight: '700' }}>{desc}</div>
  </div>
);

const CouponCard = ({ customer, cp, onRedeem }) => (
  <div style={{ display: 'flex', background: 'rgba(255, 253, 249, 0.95)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(212, 175, 55, 0.2)', height: '94px', boxShadow: '0 8px 15px rgba(0,0,0,0.1)' }}>
     <div style={{ width: '80px', background: 'linear-gradient(135deg, #8B0000 0%, #4A0404 100%)', color: '#FFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px dashed rgba(212, 175, 55, 0.3)' }}>
        <div style={{ fontSize: '22px', fontWeight: '950' }}>{cp.points}</div>
        <div style={{ fontSize: '8px', fontWeight: '950', opacity: 0.8 }}>PTS</div>
     </div>
     <div style={{ flex: 1, padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <div style={{ fontSize: '14px', fontWeight: '950', color: '#1A1110', marginBottom: '4px' }}>{cp.name}</div>
           <div style={{ fontSize: '11px', color: '#A0AEC0', fontWeight: '800' }}>ใช้คะแนนเพื่อแลกรับสิทธิ์</div>
        </div>
        <button 
          onClick={onRedeem}
          style={{ background: '#FFFEF5', color: '#D4AF37', border: '1px solid #D4AF37', padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '950', boxShadow: '0 4px 8px rgba(212,175,55,0.1)' }}
        >
          แลกสิทธิ์
        </button>
     </div>
  </div>
);

const MilestoneStep = ({ done, current, title, date }) => (
  <div style={{ marginBottom: '24px', position: 'relative' }}>
     <div style={{ 
       position: 'absolute', left: '-29px', top: '0', 
       width: '18px', height: '18px', borderRadius: '50%', 
       background: done ? '#8B0000' : (current ? '#D4AF37' : '#EDF2F7'),
       border: '4px solid #fff', zIndex: 2
     }}></div>
     <div style={{ fontSize: '14px', fontWeight: 'bold', color: done ? '#1A202C' : '#A0AEC0' }}>{title}</div>
     <div style={{ fontSize: '12px', color: '#718096' }}>{date}</div>
  </div>
);

const HistoryItem = ({ title, points, date }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'rgba(255, 253, 249, 0.95)', borderRadius: '22px', border: '1px solid rgba(212, 175, 55, 0.15)', boxShadow: '0 8px 15px rgba(0,0,0,0.1)' }}>
     <div>
        <div style={{ fontSize: '15px', fontWeight: '950', color: '#1A1110', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '11px', color: '#A0AEC0', fontWeight: '800' }}>{date}</div>
     </div>
     <div style={{ fontSize: '18px', fontWeight: '950', color: points.startsWith('+') ? '#2F855A' : '#C53030' }}>{points} <span style={{ fontSize: '9px' }}>PTS</span></div>
  </div>
);

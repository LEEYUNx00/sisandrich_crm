import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

export default function TransferModal({ transferProduct, setTransferProduct, transferQty, setTransferQty, selectedLocation, locations, handleConfirmTransfer }) {
  if (!transferProduct) return null;

  const getAvailableStock = () => {
    return selectedLocation === '3rd' ? (transferProduct.stock3rd || 0) : (transferProduct.stock1st || 0);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card animate-slide-in" style={{ width: '450px', maxWidth: '90%', padding: '24px', backgroundColor: '#fff', borderRadius: '12px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
          <ArrowRightLeft size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> โอนย้ายสต็อกสินค้า
        </h3>
        
        <div style={{ marginBottom: '16px', background: '#F7FAFC', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontWeight: '600', color: '#2D3748' }}>{transferProduct.name}</div>
          <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>SKU: {transferProduct.sku}</div>
        </div>

        <form onSubmit={handleConfirmTransfer}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#718096' }}>จาก (From)</div>
              <div style={{ fontWeight: '600', color: '#E53E3E' }}>{selectedLocation === '3rd' ? locations['3rd'].name : locations['1st'].name}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>
                📦 {selectedLocation === '3rd' ? (transferProduct.stock3rd || 0) : (transferProduct.stock1st || 0)} ชิ้น
              </div>
            </div>
            
            <ArrowRightLeft size={24} style={{ color: '#A0AEC0', marginTop: '16px' }} />

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#718096' }}>ไปยัง (To)</div>
              <div style={{ fontWeight: '600', color: '#38A169' }}>{selectedLocation === '3rd' ? locations['1st'].name : locations['3rd'].name}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>
                📦 {selectedLocation === '3rd' ? (transferProduct.stock1st || 0) : (transferProduct.stock3rd || 0)} ชิ้น
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#4A5568' }}>จำนวนที่ต้องการโอนย้าย</label>
            <input 
              type="number" 
              className="input" 
              placeholder="กรอกจำนวน (ตัวเลข)"
              value={transferQty} 
              onChange={(e) => setTransferQty(e.target.value)}
              min="1"
              max={getAvailableStock()}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setTransferProduct(null)}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#3182CE', borderColor: '#3182CE', color: '#fff' }}>
              ยืนยันโอนย้าย
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

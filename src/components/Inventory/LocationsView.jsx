import React from 'react';
import { Archive, Layers, Store, ClipboardList, PenLine, ArrowRightLeft, FileDown } from 'lucide-react';
import LocationModal from './LocationModal';
import ImportPreviewModal from './ImportPreviewModal';

export default function LocationsView({ 
  locations, products, handleDownloadTemplate, openLocation, handleEditLocation, handleTransferBulk, handleDownloadCSV, handleImportCSV, 
  editingLocationId, setEditingLocationId, locationFormData, setLocationFormData, handleSaveLocation, 
  importPreview, setImportPreview, selectedImportItems, setSelectedImportItems, handleConfirmImport 
}) {
  return (
    <div className="animate-slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px' }}>ระบบจัดการคลังเก็บสินค้า (Inventory Locations)</h2>
        <button className="btn btn-outline" onClick={handleDownloadTemplate} style={{ color: '#4A5568', borderColor: '#CBD5E0' }}>
          <FileDown size={16} /> โหลดฟอร์มนำเข้า (Template)
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: 'var(--text-muted)' }}>Location / คลังสินค้า</h3>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Type</th>
                <th>Location Name</th>
                <th>Total Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Total Stock */}
              <tr>
                <td><span className="badge badge-success">Master</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Layers size={20} color="var(--primary-red)" />
                    <span style={{ fontWeight: '600', fontSize: '16px' }}>สต็อกรวมทั้งหมด (Total Stock)</span>
                  </div>
                </td>
                <td>{products.filter(p => (p.stock1st || 0) + (p.stock3rd || 0) > 0).length} รายการ</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => openLocation('total')}>
                      <Archive size={14} /> ดูสต็อกทั้งหมด
                    </button>
                  </div>
                </td>
              </tr>
              {/* Storefront */}
              <tr>
                <td><span className="badge badge-warning">Active</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Store size={20} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', fontSize: '16px' }}>{locations['1st'].name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{locations['1st'].ref} - {locations['1st'].desc}</span>
                    </div>
                  </div>
                </td>
                <td>{products.filter(p => (p.stock1st || 0) > 0).length} รายการ</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '13px', background: '#F8F9FA' }} onClick={() => openLocation('1st')}>
                      <ClipboardList size={14} /> สต็อก
                    </button>
                    <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '13px', background: '#48BB78', color: 'white', borderColor: '#48BB78' }} onClick={() => handleEditLocation('1st')}>
                       <PenLine size={14} /> แก้ไขชื่อคลัง
                    </button>
                    <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '13px', background: '#2D3748', color: '#fff', borderColor: '#2D3748' }} onClick={handleTransferBulk}>
                       <ArrowRightLeft size={14} /> โอนย้าย
                    </button>
                    <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '13px', background: '#63B3ED', color: 'white', borderColor: '#63B3ED' }} onClick={() => handleDownloadCSV('1st')}>
                       <FileDown size={14} /> ดาวน์โหลด
                    </button>
                    <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '13px', background: '#F6AD55', color: 'white', borderColor: '#F6AD55' }} onClick={() => handleImportCSV('1st')}>
                       <ArrowRightLeft size={14} /> นำเข้า
                    </button>
                  </div>
                </td>
              </tr>
              {/* Warehouse */}
              <tr>
                <td><span className="badge badge-warning">Active</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Archive size={20} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', fontSize: '16px' }}>{locations['3rd'].name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{locations['3rd'].ref} - {locations['3rd'].desc}</span>
                    </div>
                  </div>
                </td>
                <td>{products.filter(p => (p.stock3rd || 0) > 0).length} รายการ</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '13px', background: '#F8F9FA' }} onClick={() => openLocation('3rd')}>
                      <ClipboardList size={14} /> สต็อก
                    </button>
                    <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '13px', background: '#48BB78', color: 'white', borderColor: '#48BB78' }} onClick={() => handleEditLocation('3rd')}>
                       <PenLine size={14} /> แก้ไขชื่อคลัง
                    </button>
                    <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '13px', background: '#2D3748', color: '#fff', borderColor: '#2D3748' }} onClick={handleTransferBulk}>
                       <ArrowRightLeft size={14} /> โอนย้าย
                    </button>
                    <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '13px', background: '#63B3ED', color: 'white', borderColor: '#63B3ED' }} onClick={() => handleDownloadCSV('3rd')}>
                       <FileDown size={14} /> ดาวน์โหลด
                    </button>
                    <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '13px', background: '#F6AD55', color: 'white', borderColor: '#F6AD55' }} onClick={() => handleImportCSV('3rd')}>
                       <ArrowRightLeft size={14} /> นำเข้า
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <LocationModal 
          editingLocationId={editingLocationId} 
          setEditingLocationId={setEditingLocationId} 
          locationFormData={locationFormData} 
          setLocationFormData={setLocationFormData} 
          handleSaveLocation={handleSaveLocation} 
        />

        <ImportPreviewModal 
          importPreview={importPreview} 
          setImportPreview={setImportPreview} 
          selectedImportItems={selectedImportItems} 
          setSelectedImportItems={setSelectedImportItems} 
          handleConfirmImport={handleConfirmImport} 
        />
      </div>
    </div>
  );
}

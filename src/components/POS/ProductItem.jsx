export default function ProductItem({ product, onAddToCart, quantityInCart = 0 }) {
  const stock = (product.stock1st || 0) - quantityInCart;
  const isRestricted = product.stockMode === 'Stock Control [Restricted]' || product.stockMode === 'Restricted';
  const isOut = stock <= 0 && isRestricted;

  return (
    <div 
      style={{ 
        cursor: isOut ? 'not-allowed' : 'pointer', 
        padding: 0, 
        overflow: 'hidden', 
        opacity: isOut ? 0.6 : 1,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#fff',
        border: '2px solid #f1f5f9',
        borderRadius: '16px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }} 
      className="product-card-premium"
      onClick={() => !isOut && onAddToCart(product)}
    >
      <style>{`
        .product-card-premium:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1);
          border-color: #ef4444 !important;
        }
      `}</style>

      {/* Media Section: Strictly Locked 1:1 Ratio */}
      <div style={{ 
        position: 'relative', 
        width: '100%',
        aspectRatio: '1 / 1', 
        background: '#f8fafc', 
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0 // Prevent shrinking in some flex/grid layouts
      }}>
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              display: 'block'
            }} 
          />
        ) : (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#cbd5e1', 
            padding: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', opacity: 0.6 }}>NO IMAGE</div>
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{product.sku}</div>
          </div>
        )}

        {/* Stock Badge - Premium Style */}
        {product.stockMode !== 'No Stock' && (
          <div style={{ 
            position: 'absolute', top: '8px', right: '8px', 
            background: isOut ? '#ef4444' : 'rgba(255,255,255,0.9)', 
            color: isOut ? 'white' : '#1e293b', 
            padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '900',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)'
          }}>
            {isOut ? 'หมด' : stock}
          </div>
        )}

        {/* Price Label - Red Premium */}
        <div style={{ 
          position: 'absolute', bottom: '8px', left: '8px', 
          background: '#ef4444', color: 'white', 
          padding: '4px 10px', borderRadius: '10px', fontSize: '13px', fontWeight: '900',
          boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)'
        }}>
          ฿{(Number(product.price) || 0).toLocaleString()}
        </div>
      </div>

      {/* Info Section - Guaranteed Height */}
      <div style={{ padding: '10px 8px', background: 'white', flexShrink: 0, borderTop: '1px solid #f1f5f9' }}>
        <div style={{ fontWeight: '800', fontSize: '12px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
          {product.name}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', letterSpacing: '0.05em' }}>
          {product.sku}
        </div>
      </div>
    </div>
  );
}

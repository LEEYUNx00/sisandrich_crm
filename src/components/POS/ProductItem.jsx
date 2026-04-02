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
        transition: 'all 0.15s ease',
        background: '#fff',
        border: '1px solid #edf2f7',
        borderRadius: '10px',
        width: '100%',
        position: 'relative'
      }} 
      className="product-card-hover"
      onClick={() => !isOut && onAddToCart(product)}
    >
      <style>{`
        .product-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: #3182CE !important;
        }
      `}</style>

      {/* Media Section: Image + Overlays */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%', background: '#F7FAFC' }}>
        {product.image ? (
          <img src={product.image} alt={product.name} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E0', fontSize: '9px', fontWeight: 'bold', textAlign: 'center' }}>
            N/A
          </div>
        )}

        {/* Stock Badge */}
        {product.stockMode !== 'No Stock' && (
          <div style={{ 
            position: 'absolute', top: '4px', right: '4px', 
            background: isOut ? '#E53E3E' : 'rgba(255,255,255,0.95)', 
            color: isOut ? 'white' : '#2D3748', 
            padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: '900',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: isOut ? 'none' : '1px solid #E2E8F0'
          }}>
            {isOut ? 'หมด' : stock}
          </div>
        )}

        {/* Price Overlay */}
        <div style={{ 
          position: 'absolute', bottom: '4px', right: '4px', 
          background: 'rgba(0,0,0,0.7)', color: 'white', 
          padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '900' 
        }}>
          ฿{product.price}
        </div>
      </div>

      {/* Info Section */}
      <div style={{ padding: '6px 8px', textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#2D3748', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name}
        </div>
        <div style={{ fontSize: '9px', color: '#718096', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.sku}
        </div>
      </div>
    </div>
  );
}

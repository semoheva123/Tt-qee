import React, { useState, useEffect } from 'react';

export default function App() {
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('15');
  const [activeTab, setActiveTab] = useState('terminal'); 
  const [isDemo, setIsDemo] = useState(true); 
  const [tradeAmount, setTradeAmount] = useState('0.05');
  const [statusMsg, setStatusMsg] = useState('');
  const [positions, setPositions] = useState([]);
  const [balance, setBalance] = useState(10000.00);

  const [marketData, setMarketData] = useState({
    BTCUSDT: { name: 'BTC / USDT', tvSymbol: 'BINANCE:BTCUSDT', price: 64250.00, change: '+2.4%', color: '#f7931a' },
    ETHUSDT: { name: 'ETH / USDT', tvSymbol: 'BINANCE:ETHUSDT', price: 3480.50, change: '+1.8%', color: '#627eea' },
    XAUUSD: { name: 'الذهب (XAU)', tvSymbol: 'OANDA:XAUUSD', price: 2392.40, change: '+0.9%', color: '#ffd700' },
    XAGUSD: { name: 'الفضة (XAG)', tvSymbol: 'OANDA:XAGUSD', price: 28.90, change: '-0.4%', color: '#c0c0c0' }
  });

  const currentPairObj = marketData[selectedPair];

  // محاكاة حركة الأسعار المباشرة وتحديث أرباح الصفقات المرئية
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(sym => {
          const fluctuation = (Math.random() - 0.49) * (sym === 'BTCUSDT' ? 45 : sym === 'ETHUSDT' ? 5 : 1.5);
          updated[sym].price = Number((updated[sym].price + fluctuation).toFixed(2));
        });
        return updated;
      });

      setPositions(prevPos => 
        prevPos.map(pos => {
          const currentP = marketData[pos.symbolKey]?.price || pos.entryPrice;
          const diff = pos.side === 'LONG' ? currentP - pos.entryPrice : pos.entryPrice - currentP;
          const pnlVal = diff * (pos.qty * (pos.symbolKey === 'BTCUSDT' ? 1 : 10));
          return { ...pos, currentPrice: currentP, pnl: Number(pnlVal.toFixed(2)) };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [marketData]);

  const handleTrade = (side) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }

    const newPos = {
      id: Date.now(),
      symbolKey: selectedPair,
      symbolName: currentPairObj.name,
      side: side,
      entryPrice: currentPairObj.price,
      currentPrice: currentPairObj.price,
      qty: parseFloat(tradeAmount),
      type: isDemo ? 'DEMO' : 'LIVE',
      pnl: 0.00
    };

    setPositions([newPos, ...positions]);
    setStatusMsg(`🚀 تم إسقاط صفقة ${side} على الشارت والمنظومة بنجاح!`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleClosePosition = (id, pnl) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    setBalance(prev => Number((prev + pnl).toFixed(2)));
    setPositions(positions.filter(p => p.id !== id));
    setStatusMsg(`✅ تم إغلاق الصفقة بنجاح. النتيجة: ${pnl >= 0 ? '+' : ''}$${pnl}`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  // تصفية الصفقات الخاصة بالأصل الحالي فقط لعرضها تحت شارت هدا الأصل
  const currentPairPositions = positions.filter(p => p.symbolKey === selectedPair);

  return (
    <div style={styles.container}>
      
      {/* شريط الأزواج */}
      <div style={styles.pairsBar}>
        {Object.entries(marketData).map(([key, item]) => (
          <button
            key={key}
            style={{
              ...styles.pairBtn,
              borderColor: selectedPair === key ? item.color : '#1c2541',
              backgroundColor: selectedPair === key ? '#162038' : '#0e1726'
            }}
            onClick={() => setSelectedPair(key)}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: item.color }}>{item.name}</div>
            <div style={{ fontSize: '10px', color: '#fff' }}>${item.price.toLocaleString()}</div>
          </button>
        ))}
      </div>

      {/* شريط المحفظة */}
      <div style={styles.headerCard}>
        <div>
          <div style={styles.subText}>رصيد الحساب التجريبي</div>
          <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#00b4d8' }}>${balance.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={styles.subText}>العقود النشطة للشارت الحالي</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffb703' }}>{currentPairPositions.length} صفقات مرئية</div>
        </div>
      </div>

      {/* الفواصل الزمنية */}
      <div style={styles.tfBar}>
        {['1', '5', '15', '60', 'D'].map(tf => (
          <button 
            key={tf} 
            style={{ ...styles.tfBtn, backgroundColor: timeframe === tf ? '#00b4d8' : '#162038', color: timeframe === tf ? '#0b132b' : '#fff' }}
            onClick={() => setTimeframe(tf)}
          >
            {tf === '60' ? '1H' : tf === 'D' ? '1D' : `${tf}m`}
          </button>
        ))}
      </div>

      {/* الشارت الحي */}
      <div style={styles.chartWrapper}>
        <iframe
          key={`${currentPairObj.tvSymbol}-${timeframe}`}
          src={`https://s.tradingview.com/widgetembed/?symbol=${currentPairObj.tvSymbol}&interval=${timeframe}&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0b132b&studies=[]&theme=dark&style=1&timezone=Etc/UTC`}
          style={{ width: '100%', height: '300px', border: 'none', borderRadius: '8px' }}
          title="TradingView Chart"
        />
      </div>

      {/* 🌟 الإضافة الجذرية: لوحة العرض المرئي المباشر للصفقات على الشارت */}
      <div style={styles.liveChartOverlayCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#00b4d8' }}>🎯 الصفقات المفتوحة على شارت {currentPairObj.name}</span>
          <span style={{ fontSize: '10px', color: '#8d99ae' }}>السعر الحالي: ${currentPairObj.price}</span>
        </div>

        {currentPairPositions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#52606d', fontSize: '11px', padding: '12px', border: '1px dashed #1c2541', borderRadius: '6px' }}>
            لا توجد صفقات مفتوحة لهذا الأصل. انقر شراء أو بيع لترفق الصفقة فوراً هنا.
          </div>
        ) : (
          currentPairPositions.map(pos => (
            <div key={pos.id} style={{ ...styles.visualPositionRow, borderRight: `4px solid ${pos.side === 'LONG' ? '#10b981' : '#ef476f'}` }}>
              <div>
                <span style={{ fontWeight: 'bold', color: pos.side === 'LONG' ? '#10b981' : '#ef476f', fontSize: '11px' }}>
                  {pos.side} ({pos.qty})
                </span>
                <div style={{ fontSize: '10px', color: '#8d99ae' }}>سعر الدخول: ${pos.entryPrice}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: pos.pnl >= 0 ? '#10b981' : '#ef476f' }}>
                  {pos.pnl >= 0 ? '+' : ''}${pos.pnl}
                </div>
                <div style={{ fontSize: '9px', color: '#ffb703' }}>الربح اللحظي</div>
              </div>
              <button style={styles.overlayCloseBtn} onClick={() => handleClosePosition(pos.id, pos.pnl)}>إغلاق</button>
            </div>
          ))
        )}
      </div>

      {/* لوحة التنفيذ السريع */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#8d99ae' }}>حجم العقود</span>
          <input type="number" step="0.01" style={styles.inputSmall} value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button style={{ ...styles.tradeBtn, backgroundColor: '#10b981' }} onClick={() => handleTrade('LONG')}>شراء (LONG 🟢)</button>
          <button style={{ ...styles.tradeBtn, backgroundColor: '#ef476f' }} onClick={() => handleTrade('SHORT')}>بيع (SHORT 🔴)</button>
        </div>
      </div>

      {statusMsg && <div style={styles.statusBanner}>{statusMsg}</div>}

      <div style={styles.footer}>
        Institutional Visual Quant Engine | Owner ID: 966607076
      </div>

    </div>
  );
}

const styles = {
  container: { backgroundColor: '#070d1a', color: '#f8f9fa', minHeight: '100vh', padding: '10px', fontFamily: 'system-ui, sans-serif' },
  pairsBar: { display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '4px' },
  pairBtn: { flex: '0 0 auto', padding: '6px 10px', border: '1px solid', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', minWidth: '80px' },
  headerCard: { display: 'flex', justifyContent: 'space-between', backgroundColor: '#101728', border: '1px solid #1c2541', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  subText: { fontSize: '9px', color: '#8d99ae' },
  tfBar: { display: 'flex', gap: '4px', marginBottom: '6px' },
  tfBtn: { flex: 1, padding: '4px', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  chartWrapper: { backgroundColor: '#101728', border: '1px solid #1c2541', borderRadius: '10px', padding: '4px', marginBottom: '8px' },
  liveChartOverlayCard: { backgroundColor: '#101728', border: '1px solid #00b4d8', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  visualPositionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#070d1a', padding: '8px', borderRadius: '6px', marginBottom: '6px' },
  card: { backgroundColor: '#101728', border: '1px solid #1c2541', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  inputSmall: { width: '80px', padding: '4px', backgroundColor: '#070d1a', border: '1px solid #1c2541', borderRadius: '4px', color: '#fff', fontSize: '11px', textAlign: 'center' },
  tradeBtn: { flex: 1, padding: '9px', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },
  overlayCloseBtn: { backgroundColor: '#ef476f', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' },
  statusBanner: { backgroundColor: '#00b4d8', color: '#070d1a', padding: '6px', borderRadius: '6px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' },
  footer: { textAlign: 'center', color: '#4a5568', fontSize: '9px', marginTop: '8px' }
};

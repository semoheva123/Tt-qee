import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function App() {
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [activeTab, setActiveTab] = useState('terminal');
  const [tradeAmount, setTradeAmount] = useState('0.05');
  const [statusMsg, setStatusMsg] = useState('');
  const [positions, setPositions] = useState([]);
  const [balance, setBalance] = useState(10000.00);

  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLinesRef = useRef([]);

  const [marketData, setMarketData] = useState({
    BTCUSDT: { name: 'BTC / USDT', price: 64250.00, color: '#f7931a' },
    ETHUSDT: { name: 'ETH / USDT', price: 3480.50, color: '#627eea' },
    XAUUSD: { name: 'الذهب (XAU)', price: 2392.40, color: '#ffd700' },
    XAGUSD: { name: 'الفضة (XAG)', price: 28.90, color: '#c0c0c0' }
  });

  const currentPairObj = marketData[selectedPair];

  // تهيئة شارت Lightweight Charts المتقدم عند تحميل المكون
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // إنشاء الشارت بتصميم داكن مؤسسي
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 310,
      layout: {
        background: { color: '#101728' },
        textColor: '#9399b2',
      },
      grid: {
        vertLines: { color: '#1c2541' },
        horzLines: { color: '#1c2541' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#1c2541' },
      timeScale: { borderColor: '#1c2541', timeVisible: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef476f',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef476f',
    });

    // توليد بيانات تجريبية واقعية للشموع
    const baseline = selectedPair === 'BTCUSDT' ? 64250 : selectedPair === 'ETHUSDT' ? 3480 : 2390;
    let currTime = Math.floor(Date.now() / 1000) - 150 * 60;
    let lastClose = baseline;
    
    const initialData = [];
    for (let i = 0; i < 150; i++) {
      const open = lastClose;
      const change = (Math.random() - 0.48) * (baseline * 0.002);
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * (baseline * 0.001);
      const low = Math.min(open, close) - Math.random() * (baseline * 0.001);
      
      initialData.push({ time: currTime, open, high, low, close });
      lastClose = close;
      currTime += 60; // فاصل دقيقة
    }

    candleSeries.setData(initialData);
    chartInstanceRef.current = chart;
    seriesRef.current = candleSeries;

    // استجابة لتغيير حجم الشاشة
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [selectedPair]);

  // تحديث الشموع والأسعار والصفقات لحظياً
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => {
        const updated = { ...prev };
        const sym = selectedPair;
        const fluctuation = (Math.random() - 0.49) * (sym === 'BTCUSDT' ? 30 : 4);
        const newPrice = Number((updated[sym].price + fluctuation).toFixed(2));
        updated[sym].price = newPrice;

        // تحديث الشمعة الحية الأخيرة في الشارت
        if (seriesRef.current) {
          const currentTime = Math.floor(Date.now() / 1000);
          // محاكاة تحديث آخر شمعة
          seriesRef.current.update({
            time: currentTime - (currentTime % 60),
            open: newPrice - 10,
            high: newPrice + 15,
            low: newPrice - 20,
            close: newPrice
          });
        }
        return updated;
      });

      // تحديث أرباح الصفقات النشطة
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
  }, [selectedPair, marketData]);

  // إدارة خطوط الصفقات المرسومة مباشرة على الشارت (Price Lines)
  useEffect(() => {
    if (!seriesRef.current) return;

    // إزالة الخطوط القديمة لمنع التراكم
    priceLinesRef.current.forEach(line => {
      try { seriesRef.current.removePriceLine(line); } catch (e) {}
    });
    priceLinesRef.current = [];

    // رسم خط لكل صفقة نشطة تخص الأصل الحالي مباشرة على الشارت
    const currentPairPositions = positions.filter(p => p.symbolKey === selectedPair);
    currentPairPositions.forEach(pos => {
      const lineOptions = {
        price: pos.entryPrice,
        color: pos.side === 'LONG' ? '#10b981' : '#ef476f',
        lineWidth: 2,
        lineStyle: 2, // خط متقطع
        axisLabelVisible: true,
        title: `${pos.side} (${pos.qty})`,
      };
      const priceLine = seriesRef.current.createPriceLine(lineOptions);
      priceLinesRef.current.push(priceLine);
    });
  }, [positions, selectedPair]);

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
      pnl: 0.00
    };

    setPositions([newPos, ...positions]);
    setStatusMsg(`🚀 تم إسقاط صفقة ${side} ورسم خطها بوضوح على الشارت!`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleClosePosition = (id, pnl) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    setBalance(prev => Number((prev + pnl).toFixed(2)));
    setPositions(positions.filter(p => p.id !== id));
    setStatusMsg(`✅ تم إغلاق الصفقة وإزالة خطها من الشارت. النتيجة: ${pnl >= 0 ? '+' : ''}$${pnl}`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

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

      {/* لوحة الرصيد */}
      <div style={styles.headerCard}>
        <div>
          <div style={styles.subText}>رصيد الحساب المؤسسي</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00b4d8' }}>${balance.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={styles.subText}>الصفقات المرسومة على الشارت</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffb703' }}>{currentPairPositions.length} صفقات نشطة</div>
        </div>
      </div>

      {/* 📊 شارت الشموع اليابانية التفاعلي المباشر (Lightweight Charts) */}
      <div style={styles.chartWrapper}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: '11px', color: '#00b4d8', fontWeight: 'bold' }}>
          <span>📈 شارت حي تفاعلي ({currentPairObj.name})</span>
          <span>السعر: ${currentPairObj.price}</span>
        </div>
        <div ref={chartContainerRef} style={{ width: '100%' }} />
      </div>

      {/* سجل وإدارة الصفقات المرسومة */}
      {currentPairPositions.length > 0 && (
        <div style={styles.activePositionsCard}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffb703', marginBottom: '6px' }}>⚡ الصفقات الظاهرة حالياً على الشارت:</div>
          {currentPairPositions.map(pos => (
            <div key={pos.id} style={{ ...styles.posRow, borderRight: `4px solid ${pos.side === 'LONG' ? '#10b981' : '#ef476f'}` }}>
              <div>
                <span style={{ fontWeight: 'bold', color: pos.side === 'LONG' ? '#10b981' : '#ef476f', fontSize: '11px' }}>
                  {pos.side} - دخول: ${pos.entryPrice}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: pos.pnl >= 0 ? '#10b981' : '#ef476f' }}>
                  {pos.pnl >= 0 ? '+' : ''}${pos.pnl}
                </span>
                <button style={styles.closeBtn} onClick={() => handleClosePosition(pos.id, pos.pnl)}>إغلاق</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* لوحة التنفيذ السريع للأوامر */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: '#9399b2' }}>حجم العقود (Lots)</span>
          <input type="number" step="0.01" style={styles.inputSmall} value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ ...styles.tradeBtn, backgroundColor: '#10b981' }} onClick={() => handleTrade('LONG')}>شراء صاعد (LONG 🟢)</button>
          <button style={{ ...styles.tradeBtn, backgroundColor: '#ef476f' }} onClick={() => handleTrade('SHORT')}>بيع هابط (SHORT 🔴)</button>
        </div>
      </div>

      {statusMsg && <div style={styles.statusBanner}>{statusMsg}</div>}

      <div style={styles.footer}>
        Professional Chart Engine & Live Price Lines | Owner ID: 966607076
      </div>

    </div>
  );
}

const styles = {
  container: { backgroundColor: '#070d1a', color: '#f8f9fa', minHeight: '100vh', padding: '10px', fontFamily: 'system-ui, sans-serif' },
  pairsBar: { display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '4px' },
  pairBtn: { flex: '0 0 auto', padding: '6px 10px', border: '1px solid', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', minWidth: '80px' },
  headerCard: { display: 'flex', justifyContent: 'space-between', backgroundColor: '#101728', border: '1px solid #1c2541', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  subText: { fontSize: '9px', color: '#9399b2' },
  chartWrapper: { backgroundColor: '#101728', border: '1px solid #1c2541', borderRadius: '10px', padding: '4px', marginBottom: '8px', overflow: 'hidden' },
  activePositionsCard: { backgroundColor: '#101728', border: '1px solid #00b4d8', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  posRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#070d1a', padding: '6px 10px', borderRadius: '6px', marginBottom: '4px' },
  card: { backgroundColor: '#101728', border: '1px solid #1c2541', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  inputSmall: { width: '80px', padding: '4px', backgroundColor: '#070d1a', border: '1px solid #1c2541', borderRadius: '4px', color: '#fff', fontSize: '11px', textAlign: 'center' },
  tradeBtn: { flex: 1, padding: '9px', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },
  closeBtn: { backgroundColor: '#ef476f', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' },
  statusBanner: { backgroundColor: '#00b4d8', color: '#070d1a', padding: '6px', borderRadius: '6px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' },
  footer: { textAlign: 'center', color: '#4a5568', fontSize: '9px', marginTop: '8px' }
};

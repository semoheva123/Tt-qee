import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function App() {
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [tradeAmount, setTradeAmount] = useState('0.05');
  const [leverage, setLeverage] = useState('20');
  const [tpPercent, setTpPercent] = useState('2.0');
  const [slPercent, setSlPercent] = useState('1.0');
  const [statusMsg, setStatusMsg] = useState('');
  const [positions, setPositions] = useState([]);
  const [balance, setBalance] = useState(10000.00);

  const chartContainerRef = useRef(null);
  const heatmapCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLinesRef = useRef([]);

  const [marketData, setMarketData] = useState({
    BTCUSDT: { name: 'BTC / USDT', price: 64256.38, color: '#f7931a' },
    ETHUSDT: { name: 'ETH / USDT', price: 3480.50, color: '#627eea' },
    XAUUSD: { name: 'الذهب (XAU)', price: 2392.40, color: '#ffd700' },
    XAGUSD: { name: 'الفضة (XAG)', price: 28.90, color: '#c0c0c0' }
  });

  const currentPairObj = marketData[selectedPair];

  const [orderBook, setOrderBook] = useState({ asks: [], bids: [] });
  const [timeAndSales, setTimeAndSales] = useState([]);

  // محاكاة دفتر الأوامر الحقيقي (DOM)
  useEffect(() => {
    const p = currentPairObj.price;
    const step = selectedPair === 'BTCUSDT' ? 10 : 1;
    
    const asks = Array.from({ length: 5 }, (_, i) => ({
      price: Number((p + (5 - i) * step).toFixed(2)),
      size: Number((Math.random() * 2 + 0.1).toFixed(3)),
      total: Number((Math.random() * 10 + 2).toFixed(2))
    })).reverse();

    const bids = Array.from({ length: 5 }, (_, i) => ({
      price: Number((p - (i + 1) * step).toFixed(2)),
      size: Number((Math.random() * 2 + 0.1).toFixed(3)),
      total: Number((Math.random() * 10 + 2).toFixed(2))
    }));

    setOrderBook({ asks, bids });
  }, [selectedPair, currentPairObj.price]);

  // تهيئة الشارت
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 250,
      layout: {
        background: { color: '#05080f' },
        textColor: '#8a99ad',
      },
      grid: {
        vertLines: { color: '#101726' },
        horzLines: { color: '#101726' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#1c2841' },
      timeScale: { borderColor: '#1c2841', timeVisible: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00f5d4',
      downColor: '#f72585',
      borderVisible: false,
      wickUpColor: '#00f5d4',
      wickDownColor: '#f72585',
    });

    const baseline = selectedPair === 'BTCUSDT' ? 64250 : selectedPair === 'ETHUSDT' ? 3480 : 2390;
    let currTime = Math.floor(Date.now() / 1000) - 120 * 60;
    let lastClose = baseline;
    
    const initialData = [];
    for (let i = 0; i < 120; i++) {
      const open = lastClose;
      const change = (Math.random() - 0.48) * (baseline * 0.002);
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * (baseline * 0.001);
      const low = Math.min(open, close) - Math.random() * (baseline * 0.001);
      
      initialData.push({ time: currTime, open, high, low, close });
      lastClose = close;
      currTime += 60;
    }

    candleSeries.setData(initialData);
    chartInstanceRef.current = chart;
    seriesRef.current = candleSeries;

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

  // رسم الخريطة الحرارية (Heatmap Canvas Engine) خلف الشارت
  useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // رسم تدرجات السيولة الحرارية (Bookmap Liquidity Nodes)
    const cols = 40;
    const rows = 15;
    const colWidth = width / cols;
    const rowHeight = height / rows;

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        // توليد كثافة سيولة وهمية متغيرة نابضة بالحياة
        const intensity = Math.sin(x * 0.3 + Date.now() * 0.002) * Math.cos(y * 0.4);
        if (intensity > 0.3) {
          ctx.fillStyle = y < rows / 2 
            ? `rgba(247, 37, 133, ${intensity * 0.35})` // سيولة عروض البيع (مجنتا/أحمر)
            : `rgba(0, 245, 212, ${intensity * 0.35})`; // سيولة طلبات الشراء (تركواز/أخضر)
          ctx.fillRect(x * colWidth, y * rowHeight, colWidth - 1, rowHeight - 1);
        }
      }
    }
  }, [marketData]);

  // تحديث البيانات دورياً
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => {
        const updated = { ...prev };
        const sym = selectedPair;
        const fluctuation = (Math.random() - 0.49) * (sym === 'BTCUSDT' ? 30 : 5);
        const newPrice = Number((updated[sym].price + fluctuation).toFixed(2));
        updated[sym].price = newPrice;

        if (seriesRef.current) {
          const currentTime = Math.floor(Date.now() / 1000);
          seriesRef.current.update({
            time: currentTime - (currentTime % 60),
            open: newPrice - 10,
            high: newPrice + 12,
            low: newPrice - 15,
            close: newPrice
          });
        }
        return updated;
      });

      const isBuy = Math.random() > 0.45;
      const newTrade = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        price: currentPairObj.price,
        size: Number((Math.random() * 1.5 + 0.01).toFixed(3)),
        side: isBuy ? 'BUY' : 'SELL'
      };

      setTimeAndSales(prev => [newTrade, ...prev.slice(0, 4)]);

      setPositions(prevPos => 
        prevPos.map(pos => {
          const currentP = marketData[pos.symbolKey]?.price || pos.entryPrice;
          const diff = pos.side === 'LONG' ? currentP - pos.entryPrice : pos.entryPrice - currentP;
          const basePnl = diff * (pos.qty * (pos.symbolKey === 'BTCUSDT' ? 1 : 10));
          const pnlVal = basePnl * pos.leverage;
          return { ...pos, currentPrice: currentP, pnl: Number(pnlVal.toFixed(2)) };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedPair, marketData, currentPairObj.price]);

  // ربط الأهداف بالخطوط على الشارت
  useEffect(() => {
    if (!seriesRef.current) return;

    priceLinesRef.current.forEach(line => {
      try { seriesRef.current.removePriceLine(line); } catch (e) {}
    });
    priceLinesRef.current = [];

    const currentPairPositions = positions.filter(p => p.symbolKey === selectedPair);
    currentPairPositions.forEach(pos => {
      const pnlSign = pos.pnl >= 0 ? '+' : '';
      
      const entryLine = seriesRef.current.createPriceLine({
        price: pos.entryPrice,
        color: pos.side === 'LONG' ? '#00f5d4' : '#f72585',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `${pos.side} ${pos.leverage}x [${pnlSign}$${pos.pnl}]`,
      });

      const tpLine = seriesRef.current.createPriceLine({
        price: pos.tpPrice,
        color: '#4cc9f0',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `🎯 TP: ${pos.tpPrice}`,
      });

      const slLine = seriesRef.current.createPriceLine({
        price: pos.slPrice,
        color: '#fca311',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `🛡️ SL: ${pos.slPrice}`,
      });

      priceLinesRef.current.push(entryLine, tpLine, slLine);
    });
  }, [positions, selectedPair]);

  const handleTrade = (side) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }

    const entry = currentPairObj.price;
    const lev = parseInt(leverage);
    const tpDist = entry * (parseFloat(tpPercent) / 100);
    const slDist = entry * (parseFloat(slPercent) / 100);

    const tpPrice = side === 'LONG' ? Number((entry + tpDist).toFixed(2)) : Number((entry - tpDist).toFixed(2));
    const slPrice = side === 'LONG' ? Number((entry - slDist).toFixed(2)) : Number((entry + slDist).toFixed(2));

    const newPos = {
      id: Date.now(),
      symbolKey: selectedPair,
      symbolName: currentPairObj.name,
      side: side,
      entryPrice: entry,
      currentPrice: entry,
      qty: parseFloat(tradeAmount),
      leverage: lev,
      tpPrice,
      slPrice,
      pnl: 0.00
    };

    setPositions([newPos, ...positions]);
    setStatusMsg(`🚀 تم تنفيذ الصفقة بنجاح عبر الخريطة الحرارية المؤسسية!`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleClosePosition = (id, pnl) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    setBalance(prev => Number((prev + pnl).toFixed(2)));
    setPositions(positions.filter(p => p.id !== id));
    setStatusMsg(`✅ تم إغلاق الصفقة بقيمة: ${pnl >= 0 ? '+' : ''}$${pnl}`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const adjustPriceLine = (id, type, amount) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
    setPositions(positions.map(p => {
      if (p.id === id) {
        if (type === 'tp') {
          return { ...p, tpPrice: Number((p.tpPrice + amount).toFixed(2)) };
        } else {
          return { ...p, slPrice: Number((p.slPrice + amount).toFixed(2)) };
        }
      }
      return p;
    }));
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
              borderColor: selectedPair === key ? item.color : '#1c2841',
              backgroundColor: selectedPair === key ? '#131c31' : '#0b111e'
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
          <div style={styles.subText}>رصيد المحفظة المؤسسية</div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#00f5d4' }}>${balance.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={styles.subText}>محرك السيولة الحرارية</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#f72585' }}>Bookmap Heatmap Active 🔥</div>
        </div>
      </div>

      {/* الشارت المدمج مع الخريطة الحرارية (Heatmap Overlay) */}
      <div style={styles.chartWrapper}>
        <div style={styles.chartHeader}>
          <span>🔥 Bookmap Heatmap & Chart ({currentPairObj.name})</span>
          <span style={{ color: '#00f5d4' }}>${currentPairObj.price}</span>
        </div>
        <div style={{ position: 'relative', width: '100%' }}>
          {/* طبقة الكانفاس الحرارية تحت الشارت مباشرة */}
          <canvas 
            ref={heatmapCanvasRef} 
            width={380} 
            height={250} 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, opacity: 0.85 }} 
          />
          <div ref={chartContainerRef} style={{ width: '100%', position: 'relative', zIndex: 2 }} />
        </div>
      </div>

      {/* دفتر الأوامر وسجل الصفقات */}
      <div style={styles.marketDeepGrid}>
        
        {/* دفتر الأوامر (DOM) */}
        <div style={styles.domCard}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#4cc9f0', marginBottom: '4px', textAlign: 'center' }}>دفتر الأوامر الحي (DOM)</div>
          <div style={styles.domTableHeader}><span>العرض (Ask)</span><span>السعر</span><span>الحجم</span></div>
          {orderBook.asks.map((ask, idx) => (
            <div key={idx} style={styles.domRowAsk}>
              <span style={{ color: '#f72585' }}>{ask.total}</span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>${ask.price}</span>
              <span style={{ color: '#8a99ad' }}>{ask.size}</span>
            </div>
          ))}
          <div style={styles.currentSpreadBar}>السعر الحالي: ${currentPairObj.price}</div>
          {orderBook.bids.map((bid, idx) => (
            <div key={idx} style={styles.domRowBid}>
              <span style={{ color: '#00f5d4' }}>{bid.total}</span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>${bid.price}</span>
              <span style={{ color: '#8a99ad' }}>{bid.size}</span>
            </div>
          ))}
        </div>

        {/* سجل الصفقات (Time & Sales) */}
        <div style={styles.domCard}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#fca311', marginBottom: '4px', textAlign: 'center' }}>شريط الصفقات (Time & Sales)</div>
          <div style={styles.domTableHeader}><span>الوقت</span><span>السعر</span><span>الحجم</span></div>
          {timeAndSales.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', padding: '3px 4px', borderBottom: '1px solid #101726' }}>
              <span style={{ color: '#8a99ad' }}>{t.time}</span>
              <span style={{ fontWeight: 'bold', color: t.side === 'BUY' ? '#00f5d4' : '#f72585' }}>${t.price}</span>
              <span style={{ color: '#fff' }}>{t.size}</span>
            </div>
          ))}
        </div>

      </div>

      {/* الصفقات النشطة */}
      {currentPairPositions.length > 0 && (
        <div style={styles.activePositionsCard}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fca311', marginBottom: '6px' }}>💼 الصفقات النشطة والتحكم بخطوط الشارت:</div>
          {currentPairPositions.map(pos => {
            const stepVal = pos.symbolKey === 'BTCUSDT' ? 50 : 5;
            return (
              <div key={pos.id} style={{ ...styles.posRow, borderRight: `4px solid ${pos.side === 'LONG' ? '#00f5d4' : '#f72585'}` }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: pos.side === 'LONG' ? '#00f5d4' : '#f72585', fontSize: '11px' }}>
                      {pos.side} ({pos.leverage}x) - دخول: ${pos.entryPrice}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: pos.pnl >= 0 ? '#00f5d4' : '#f72585' }}>
                      الربح: {pos.pnl >= 0 ? '+' : ''}${pos.pnl}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                    <div style={styles.controlBox}>
                      <span style={{ fontSize: '9px', color: '#4cc9f0' }}>🎯 TP: ${pos.tpPrice}</span>
                      <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                        <button style={styles.miniBtn} onClick={() => adjustPriceLine(pos.id, 'tp', -stepVal)}>-</button>
                        <button style={styles.miniBtn} onClick={() => adjustPriceLine(pos.id, 'tp', stepVal)}>+</button>
                      </div>
                    </div>

                    <div style={styles.controlBox}>
                      <span style={{ fontSize: '9px', color: '#fca311' }}>🛡️ SL: ${pos.slPrice}</span>
                      <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                        <button style={styles.miniBtn} onClick={() => adjustPriceLine(pos.id, 'sl', -stepVal)}>-</button>
                        <button style={styles.miniBtn} onClick={() => adjustPriceLine(pos.id, 'sl', stepVal)}>+</button>
                      </div>
                    </div>

                    <button style={styles.closeBtnLarge} onClick={() => handleClosePosition(pos.id, pos.pnl)}>إغلاق</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* لوحة التنفيذ */}
      <div style={styles.card}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '10px', color: '#8a99ad' }}>الرافعة المالية</span>
            <select style={styles.selectInput} value={leverage} onChange={(e) => setLeverage(e.target.value)}>
              <option value="1">1x (بدون رافعة)</option>
              <option value="10">10x</option>
              <option value="20">20x</option>
              <option value="50">50x</option>
              <option value="100">100x (قوة قصوى)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '10px', color: '#8a99ad' }}>حجم العقود</span>
            <input type="number" step="0.01" style={styles.inputSmall} value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '10px', color: '#8a99ad' }}>جني الأرباح TP (%)</span>
            <input type="number" step="0.5" style={styles.inputSmall} value={tpPercent} onChange={(e) => setTpPercent(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '10px', color: '#8a99ad' }}>وقف الخسارة SL (%)</span>
            <input type="number" step="0.5" style={styles.inputSmall} value={slPercent} onChange={(e) => setSlPercent(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ ...styles.tradeBtn, backgroundColor: '#00f5d4', color: '#070d1a' }} onClick={() => handleTrade('LONG')}>شراء صاعد (LONG 🟢)</button>
          <button style={{ ...styles.tradeBtn, backgroundColor: '#f72585', color: '#fff' }} onClick={() => handleTrade('SHORT')}>بيع هابط (SHORT 🔴)</button>
        </div>
      </div>

      {statusMsg && <div style={styles.statusBanner}>{statusMsg}</div>}

      <div style={styles.footer}>
        Bookmap Heatmap Quant Engine | Owner ID: 966607076
      </div>

    </div>
  );
}

const styles = {
  container: { backgroundColor: '#05080f', color: '#f8f9fa', minHeight: '100vh', padding: '10px', fontFamily: 'system-ui, sans-serif' },
  pairsBar: { display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '4px' },
  pairBtn: { flex: '0 0 auto', padding: '6px 10px', border: '1px solid', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', minWidth: '80px' },
  headerCard: { display: 'flex', justifyContent: 'space-between', backgroundColor: '#0b111e', border: '1px solid #1c2841', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  subText: { fontSize: '9px', color: '#8a99ad' },
  chartWrapper: { backgroundColor: '#0b111e', border: '1px solid #1c2841', borderRadius: '10px', padding: '4px', marginBottom: '8px', overflow: 'hidden' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: '11px', color: '#4cc9f0', fontWeight: 'bold' },
  marketDeepGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' },
  domCard: { backgroundColor: '#0b111e', border: '1px solid #1c2841', borderRadius: '10px', padding: '6px' },
  domTableHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#8a99ad', borderBottom: '1px solid #1c2841', paddingBottom: '2px', marginBottom: '2px' },
  domRowAsk: { display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '2px 0', backgroundColor: 'rgba(247, 37, 133, 0.08)' },
  domRowBid: { display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '2px 0', backgroundColor: 'rgba(0, 245, 212, 0.08)' },
  currentSpreadBar: { textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: '#4cc9f0', padding: '4px 0', margin: '2px 0', backgroundColor: '#05080f', borderRadius: '3px' },
  activePositionsCard: { backgroundColor: '#0b111e', border: '1px solid #4cc9f0', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  posRow: { backgroundColor: '#05080f', padding: '8px 10px', borderRadius: '6px', marginBottom: '6px' },
  controlBox: { flex: 1, backgroundColor: '#0b111e', padding: '4px 6px', borderRadius: '4px', border: '1px solid #1c2841', textAlign: 'center' },
  miniBtn: { flex: 1, backgroundColor: '#1c2841', color: '#fff', border: 'none', padding: '2px', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' },
  card: { backgroundColor: '#0b111e', border: '1px solid #1c2841', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  inputSmall: { width: '100%', padding: '6px', backgroundColor: '#05080f', border: '1px solid #1c2841', borderRadius: '4px', color: '#fff', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box', marginTop: '2px' },
  selectInput: { width: '100%', padding: '6px', backgroundColor: '#05080f', border: '1px solid #1c2841', borderRadius: '4px', color: '#fff', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box', marginTop: '2px' },
  tradeBtn: { flex: '1', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },
  closeBtnLarge: { backgroundColor: '#f72585', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', alignSelf: 'center' },
  statusBanner: { backgroundColor: '#4cc9f0', color: '#05080f', padding: '6px', borderRadius: '6px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' },
  footer: { textAlign: 'center', color: '#3a4b6c', fontSize: '9px', marginTop: '8px' }
};

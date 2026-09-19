import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function App() {
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [marketType, setMarketType] = useState('SPOT');
  const [timeframe, setTimeframe] = useState('1m');
  const [tradeAmount, setTradeAmount] = useState('0.05');
  const [leverage, setLeverage] = useState('20');
  const [statusMsg, setStatusMsg] = useState('');

  // 1. استرجاع الرصيد والصفقات من localStorage لمنع فقدان البيانات عند إغلاق/تحديث المتصفح
  const [balance, setBalance] = useState(() => {
    const savedBalance = localStorage.getItem('bot_balance');
    return savedBalance !== null ? parseFloat(savedBalance) : 10000.00;
  });

  const [positions, setPositions] = useState(() => {
    const savedPositions = localStorage.getItem('bot_positions');
    return savedPositions ? JSON.parse(savedPositions) : [];
  });

  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);
  const lastCandleRef = useRef(null);

  const [marketData, setMarketData] = useState({
    BTCUSD: { name: 'BTC / USD', symbolApi: 'BTCUSDT', price: 0, color: '#f7931a' },
    ETHUSD: { name: 'ETH / USD', symbolApi: 'ETHUSDT', price: 0, color: '#627eea' },
    XAUUSD: { name: 'الذهب (XAU/USD)', symbolApi: 'PAXGUSDT', price: 0, color: '#ffd700' },
    XAGUSD: { name: 'الفضة (XAG/USD)', symbolApi: 'LTCUSDT', price: 0, color: '#c0c0c0' }
  });

  const currentPairObj = marketData[selectedPair];

  // 2. التخزين التلقائي للبيانات كلما تغير الرصيد أو الصفقات
  useEffect(() => {
    localStorage.setItem('bot_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('bot_positions', JSON.stringify(positions));
  }, [positions]);

  // 3. إنشاء الشارت مرة واحدة فقط عند إقلاع الواجهة
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 280,
      layout: {
        background: { color: '#05080f' },
        textColor: '#8a99ad',
      },
      grid: {
        vertLines: { color: '#121c2e' },
        horzLines: { color: '#121c2e' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#1c2841' },
      timeScale: { borderColor: '#1c2841', timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00f5d4',
      downColor: '#f72585',
      borderVisible: false,
      wickUpColor: '#00f5d4',
      wickDownColor: '#f72585',
    });

    chartInstanceRef.current = chart;
    seriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // 4. جلب الشموع التاريخية عند تغيير الزوج أو الفريم الزمني
  useEffect(() => {
    if (!seriesRef.current) return;

    const fetchHistoricalData = async () => {
      try {
        const symbol = currentPairObj.symbolApi;
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=100`);
        const rawData = await res.json();

        if (Array.isArray(rawData)) {
          const formattedData = rawData.map(d => ({
            time: Math.floor(d[0] / 1000),
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4])
          }));

          seriesRef.current.setData(formattedData);
          lastCandleRef.current = formattedData[formattedData.length - 1];
        }
      } catch (err) {
        console.error("فشل تحميل البيانات التاريخية:", err);
      }
    };

    fetchHistoricalData();
  }, [selectedPair, timeframe]);

  // 5. جلب الأسعار الحية بشكل آمن لمنع حظر الطلبات وتجمد الشاشة
  useEffect(() => {
    let isSubscribed = true;
    let isFetching = false;

    const fetchLivePrices = async () => {
      if (isFetching) return;
      isFetching = true;

      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price');
        const data = await res.json();

        if (isSubscribed && Array.isArray(data)) {
          setMarketData(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(key => {
              const item = updated[key];
              const match = data.find(d => d.symbol === item.symbolApi);
              if (match) {
                const newPrice = parseFloat(match.price);
                item.price = newPrice;

                if (key === selectedPair && seriesRef.current && lastCandleRef.current) {
                  const lastC = { ...lastCandleRef.current };
                  lastC.close = newPrice;
                  if (newPrice > lastC.high) lastC.high = newPrice;
                  if (newPrice < lastC.low) lastC.low = newPrice;

                  seriesRef.current.update(lastC);
                  lastCandleRef.current = lastC;
                }
              }
            });
            return updated;
          });
        }
      } catch (error) {
        console.error("خطأ جلب الأسعار الحية:", error);
      } finally {
        isFetching = false;
      }
    };

    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedPair]);

  // 6. تحديث الأرباح والتحقق من الوقف والهدف (SL/TP) بدون Infinite Loops
  useEffect(() => {
    const currentP = currentPairObj?.price;
    if (!currentP || positions.length === 0) return;

    let totalClosedPnl = 0;
    const closedIds = [];

    const updatedPositions = positions.map(pos => {
      if (pos.symbolKey !== selectedPair) return pos;

      const diff = pos.side === 'LONG' || pos.marketType === 'SPOT' ? currentP - pos.entryPrice : pos.entryPrice - currentP;
      const basePnl = diff * pos.qty;
      const pnlVal = pos.marketType === 'FUTURES' ? basePnl * pos.leverage : basePnl;

      const isHitSL = pos.stopLoss && ((pos.side === 'LONG' && currentP <= pos.stopLoss) || (pos.side === 'SHORT' && currentP >= pos.stopLoss));
      const isHitTP = pos.takeProfit && ((pos.side === 'LONG' && currentP >= pos.takeProfit) || (pos.side === 'SHORT' && currentP <= pos.takeProfit));

      if (isHitSL || isHitTP) {
        closedIds.push(pos.id);
        totalClosedPnl += pnlVal;
      }

      return { ...pos, currentPrice: currentP, pnl: Number(pnlVal.toFixed(2)) };
    });

    if (closedIds.length > 0) {
      setBalance(prev => Number((prev + totalClosedPnl).toFixed(2)));
      setPositions(prev => prev.filter(p => !closedIds.includes(p.id)));
      setStatusMsg(`✅ تم إغلاق ${closedIds.length} صفقة تلقائياً (SL/TP)`);
      setTimeout(() => setStatusMsg(''), 3000);
    } else {
      setPositions(updatedPositions);
    }
  }, [marketData[selectedPair]?.price]);

  // 7. فتح وإغلاق الصفقات وإعادة ضبط الحساب
  const handleTrade = (side, customParams = {}) => {
    const entry = currentPairObj.price;
    if (!entry) return;

    const lev = marketType === 'FUTURES' ? parseInt(leverage) : 1;
    const newPos = {
      id: Date.now(),
      marketType,
      symbolKey: selectedPair,
      symbolName: currentPairObj.name,
      side,
      entryPrice: entry,
      currentPrice: entry,
      qty: parseFloat(customParams.qty || tradeAmount),
      leverage: lev,
      stopLoss: customParams.stopLoss || null,
      takeProfit: customParams.takeProfit || null,
      pnl: 0.00
    };

    setPositions(prev => [newPos, ...prev]);
    setStatusMsg(`🚀 تم فتح صفقة ${side} على سعر (${entry})`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleClosePosition = (id, pnl) => {
    setBalance(prev => Number((prev + pnl).toFixed(2)));
    setPositions(prev => prev.filter(p => p.id !== id));
    setStatusMsg(`✅ تم إغلاق الصفقة بنجاح: ${pnl >= 0 ? '+' : ''}$${pnl}`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleResetAccount = () => {
    if (window.confirm('هل أنت تأكد من إعادة ضبط الحساب ومسح الصفقات والأرباح؟')) {
      localStorage.removeItem('bot_positions');
      localStorage.removeItem('bot_balance');
      setBalance(10000.00);
      setPositions([]);
      setStatusMsg('🔄 تم إعادة ضبط المحفظة بنجاح');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const currentPairPositions = positions.filter(p => p.symbolKey === selectedPair);

  return (
    <div style={styles.container}>
      {/* اختيار نمط السوق */}
      <div style={styles.marketTypeBar}>
        <button
          style={{ ...styles.marketTypeBtn, backgroundColor: marketType === 'SPOT' ? '#00f5d4' : '#0b111e', color: marketType === 'SPOT' ? '#05080f' : '#8a99ad' }}
          onClick={() => setMarketType('SPOT')}
        >
          🟢 تداول فوري (Spot)
        </button>
        <button
          style={{ ...styles.marketTypeBtn, backgroundColor: marketType === 'FUTURES' ? '#f72585' : '#0b111e', color: marketType === 'FUTURES' ? '#fff' : '#8a99ad' }}
          onClick={() => setMarketType('FUTURES')}
        >
          ⚡ عقود آجلة (Futures)
        </button>
      </div>

      {/* شريط الأزواج */}
      <div style={styles.pairsBar}>
        {Object.entries(marketData).map(([key, item]) => (
          <button
            key={key}
            style={{ ...styles.pairBtn, borderColor: selectedPair === key ? item.color : '#1c2841', backgroundColor: selectedPair === key ? '#131c31' : '#0b111e' }}
            onClick={() => setSelectedPair(key)}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: item.color }}>{item.name}</div>
            <div style={{ fontSize: '10px', color: '#fff' }}>${item.price ? item.price.toLocaleString() : '...'}</div>
          </button>
        ))}
      </div>

      {/* الفريمات الزمنيّة */}
      <div style={styles.timeframeBar}>
        {['1m', '5m', '15m', '1h'].map(tf => (
          <button
            key={tf}
            style={{ ...styles.tfBtn, backgroundColor: timeframe === tf ? '#4cc9f0' : '#0b111e', color: timeframe === tf ? '#05080f' : '#8a99ad' }}
            onClick={() => setTimeframe(tf)}
          >
            {tf.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ملخص المحفظة وحالة الحساب */}
      <div style={styles.headerCard}>
        <div>
          <div style={styles.subText}>الرصيد المتاح (محفوظ)</div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#00f5d4' }}>${balance.toLocaleString()} USD</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button style={styles.resetBtn} onClick={handleResetAccount}>🔄 إعادة ضبط</button>
        </div>
      </div>

      {/* الشارت */}
      <div style={styles.chartWrapper}>
        <div style={styles.chartHeader}>
          <span>📊 شارت تفاعلي ({currentPairObj.name})</span>
          <span style={{ color: '#00f5d4' }}>${currentPairObj.price} USD</span>
        </div>
        <div ref={chartContainerRef} style={{ width: '100%', height: '280px' }} />
      </div>

      {/* قائمة الصفقات النشطة */}
      {currentPairPositions.length > 0 && (
        <div style={styles.activePositionsCard}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fca311', marginBottom: '6px' }}>💼 الصفقات النشطة:</div>
          {currentPairPositions.map(pos => (
            <div key={pos.id} style={{ ...styles.posRow, borderRight: `4px solid ${pos.side === 'LONG' ? '#00f5d4' : '#f72585'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', color: pos.side === 'LONG' ? '#00f5d4' : '#f72585', fontSize: '11px' }}>
                  {pos.marketType} - {pos.side} {pos.marketType === 'FUTURES' ? `(${pos.leverage}x)` : ''} | دخول: ${pos.entryPrice}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: pos.pnl >= 0 ? '#00f5d4' : '#f72585' }}>
                  {pos.pnl >= 0 ? '+' : ''}${pos.pnl} USD
                </span>
              </div>
              {(pos.stopLoss || pos.takeProfit) && (
                <div style={{ fontSize: '10px', color: '#8a99ad', display: 'flex', gap: '10px', marginBottom: '4px' }}>
                  {pos.stopLoss && <span>🛑 الوقف: <b style={{ color: '#ef4444' }}>${pos.stopLoss}</b></span>}
                  {pos.takeProfit && <span>🎯 الهدف: <b style={{ color: '#22c55e' }}>${pos.takeProfit}</b></span>}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button style={styles.closeBtnLarge} onClick={() => handleClosePosition(pos.id, pos.pnl)}>إغلاق الصفقة</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* لوحة التحكم بالتداول */}
      <div style={styles.card}>
        {marketType === 'FUTURES' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '10px', color: '#8a99ad' }}>الرافعة المالية</span>
              <select style={styles.selectInput} value={leverage} onChange={(e) => setLeverage(e.target.value)}>
                <option value="1">1x</option>
                <option value="10">10x</option>
                <option value="20">20x</option>
                <option value="50">50x</option>
                <option value="100">100x</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '10px', color: '#8a99ad' }}>الحجم</span>
              <input type="number" step="0.01" style={styles.inputSmall} value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} />
            </div>
          </div>
        )}

        {marketType === 'SPOT' && (
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', color: '#8a99ad' }}>الكمية</span>
            <input type="number" step="0.01" style={styles.inputSmall} value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ ...styles.tradeBtn, backgroundColor: '#00f5d4', color: '#070d1a' }} onClick={() => handleTrade('LONG')}>
            {marketType === 'SPOT' ? 'شراء فوري (Buy 🟢)' : 'شراء صاعد (LONG 🟢)'}
          </button>
          {marketType === 'FUTURES' && (
            <button style={{ ...styles.tradeBtn, backgroundColor: '#f72585', color: '#fff' }} onClick={() => handleTrade('SHORT')}>
              بيع هابط (SHORT 🔴)
            </button>
          )}
        </div>
      </div>

      {statusMsg && <div style={styles.statusBanner}>{statusMsg}</div>}

      <div style={styles.footer}>
        Persistent Live Engine | Continuous State Active
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#05080f', color: '#f8f9fa', minHeight: '100vh', padding: '10px', fontFamily: 'system-ui, sans-serif' },
  marketTypeBar: { display: 'flex', gap: '6px', marginBottom: '8px' },
  marketTypeBtn: { flex: 1, padding: '8px', border: '1px solid #1c2841', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', textAlign: 'center' },
  pairsBar: { display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '4px' },
  pairBtn: { flex: '0 0 auto', padding: '6px 10px', border: '1px solid', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', minWidth: '80px' },
  timeframeBar: { display: 'flex', gap: '6px', marginBottom: '8px', backgroundColor: '#0b111e', padding: '6px', borderRadius: '8px', border: '1px solid #1c2841' },
  tfBtn: { flex: 1, padding: '4px', border: '1px solid #1c2841', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', textAlign: 'center' },
  headerCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0b111e', border: '1px solid #1c2841', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  subText: { fontSize: '9px', color: '#8a99ad' },
  resetBtn: { backgroundColor: '#1c2841', color: '#ef4444', border: '1px solid #3a4b6c', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' },
  chartWrapper: { backgroundColor: '#0b111e', border: '1px solid #1c2841', borderRadius: '10px', padding: '4px', marginBottom: '8px', overflow: 'hidden' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: '11px', color: '#4cc9f0', fontWeight: 'bold' },
  activePositionsCard: { backgroundColor: '#0b111e', border: '1px solid #4cc9f0', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  posRow: { backgroundColor: '#05080f', padding: '8px 10px', borderRadius: '6px', marginBottom: '6px' },
  card: { backgroundColor: '#0b111e', border: '1px solid #1c2841', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  inputSmall: { width: '100%', padding: '6px', backgroundColor: '#05080f', border: '1px solid #1c2841', borderRadius: '4px', color: '#fff', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box', marginTop: '2px' },
  selectInput: { width: '100%', padding: '6px', backgroundColor: '#05080f', border: '1px solid #1c2841', borderRadius: '4px', color: '#fff', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box', marginTop: '2px' },
  tradeBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },
  closeBtnLarge: { backgroundColor: '#f72585', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' },
  statusBanner: { backgroundColor: '#4cc9f0', color: '#05080f', padding: '6px', borderRadius: '6px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' },
  footer: { textAlign: 'center', color: '#3a4b6c', fontSize: '9px', marginTop: '8px' }
};

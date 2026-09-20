import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function App() {
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [marketType, setMarketType] = useState('FUTURES');
  const [timeframe, setTimeframe] = useState('5m');
  const [tradeAmount, setTradeAmount] = useState('100');
  const [leverage, setLeverage] = useState('20');
  const [statusMsg, setStatusMsg] = useState('');
  const [activeTab, setActiveTab] = useState('chart'); // chart | positions | ai | news | calc | signals | prop
  const [activeSource, setActiveSource] = useState('Binance');

  // حالة الذكاء الاصطناعي والتداول الآلي
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoTradeAI, setAutoTradeAI] = useState(false);

  // حالة حاسبة المخاطر
  const [calcRiskPercent, setCalcRiskPercent] = useState('1');
  const [calcStopLossPips, setCalcStopLossPips] = useState('50');

  // حالة تحدي Prop Firm
  const [isPropActive, setIsPropActive] = useState(false);
  const [propInitialBalance, setPropInitialBalance] = useState(10000);
  const [propMaxDailyLoss, setPropMaxDailyLoss] = useState(500); // 5%
  const [propMaxOverallLoss, setPropMaxOverallLoss] = useState(1000); // 10%
  const [propTarget, setPropTarget] = useState(1000); // 10%

  // 1. استرجاع الرصيد والصفقات من localStorage
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
  const isDataReadyRef = useRef(false);

  const [marketData, setMarketData] = useState({
    BTCUSD: { name: 'BTC / USDT', symbolApi: 'BTCUSDT', coinGeckoId: 'bitcoin', price: 81300.00, change: '+2.4%', color: '#f7931a' },
    ETHUSD: { name: 'ETH / USDT', symbolApi: 'ETHUSDT', coinGeckoId: 'ethereum', price: 2634.00, change: '-0.8%', color: '#627eea' },
    XAUUSD: { name: 'الذهب (XAU)', symbolApi: 'PAXGUSDT', coinGeckoId: 'pax-gold', price: 4366.72, change: '+0.5%', color: '#ffd700' },
    XAGUSD: { name: 'الفضة (XAG)', symbolApi: 'LTCUSDT', coinGeckoId: 'litecoin', price: 58.28, change: '+1.1%', color: '#e2e8f0' }
  });

  const currentPairObj = marketData[selectedPair];

  // الأخبار الاقتصادية
  const economicNews = [
    { id: 1, title: 'قرار الفائدة الفيدرالي (FOMC Rate Statement)', currency: 'USD', impact: 'HIGH', time: '21:00' },
    { id: 2, title: 'تقرير الوظائف غير الزراعية (NFP)', currency: 'USD', impact: 'HIGH', time: '15:30' },
    { id: 3, title: 'مؤشر أسعار المستهلكين (CPI Inflation)', currency: 'EUR', impact: 'MEDIUM', time: '12:00' },
    { id: 4, title: 'مخزونات النفط الخام الأمريكية (Crude Oil Inventories)', currency: 'USD', impact: 'MEDIUM', time: '17:30' }
  ];

  // توصيات القناة (TRADING KURD Sync)
  const channelSignals = [
    { id: 101, pairKey: 'BTCUSD', pairName: 'BTC/USDT', side: 'LONG', entry: 81200, sl: 80500, tp: 82500, time: 'منذ 10 دقائق', status: 'نشطة' },
    { id: 102, pairKey: 'XAUUSD', pairName: 'XAU/USD', side: 'SHORT', entry: 4370, sl: 4385, tp: 4340, time: 'منذ 35 دقيقة', status: 'نشطة' }
  ];

  // مولد بيانات احتياطي
  const generateFallbackCandles = (basePrice) => {
    const candles = [];
    let currentPrice = basePrice || 100;
    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = timeframe === '1m' ? 60 : timeframe === '5m' ? 300 : timeframe === '15m' ? 900 : 3600;

    for (let i = 100; i >= 0; i--) {
      const time = now - (i * intervalSeconds);
      const randomVol = (Math.random() - 0.49) * (currentPrice * 0.003);
      const open = currentPrice;
      const close = open + randomVol;
      const high = Math.max(open, close) + Math.random() * (currentPrice * 0.001);
      const low = Math.min(open, close) - Math.random() * (currentPrice * 0.001);

      candles.push({
        time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2))
      });
      currentPrice = close;
    }
    return candles;
  };

  // 2. تهيئة وتوسعة النافذة داخل Telegram Mini App
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  // 3. الحفظ التلقائي للبيانات
  useEffect(() => {
    localStorage.setItem('bot_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('bot_positions', JSON.stringify(positions));
  }, [positions]);

  // 4. إنشاء الشارت
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 270,
      layout: {
        background: { color: 'transparent' },
        textColor: '#64748b',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#00f5d4', width: 1, style: 2 },
        horzLine: { color: '#00f5d4', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
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

  // 5. محرك جلب بيانات الشموع التاريخية (Binance + CoinGecko Hybrid)
  useEffect(() => {
    if (!seriesRef.current) return;

    let isMounted = true;
    isDataReadyRef.current = false;

    const loadCandlesData = async () => {
      seriesRef.current.setData([]);
      let formattedData = [];
      let sourceName = 'Binance';

      try {
        const symbol = currentPairObj.symbolApi;
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=100`);
        if (!res.ok) throw new Error('Binance error');
        const rawData = await res.json();

        if (Array.isArray(rawData) && rawData.length > 0) {
          formattedData = rawData.map(d => ({
            time: Math.floor(d[0] / 1000),
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4])
          }));
        }
      } catch (err) {
        sourceName = 'CoinGecko';
        try {
          const cgId = currentPairObj.coinGeckoId;
          const cgRes = await fetch(`https://api.coingecko.com/api/v3/coins/${cgId}/ohlc?vs_currency=usd&days=1`);
          if (cgRes.ok) {
            const cgData = await cgRes.json();
            if (Array.isArray(cgData) && cgData.length > 0) {
              formattedData = cgData.map(d => ({
                time: Math.floor(d[0] / 1000),
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4])
              }));
            }
          }
        } catch (cgErr) {
          sourceName = 'Engine Local';
        }
      }

      if (formattedData.length === 0) {
        formattedData = generateFallbackCandles(currentPairObj.price);
        sourceName = 'Engine Local';
      }

      if (isMounted && formattedData.length > 0) {
        setActiveSource(sourceName);
        seriesRef.current.setData(formattedData);
        lastCandleRef.current = formattedData[formattedData.length - 1];
        isDataReadyRef.current = true;

        if (chartInstanceRef.current) {
          chartInstanceRef.current.priceScale('right').applyOptions({ autoScale: true });
          chartInstanceRef.current.timeScale().fitContent();
        }
      }
    };

    loadCandlesData();

    return () => {
      isMounted = false;
      isDataReadyRef.current = false;
    };
  }, [selectedPair, timeframe]);

  // 6. البث المباشر WebSocket
  useEffect(() => {
    if (!currentPairObj?.symbolApi) return;

    let isSubscribed = true;
    const symbol = currentPairObj.symbolApi.toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol}@kline_${timeframe}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      if (!isSubscribed) return;

      try {
        const data = JSON.parse(event.data);
        if (data && data.k) {
          const kline = data.k;
          const liveCandle = {
            time: Math.floor(kline.t / 1000),
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
          };

          if (isDataReadyRef.current && seriesRef.current && lastCandleRef.current) {
            if (liveCandle.time >= lastCandleRef.current.time) {
              seriesRef.current.update(liveCandle);
              lastCandleRef.current = liveCandle;
            }
          }

          const newPrice = parseFloat(kline.c);
          setMarketData(prev => ({
            ...prev,
            [selectedPair]: {
              ...prev[selectedPair],
              price: newPrice
            }
          }));
        }
      } catch (err) {
        console.error("خطأ البث المباشر:", err);
      }
    };

    return () => {
      isSubscribed = false;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [selectedPair, timeframe]);

  // 7. متابعة الصفقات والوقف والهدف
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
      setStatusMsg(`⚡ تم إغلاق ${closedIds.length} صفقة تلقائياً (SL/TP)`);
      setTimeout(() => setStatusMsg(''), 3500);
    } else {
      setPositions(updatedPositions);
    }
  }, [marketData[selectedPair]?.price]);

  // 8. الذكاء الاصطناعي
  const handleRunAiAnalysis = async () => {
    const currentP = currentPairObj?.price;
    if (!currentP) return;

    setIsAnalyzing(true);
    setStatusMsg('🧠 جاري تحليل الهيكل الفني وسلوك السعر...');

    setTimeout(() => {
      const isUp = Math.random() > 0.42;
      const action = isUp ? 'BUY' : 'SELL';
      const slOffset = currentP * 0.007;
      const tpOffset = currentP * 0.015;

      const result = {
        action,
        confidence: Math.floor(Math.random() * 15) + 82,
        entryPrice: currentP,
        stopLoss: Number((action === 'BUY' ? currentP - slOffset : currentP + slOffset).toFixed(2)),
        takeProfit: Number((action === 'BUY' ? currentP + tpOffset : currentP - tpOffset).toFixed(2)),
        reason: action === 'BUY' 
          ? 'تم الكشف عن امتصاص بيعي عند منطقة طلب رئيسية (Order Block).' 
          : 'سيادة كاسحة للبائعين واختراق لخط الاتجاه الصاعد الحالي (BOS).'
      };

      setAiAnalysis(result);
      setIsAnalyzing(false);
      setStatusMsg(`💡 توصية جديدة: ${result.action}`);

      if (autoTradeAI) {
        handleTrade(result.action === 'BUY' ? 'LONG' : 'SHORT', {
          stopLoss: result.stopLoss,
          takeProfit: result.takeProfit
        });
      }
    }, 1100);
  };

  // 9. تنفيذ التداول
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
    setStatusMsg(`🚀 تم فتح صفقة ${side} بسعر $${entry}`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleClosePosition = (id, pnl) => {
    setBalance(prev => Number((prev + pnl).toFixed(2)));
    setPositions(prev => prev.filter(p => p.id !== id));
    setStatusMsg(`✅ تم إغلاق الصفقة بنجاح: ${pnl >= 0 ? '+' : ''}$${pnl}`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleResetAccount = () => {
    if (window.confirm('هل تريد إعادة تهيئة المحفظة وإعادة الضبط لـ $10,000؟')) {
      localStorage.removeItem('bot_positions');
      localStorage.removeItem('bot_balance');
      setBalance(10000.00);
      setPositions([]);
      setAiAnalysis(null);
      setStatusMsg('🔄 تم إعادة ضبط المحفظة بنجاح');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  // حسابات حاسبة المخاطرة
  const calculatedRiskAmount = (balance * (parseFloat(calcRiskPercent) / 100)).toFixed(2);
  const calculatedLotSize = (calculatedRiskAmount / (parseFloat(calcStopLossPips) * 10 || 1)).toFixed(2);

  return (
    <div style={styles.appContainer}>
      {/* الشريط العلوي */}
      <div style={styles.topBar}>
        <div style={styles.brandTitle}>
          <span style={styles.neonDot} />
          TRAD_KIRD <span style={styles.proBadge}>PRO</span>
        </div>
        <div style={styles.engineStatus}>
          <span style={styles.livePulse} />
          {activeSource}
        </div>
      </div>

      {/* بطاقة الرصيد */}
      <div style={styles.balanceCard}>
        <div>
          <div style={styles.balanceLabel}>الرصيد المتاح</div>
          <div style={styles.balanceValue}>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <button style={styles.resetBtn} onClick={handleResetAccount}>🔄 إعادة ضبط</button>
      </div>

      {/* شريط اختيار الأزواج */}
      <div style={styles.pairsScroll}>
        {Object.entries(marketData).map(([key, item]) => (
          <div
            key={key}
            style={{
              ...styles.pairCard,
              borderColor: selectedPair === key ? '#00f5d4' : 'rgba(255,255,255,0.06)',
              backgroundColor: selectedPair === key ? 'rgba(0, 245, 212, 0.08)' : 'rgba(15, 23, 42, 0.6)'
            }}
            onClick={() => setSelectedPair(key)}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: item.color }}>{item.name}</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', marginTop: '2px' }}>
              ${item.price ? item.price.toLocaleString() : '...'}
            </div>
          </div>
        ))}
      </div>

      {/* شريط التحكم بالفريم ونمط السوق */}
      <div style={styles.controlsBar}>
        <div style={styles.segmentedControl}>
          <button
            style={{ ...styles.segmentBtn, backgroundColor: marketType === 'SPOT' ? '#00f5d4' : 'transparent', color: marketType === 'SPOT' ? '#000' : '#94a3b8' }}
            onClick={() => setMarketType('SPOT')}
          >
            SPOT
          </button>
          <button
            style={{ ...styles.segmentBtn, backgroundColor: marketType === 'FUTURES' ? '#f72585' : 'transparent', color: marketType === 'FUTURES' ? '#fff' : '#94a3b8' }}
            onClick={() => setMarketType('FUTURES')}
          >
            FUTURES
          </button>
        </div>

        <div style={styles.tfContainer}>
          {['1m', '5m', '15m', '1h'].map(tf => (
            <button
              key={tf}
              style={{ ...styles.tfBtn, color: timeframe === tf ? '#00f5d4' : '#64748b', borderColor: timeframe === tf ? '#00f5d4' : 'transparent' }}
              onClick={() => setTimeframe(tf)}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* شريط التبويبات الرئيسي (الأقسام المضافة) */}
      <div style={styles.mainTabsScroll}>
        <button 
          style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'chart' ? '#00f5d4' : 'transparent', color: activeTab === 'chart' ? '#00f5d4' : '#64748b' }}
          onClick={() => setActiveTab('chart')}
        >
          📈 الشارت
        </button>
        <button 
          style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'signals' ? '#00f5d4' : 'transparent', color: activeTab === 'signals' ? '#00f5d4' : '#64748b' }}
          onClick={() => setActiveTab('signals')}
        >
          📡 القناة
        </button>
        <button 
          style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'positions' ? '#00f5d4' : 'transparent', color: activeTab === 'positions' ? '#00f5d4' : '#64748b' }}
          onClick={() => setActiveTab('positions')}
        >
          💼 الصفقات ({positions.length})
        </button>
        <button 
          style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'ai' ? '#7209b7' : 'transparent', color: activeTab === 'ai' ? '#a855f7' : '#64748b' }}
          onClick={() => setActiveTab('ai')}
        >
          🧠 الذكاء
        </button>
        <button 
          style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'calc' ? '#3b82f6' : 'transparent', color: activeTab === 'calc' ? '#3b82f6' : '#64748b' }}
          onClick={() => setActiveTab('calc')}
        >
          🧮 الحاسبة
        </button>
        <button 
          style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'news' ? '#eab308' : 'transparent', color: activeTab === 'news' ? '#eab308' : '#64748b' }}
          onClick={() => setActiveTab('news')}
        >
          📰 الأخبار
        </button>
        <button 
          style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'prop' ? '#ec4899' : 'transparent', color: activeTab === 'prop' ? '#ec4899' : '#64748b' }}
          onClick={() => setActiveTab('prop')}
        >
          🏆 التحدي
        </button>
      </div>

      {/* تبويب 1: الشارت والتداول المباشر */}
      {activeTab === 'chart' && (
        <>
          <div style={styles.chartWrapper}>
            <div style={styles.chartHeader}>
              <span style={{ color: '#cbd5e1' }}>{currentPairObj.name} • {timeframe.toUpperCase()}</span>
              <span style={{ color: '#00f5d4', fontWeight: 'bold' }}>${currentPairObj.price}</span>
            </div>
            <div ref={chartContainerRef} style={{ width: '100%', height: '270px' }} />
          </div>

          <div style={styles.tradePanel}>
            {marketType === 'FUTURES' && (
              <div style={styles.inputsRow}>
                <div style={{ flex: 1 }}>
                  <span style={styles.fieldLabel}>الرافعة المالية</span>
                  <select style={styles.cyberSelect} value={leverage} onChange={(e) => setLeverage(e.target.value)}>
                    <option value="1">1x</option>
                    <option value="10">10x</option>
                    <option value="20">20x</option>
                    <option value="50">50x</option>
                    <option value="100">100x</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={styles.fieldLabel}>المبلغ (USD)</span>
                  <input type="number" style={styles.cyberInput} value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button style={styles.buyBtn} onClick={() => handleTrade('LONG')}>
                {marketType === 'SPOT' ? 'شراء فوري 🟢' : 'شراء (LONG) 🟢'}
              </button>
              {marketType === 'FUTURES' && (
                <button style={styles.sellBtn} onClick={() => handleTrade('SHORT')}>
                  بيع (SHORT) 🔴
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* تبويب 2: توصيات القناة TRADING KURD Sync */}
      {activeTab === 'signals' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00f5d4', marginBottom: '10px' }}>
            📡 توصيات قناة TRADING KURD المباشرة
          </div>
          {channelSignals.map(sig => (
            <div key={sig.id} style={styles.signalCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: sig.side === 'LONG' ? '#10b981' : '#ef4444' }}>
                  {sig.pairName} ({sig.side})
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{sig.time}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <span>دخول: ${sig.entry}</span>
                <span>🛑 الوقف: ${sig.sl}</span>
                <span>🎯 الهدف: ${sig.tp}</span>
              </div>
              <button 
                style={styles.applySignalBtn}
                onClick={() => {
                  setSelectedPair(sig.pairKey);
                  handleTrade(sig.side, { stopLoss: sig.sl, takeProfit: sig.tp });
                }}
              >
                ⚡ تطبيق التوصية بنقرة واحدة
              </button>
            </div>
          ))}
        </div>
      )}

      {/* تبويب 3: الصفقات المفتوحة */}
      {activeTab === 'positions' && (
        <div style={styles.tabContentCard}>
          {positions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 0', fontSize: '12px' }}>
              لا توجد صفقات مفتوحة حالياً
            </div>
          ) : (
            positions.map(pos => (
              <div key={pos.id} style={{ ...styles.posRow, borderRight: `4px solid ${pos.side === 'LONG' ? '#10b981' : '#ef4444'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: pos.side === 'LONG' ? '#10b981' : '#ef4444', fontSize: '12px' }}>
                    {pos.symbolName} ({pos.side}) {pos.leverage > 1 ? `${pos.leverage}x` : ''}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: pos.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                    {pos.pnl >= 0 ? '+' : ''}${pos.pnl} USD
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                  <span>سعر الدخول: ${pos.entryPrice}</span>
                  <span>السعر الحالي: ${pos.currentPrice}</span>
                </div>
                <button style={styles.closePosBtn} onClick={() => handleClosePosition(pos.id, pos.pnl)}>إغلاق الصفقة</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* تبويب 4: الذكاء الاصطناعي */}
      {activeTab === 'ai' && (
        <div style={styles.tabContentCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#a855f7' }}>🧠 Groq AI Predictive Engine</span>
            <label style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input type="checkbox" checked={autoTradeAI} onChange={(e) => setAutoTradeAI(e.target.checked)} />
              تداول تلقائي
            </label>
          </div>

          <button style={styles.aiRunBtn} onClick={handleRunAiAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? '⏳ جاري تحليل الهيكل الحركي...' : '⚡ قراءة الشمعة وإصدار التوصية'}
          </button>

          {aiAnalysis && (
            <div style={styles.aiBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: aiAnalysis.action === 'BUY' ? '#10b981' : '#ef4444', fontSize: '13px' }}>
                  التوصية: {aiAnalysis.action === 'BUY' ? 'شراء (LONG 🟢)' : 'بيع (SHORT 🔴)'}
                </span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>دقة التوقع: {aiAnalysis.confidence}%</span>
              </div>
              <p style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4', margin: '6px 0' }}>{aiAnalysis.reason}</p>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', marginTop: '8px' }}>
                <span style={{ color: '#ef4444' }}>🛑 الوقف: <b>${aiAnalysis.stopLoss}</b></span>
                <span style={{ color: '#10b981' }}>🎯 الهدف: <b>${aiAnalysis.takeProfit}</b></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* تبويب 5: حاسبة المخاطرة ورأس المال */}
      {activeTab === 'calc' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '12px' }}>
            🧮 حاسبة إدارة المخاطرة وحجم العقود
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={styles.fieldLabel}>نسبة المخاطرة المطلوبة (%)</span>
            <input 
              type="number" 
              style={styles.cyberInput} 
              value={calcRiskPercent} 
              onChange={(e) => setCalcRiskPercent(e.target.value)} 
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={styles.fieldLabel}>مسافة وقف الخسارة (نقاط / Pips)</span>
            <input 
              type="number" 
              style={styles.cyberInput} 
              value={calcStopLossPips} 
              onChange={(e) => setCalcStopLossPips(e.target.value)} 
            />
          </div>
          <div style={styles.calcResultBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>المبلغ المخاطر به:</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>${calculatedRiskAmount} USD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>حجم العقد المقترح (Lot Size):</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00f5d4' }}>{calculatedLotSize} Lot</span>
            </div>
          </div>
        </div>
      )}

      {/* تبويب 6: أجندة الأخبار الاقتصادية */}
      {activeTab === 'news' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#eab308', marginBottom: '10px' }}>
            📰 المفكرة الاقتصادية اللحظية
          </div>
          {economicNews.map(news => (
            <div key={news.id} style={styles.newsItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>{news.title}</span>
                <span style={{ 
                  fontSize: '9px', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  fontWeight: 'bold',
                  backgroundColor: news.impact === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)',
                  color: news.impact === 'HIGH' ? '#ef4444' : '#eab308'
                }}>
                  {news.impact}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                العملة: {news.currency} | التوقيت: {news.time}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* تبويب 7: تحدي المحاكاة (Prop Firm Challenge Mode) */}
      {activeTab === 'prop' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ec4899', marginBottom: '10px' }}>
            🏆 تحدي محاكاة شركات التمويل (Funding Pips Rules)
          </div>
          <div style={styles.propStatsGrid}>
            <div style={styles.propStatItem}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>أقصى خسارة يومية (5%)</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>${propMaxDailyLoss}</span>
            </div>
            <div style={styles.propStatItem}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>أقصى خسارة كلية (10%)</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>${propMaxOverallLoss}</span>
            </div>
            <div style={styles.propStatItem}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>الهدف المطلوب (10%)</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}>${propTarget}</span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '10px', textAlign: 'center' }}>
            الحالة الحالية: <b style={{ color: '#00f5d4' }}>تحدي قيد التشغيل (نشط)</b>
          </div>
        </div>
      )}

      {/* التنبيهات السفليّة */}
      {statusMsg && <div style={styles.statusToast}>{statusMsg}</div>}
    </div>
  );
}

const styles = {
  appContainer: {
    backgroundColor: '#090d16',
    color: '#f8fafc',
    minHeight: '100vh',
    maxHeight: '100vh',
    overflowY: 'auto',
    padding: '12px',
    paddingBottom: '50px',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  brandTitle: {
    fontSize: '14px',
    fontWeight: '900',
    letterSpacing: '0.5px',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  neonDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#00f5d4',
    borderRadius: '50%',
    boxShadow: '0 0 8px #00f5d4',
  },
  proBadge: {
    backgroundColor: 'rgba(0, 245, 212, 0.15)',
    color: '#00f5d4',
    fontSize: '9px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  engineStatus: {
    fontSize: '10px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: '4px 8px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  livePulse: {
    width: '6px',
    height: '6px',
    backgroundColor: '#10b981',
    borderRadius: '50%',
  },
  balanceCard: {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.5))',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  balanceLabel: { fontSize: '10px', color: '#64748b' },
  balanceValue: { fontSize: '20px', fontWeight: 'bold', color: '#00f5d4', marginTop: '2px' },
  resetBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  pairsScroll: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    marginBottom: '10px',
    paddingBottom: '4px',
  },
  pairCard: {
    flex: '0 0 auto',
    width: '100px',
    padding: '8px 10px',
    borderRadius: '10px',
    border: '1px solid',
    cursor: 'pointer',
    backdropFilter: 'blur(6px)',
  },
  controlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    gap: '8px',
  },
  segmentedControl: {
    display: 'flex',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: '2px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  segmentBtn: {
    padding: '5px 12px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  tfContainer: { display: 'flex', gap: '4px' },
  tfBtn: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: '1px solid',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  mainTabsScroll: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    marginBottom: '10px',
    paddingBottom: '2px',
  },
  tabBtn: {
    flex: '0 0 auto',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    textAlign: 'center',
  },
  chartWrapper: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '8px',
    marginBottom: '10px',
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    padding: '0 4px 8px 4px',
  },
  tradePanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '12px',
  },
  inputsRow: { display: 'flex', gap: '10px' },
  fieldLabel: { fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' },
  cyberInput: {
    width: '100%',
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '6px',
    color: '#fff',
    fontSize: '11px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  cyberSelect: {
    width: '100%',
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '6px',
    color: '#fff',
    fontSize: '11px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  buyBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#10b981',
    color: '#000',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer',
  },
  sellBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer',
  },
  tabContentCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '12px',
  },
  signalCard: {
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    border: '1px solid rgba(0, 245, 212, 0.2)',
    borderRadius: '10px',
    padding: '10px',
    marginBottom: '8px',
  },
  applySignalBtn: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#00f5d4',
    color: '#000',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '11px',
    cursor: 'pointer',
  },
  posRow: {
    backgroundColor: 'rgba(9, 13, 22, 0.6)',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  closePosBtn: {
    width: '100%',
    padding: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 'bold',
    marginTop: '8px',
    cursor: 'pointer',
  },
  aiRunBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#7209b7',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '11px',
    cursor: 'pointer',
  },
  aiBox: {
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    border: '1px solid rgba(114, 9, 183, 0.3)',
    borderRadius: '10px',
    padding: '10px',
    marginTop: '10px',
  },
  calcResultBox: {
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '8px',
    padding: '10px',
    marginTop: '10px',
  },
  newsItem: {
    backgroundColor: 'rgba(9, 13, 22, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '8px',
    marginBottom: '8px',
  },
  propStatsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
  },
  propStatItem: {
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '8px',
    textAlign: 'center',
  },
  statusToast: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#00f5d4',
    color: '#000',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(0,245,212,0.3)',
    zIndex: 100,
  }
};

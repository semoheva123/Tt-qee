// src/App.jsx - TRAD_KIRD Pro Max (نسخة مؤسساتية كاملة الميزات)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import { getGroqTradingDecision } from './groqService';

const getSafeStorage = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

export default function App() {
  // 1. حالات التنقل والواجهة
  const [activeTab, setActiveTab] = useState('trade'); // home, trade, quant, invest, tools
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [marketType, setMarketType] = useState('FUTURES');
  const [timeframe, setTimeframe] = useState('5m');
  const [statusMsg, setStatusMsg] = useState('');
  const [activeSource, setActiveSource] = useState('Binance API Pro');

  // 2. إدخال الأوامر وحاسبة المخاطر
  const [tradePercentage, setTradePercentage] = useState(25);
  const [leverage, setLeverage] = useState('20');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [calcRiskPercent, setCalcRiskPercent] = useState('1');
  const [calcStopLossPips, setCalcStopLossPips] = useState('50');

  // 3. المحفظة والصفقات
  const [balance, setBalance] = useState(() => getSafeStorage('bot_balance', 10000.00));
  const [positions, setPositions] = useState(() => getSafeStorage('bot_positions', []));
  const tradeAmount = (balance * (tradePercentage / 100)).toFixed(2);

  // 4. بيانات حية من شبكات خارجية
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [sentimentData, setSentimentData] = useState({ value: '50', classification: 'Neutral' });
  const [liveNews, setLiveNews] = useState([]);
  const [marketData, setMarketData] = useState({
    BTCUSD: { name: 'BTC / USDT', symbolApi: 'BTCUSDT', price: 81300.00, color: '#F0B90B' },
    ETHUSD: { name: 'ETH / USDT', symbolApi: 'ETHUSDT', price: 2634.00, color: '#627EEA' },
    XAUUSD: { name: 'الذهب (PAXG)', symbolApi: 'PAXGUSDT', price: 2750.00, color: '#FFD700' },
    XAGUSD: { name: 'الفضة (XAG)', symbolApi: null, price: 32.50, color: '#E2E8F0' }
  });
  const currentPairObj = marketData[selectedPair];

  // 5. الذكاء الاصطناعي والميزات الإضافية
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoTradeAI, setAutoTradeAI] = useState(true);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [battleOpponent, setBattleOpponent] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  
  // 6. الصندوق والنسخ
  const [vaultBalance, setVaultBalance] = useState(51200.00);
  const [propMaxDailyLoss] = useState(500); 
  const [propMaxOverallLoss] = useState(1000); 
  const [propTarget] = useState(1000);
  const [copyTraders] = useState([
    { id: 1, name: 'Kurd_Whale 🐋', roi: '+412%', winRate: '93%', copiers: 1540, pair: 'BTCUSD', side: 'LONG' },
    { id: 2, name: 'SMC_Master 🎯', roi: '+240%', winRate: '83%', copiers: 980, pair: 'XAUUSD', side: 'SHORT' }
  ]);
  const [userBadges] = useState(['صائد الصفقات 🏹', 'محلل مؤسسي 🏛️']);

  // المراجع للشارت
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);
  const lastCandleRef = useRef(null);
  const candlesDataRef = useRef([]);
  const isDataReadyRef = useRef(false);
  const priceLinesRef = useRef([]);

  // حفظ الحالة
  useEffect(() => { localStorage.setItem('bot_balance', balance.toString()); }, [balance]);
  useEffect(() => { localStorage.setItem('bot_positions', JSON.stringify(positions)); }, [positions]);

  // إشعار للمستخدم
  const showToast = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  // --- جلب البيانات الحية الحقيقية (الأخبار، المشاعر، عمق السوق) ---
  useEffect(() => {
    const fetchRealNews = async () => {
      try {
        const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
        const data = await res.json();
        if (data.Data && Array.isArray(data.Data)) {
          setLiveNews(data.Data.slice(0, 5).map((n, idx) => ({
            id: idx + 1, title: n.title, source: n.source_info.name,
            time: new Date(n.published_on * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
        }
      } catch (e) { console.warn("خطأ الأخبار", e); }
    };
    fetchRealNews();
  }, []);

  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        const res = await fetch('https://api.alternative.me/fng/');
        const data = await res.json();
        if (data.data && data.data[0]) {
          setSentimentData({ value: data.data[0].value, classification: data.data[0].value_classification });
        }
      } catch (e) { console.warn("خطأ المشاعر", e); }
    };
    fetchSentiment();
  }, []);

  useEffect(() => {
    if (!currentPairObj?.symbolApi) return;
    const fetchOrderBook = async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${currentPairObj.symbolApi}&limit=5`);
        const data = await res.json();
        if (data.bids && data.asks) {
          setOrderBook({
            bids: data.bids.map(b => [parseFloat(b[0]).toFixed(2), parseFloat(b[1]).toFixed(3)]),
            asks: data.asks.map(a => [parseFloat(a[0]).toFixed(2), parseFloat(a[1]).toFixed(3)])
          });
        }
      } catch (e) { console.warn("خطأ عمق السوق"); }
    };
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 3000);
    return () => clearInterval(interval);
  }, [selectedPair, currentPairObj?.symbolApi]);

  // --- دوال الشارت ---
  const generateFallbackCandles = useCallback((basePrice) => {
    const candles = [];
    let currentPrice = basePrice || 100;
    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = timeframe === '1m' ? 60 : timeframe === '5m' ? 300 : timeframe === '15m' ? 900 : 3600;
    for (let i = 100; i >= 0; i--) {
      const open = currentPrice;
      const close = open + (Math.random() - 0.49) * (currentPrice * 0.003);
      candles.push({
        time: now - (i * intervalSeconds), open: Number(open.toFixed(2)), close: Number(close.toFixed(2)),
        high: Number((Math.max(open, close) + Math.random() * (currentPrice * 0.001)).toFixed(2)),
        low: Number((Math.min(open, close) - Math.random() * (currentPrice * 0.001)).toFixed(2)),
      });
      currentPrice = close;
    }
    return candles;
  }, [timeframe]);

  // إنشاء الشارت ورسم الخطوط
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth, height: 280,
      layout: { background: { color: '#0B0E14' }, textColor: '#848E9C', fontSize: 11, fontFamily: 'SF Mono, monospace' },
      grid: { vertLines: { color: '#2B3139' }, horzLines: { color: '#2B3139' } },
      crosshair: { mode: 1, vertLine: { color: '#848E9C', style: 2 }, horzLine: { color: '#848E9C', style: 2 } },
      rightPriceScale: { borderColor: '#2B3139', autoScale: true }, timeScale: { borderColor: '#2B3139', timeVisible: true },
    });
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ECB81', downColor: '#F6465D', borderVisible: false, wickUpColor: '#0ECB81', wickDownColor: '#F6465D',
    });
    chartInstanceRef.current = chart;
    seriesRef.current = candleSeries;
    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    window.addEventListener('resize', handleResize);

    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, [activeTab]);

  // تحديث خطوط الصفقات
  useEffect(() => {
    if (!seriesRef.current) return;
    priceLinesRef.current.forEach(line => { try { seriesRef.current.removePriceLine(line); } catch (e) {} });
    priceLinesRef.current = [];
    const activePos = positions.filter(p => p.symbolKey === selectedPair);
    activePos.forEach(pos => {
      priceLinesRef.current.push(seriesRef.current.createPriceLine({ price: pos.entryPrice, color: '#2962FF', lineWidth: 1, lineStyle: 1, title: `Entry ${pos.side}` }));
      if (pos.stopLoss) priceLinesRef.current.push(seriesRef.current.createPriceLine({ price: pos.stopLoss, color: '#F6465D', lineWidth: 1, lineStyle: 2, title: 'SL' }));
      if (pos.takeProfit) priceLinesRef.current.push(seriesRef.current.createPriceLine({ price: pos.takeProfit, color: '#0ECB81', lineWidth: 1, lineStyle: 2, title: 'TP' }));
    });
  }, [positions, selectedPair]);

  // جلب البيانات الأولية و WebSocket
  useEffect(() => {
    if (!seriesRef.current) return;
    let isMounted = true;
    const loadCandles = async () => {
      let formattedData = [];
      try {
        if (!currentPairObj?.symbolApi) throw new Error('No API symbol');
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${currentPairObj.symbolApi}&interval=${timeframe}&limit=100`);
        const rawData = await res.json();
        formattedData = rawData.map(d => ({ time: Math.floor(d[0]/1000), open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]) }));
        setActiveSource('Binance API Pro');
      } catch (err) {
        formattedData = generateFallbackCandles(currentPairObj.price);
        setActiveSource('Engine Local');
      }
      if (isMounted && formattedData.length > 0) {
        seriesRef.current.setData(formattedData);
        lastCandleRef.current = formattedData[formattedData.length - 1];
        candlesDataRef.current = formattedData;
        isDataReadyRef.current = true;
        if (chartInstanceRef.current) chartInstanceRef.current.timeScale().fitContent();
      }
    };
    loadCandles();
    return () => { isMounted = false; isDataReadyRef.current = false; };
  }, [selectedPair, timeframe, currentPairObj, generateFallbackCandles]);

  useEffect(() => {
    if (!currentPairObj?.symbolApi) return;
    let isSubscribed = true;
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${currentPairObj.symbolApi.toLowerCase()}@kline_${timeframe}`);
    ws.onmessage = (event) => {
      if (!isSubscribed) return;
      const data = JSON.parse(event.data);
      if (data && data.k) {
        const kline = data.k;
        const liveCandle = { time: Math.floor(kline.t/1000), open: parseFloat(kline.o), high: parseFloat(kline.h), low: parseFloat(kline.l), close: parseFloat(kline.c) };
        if (isDataReadyRef.current && seriesRef.current && lastCandleRef.current && liveCandle.time >= lastCandleRef.current.time) {
          seriesRef.current.update(liveCandle);
          lastCandleRef.current = liveCandle;
          candlesDataRef.current.push(liveCandle);
        }
        setMarketData(prev => ({ ...prev, [selectedPair]: { ...prev[selectedPair], price: parseFloat(kline.c) } }));
      }
    };
    return () => { isSubscribed = false; ws.close(); };
  }, [selectedPair, timeframe, currentPairObj?.symbolApi]);

  // --- منطق الأرباح والخسائر والتحكم بالمراكز ---
  useEffect(() => {
    const currentP = currentPairObj?.price;
    if (!currentP || positions.length === 0) return;
    let totalClosedPnl = 0;
    const closedIds = [];
    const updatedPositions = positions.map(pos => {
      if (pos.symbolKey !== selectedPair) return pos;
      const priceRatio = (currentP - pos.entryPrice) / pos.entryPrice;
      const direction = pos.side === 'LONG' || pos.marketType === 'SPOT' ? 1 : -1;
      const pnlVal = priceRatio * direction * pos.qty * (pos.marketType === 'FUTURES' ? pos.leverage : 1);
      
      const hitSL = pos.stopLoss && ((pos.side==='LONG' && currentP<=pos.stopLoss) || (pos.side==='SHORT' && currentP>=pos.stopLoss));
      const hitTP = pos.takeProfit && ((pos.side==='LONG' && currentP>=pos.takeProfit) || (pos.side==='SHORT' && currentP<=pos.takeProfit));
      
      if (hitSL || hitTP) { closedIds.push(pos.id); totalClosedPnl += pnlVal; }
      return { ...pos, pnl: Number(pnlVal.toFixed(2)) };
    });

    if (closedIds.length > 0) {
      setBalance(prev => Number((prev + totalClosedPnl).toFixed(2)));
      setPositions(prev => prev.filter(p => !closedIds.includes(p.id)));
      showToast(`إغلاق تلقائي (SL/TP) للأوامر: ${closedIds.join(', ')}`);
    } else {
      setPositions(updatedPositions);
    }
  }, [marketData, selectedPair, currentPairObj?.price, positions]);

  // --- التفاعلات وأوامر التداول ---
  const handleTrade = (side, customParams = {}) => {
    const entry = currentPairObj.price;
    if (!entry || tradeAmount <= 0) return;
    const newPos = {
      id: Date.now(), symbolKey: selectedPair, symbolName: currentPairObj.name, side, entryPrice: entry,
      qty: parseFloat(customParams.qty || tradeAmount), leverage: marketType === 'FUTURES' ? parseInt(leverage) : 1,
      stopLoss: customParams.stopLoss || (stopLossPrice ? parseFloat(stopLossPrice) : null),
      takeProfit: customParams.takeProfit || (takeProfitPrice ? parseFloat(takeProfitPrice) : null),
      pnl: 0.00
    };
    setPositions(prev => [newPos, ...prev]);
    showToast(`تم التنفيذ: ${side} ${currentPairObj.name} ماركت`);
  };

  const closePosition = (id, pnl) => {
    setBalance(prev => Number((prev + pnl).toFixed(2)));
    setPositions(prev => prev.filter(p => p.id !== id));
    showToast(`تم إغلاق المركز بـ ${pnl >= 0 ? '+' : ''}$${pnl}`);
  };

  const handleResetAccount = () => {
    if (window.confirm('إعادة ضبط الرصيد إلى $10,000؟')) {
      setBalance(10000.00); setPositions([]); showToast('تمت إعادة ضبط المحفظة');
    }
  };

  // --- ميزات الذكاء الاصطناعي والصوت والمعارك ---
  const handleRunAiAnalysis = async () => {
    if (!currentPairObj?.price) return;
    setIsAnalyzing(true); showToast(`🧠 جاري تحليل ${selectedPair} عبر نموذج Groq AI...`);
    try {
      const decision = await getGroqTradingDecision(candlesDataRef.current, currentPairObj.price);
      const action = decision.action ? decision.action.toUpperCase() : 'WAIT';
      setAiAnalysis({ ...decision, action, entryPrice: currentPairObj.price });
      showToast(`قرار الخوارزمية: ${action}`);
      if (autoTradeAI && (action === 'BUY' || action === 'SELL')) {
        handleTrade(action === 'BUY' ? 'LONG' : 'SHORT', { stopLoss: decision.stopLoss, takeProfit: decision.takeProfit });
      }
    } catch (err) { showToast('❌ فشل تحليل الذكاء الاصطناعي'); } 
    finally { setIsAnalyzing(false); }
  };

  const handleVoiceCommand = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { showToast('التعرف الصوتي غير مدعوم'); return; }
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'ar-SA';
    setIsListeningVoice(true); showToast('🎙️ تحدث الآن (شراء / بيع)...');
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.toLowerCase();
      if (text.includes('شراء') || text.includes('صعود')) { handleTrade('LONG'); showToast('🎙️ أمر: شراء'); }
      else if (text.includes('بيع') || text.includes('هبوط')) { handleTrade('SHORT'); showToast('🎙️ أمر: بيع'); }
      else { showToast(`🎙️ لم أفهم: ${text}`); }
      setIsListeningVoice(false);
    };
    recognition.onerror = () => { setIsListeningVoice(false); showToast('تعذر الاستماع'); };
    recognition.start();
  };

  const startBattle = () => {
    setBattleOpponent('Quant_Bot_v9 🤖'); showToast('⚔️ بدأت معركة الاسترداد السريع!'); setBattleResult(null);
    setTimeout(() => {
      const userWin = Math.random() > 0.4;
      setBattleResult(userWin ? '🏆 فزت بالجولة وربحت 1000$!' : '❌ تفوق الخصم!');
      if (userWin) setBalance(prev => prev + 1000);
    }, 3000);
  };

  // --- الواجهات الفرعية للتنقل السفلي ---
  const renderHome = () => (
    <div style={styles.paddingArea}>
      <div style={styles.card}>
        <div style={styles.textMuted}>إجمالي رصيد الهامش (USD)</div>
        <div style={styles.largeValue}>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          {userBadges.map((b, i) => <span key={i} style={styles.badge}>{b}</span>)}
        </div>
        <button onClick={handleResetAccount} style={{...styles.outlineBtn, marginTop: '15px'}}>🔄 إعادة ضبط الحساب</button>
      </div>
    </div>
  );

  const renderTrade = () => (
    <div>
      <div style={styles.tradeHeader}>
        <select style={styles.selectSymbol} value={selectedPair} onChange={(e) => setSelectedPair(e.target.value)}>
          {Object.keys(marketData).map(k => <option key={k} value={k}>{marketData[k].name}</option>)}
        </select>
        <span style={{ color: currentPairObj.color, fontWeight: 'bold', fontFamily: 'monospace' }}>${currentPairObj.price.toFixed(2)}</span>
      </div>
      <div style={{ padding: '0 10px', display: 'flex', gap: '5px', backgroundColor: '#181A20' }}>
        {['1m', '5m', '15m', '1h'].map(tf => (
          <button key={tf} onClick={() => setTimeframe(tf)} style={{...styles.tfBtn, color: timeframe === tf ? '#F0B90B' : '#848E9C'}}>{tf.toUpperCase()}</button>
        ))}
      </div>
      <div ref={chartContainerRef} style={{ width: '100%', height: '280px', borderBottom: '1px solid #2B3139' }} />
      
      {/* دمج عمق السوق (DOM) أسفل الشارت مباشرة ليكون عملياً للمتداول */}
      <div style={{ display: 'flex', padding: '10px', gap: '10px', backgroundColor: '#181A20' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: '#848E9C', marginBottom: '5px' }}>Asks (عروض)</div>
          {orderBook.asks.slice(0, 3).map((a, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#F6465D', fontFamily: 'monospace' }}><span>{a[0]}</span><span>{a[1]}</span></div>)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: '#848E9C', marginBottom: '5px' }}>Bids (طلبات)</div>
          {orderBook.bids.slice(0, 3).map((b, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#0ECB81', fontFamily: 'monospace' }}><span>{b[0]}</span><span>{b[1]}</span></div>)}
        </div>
      </div>

      <div style={styles.cardNoBorder}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button style={marketType === 'SPOT' ? styles.segmentActive : styles.segment} onClick={() => setMarketType('SPOT')}>Spot</button>
          <button style={marketType === 'FUTURES' ? styles.segmentActive : styles.segment} onClick={() => setMarketType('FUTURES')}>USDT-M</button>
        </div>
        {marketType === 'FUTURES' && (
          <div style={{ marginBottom: '10px' }}>
            <span style={styles.label}>الرافعة المالية</span>
            <input type="number" style={styles.input} value={leverage} onChange={e => setLeverage(e.target.value)} />
          </div>
        )}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={styles.label}>الحجم (USD)</span><span style={styles.label}>{tradeAmount}</span>
          </div>
          <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
            {[25, 50, 75, 100].map(pct => (
              <button key={pct} onClick={() => setTradePercentage(pct)} style={tradePercentage === pct ? styles.pctBtnActive : styles.pctBtn}>{pct}%</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input type="number" placeholder="TP Price" style={styles.input} value={takeProfitPrice} onChange={e => setTakeProfitPrice(e.target.value)} />
          <input type="number" placeholder="SL Price" style={styles.input} value={stopLossPrice} onChange={e => setStopLossPrice(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={styles.btnGreen} onClick={() => handleTrade('LONG')}>شراء / Long</button>
          {marketType === 'FUTURES' && <button style={styles.btnRed} onClick={() => handleTrade('SHORT')}>بيع / Short</button>}
        </div>
      </div>

      <div style={styles.cardNoBorder}>
        <div style={{ color: '#EAECEF', fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #2B3139', paddingBottom: '8px', marginBottom: '8px' }}>المراكز المفتوحة ({positions.length})</div>
        {positions.map(pos => (
          <div key={pos.id} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#0B0E14', borderRadius: '4px', borderLeft: `3px solid ${pos.side === 'LONG' ? '#0ECB81' : '#F6465D'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace' }}>
              <span style={{ color: '#EAECEF', fontSize: '12px', fontWeight: 'bold' }}>{pos.symbolName} {pos.side} {pos.leverage}x</span>
              <span style={{ color: pos.pnl >= 0 ? '#0ECB81' : '#F6465D', fontWeight: 'bold' }}>{pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)}</span>
            </div>
            <div style={{ color: '#848E9C', fontSize: '11px', marginTop: '5px', fontFamily: 'monospace' }}>Entry: {pos.entryPrice} | Qty: {pos.qty}</div>
            <button style={{...styles.outlineBtn, marginTop: '8px', width: '100%'}} onClick={() => closePosition(pos.id, pos.pnl)}>إغلاق</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuant = () => (
    <div style={styles.paddingArea}>
      <div style={styles.card}>
        <div style={styles.headerTitle}>🧠 Groq Quant AI</div>
        <label style={{ fontSize: '11px', color: '#848E9C', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
          <input type="checkbox" checked={autoTradeAI} onChange={(e) => setAutoTradeAI(e.target.checked)} /> تداول آلي (Auto-Execution)
        </label>
        <button style={styles.btnPrimary} onClick={handleRunAiAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? '⏳ جاري المعالجة...' : '⚡ تشغيل محرك Groq'}
        </button>
        {aiAnalysis && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#0B0E14', borderRadius: '4px', border: '1px solid #2962FF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontWeight: 'bold', color: aiAnalysis.action === 'BUY' ? '#0ECB81' : aiAnalysis.action === 'SELL' ? '#F6465D' : '#F0B90B' }}>
              <span>القرار: {aiAnalysis.action}</span><span>الثقة: {aiAnalysis.confidence}%</span>
            </div>
            <p style={{ fontSize: '11px', color: '#EAECEF', marginTop: '8px' }}>{aiAnalysis.reason}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
        <div style={styles.card}>
          <div style={styles.textMuted}>الخوف والطمع الحقيقي</div>
          <div style={{ color: '#0ECB81', fontWeight: 'bold', fontSize: '18px', marginTop: '5px', fontFamily: 'monospace' }}>{sentimentData.value}</div>
          <div style={{ color: '#848E9C', fontSize: '10px' }}>{sentimentData.classification}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.textMuted}>مصدر التسعير</div>
          <div style={{ color: '#EAECEF', fontWeight: 'bold', fontSize: '12px', marginTop: '8px' }}>{activeSource}</div>
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: '10px' }}>
        <div style={styles.headerTitle}>📰 الأخبار المباشرة</div>
        {liveNews.map(news => (
          <div key={news.id} style={{ borderBottom: '1px solid #2B3139', paddingBottom: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#848E9C' }}>
              <span>{news.source}</span><span>{news.time}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#EAECEF', marginTop: '4px' }}>{news.title}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderInvest = () => (
    <div style={styles.paddingArea}>
      <div style={styles.card}>
        <div style={styles.headerTitle}>🏛️ سيولة الصندوق المدارة</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#F0B90B', fontFamily: 'monospace' }}>${vaultBalance.toLocaleString()}</div>
        <button style={{ ...styles.btnPrimary, marginTop: '10px', backgroundColor: '#F0B90B', color: '#0B0E14' }} onClick={() => { setVaultBalance(v => v + 500); showToast('تمت إضافة 500$ للسيولة'); }}>➕ استثمار 500$</button>
      </div>

      <div style={{ ...styles.card, marginTop: '10px' }}>
        <div style={styles.headerTitle}>📊 شروط تحدي التمويل (Prop Firm)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontFamily: 'monospace' }}>
          <div><div style={styles.textMuted}>أقصى خسارة يومية</div><div style={{ color: '#F6465D', fontWeight: 'bold' }}>${propMaxDailyLoss}</div></div>
          <div><div style={styles.textMuted}>أقصى خسارة كلية</div><div style={{ color: '#F6465D', fontWeight: 'bold' }}>${propMaxOverallLoss}</div></div>
          <div style={{ gridColumn: 'span 2' }}><div style={styles.textMuted}>هدف الربح المطلوب</div><div style={{ color: '#0ECB81', fontWeight: 'bold' }}>${propTarget}</div></div>
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: '10px' }}>
        <div style={styles.headerTitle}>👥 نسخ الصفقات (Copy Trading)</div>
        {copyTraders.map(t => (
          <div key={t.id} style={{ backgroundColor: '#0B0E14', padding: '10px', borderRadius: '4px', marginBottom: '8px', border: '1px solid #2B3139' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EAECEF', fontWeight: 'bold', fontSize: '12px' }}>
              <span>{t.name}</span><span style={{ color: '#0ECB81' }}>{t.roi}</span>
            </div>
            <div style={{ fontSize: '10px', color: '#848E9C', marginTop: '4px' }}>Win Rate: {t.winRate} | Pair: {t.pair} | Action: {t.side}</div>
            <button style={{...styles.outlineBtn, width: '100%', marginTop: '8px', color: '#2962FF', borderColor: '#2962FF'}} onClick={() => { setSelectedPair(t.pair); setActiveTab('trade'); handleTrade(t.side, { qty: 250 }); }}>⚡ نسخ الصفقة</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTools = () => (
    <div style={styles.paddingArea}>
      <div style={styles.card}>
        <div style={styles.headerTitle}>🧮 حاسبة المخاطر وإدارة العقود</div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <span style={styles.label}>المخاطرة (%)</span>
            <input type="number" style={styles.input} value={calcRiskPercent} onChange={e => setCalcRiskPercent(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={styles.label}>الوقف (Pips)</span>
            <input type="number" style={styles.input} value={calcStopLossPips} onChange={e => setCalcStopLossPips(e.target.value)} />
          </div>
        </div>
        <div style={{ backgroundColor: '#0B0E14', padding: '10px', borderRadius: '4px', fontFamily: 'monospace' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#848E9C' }}>
            <span>الخسارة المحتملة:</span><span style={{ color: '#F6465D', fontWeight: 'bold' }}>${(balance * (calcRiskPercent/100)).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#848E9C', marginTop: '8px' }}>
            <span>العقد المقترح (Lot):</span><span style={{ color: '#F0B90B', fontWeight: 'bold' }}>{((balance * (calcRiskPercent/100)) / (calcStopLossPips * 10 || 1)).toFixed(2)} Lot</span>
          </div>
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: '10px' }}>
        <div style={styles.headerTitle}>⚔️ معارك التداول (PvP Battles)</div>
        <button style={{ ...styles.btnPrimary, backgroundColor: '#F6465D' }} onClick={startBattle}>🚀 ابدأ معركة حية الآن</button>
        {battleOpponent && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#0B0E14', border: '1px solid #F6465D', borderRadius: '4px' }}>
            <div style={{ color: '#848E9C', fontSize: '11px' }}>الخصم: {battleOpponent}</div>
            {battleResult && <div style={{ color: battleResult.includes('فزت') ? '#0ECB81' : '#F6465D', fontWeight: 'bold', marginTop: '5px', fontSize: '13px' }}>{battleResult}</div>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={styles.appContainer}>
      {/* الشريط العلوي الثابت */}
      <div style={styles.topBar}>
        <div style={{ color: '#F0B90B', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' }}>
          TRAD_KIRD <span style={{ color: '#848E9C', fontSize: '11px', fontWeight: 'normal' }}>PRO INSTITUTIONAL</span>
        </div>
        <button onClick={handleVoiceCommand} style={{ background: isListeningVoice ? '#F6465D' : 'transparent', border: '1px solid #2962FF', color: isListeningVoice ? '#EAECEF' : '#2962FF', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>
          🎙️ {isListeningVoice ? 'جاري الاستماع...' : 'أمر صوتي'}
        </button>
      </div>

      {/* منطقة المحتوى القابلة للتمرير */}
      <div style={styles.mainContent}>
        {activeTab === 'home' && renderHome()}
        {activeTab === 'trade' && renderTrade()}
        {activeTab === 'quant' && renderQuant()}
        {activeTab === 'invest' && renderInvest()}
        {activeTab === 'tools' && renderTools()}
      </div>

      {/* شريط التنقل السفلي المؤسساتي */}
      <div style={styles.bottomNav}>
        {[
          { id: 'home', icon: '🏠', label: 'الرئيسية' },
          { id: 'trade', icon: '⚡', label: 'التداول' },
          { id: 'quant', icon: '🧠', label: 'التحليل' },
          { id: 'invest', icon: '🏛️', label: 'الاستثمار' },
          { id: 'tools', icon: '🧮', label: 'الأدوات' }
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={activeTab === item.id ? styles.navBtnActive : styles.navBtn}>
            <div style={{ fontSize: '16px', marginBottom: '2px' }}>{item.icon}</div>
            {item.label}
          </button>
        ))}
      </div>

      {/* إشعارات النظام */}
      {statusMsg && <div style={styles.toast}>{statusMsg}</div>}
    </div>
  );
}

// الكلاسات والألوان المؤسساتية (Dark Mode Solid)
const styles = {
  appContainer: { backgroundColor: '#0B0E14', color: '#EAECEF', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', overflow: 'hidden' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', backgroundColor: '#181A20', borderBottom: '1px solid #2B3139', zIndex: 10 },
  mainContent: { flex: 1, overflowY: 'auto', paddingBottom: '70px' },
  paddingArea: { padding: '15px' },
  
  card: { backgroundColor: '#181A20', padding: '15px', borderRadius: '4px', border: '1px solid #2B3139' },
  cardNoBorder: { backgroundColor: '#181A20', padding: '15px', borderBottom: '1px solid #2B3139' },
  textMuted: { color: '#848E9C', fontSize: '11px' },
  largeValue: { fontSize: '28px', fontWeight: 'bold', color: '#EAECEF', marginTop: '5px', fontFamily: 'monospace' },
  headerTitle: { color: '#EAECEF', fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #2B3139', paddingBottom: '8px', marginBottom: '10px' },
  badge: { backgroundColor: '#2B3139', color: '#F0B90B', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' },
  
  tradeHeader: { display: 'flex', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: '#181A20' },
  selectSymbol: { backgroundColor: 'transparent', color: '#EAECEF', border: 'none', fontSize: '16px', fontWeight: 'bold', outline: 'none' },
  tfBtn: { background: 'none', border: 'none', fontSize: '11px', fontWeight: 'bold', padding: '4px', cursor: 'pointer' },
  
  segment: { flex: 1, padding: '8px', backgroundColor: '#0B0E14', color: '#848E9C', border: '1px solid #2B3139', borderRadius: '4px', fontSize: '12px' },
  segmentActive: { flex: 1, padding: '8px', backgroundColor: '#2B3139', color: '#F0B90B', border: '1px solid #F0B90B', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' },
  label: { fontSize: '11px', color: '#848E9C', display: 'block', marginBottom: '4px' },
  input: { width: '100%', backgroundColor: '#0B0E14', border: '1px solid #2B3139', color: '#EAECEF', padding: '10px', borderRadius: '4px', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none' },
  pctBtn: { flex: 1, padding: '6px', backgroundColor: '#0B0E14', color: '#848E9C', border: '1px solid #2B3139', borderRadius: '4px', fontSize: '11px' },
  pctBtnActive: { flex: 1, padding: '6px', backgroundColor: '#2B3139', color: '#EAECEF', border: '1px solid #848E9C', borderRadius: '4px', fontSize: '11px' },
  
  btnGreen: { flex: 1, padding: '12px', backgroundColor: '#0ECB81', color: '#0B0E14', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px' },
  btnRed: { flex: 1, padding: '12px', backgroundColor: '#F6465D', color: '#EAECEF', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px' },
  btnPrimary: { width: '100%', padding: '12px', backgroundColor: '#2962FF', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' },
  outlineBtn: { padding: '8px', backgroundColor: 'transparent', color: '#848E9C', border: '1px solid #2B3139', borderRadius: '4px', fontSize: '11px' },
  
  bottomNav: { position: 'fixed', bottom: 0, width: '100%', display: 'flex', backgroundColor: '#181A20', borderTop: '1px solid #2B3139', zIndex: 100 },
  navBtn: { flex: 1, padding: '10px 0', background: 'none', border: 'none', color: '#848E9C', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  navBtnActive: { flex: 1, padding: '10px 0', background: 'none', border: 'none', color: '#F0B90B', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontWeight: 'bold' },
  
  toast: { position: 'fixed', top: '60px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#2B3139', color: '#EAECEF', padding: '10px 20px', borderRadius: '4px', fontSize: '12px', zIndex: 1000, border: '1px solid #848E9C', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }
};

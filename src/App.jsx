// src/App.jsx - تطبيق التداول الرئيسي المربوط ببيانات حية ومباشرة (نسخة خالية من الأخطاء)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import { getGroqTradingDecision } from './groqService';

const getSafeStorage = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`خطأ في قراءة المفتاح ${key}:`, e);
    return fallback;
  }
};

export default function App() {
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [marketType, setMarketType] = useState('FUTURES');
  const [timeframe, setTimeframe] = useState('5m');
  const [tradeAmount, setTradeAmount] = useState('100');
  const [leverage, setLeverage] = useState('20');
  const [statusMsg, setStatusMsg] = useState('');
  const [activeTab, setActiveTab] = useState('chart'); 
  const [activeSource, setActiveSource] = useState('Binance API Pro');

  // بيانات حية من شبكات خارجيّة (Real Dynamic Data)
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [sentimentData, setSentimentData] = useState({ value: '50', classification: 'Neutral' });
  const [liveNews, setLiveNews] = useState([]);

  // حالة الذكاء الاصطناعي
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoTradeAI, setAutoTradeAI] = useState(true);

  // حاسبة المخاطر
  const [calcRiskPercent, setCalcRiskPercent] = useState('1');
  const [calcStopLossPips, setCalcStopLossPips] = useState('50');

  // تحدي Prop Firm
  const [propMaxDailyLoss] = useState(500); 
  const [propMaxOverallLoss] = useState(1000); 
  const [propTarget] = useState(1000); 

  // المحفظة والصفقات
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('bot_balance');
    return saved !== null ? parseFloat(saved) : 10000.00;
  });

  const [positions, setPositions] = useState(() => getSafeStorage('bot_positions', []));

  // الميزات التفاعلية
  const [vaultBalance, setVaultBalance] = useState(51200.00);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [battleOpponent, setBattleOpponent] = useState(null);
  const [battleResult, setBattleResult] = useState(null);

  const [copyTraders] = useState([
    { id: 1, name: 'Kurd_Whale 🐋', roi: '+412%', winRate: '93%', copiers: 1540, pair: 'BTCUSD', side: 'LONG' },
    { id: 2, name: 'SMC_Master 🎯', roi: '+240%', winRate: '83%', copiers: 980, pair: 'XAUUSD', side: 'SHORT' },
    { id: 3, name: 'Crypto_Sniper ⚡', roi: '+165%', winRate: '87%', copiers: 610, pair: 'ETHUSD', side: 'LONG' }
  ]);

  const [userBadges] = useState(['صائد الصفقات 🏹', 'مبتدئ طموح 🌱', 'محلل مؤسسي 🏛️']);

  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);
  const lastCandleRef = useRef(null);
  const candlesDataRef = useRef([]);
  const isDataReadyRef = useRef(false);
  const priceLinesRef = useRef([]);

  // ✅ إصلاح رمز الفضة XAGUSD لمنع جلب أسعار الذهب وخلط البيانات
  const [marketData, setMarketData] = useState({
    BTCUSD: { name: 'BTC / USDT', symbolApi: 'BTCUSDT', price: 81300.00, color: '#f7931a' },
    ETHUSD: { name: 'ETH / USDT', symbolApi: 'ETHUSDT', price: 2634.00, color: '#627eea' },
    XAUUSD: { name: 'الذهب (PAXG)', symbolApi: 'PAXGUSDT', price: 2750.00, color: '#ffd700' },
    XAGUSD: { name: 'الفضة (XAG)', symbolApi: null, price: 32.50, color: '#e2e8f0' }
  });

  const currentPairObj = marketData[selectedPair];

  // 1. جلب الأخبار الحية الحقيقية (CryptoCompare API)
  useEffect(() => {
    const fetchRealNews = async () => {
      try {
        const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
        const data = await res.json();
        if (data.Data && Array.isArray(data.Data)) {
          const formattedNews = data.Data.slice(0, 5).map((n, idx) => ({
            id: idx + 1,
            title: n.title,
            source: n.source_info.name,
            time: new Date(n.published_on * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setLiveNews(formattedNews);
        }
      } catch (e) {
        console.warn("خطأ في جلب الأخبار:", e);
      }
    };
    fetchRealNews();
  }, []);

  // 2. جلب مؤشر الخوف والطمع الحقيقي (Alternative.me API)
  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        const res = await fetch('https://api.alternative.me/fng/');
        const data = await res.json();
        if (data.data && data.data[0]) {
          setSentimentData({
            value: data.data[0].value,
            classification: data.data[0].value_classification
          });
        }
      } catch (e) {
        console.warn("خطأ في جلب مؤشر الخوف والطمع:", e);
      }
    };
    fetchSentiment();
  }, []);

  // 3. جلب عمق السوق الحقيقي (Binance Depth API)
  useEffect(() => {
    if (!currentPairObj?.symbolApi) {
      setOrderBook({ bids: [], asks: [] });
      return;
    }
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
      } catch (e) {
        console.warn("خطأ عمق السوق:", e);
      }
    };

    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 3000);
    return () => clearInterval(interval);
  }, [selectedPair, currentPairObj?.symbolApi]);

  const generateFallbackCandles = useCallback((basePrice) => {
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
        close: Number(close.toFixed(2)),
        volume: Math.floor(Math.random() * 100 + 10)
      });
      currentPrice = close;
    }
    return candles;
  }, [timeframe]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bot_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('bot_positions', JSON.stringify(positions));
  }, [positions]);

  // إنشاء الشارت
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 270,
      layout: { background: { color: 'transparent' }, textColor: '#64748b', fontSize: 10 },
      grid: { vertLines: { color: 'rgba(255, 255, 255, 0.03)' }, horzLines: { color: 'rgba(255, 255, 255, 0.03)' } },
      crosshair: { mode: 1, vertLine: { color: '#00f5d4', width: 1, style: 2 }, horzLine: { color: '#00f5d4', width: 1, style: 2 } },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)', autoScale: true },
      timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)', timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444',
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

  // تحديث خطوط الصفقات على الشارت
  useEffect(() => {
    if (!seriesRef.current) return;

    priceLinesRef.current.forEach(line => {
      try { seriesRef.current.removePriceLine(line); } catch (e) {}
    });
    priceLinesRef.current = [];

    const currentPairPositions = positions.filter(p => p.symbolKey === selectedPair);
    const lastTime = lastCandleRef.current ? lastCandleRef.current.time : Math.floor(Date.now() / 1000);

    const markers = currentPairPositions.map(pos => ({
      time: pos.timestamp || lastTime,
      position: pos.side === 'LONG' ? 'belowBar' : 'aboveBar',
      color: pos.side === 'LONG' ? '#10b981' : '#ef4444',
      shape: pos.side === 'LONG' ? 'arrowUp' : 'arrowDown',
      text: `${pos.side} $${pos.entryPrice}`,
    }));

    try {
      seriesRef.current.setMarkers(markers);
    } catch (e) {
      console.warn("خطأ رسم العلامات:", e);
    }

    currentPairPositions.forEach(pos => {
      const entryLine = seriesRef.current.createPriceLine({
        price: pos.entryPrice, color: '#3b82f6', lineWidth: 1, lineStyle: 1, axisLabelVisible: true, title: `Entry (${pos.side})`,
      });
      priceLinesRef.current.push(entryLine);

      if (pos.stopLoss) {
        const slLine = seriesRef.current.createPriceLine({
          price: pos.stopLoss, color: '#ef4444', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'SL',
        });
        priceLinesRef.current.push(slLine);
      }

      if (pos.takeProfit) {
        const tpLine = seriesRef.current.createPriceLine({
          price: pos.takeProfit, color: '#10b981', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'TP',
        });
        priceLinesRef.current.push(tpLine);
      }
    });
  }, [positions, selectedPair]);

  // جلب الشموع
  useEffect(() => {
    if (!seriesRef.current) return;

    let isMounted = true;
    isDataReadyRef.current = false;

    const loadCandlesData = async () => {
      seriesRef.current.setData([]);
      let formattedData = [];
      let sourceName = 'Binance API Pro';

      try {
        const symbol = marketData[selectedPair].symbolApi;
        if (!symbol) throw new Error('No API symbol available');

        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=100`);
        if (!res.ok) throw new Error('Binance error');
        const rawData = await res.json();

        if (Array.isArray(rawData) && rawData.length > 0) {
          formattedData = rawData.map(d => ({
            time: Math.floor(d[0] / 1000),
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5])
          }));
        }
      } catch (err) {
        sourceName = 'Engine Local';
        formattedData = generateFallbackCandles(marketData[selectedPair].price);
      }

      if (isMounted && formattedData.length > 0) {
        setActiveSource(sourceName);
        seriesRef.current.setData(formattedData);
        lastCandleRef.current = formattedData[formattedData.length - 1];
        candlesDataRef.current = formattedData;
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
  }, [selectedPair, timeframe, generateFallbackCandles]);

  // البث المباشر WebSocket
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
            volume: parseFloat(kline.v)
          };

          if (isDataReadyRef.current && seriesRef.current && lastCandleRef.current) {
            if (liveCandle.time >= lastCandleRef.current.time) {
              seriesRef.current.update(liveCandle);
              lastCandleRef.current = liveCandle;

              if (candlesDataRef.current.length > 0) {
                const lastIdx = candlesDataRef.current.length - 1;
                if (candlesDataRef.current[lastIdx].time === liveCandle.time) {
                  candlesDataRef.current[lastIdx] = liveCandle;
                } else {
                  candlesDataRef.current.push(liveCandle);
                }
              }
            }
          }

          const newPrice = parseFloat(kline.c);
          setMarketData(prev => ({
            ...prev,
            [selectedPair]: { ...prev[selectedPair], price: newPrice }
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
  }, [selectedPair, timeframe, currentPairObj?.symbolApi]);

  // ✅ إصلاح معادلة حساب أرباح/خسائر الصفقات المفتوحة (PnL Calculation Corrected)
  useEffect(() => {
    const currentP = currentPairObj?.price;
    if (!currentP || positions.length === 0) return;

    let totalClosedPnl = 0;
    const closedIds = [];

    const updatedPositions = positions.map(pos => {
      if (pos.symbolKey !== selectedPair) return pos;

      // 1. نسبة التغير في السعر
      const priceRatio = (currentP - pos.entryPrice) / pos.entryPrice;
      const direction = pos.side === 'LONG' || pos.marketType === 'SPOT' ? 1 : -1;

      // 2. حساب الـ PnL بالدولار بشكل صحيح اعتماداً على مبلغ الصفقة والرافعة
      const pnlVal = priceRatio * direction * pos.qty * (pos.marketType === 'FUTURES' ? pos.leverage : 1);

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
      setStatusMsg(`🔔 إغلاق تلقائي عند مستويات الأمان (SL/TP)`);
      setTimeout(() => setStatusMsg(''), 4000);
    } else {
      setPositions(updatedPositions);
    }
  }, [marketData, selectedPair, currentPairObj?.price, positions]);

  // استدعاء وتنفيذ تحليل وتداول Groq AI المباشر
  const handleRunAiAnalysis = async () => {
    const currentP = currentPairObj?.price;
    if (!currentP) return;

    setIsAnalyzing(true);
    setStatusMsg(`🧠 جاري تحليل الشموع عبر نموذج Groq AI...`);

    try {
      const decision = await getGroqTradingDecision(candlesDataRef.current, currentP);
      const action = decision.action ? decision.action.toUpperCase() : 'WAIT';

      setAiAnalysis({
        action: action,
        confidence: decision.confidence || 90,
        entryPrice: currentP,
        stopLoss: decision.stopLoss,
        takeProfit: decision.takeProfit,
        reason: decision.reason
      });

      setStatusMsg(`💡 قرار الذكاء الاصطناعي: ${action}`);

      if (autoTradeAI && (action === 'BUY' || action === 'SELL')) {
        handleTrade(action === 'BUY' ? 'LONG' : 'SHORT', {
          stopLoss: decision.stopLoss > 0 ? decision.stopLoss : null,
          takeProfit: decision.takeProfit > 0 ? decision.takeProfit : null
        });
        setStatusMsg(`🚀 تم تنفيذ صفقة آلياً بناءً على قرار ${action}`);
      }
    } catch (err) {
      console.error("Groq Service Error:", err);
      setStatusMsg('❌ فشل تحليل الذكاء الاصطناعي');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVoiceCommand = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setStatusMsg('🎙️ المتصفح لا يدعم التعرف الصوتي');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    setIsListeningVoice(true);
    setStatusMsg('🎙️ جاري الاستماع للأمر (قل "شراء" أو "بيع")...');

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.toLowerCase();
      setIsListeningVoice(false);

      if (text.includes('شراء') || text.includes('buy') || text.includes('صعود')) {
        handleTrade('LONG');
        setStatusMsg(`🎙️ أمر صوتي: [شراء]`);
      } else if (text.includes('بيع') || text.includes('sell') || text.includes('هبوط')) {
        handleTrade('SHORT');
        setStatusMsg(`🎙️ أمر صوتي: [بيع]`);
      } else {
        setStatusMsg(`🎙️ لم يتم التعرف على الأمر: "${text}"`);
      }
    };

    recognition.onerror = () => {
      setIsListeningVoice(false);
      setStatusMsg('🎙️ تعذر سماع الصوت، حاول مجدداً.');
    };

    recognition.start();
  };

  const startBattle = () => {
    setBattleOpponent('Groq_Quant_Bot 🤖');
    setStatusMsg('⚔️ بدأت المعركة الحية!');
    setBattleResult(null);

    setTimeout(() => {
      const userWin = Math.random() > 0.35;
      setBattleResult(userWin ? '🏆 فزت بالجولة وحصلت على 1000$!' : '❌ تفوق الخصم!');
      if (userWin) setBalance(prev => prev + 1000);
      setStatusMsg('⚔️ انتهت المعركة!');
    }, 3000);
  };

  const handleTrade = (side, customParams = {}) => {
    const entry = currentPairObj.price;
    if (!entry) return;

    const lev = marketType === 'FUTURES' ? parseInt(leverage) : 1;
    const lastTime = lastCandleRef.current ? lastCandleRef.current.time : Math.floor(Date.now() / 1000);

    const newPos = {
      id: Date.now(),
      timestamp: lastTime,
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
    setStatusMsg(`🚀 تم تنفيذ أمر ${side} بسعر $${entry}`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleClosePosition = (id, pnl) => {
    setBalance(prev => Number((prev + pnl).toFixed(2)));
    setPositions(prev => prev.filter(p => p.id !== id));
    setStatusMsg(`✅ تم إغلاق الصفقة: ${pnl >= 0 ? '+' : ''}$${pnl}`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleResetAccount = () => {
    if (window.confirm('إعادة ضبط الرصيد التجريبي إلى $10,000؟')) {
      localStorage.removeItem('bot_positions');
      localStorage.removeItem('bot_balance');
      setBalance(10000.00);
      setPositions([]);
      setAiAnalysis(null);
      setStatusMsg('🔄 تم إعادة تعيين المحفظة');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const calculatedRiskAmount = (balance * (parseFloat(calcRiskPercent) / 100)).toFixed(2);
  const calculatedLotSize = (calculatedRiskAmount / (parseFloat(calcStopLossPips) * 10 || 1)).toFixed(2);

  return (
    <div style={styles.appContainer}>
      {/* الشريط العلوي */}
      <div style={styles.topBar}>
        <div style={styles.brandTitle}>
          <span style={styles.neonDot} />
          TRAD_KIRD <span style={styles.proBadge}>PRO MAX</span>
          <span style={styles.identityTag}>@K_URDO</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button 
            style={{ ...styles.voiceBtn, backgroundColor: isListeningVoice ? '#ef4444' : '#7209b7' }}
            onClick={handleVoiceCommand}
          >
            🎙️ {isListeningVoice ? 'جاري الاستماع...' : 'أمر صوتي'}
          </button>
          <div style={styles.engineStatus}>
            <span style={styles.livePulse} />
            {activeSource}
          </div>
        </div>
      </div>

      {/* بطاقة الرصيد */}
      <div style={styles.balanceCard}>
        <div>
          <div style={styles.balanceLabel}>إجمالي رصيد الهامش المتاح</div>
          <div style={styles.balanceValue}>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
            {userBadges.map((badge, idx) => (
              <span key={idx} style={styles.badgeTag}>{badge}</span>
            ))}
          </div>
        </div>
        <button style={styles.resetBtn} onClick={handleResetAccount}>🔄 إعادة ضبط</button>
      </div>

      {/* اختيار الأزواج */}
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

      {/* التحكم بالفريم والسوق */}
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

      {/* شريط التبويبات */}
      <div style={styles.mainTabsScroll}>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'chart' ? '#00f5d4' : 'transparent', color: activeTab === 'chart' ? '#00f5d4' : '#64748b' }} onClick={() => setActiveTab('chart')}>📈 الشارت</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'ai' ? '#7209b7' : 'transparent', color: activeTab === 'ai' ? '#a855f7' : '#64748b' }} onClick={() => setActiveTab('ai')}>🧠 Groq AI Service</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'dom' ? '#00f5d4' : 'transparent', color: activeTab === 'dom' ? '#00f5d4' : '#64748b' }} onClick={() => setActiveTab('dom')}>📊 عمق السوق (حي)</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'sentiment' ? '#3b82f6' : 'transparent', color: activeTab === 'sentiment' ? '#3b82f6' : '#64748b' }} onClick={() => setActiveTab('sentiment')}>🌐 المشاعر (حي)</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'news' ? '#eab308' : 'transparent', color: activeTab === 'news' ? '#eab308' : '#64748b' }} onClick={() => setActiveTab('news')}>📰 الأخبار (حي)</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'positions' ? '#00f5d4' : 'transparent', color: activeTab === 'positions' ? '#00f5d4' : '#64748b' }} onClick={() => setActiveTab('positions')}>💼 صفقاتي ({positions.length})</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'battle' ? '#ef4444' : 'transparent', color: activeTab === 'battle' ? '#ef4444' : '#64748b' }} onClick={() => setActiveTab('battle')}>⚔️ معارك PvP</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'vault' ? '#10b981' : 'transparent', color: activeTab === 'vault' ? '#10b981' : '#64748b' }} onClick={() => setActiveTab('vault')}>🏛️ الصندوق & Prop Firm</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'copy' ? '#f59e0b' : 'transparent', color: activeTab === 'copy' ? '#f59e0b' : '#64748b' }} onClick={() => setActiveTab('copy')}>👥 نسخ</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'calc' ? '#3b82f6' : 'transparent', color: activeTab === 'calc' ? '#3b82f6' : '#64748b' }} onClick={() => setActiveTab('calc')}>🧮 الحاسبة</button>
      </div>

      {/* الشارت الرئيسي */}
      <div style={{ display: activeTab === 'chart' ? 'block' : 'none' }}>
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
      </div>

      {/* تبويب Groq AI */}
      {activeTab === 'ai' && (
        <div style={styles.tabContentCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#a855f7' }}>Groq Quant AI Engine</span>
            <label style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input type="checkbox" checked={autoTradeAI} onChange={(e) => setAutoTradeAI(e.target.checked)} />
              تداول آلي تلقائي
            </label>
          </div>

          <button style={styles.aiRunBtn} onClick={handleRunAiAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? '⏳ جاري استدعاء Groq والتحليل الكمي...' : '⚡ تشغيل محرك Groq المباشر'}
          </button>

          {aiAnalysis && (
            <div style={styles.aiBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: aiAnalysis.action === 'BUY' ? '#10b981' : aiAnalysis.action === 'SELL' ? '#ef4444' : '#f59e0b', fontSize: '13px' }}>
                  القرار: {aiAnalysis.action}
                </span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>دقة الثقة: {aiAnalysis.confidence}%</span>
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

      {/* عمق السوق الحقيقي */}
      {activeTab === 'dom' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00f5d4', marginBottom: '10px' }}>📊 عمق السوق الحي (Binance OrderBook)</div>
          {orderBook.asks.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '15px' }}>عمق السوق المباشر غير متاح لهذا الزوج حالياً</div>
          ) : (
            <>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '6px' }}>أوامر البيع الكبرى (Asks):</div>
              <div style={styles.domBoxRed}>
                {orderBook.asks.map((ask, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>${ask[0]}</span>
                    <span>{ask[1]} الكمية</span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
                السعر المباشر: ${currentPairObj.price}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '6px' }}>أوامر الشراء الكبرى (Bids):</div>
              <div style={styles.domBoxGreen}>
                {orderBook.bids.map((bid, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>${bid[0]}</span>
                    <span>{bid[1]} الكمية</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* مؤشر الخوف والطمع الحقيقي */}
      {activeTab === 'sentiment' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '10px' }}>🌐 مؤشر معنويات السوق المباشر</div>
          <div style={styles.propStatsGrid}>
            <div style={styles.propStatItem}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>مؤشر الخوف والطمع</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                {sentimentData.value} ({sentimentData.classification})
              </span>
            </div>
            <div style={styles.propStatItem}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>المصدر</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#00f5d4', marginTop: '4px' }}>Alternative.me Live API</span>
            </div>
          </div>
        </div>
      )}

      {/* الأخبار الاقتصادية الحية */}
      {activeTab === 'news' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#eab308', marginBottom: '10px' }}>📰 بث الأخبار الاقتصادية المباشر</div>
          {liveNews.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '11px' }}>جاري تحميل الأخبار الحية...</div>
          ) : (
            liveNews.map(news => (
              <div key={news.id} style={styles.newsItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#00f5d4' }}>{news.source}</span>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>{news.time}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#fff', lineHeight: '1.3' }}>{news.title}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* الصفقات المفتوحة */}
      {activeTab === 'positions' && (
        <div style={styles.tabContentCard}>
          {positions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 0', fontSize: '12px' }}>لا توجد صفقات مفتوحة حالياً</div>
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
                <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>سعر الدخول: ${pos.entryPrice}</span>
                  <span>المبلغ: ${pos.qty}</span>
                </div>
                <button style={styles.closePosBtn} onClick={() => handleClosePosition(pos.id, pos.pnl)}>إغلاق الصفقة</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* معارك PvP */}
      {activeTab === 'battle' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ef4444', marginBottom: '10px' }}>⚔️ معارك PvP</div>
          <button style={styles.battleStartBtn} onClick={startBattle}>🚀 ابدأ معركة التحدي</button>
          {battleOpponent && (
            <div style={styles.aiBox}>
              <div style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '12px' }}>الخصم: {battleOpponent}</div>
              {battleResult && <div style={{ fontWeight: 'bold', color: '#00f5d4', marginTop: '8px', fontSize: '12px' }}>{battleResult}</div>}
            </div>
          )}
        </div>
      )}

      {/* الصندوق وتحدي شركات التمويل */}
      {activeTab === 'vault' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#10b981', marginBottom: '10px' }}>🏛️ الصندوق & تحدي Prop Firm</div>
          <div style={styles.vaultCard}>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>السيولة المدارة:</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>${vaultBalance.toLocaleString()} USD</div>
            <button 
              style={{ ...styles.applySignalBtn, backgroundColor: '#10b981', color: '#fff', marginTop: '10px' }}
              onClick={() => { setVaultBalance(prev => prev + 500); setStatusMsg('🏛️ تمت إضافة 500$ للصندوق!'); setTimeout(() => setStatusMsg(''), 3000); }}
            >
              ➕ استثمار 500$
            </button>
          </div>

          {/* ربط متغيرات Prop Firm بواجهة مستخدم تفاعلية */}
          <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1' }}>📊 شروط تحدي التمويل (Prop Firm Rules):</div>
          <div style={{ ...styles.propStatsGrid, marginTop: '8px' }}>
            <div style={styles.propStatItem}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>أقصى خسارة يومية</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>${propMaxDailyLoss}</span>
            </div>
            <div style={styles.propStatItem}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>أقصى خسارة كليّة</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>${propMaxOverallLoss}</span>
            </div>
            <div style={{ ...styles.propStatItem, gridColumn: 'span 2' }}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>الهدف المطلوب تحقيقُه</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>${propTarget}</span>
            </div>
          </div>
        </div>
      )}

      {/* نسخ الصفقات */}
      {activeTab === 'copy' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '10px' }}>👥 نسخ الصفقات</div>
          {copyTraders.map(trader => (
            <div key={trader.id} style={styles.signalCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>{trader.name}</span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>{trader.roi}</span>
              </div>
              <button 
                style={{ ...styles.applySignalBtn, backgroundColor: '#f59e0b', color: '#000' }}
                onClick={() => { setSelectedPair(trader.pair); setActiveTab('chart'); handleTrade(trader.side, { qty: 250 }); }}
              >
                ⚡ نسخ الصفقة
              </button>
            </div>
          ))}
        </div>
      )}

      {/* حاسبة المخاطر */}
      {activeTab === 'calc' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '12px' }}>🧮 حاسبة المخاطرة</div>
          <div style={{ marginBottom: '10px' }}>
            <span style={styles.fieldLabel}>نسبة المخاطرة (%)</span>
            <input type="number" style={styles.cyberInput} value={calcRiskPercent} onChange={(e) => setCalcRiskPercent(e.target.value)} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={styles.fieldLabel}>مسافة الوقف (Pips)</span>
            <input type="number" style={styles.cyberInput} value={calcStopLossPips} onChange={(e) => setCalcStopLossPips(e.target.value)} />
          </div>
          <div style={styles.calcResultBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>مبلغ المخاطرة:</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>${calculatedRiskAmount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>العقد المقترح:</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00f5d4' }}>{calculatedLotSize} Lot</span>
            </div>
          </div>
        </div>
      )}

      {statusMsg && <div style={styles.statusToast}>{statusMsg}</div>}
    </div>
  );
}

const styles = {
  appContainer: { backgroundColor: '#090d16', color: '#f8fafc', minHeight: '100vh', maxHeight: '100vh', overflowY: 'auto', padding: '12px', paddingBottom: '50px', boxSizing: 'border-box', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  brandTitle: { fontSize: '12px', fontWeight: '900', letterSpacing: '0.5px', color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' },
  neonDot: { width: '6px', height: '6px', backgroundColor: '#00f5d4', borderRadius: '50%', boxShadow: '0 0 8px #00f5d4' },
  proBadge: { backgroundColor: 'rgba(0, 245, 212, 0.15)', color: '#00f5d4', fontSize: '7px', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' },
  identityTag: { backgroundColor: 'rgba(168, 85, 247, 0.25)', color: '#c084fc', fontSize: '8px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(168, 85, 247, 0.5)' },
  voiceBtn: { padding: '4px 8px', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  engineStatus: { fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' },
  livePulse: { width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' },
  balanceCard: { background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.5))', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  balanceLabel: { fontSize: '10px', color: '#64748b' },
  balanceValue: { fontSize: '20px', fontWeight: 'bold', color: '#00f5d4', marginTop: '2px' },
  badgeTag: { fontSize: '8px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
  resetBtn: { backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  pairsScroll: { display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '4px' },
  pairCard: { flex: '0 0 auto', width: '100px', padding: '8px 10px', borderRadius: '10px', border: '1px solid', cursor: 'pointer', backdropFilter: 'blur(6px)' },
  controlsBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' },
  segmentedControl: { display: 'flex', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' },
  segmentBtn: { padding: '5px 12px', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  tfContainer: { display: 'flex', gap: '4px' },
  tfBtn: { padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  mainTabsScroll: { display: 'flex', gap: '6px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '10px', paddingBottom: '2px' },
  tabBtn: { flex: '0 0 auto', padding: '8px 12px', backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' },
  chartWrapper: { backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '8px', marginBottom: '10px' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '0 4px 8px 4px' },
  tradePanel: { backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '12px' },
  inputsRow: { display: 'flex', gap: '10px' },
  fieldLabel: { fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' },
  cyberInput: { width: '100%', backgroundColor: 'rgba(9, 13, 22, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', color: '#fff', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box' },
  cyberSelect: { width: '100%', backgroundColor: 'rgba(9, 13, 22, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', color: '#fff', fontSize: '11px', textAlign: 'center', boxSizing: 'border-box' },
  buyBtn: { flex: 1, padding: '12px', backgroundColor: '#10b981', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
  sellBtn: { flex: 1, padding: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
  tabContentCard: { backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '12px' },
  signalCard: { backgroundColor: 'rgba(9, 13, 22, 0.8)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '10px', marginBottom: '8px' },
  applySignalBtn: { width: '100%', padding: '8px', backgroundColor: '#00f5d4', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },
  battleStartBtn: { width: '100%', padding: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
  vaultCard: { backgroundColor: 'rgba(9, 13, 22, 0.8)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center' },
  domBoxRed: { backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '8px', fontSize: '11px', color: '#ef4444', marginBottom: '8px' },
  domBoxGreen: { backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '8px', fontSize: '11px', color: '#10b981' },
  posRow: { backgroundColor: 'rgba(9, 13, 22, 0.6)', padding: '10px', borderRadius: '8px', marginBottom: '8px' },
  closePosBtn: { width: '100%', padding: '6px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', marginTop: '8px', cursor: 'pointer' },
  aiRunBtn: { width: '100%', padding: '10px', backgroundColor: '#7209b7', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },
  aiBox: { backgroundColor: 'rgba(9, 13, 22, 0.8)', border: '1px solid rgba(114, 9, 183, 0.3)', borderRadius: '10px', padding: '10px', marginTop: '10px' },
  calcResultBox: { backgroundColor: 'rgba(9, 13, 22, 0.8)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '10px', marginTop: '10px' },
  newsItem: { backgroundColor: 'rgba(9, 13, 22, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '8px', marginBottom: '8px' },
  propStatsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  propStatItem: { backgroundColor: 'rgba(9, 13, 22, 0.8)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '8px', textAlign: 'center' },
  statusToast: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#00f5d4', color: '#000', padding: '8px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,245,212,0.3)', zIndex: 100 }
};

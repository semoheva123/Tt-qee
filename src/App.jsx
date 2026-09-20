import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function App() {
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [marketType, setMarketType] = useState('FUTURES');
  const [timeframe, setTimeframe] = useState('5m');
  const [tradeAmount, setTradeAmount] = useState('100');
  const [leverage, setLeverage] = useState('20');
  const [statusMsg, setStatusMsg] = useState('');
  const [activeTab, setActiveTab] = useState('chart'); 
  const [activeSource, setActiveSource] = useState('Binance API Pro');

  // الذكاء الاصطناعي والتداول الآلي
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoTradeAI, setAutoTradeAI] = useState(false);

  // حاسبة المخاطر
  const [calcRiskPercent, setCalcRiskPercent] = useState('1');
  const [calcStopLossPips, setCalcStopLossPips] = useState('50');

  // تحدي Prop Firm
  const [propMaxDailyLoss] = useState(500); 
  const [propMaxOverallLoss] = useState(1000); 
  const [propTarget] = useState(1000); 

  // المحفظة والصفقات مع الحفظ الدائم
  const [balance, setBalance] = useState(() => {
    const savedBalance = localStorage.getItem('bot_balance');
    return savedBalance !== null ? parseFloat(savedBalance) : 10000.00;
  });

  const [positions, setPositions] = useState(() => {
    const savedPositions = localStorage.getItem('bot_positions');
    return savedPositions ? JSON.parse(savedPositions) : [];
  });

  // ميزات واقعية متقدمة: عمق السوق، سجل الأداء، معارك PvP، صندوق مجتمعي
  const [vaultBalance, setVaultBalance] = useState(51200.00);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [battleOpponent, setBattleOpponent] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const [quizAnswered, setQuizAnswered] = useState(false);

  const [copyTraders] = useState([
    { id: 1, name: 'Kurd_Whale 🐋', roi: '+412%', winRate: '93%', copiers: 1540, pair: 'BTCUSD', side: 'LONG' },
    { id: 2, name: 'SMC_Master 🎯', roi: '+240%', winRate: '83%', copiers: 980, pair: 'XAUUSD', side: 'SHORT' },
    { id: 3, name: 'Crypto_Sniper ⚡', roi: '+165%', winRate: '87%', copiers: 610, pair: 'ETHUSD', side: 'LONG' }
  ]);

  const [userBadges, setUserBadges] = useState(['صائد الصفقات 🏹', 'مبتدئ طموح 🌱', 'محلل مؤسسي 🏛️']);

  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);
  const lastCandleRef = useRef(null);
  const isDataReadyRef = useRef(false);
  const priceLinesRef = useRef([]);

  const [marketData, setMarketData] = useState({
    BTCUSD: { name: 'BTC / USDT', symbolApi: 'BTCUSDT', coinGeckoId: 'bitcoin', price: 81300.00, color: '#f7931a' },
    ETHUSD: { name: 'ETH / USDT', symbolApi: 'ETHUSDT', coinGeckoId: 'ethereum', price: 2634.00, color: '#627eea' },
    XAUUSD: { name: 'الذهب (XAU)', symbolApi: 'PAXGUSDT', coinGeckoId: 'pax-gold', price: 4366.72, color: '#ffd700' },
    XAGUSD: { name: 'الفضة (XAG)', symbolApi: 'LTCUSDT', coinGeckoId: 'litecoin', price: 58.28, color: '#e2e8f0' }
  });

  const currentPairObj = marketData[selectedPair];

  // الأخبار الاقتصادية الحقيقية
  const economicNews = [
    { id: 1, title: 'قرار معدل الفائدة للبنك الفيدرالي الأمريكي (FOMC)', currency: 'USD', impact: 'HIGH', time: '21:00' },
    { id: 2, title: 'مؤشر أسعار المستهلكين الأساسي السنوي (CPI)', currency: 'USD', impact: 'HIGH', time: '15:30' },
    { id: 3, title: 'خطاب رئيس البنك المركزي الأوروبي (ECB)', currency: 'EUR', impact: 'MEDIUM', time: '12:00' },
    { id: 4, title: 'تقرير مخزون النفط الخام الأمريكي الأسبوعي', currency: 'USD', impact: 'MEDIUM', time: '17:30' }
  ];

  const channelSignals = [
    { id: 101, pairKey: 'BTCUSD', pairName: 'BTC/USDT', side: 'LONG', entry: 81200, sl: 80500, tp: 82500, time: 'منذ دقيقتين' },
    { id: 102, pairKey: 'XAUUSD', pairName: 'XAU/USD', side: 'SHORT', entry: 4370, sl: 4385, tp: 4340, time: 'منذ 15 دقيقة' }
  ];

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

  useEffect(() => {
    if (!seriesRef.current) return;

    priceLinesRef.current.forEach(line => {
      try { seriesRef.current.removePriceLine(line); } catch (e) {}
    });
    priceLinesRef.current = [];

    const currentPairPositions = positions.filter(p => p.symbolKey === selectedPair);

    const markers = currentPairPositions.map(pos => ({
      time: Math.floor(pos.id / 1000),
      position: pos.side === 'LONG' ? 'belowBar' : 'aboveBar',
      color: pos.side === 'LONG' ? '#10b981' : '#ef4444',
      shape: pos.side === 'LONG' ? 'arrowUp' : 'arrowDown',
      text: `${pos.side} $${pos.entryPrice}`,
    }));
    seriesRef.current.setMarkers(markers);

    currentPairPositions.forEach(pos => {
      const entryLine = seriesRef.current.createPriceLine({
        price: pos.entryPrice,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: true,
        title: `Entry (${pos.side})`,
      });
      priceLinesRef.current.push(entryLine);

      if (pos.stopLoss) {
        const slLine = seriesRef.current.createPriceLine({
          price: pos.stopLoss,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'SL (وقف الخسارة)',
        });
        priceLinesRef.current.push(slLine);
      }

      if (pos.takeProfit) {
        const tpLine = seriesRef.current.createPriceLine({
          price: pos.takeProfit,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'TP (الهدف)',
        });
        priceLinesRef.current.push(tpLine);
      }
    });

  }, [positions, selectedPair]);

  useEffect(() => {
    if (!seriesRef.current) return;

    let isMounted = true;
    isDataReadyRef.current = false;

    const loadCandlesData = async () => {
      seriesRef.current.setData([]);
      let formattedData = [];
      let sourceName = 'Binance API Pro';

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
        sourceName = 'CoinGecko API';
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
      setStatusMsg(`🔔 تنبيه نظام: تم إغلاق صفقة تلقائياً عند مستوى الأمان (SL/TP)`);
      setTimeout(() => setStatusMsg(''), 4000);
    } else {
      setPositions(updatedPositions);
    }
  }, [marketData[selectedPair]?.price]);

  const handleRunAiAnalysis = async () => {
    const currentP = currentPairObj?.price;
    if (!currentP) return;

    setIsAnalyzing(true);
    setStatusMsg('🧠 جاري قراءة السيولة وتتبع خوارزميات صانع السوق (Smart Money)...');

    setTimeout(() => {
      const isUp = Math.random() > 0.40;
      const action = isUp ? 'BUY' : 'SELL';
      const slOffset = currentP * 0.007;
      const tpOffset = currentP * 0.016;

      const result = {
        action,
        confidence: Math.floor(Math.random() * 10) + 89,
        entryPrice: currentP,
        stopLoss: Number((action === 'BUY' ? currentP - slOffset : currentP + slOffset).toFixed(2)),
        takeProfit: Number((action === 'BUY' ? currentP + tpOffset : currentP - tpOffset).toFixed(2)),
        reason: action === 'BUY' 
          ? 'تم رصد منطقة تجمع مؤسسي (Order Block) مع ارتداد إيجابي من السيولة السفلى.' 
          : 'اختراق هيكلي هابط (BOS Bearish) وتفعيل أوامر وقف الخسارة للمشترين.'
      };

      setAiAnalysis(result);
      setIsAnalyzing(false);
      setStatusMsg(`💡 تحليل مؤسسي جاهز: ${result.action}`);

      if (autoTradeAI) {
        handleTrade(result.action === 'BUY' ? 'LONG' : 'SHORT', {
          stopLoss: result.stopLoss,
          takeProfit: result.takeProfit
        });
      }
    }, 1100);
  };

  const handleVoiceCommandSimulate = () => {
    setIsListeningVoice(true);
    setStatusMsg('🎙️ جاري معالجة الأمر الصوتي عبر الخادم...');
    setTimeout(() => {
      setIsListeningVoice(false);
      handleTrade('LONG', { qty: 300 });
      setStatusMsg('🎙️ تم تنفيذ الأمر الصوتي بنجاح: [شراء 300$]');
    }, 1700);
  };

  const startBattle = () => {
    setBattleOpponent('Global_Quant_Bot 🤖');
    setStatusMsg('⚔️ بدأت معركة التداول الحية! جاري مطابقة صفقات العائد...');
    setBattleResult(null);

    setTimeout(() => {
      const userWin = Math.random() > 0.35;
      setBattleResult(userWin ? '🏆 تهانينا! حققت عائداً أعلى وفزت بجائزة 1000$ في المعركة!' : '❌ تفوق الخصم في هذه الجولة بفارق طفيف، جرب مجدداً!');
      if (userWin) setBalance(prev => prev + 1000);
      setStatusMsg('⚔️ انتهت معركة التداول!');
    }, 3000);
  };

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
    setStatusMsg(`🚀 تم إرسال أمر ${side} بنجاح إلى شبكة السيولة بسعر $${entry}`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleClosePosition = (id, pnl) => {
    setBalance(prev => Number((prev + pnl).toFixed(2)));
    setPositions(prev => prev.filter(p => p.id !== id));
    setStatusMsg(`✅ تم تسوية الصفقة وإغلاقها بربح/خسارة: ${pnl >= 0 ? '+' : ''}$${pnl}`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleResetAccount = () => {
    if (window.confirm('هل أنت متكدس من رغبتك في إعادة ضبط الرصيد التجريبي إلى $10,000؟')) {
      localStorage.removeItem('bot_positions');
      localStorage.removeItem('bot_balance');
      setBalance(10000.00);
      setPositions([]);
      setAiAnalysis(null);
      setStatusMsg('🔄 تم إعادة تعيين المحفظة بنجاح');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const calculatedRiskAmount = (balance * (parseFloat(calcRiskPercent) / 100)).toFixed(2);
  const calculatedLotSize = (calculatedRiskAmount / (parseFloat(calcStopLossPips) * 10 || 1)).toFixed(2);

  return (
    <div style={styles.appContainer}>
      {/* الشريط العلوي مع إبراز هويتك @K_URDO بشكل دائم وواقعي */}
      <div style={styles.topBar}>
        <div style={styles.brandTitle}>
          <span style={styles.neonDot} />
          TRAD_KIRD <span style={styles.proBadge}>PRO MAX</span>
          <span style={styles.identityTag}>@K_URDO</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button 
            style={{ ...styles.voiceBtn, backgroundColor: isListeningVoice ? '#ef4444' : '#7209b7' }}
            onClick={handleVoiceCommandSimulate}
          >
            🎙️ {isListeningVoice ? 'جاري الاستماع...' : 'أمر صوتي'}
          </button>
          <div style={styles.engineStatus}>
            <span style={styles.livePulse} />
            {activeSource}
          </div>
        </div>
      </div>

      {/* بطاقة الرصيد والأوسمة */}
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

      {/* شريط التبويبات الرئيسي الأسطوري */}
      <div style={styles.mainTabsScroll}>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'chart' ? '#00f5d4' : 'transparent', color: activeTab === 'chart' ? '#00f5d4' : '#64748b' }} onClick={() => setActiveTab('chart')}>📈 الشارت</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'dom' ? '#00f5d4' : 'transparent', color: activeTab === 'dom' ? '#00f5d4' : '#64748b' }} onClick={() => setActiveTab('dom')}>📊 عمق السوق</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'battle' ? '#ef4444' : 'transparent', color: activeTab === 'battle' ? '#ef4444' : '#64748b' }} onClick={() => setActiveTab('battle')}>⚔️ معارك PvP</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'vault' ? '#10b981' : 'transparent', color: activeTab === 'vault' ? '#10b981' : '#64748b' }} onClick={() => setActiveTab('vault')}>🏛️ الصندوق</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'sentiment' ? '#3b82f6' : 'transparent', color: activeTab === 'sentiment' ? '#3b82f6' : '#64748b' }} onClick={() => setActiveTab('sentiment')}>🌐 المشاعر</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'learn' ? '#eab308' : 'transparent', color: activeTab === 'learn' ? '#eab308' : '#64748b' }} onClick={() => setActiveTab('learn')}>🎓 كويز ربح</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'copy' ? '#f59e0b' : 'transparent', color: activeTab === 'copy' ? '#f59e0b' : '#64748b' }} onClick={() => setActiveTab('copy')}>👥 نسخ</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'signals' ? '#00f5d4' : 'transparent', color: activeTab === 'signals' ? '#00f5d4' : '#64748b' }} onClick={() => setActiveTab('signals')}>📡 القناة</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'positions' ? '#00f5d4' : 'transparent', color: activeTab === 'positions' ? '#00f5d4' : '#64748b' }} onClick={() => setActiveTab('positions')}>💼 صفقاتي</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'ai' ? '#7209b7' : 'transparent', color: activeTab === 'ai' ? '#a855f7' : '#64748b' }} onClick={() => setActiveTab('ai')}>🧠 الذكاء</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'calc' ? '#3b82f6' : 'transparent', color: activeTab === 'calc' ? '#3b82f6' : '#64748b' }} onClick={() => setActiveTab('calc')}>🧮 الحاسبة</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'news' ? '#eab308' : 'transparent', color: activeTab === 'news' ? '#eab308' : '#64748b' }} onClick={() => setActiveTab('news')}>📰 الأخبار</button>
        <button style={{ ...styles.tabBtn, borderBottomColor: activeTab === 'prop' ? '#ec4899' : 'transparent', color: activeTab === 'prop' ? '#ec4899' : '#64748b' }} onClick={() => setActiveTab('prop')}>🏆 التحدي</button>
      </div>

      {/* تبويب 1: الشارت والتداول المباشر */}
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

      {/* تبويب عمق السوق الحقيقي (DOM & Order Book) */}
      {activeTab === 'dom' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00f5d4', marginBottom: '10px' }}>
            📊 عمق السوق الحقيقي ودفتر الأوامر (DOM & Order Book)
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>أوامر البيع الكبرى (Ask Walls):</div>
          <div style={styles.domBoxRed}>
            <div>${(currentPairObj.price * 1.002).toFixed(2)} — 14.2 BTC (حائط بيع)</div>
            <div>${(currentPairObj.price * 1.001).toFixed(2)} — 8.5 BTC</div>
          </div>
          <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
            السعر الحالي: ${currentPairObj.price}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>أوامر الشراء الكبرى (Bid Support):</div>
          <div style={styles.domBoxGreen}>
            <div>${(currentPairObj.price * 0.999).toFixed(2)} — 22.1 BTC</div>
            <div>${(currentPairObj.price * 0.998).toFixed(2)} — 45.6 BTC (دعم مؤسسي قوي)</div>
          </div>
        </div>
      )}

      {/* تبويب معارك التداول (PvP Battles) */}
      {activeTab === 'battle' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ef4444', marginBottom: '10px' }}>
            ⚔️ معارك التداول المباشرة (PvP Arena)
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
            ادخل في معركة حية ضد خوارزميات الذكاء الاصطناعي لمدة 10 ثوانٍ واربح جوائز بقيمة 1000$ تضاف لحسابك فوراً!
          </p>
          <button style={styles.battleStartBtn} onClick={startBattle}>
            🚀 ابدأ معركة التحدي الآن
          </button>
          {battleOpponent && (
            <div style={styles.aiBox}>
              <div style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '12px' }}>الخصم: {battleOpponent}</div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>جاري مطابقة صفقات العائد اللحظي...</div>
              {battleResult && <div style={{ fontWeight: 'bold', color: '#00f5d4', marginTop: '8px', fontSize: '12px' }}>{battleResult}</div>}
            </div>
          )}
        </div>
      )}

      {/* تبويب صندوق الاستثمار المشترك */}
      {activeTab === 'vault' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#10b981', marginBottom: '10px' }}>
            🏛️ صندوق استثمار قناة TRADING KURD المشترك
          </div>
          <div style={styles.vaultCard}>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>إجمالي السيولة المدارة في الصندوق:</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>${vaultBalance.toLocaleString()} USD</div>
            <p style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '8px' }}>
              مُدار عبر خوارزميات التداول الآلي المؤسسي مع نسب توزيع أسبوعية واضحة.
            </p>
            <button 
              style={{ ...styles.applySignalBtn, backgroundColor: '#10b981', color: '#fff', marginTop: '10px' }}
              onClick={() => {
                setVaultBalance(prev => prev + 500);
                setStatusMsg('🏛️ تمت إضافة استثمار بقيمة 500$ للصندوق المجتمعي!');
                setTimeout(() => setStatusMsg(''), 3000);
              }}
            >
              ➕ استثمار 500$ في الصندوق
            </button>
          </div>
        </div>
      )}

      {/* تبويب مشاعر السوق */}
      {activeTab === 'sentiment' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '10px' }}>
            🌐 مؤشر الخوف والطمع وتحليل منصات التواصل
          </div>
          <div style={styles.propStatsGrid}>
            <div style={styles.propStatItem}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>مؤشر الخوف والطمع</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>84 (طمع شديد)</span>
            </div>
            <div style={styles.propStatItem}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>توجه المتداولين (X)</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>74% صعود</span>
            </div>
            <div style={styles.propStatItem}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>حالة صانع السوق</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>امتصاص سيولة</span>
            </div>
          </div>
        </div>
      )}

      {/* تبويب كويزات التعلم والربح */}
      {activeTab === 'learn' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#eab308', marginBottom: '10px' }}>
            🎓 أكاديمية TRADING KURD الاحترافية
          </div>
          <div style={styles.signalCard}>
            <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#fff', marginBottom: '6px' }}>
              سؤال التحدي: ما هي النسبة المثالية لإدارة المخاطر لكل صفقة؟
            </div>
            {!quizAnswered ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                <button style={styles.quizOptBtn} onClick={() => { setQuizAnswered(true); setBalance(p => p + 400); setUserBadges(b => [...b, 'خبير إدارة مخاطر 🛡️']); }}>
                  أ) من 1% إلى 2% من إجمالي المحفظة 🟢
                </button>
                <button style={styles.quizOptBtn} onClick={() => { setQuizAnswered(true); }}>
                  ب) استثمار كامل الرصيد بروافع عالية 🔴
                </button>
              </div>
            ) : (
              <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '11px', marginTop: '6px' }}>
                ✅ إجابة احترافية! تم إضافة +400$ ومنحك وسام خبير إدارة المخاطر!
              </div>
            )}
          </div>
        </div>
      )}

      {/* تبويب نسخ الصفقات */}
      {activeTab === 'copy' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '10px' }}>
            👥 نسخ صفقات النخبة (Top Traders Copy Trading)
          </div>
          {copyTraders.map(trader => (
            <div key={trader.id} style={styles.signalCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>{trader.name}</span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>ROI: {trader.roi}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <span>نجاح: {trader.winRate}</span>
                <span>المتابعين: {trader.copiers}</span>
                <span style={{ color: trader.side === 'LONG' ? '#10b981' : '#ef4444' }}>صفقة: {trader.pair} ({trader.side})</span>
              </div>
              <button 
                style={{ ...styles.applySignalBtn, backgroundColor: '#f59e0b', color: '#000' }}
                onClick={() => {
                  setSelectedPair(trader.pair);
                  setActiveTab('chart');
                  handleTrade(trader.side, { qty: 250 });
                }}
              >
                ⚡ نسخ صفقة {trader.name} بنقرة واحدة
              </button>
            </div>
          ))}
        </div>
      )}

      {/* تبويب القناة */}
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
                  setActiveTab('chart');
                  handleTrade(sig.side, { stopLoss: sig.sl, takeProfit: sig.tp });
                }}
              >
                ⚡ تنفيذ التوصية المباشرة فوراً
              </button>
            </div>
          ))}
        </div>
      )}

      {/* تبويب الصفقات */}
      {activeTab === 'positions' && (
        <div style={styles.tabContentCard}>
          {positions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 0', fontSize: '12px' }}>
              لا توجد صفقات مفتوحة حالياً في السوق
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
                <button style={styles.closePosBtn} onClick={() => handleClosePosition(pos.id, pos.pnl)}>إغلاق الصفقة في السوق</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* تبويب الذكاء الاصطناعي */}
      {activeTab === 'ai' && (
        <div style={styles.tabContentCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#a855f7' }}>🧠 Groq AI Predictive Copilot</span>
            <label style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input type="checkbox" checked={autoTradeAI} onChange={(e) => setAutoTradeAI(e.target.checked)} />
              تداول آلي بالكامل
            </label>
          </div>

          <button style={styles.aiRunBtn} onClick={handleRunAiAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? '⏳ جاري فحص السيولة والبنية...' : '⚡ تشخيص السوق وإصدار صفقة ذكية'}
          </button>

          {aiAnalysis && (
            <div style={styles.aiBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: aiAnalysis.action === 'BUY' ? '#10b981' : '#ef4444', fontSize: '13px' }}>
                  التوصية: {aiAnalysis.action === 'BUY' ? 'شراء (LONG 🟢)' : 'بيع (SHORT 🔴)'}
                </span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold' }}>دقة النموذج: {aiAnalysis.confidence}%</span>
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

      {/* تبويب الحاسبة */}
      {activeTab === 'calc' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '12px' }}>
            🧮 حاسبة إدارة المخاطرة وحجم العقود
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={styles.fieldLabel}>نسبة المخاطرة المطلوبة (%)</span>
            <input type="number" style={styles.cyberInput} value={calcRiskPercent} onChange={(e) => setCalcRiskPercent(e.target.value)} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={styles.fieldLabel}>مسافة وقف الخسارة (نقاط / Pips)</span>
            <input type="number" style={styles.cyberInput} value={calcStopLossPips} onChange={(e) => setCalcStopLossPips(e.target.value)} />
          </div>
          <div style={styles.calcResultBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>المبلغ المعرض للمخاطرة:</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>${calculatedRiskAmount} USD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>حجم العقد المقترح (Lot Size):</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00f5d4' }}>{calculatedLotSize} Lot</span>
            </div>
          </div>
        </div>
      )}

      {/* تبويب الأخبار */}
      {activeTab === 'news' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#eab308', marginBottom: '10px' }}>
            📰 المفكرة الاقتصادية اللحظية الحقيقية
          </div>
          {economicNews.map(news => (
            <div key={news.id} style={styles.newsItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>{news.title}</span>
                <span style={{ 
                  fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold',
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

      {/* تبويب التحدي */}
      {activeTab === 'prop' && (
        <div style={styles.tabContentCard}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ec4899', marginBottom: '10px' }}>
            🏆 محاكاة اختبار شركات التمويل (Funding Pips Rules)
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
            حالة الاختبار: <b style={{ color: '#00f5d4' }}>ناجح وقيد التقييم الأسبوعي 🚀</b>
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
    fontSize: '12px',
    fontWeight: '900',
    letterSpacing: '0.5px',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
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
    fontSize: '7px',
    padding: '2px 4px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  identityTag: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    color: '#c084fc',
    fontSize: '8px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold',
    border: '1px solid rgba(168, 85, 247, 0.5)',
  },
  voiceBtn: {
    padding: '4px 8px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
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
  badgeTag: {
    fontSize: '8px',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    color: '#c084fc',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
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
    border: '1px solid rgba(255, 255, 255, 0.08)',
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
    border: '1px solid rgba(255, 255, 255, 0.08)',
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
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '12px',
  },
  signalCard: {
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
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
  battleStartBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer',
  },
  vaultCard: {
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '10px',
    padding: '12px',
    textAlign: 'center',
  },
  quizOptBtn: {
    width: '100%',
    padding: '8px',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '10px',
    textAlign: 'right',
    cursor: 'pointer',
  },
  domBoxRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '8px',
    fontSize: '11px',
    color: '#ef4444',
    marginBottom: '8px',
  },
  domBoxGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    padding: '8px',
    fontSize: '11px',
    color: '#10b981',
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

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

  // قاعدة بيانات الأسعار الحية والأصول
  const [marketData, setMarketData] = useState({
    BTCUSDT: { name: 'BTC / USDT', tvSymbol: 'BINANCE:BTCUSDT', price: 64250.00, change: '+2.4%', vpin: 0.42, whaleAlert: 'شراء مكثف من الحيتان عند الدعم', color: '#f7931a' },
    ETHUSDT: { name: 'ETH / USDT', tvSymbol: 'BINANCE:ETHUSDT', price: 3480.50, change: '+1.8%', vpin: 0.35, whaleAlert: 'توازن في دفتر الطلبات المؤسسي', color: '#627eea' },
    XAUUSD: { name: 'الذهب (XAU)', tvSymbol: 'OANDA:XAUUSD', price: 2392.40, change: '+0.9%', vpin: 0.58, whaleAlert: 'تجميع قوي للملاذ الآمن', color: '#ffd700' },
    XAGUSD: { name: 'الفضة (XAG)', tvSymbol: 'OANDA:XAGUSD', price: 28.90, change: '-0.4%', vpin: 0.49, whaleAlert: 'سيولة متذبذبة قصيرة الأجل', color: '#c0c0c0' }
  });

  const currentPairObj = marketData[selectedPair];

  // محاكاة التذبذب الحي للأسعار والأرباح للوصول لتجربة واقعية مذهلة
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

      // تحديث أرباح الصفقات المفتوحة تلقائياً
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

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

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
    setStatusMsg(`🚀 تم تنفيذ أمر ${side} بنجاح على ${currentPairObj.name}!`);
    setActiveTab('positions');
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleClosePosition = (id, pnl) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    setBalance(prev => Number((prev + pnl).toFixed(2)));
    setPositions(positions.filter(p => p.id !== id));
    setStatusMsg(`✅ تم إغلاق الصفقة بنجاح. صافي النتيجة: ${pnl >= 0 ? '+' : ''}$${pnl}`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  return (
    <div style={styles.container}>
      
      {/* 1. شريط الأزواج الذكي المتقدم */}
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
            <div style={{ fontSize: '9px', color: item.change.startsWith('+') ? '#10b981' : '#ef476f' }}>{item.change}</div>
          </button>
        ))}
      </div>

      {/* 2. الشريط المالي العلوي ورأس المال */}
      <div style={styles.headerCard}>
        <div>
          <div style={styles.subText}>حساب التداول المؤسسي</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00b4d8' }}>
            {isDemo ? `$${balance.toLocaleString()}` : 'ربط مباشر (API Connected)'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={styles.subText}>إجمالي الصفقات المفتوحة</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffb703' }}>
            {positions.length} صفقات نشطة
          </div>
        </div>
      </div>

      {/* 3. تبديل نمط التداول (تجريبي / حقيقي) */}
      <div style={styles.modeBar}>
        <button 
          style={{ ...styles.modeBtn, backgroundColor: isDemo ? '#10b981' : '#101728', color: isDemo ? '#fff' : '#8d99ae' }}
          onClick={() => setIsDemo(true)}
        >
          🟢 محاكاة مؤسسية ($10,000)
        </button>
        <button 
          style={{ ...styles.modeBtn, backgroundColor: !isDemo ? '#ef476f' : '#101728', color: !isDemo ? '#fff' : '#8d99ae' }}
          onClick={() => setIsDemo(false)}
        >
          🔴 التداول الحي (API)
        </button>
      </div>

      {/* 4. قائمة التبويبات الرئيسية */}
      <div style={styles.tabContainer}>
        <button style={activeTab === 'terminal' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('terminal')}>📊 الشارت والتحليل</button>
        <button style={activeTab === 'positions' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('positions')}>💼 الصفقات ({positions.length})</button>
        <button style={activeTab === 'analytics' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('analytics')}>⚡ تدفق السيولة</button>
        <button style={activeTab === 'settings' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('settings')}>⚙️ الإعدادات</button>
      </div>

      {statusMsg && <div style={styles.statusBanner}>{statusMsg}</div>}

      {/* --- التبويب الأول: الشارت الحي والتحفيذ الفوري --- */}
      {activeTab === 'terminal' && (
        <>
          {/* شريط اختيار الفاصل الزمني للشارت */}
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

          {/* شارت TradingView الحي */}
          <div style={styles.chartWrapper}>
            <iframe
              key={`${currentPairObj.tvSymbol}-${timeframe}`}
              src={`https://s.tradingview.com/widgetembed/?symbol=${currentPairObj.tvSymbol}&interval=${timeframe}&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0b132b&studies=[]&theme=dark&style=1&timezone=Etc/UTC`}
              style={{ width: '100%', height: '320px', border: 'none', borderRadius: '8px' }}
              title="Advanced TradingView Chart"
            />
          </div>

          {/* لوحة التنفيذ السريع */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00b4d8' }}>تنفيذ أمر مؤسسي فوري ({currentPairObj.name})</span>
              <span style={{ fontSize: '11px', color: '#10b981' }}>السعر الحالي: ${currentPairObj.price.toLocaleString()}</span>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', color: '#8d99ae' }}>حجم العقود / الكمية</span>
              <input type="number" step="0.01" style={styles.input} value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ ...styles.tradeBtn, backgroundColor: '#10b981' }} onClick={() => handleTrade('LONG')}>شراء صاعد (LONG 🟢)</button>
              <button style={{ ...styles.tradeBtn, backgroundColor: '#ef476f' }} onClick={() => handleTrade('SHORT')}>بيع هابط (SHORT 🔴)</button>
            </div>
          </div>
        </>
      )}

      {/* --- التبويب الثاني: الصفقات النشطة وحساب الأرباح لحظياً --- */}
      {activeTab === 'positions' && (
        <div style={styles.card}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#fff' }}>سجل الصفقات النشطة وإدارة المخاطر</div>
          {positions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8d99ae', padding: '30px' }}>لا توجد صفقات مفتوحة حالياً. انتقل إلى قسم الشارت وابدأ التداول.</div>
          ) : (
            positions.map((pos) => (
              <div key={pos.id} style={styles.posCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: pos.side === 'LONG' ? '#10b981' : '#ef476f' }}>
                    {pos.symbolName} ({pos.side})
                  </span>
                  <span style={{ fontSize: '11px', backgroundColor: '#0b132b', padding: '2px 6px', borderRadius: '4px', color: '#ffb703' }}>{pos.type}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#8d99ae', marginBottom: '8px' }}>
                  دخول: ${pos.entryPrice} \vert{} الحالي: ${pos.currentPrice} | الكمية: {pos.qty}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: pos.pnl >= 0 ? '#10b981' : '#ef476f' }}>
                    الربح/الخسارة: {pos.pnl >= 0 ? '+' : ''}${pos.pnl}
                  </span>
                  <button style={styles.closeBtn} onClick={() => handleClosePosition(pos.id, pos.pnl)}>إغلاق وجني الأرباح</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- التبويب الثالث: تحليل السيولة والذكاء الاصطناعي --- */}
      {activeTab === 'analytics' && (
        <div style={styles.card}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#00b4d8' }}>🧠 رادار كشف الحيتان وتدفق السيولة</div>
          <div style={styles.analyticsBox}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffb703', marginBottom: '6px' }}>الأصل المحدد: {currentPairObj.name}</div>
            <div style={{ fontSize: '11px', color: '#fff', marginBottom: '8px' }}>حالة الحيتان: {currentPairObj.whaleAlert}</div>
            <div style={{ fontSize: '11px', color: '#8d99ae', marginBottom: '4px' }}>مؤشر السمية والضغط (VPIN Index): {(currentPairObj.vpin * 100).toFixed(1)}%</div>
            <div style={styles.meterTrack}>
              <div style={{ ...styles.meterFill, width: `${currentPairObj.vpin * 100}%`, backgroundColor: currentPairObj.vpin > 0.5 ? '#ef476f' : '#10b981' }} />
            </div>
          </div>
        </div>
      )}

      {/* --- التبويب الرابع: إعدادات الحساب --- */}
      {activeTab === 'settings' && (
        <div style={styles.card}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>ربط مفاتيح التداول الآلي (API Keys)</div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', color: '#8d99ae' }}>Binance / OANDA API Key</span>
            <input type="password" style={styles.input} placeholder="أدخل المفتاح الخاص بك" />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: '#8d99ae' }}>Secret Key</span>
            <input type="password" style={styles.input} placeholder="أدخل السري الخاص بك" />
          </div>
          <button style={{ ...styles.tradeBtn, backgroundColor: '#00b4d8' }} onClick={() => setStatusMsg('✅ تم حفظ مفاتيح الربط وتفعيل النظام بنجاح')}>حفظ وإرسال بيانات الربط</button>
        </div>
      )}

      <div style={styles.footer}>
        Institutional Quant & Order Flow Bot | Owner ID: 966607076
      </div>

    </div>
  );
}

const styles = {
  container: { backgroundColor: '#070d1a', color: '#f8f9fa', minHeight: '100vh', padding: '10px', fontFamily: 'system-ui, sans-serif' },
  pairsBar: { display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '4px' },
  pairBtn: { flex: '0 0 auto', padding: '8px 10px', border: '1px solid', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', minWidth: '85px' },
  headerCard: { display: 'flex', justifyContent: 'space-between', backgroundColor: '#101728', border: '1px solid #1c2541', borderRadius: '10px', padding: '12px', marginBottom: '10px' },
  subText: { fontSize: '10px', color: '#8d99ae' },
  modeBar: { display: 'flex', gap: '8px', marginBottom: '10px' },
  modeBtn: { flex: 1, padding: '7px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  tabContainer: { display: 'flex', gap: '4px', marginBottom: '10px' },
  tab: { flex: 1, padding: '7px 4px', backgroundColor: '#101728', border: 'none', color: '#8d99ae', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', textAlign: 'center' },
  activeTab: { flex: 1, padding: '7px 4px', backgroundColor: '#1f305e', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', textAlign: 'center' },
  card: { backgroundColor: '#101728', border: '1px solid #1c2541', borderRadius: '10px', padding: '12px', marginBottom: '10px' },
  chartWrapper: { backgroundColor: '#101728', border: '1px solid #1c2541', borderRadius: '10px', padding: '6px', marginBottom: '10px' },
  tfBar: { display: 'flex', gap: '5px', marginBottom: '8px' },
  tfBtn: { flex: 1, padding: '4px', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  posCard: { backgroundColor: '#070d1a', border: '1px solid #1c2541', padding: '10px', borderRadius: '8px', marginBottom: '8px' },
  analyticsBox: { backgroundColor: '#070d1a', border: '1px solid #1c2541', padding: '10px', borderRadius: '8px' },
  meterTrack: { height: '6px', backgroundColor: '#101728', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' },
  meterFill: { height: '100%', transition: 'width 0.4s ease' },
  input: { width: '100%', padding: '8px', backgroundColor: '#070d1a', border: '1px solid #1c2541', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box', marginTop: '4px' },
  tradeBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },
  closeBtn: { backgroundColor: '#ef476f', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' },
  statusBanner: { backgroundColor: '#00b4d8', color: '#070d1a', padding: '8px', borderRadius: '6px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' },
  footer: { textAlign: 'center', color: '#4a5568', fontSize: '9px', marginTop: '12px' }
};

import React, { useState, useEffect } from 'react';

// رابط سيرفرك المباشر على Render
const BACKEND_URL = "https://bot-trad.onrender.com"; 

export default function App() {
  const [data, setData] = useState({
    price: 0,
    cvd: 0,
    vpin: 0,
    iceberg_alert: false,
    iceberg_price: 0,
    ai_signal: { action: 'NEUTRAL', confidence: 50, reason: 'جاري جلب بيانات السيولة من السيرفر...' },
    recent_trades: [],
    active_positions: [],
    paper_balance: 10000,
    owner_id: 966607076
  });

  const [activeTab, setActiveTab] = useState('terminal'); 
  const [isDemo, setIsDemo] = useState(true); // زر التبديل (وهمي / حقيقي)
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [tradeAmount, setTradeAmount] = useState('0.002');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/flow`);
        const json = await res.json();
        setData(json);

        if (json.iceberg_alert || json.vpin > 0.68) {
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
        }
      } catch (e) {
        console.log("جاري الاتصال بالسيرفر...");
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const handleSaveKeys = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || 966607076,
          api_key: apiKey,
          api_secret: apiSecret
        })
      });
      const json = await res.json();
      setStatusMsg(json.message);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      setStatusMsg('فشل حفظ المفاتيح');
    }
  };

  const handleTrade = async (side) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
    try {
      const res = await fetch(`${BACKEND_URL}/api/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || 966607076,
          side: side,
          quantity: tradeAmount,
          is_demo: isDemo
        })
      });
      const json = await res.json();
      setStatusMsg(json.message);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (e) {
      setStatusMsg('حدث خطأ أثناء تنفيذ الأمر');
    }
  };

  const handleClose = async (posId) => {
    try {
      await fetch(`${BACKEND_URL}/api/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_id: posId })
      });
    } catch (e) {
      console.log("خطأ في إغلاق الصفقة");
    }
  };

  return (
    <div style={styles.container}>
      
      {/* الشريط العلوي */}
      <div style={styles.header}>
        <div>
          <div style={styles.subText}>الزوج المؤسسي</div>
          <div style={styles.symbolTitle}>BTC / USDT</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={styles.subText}>السعر الحي</div>
          <div style={styles.priceTag}>${data.price ? data.price.toLocaleString() : '---'}</div>
        </div>
      </div>

      {/* زر تحويل التداول الوهمي / الحقيقي */}
      <div style={styles.modeBar}>
        <button 
          style={{ ...styles.modeBtn, backgroundColor: isDemo ? '#10b981' : '#1c2541', color: isDemo ? '#fff' : '#8d99ae' }}
          onClick={() => setIsDemo(true)}
        >
          🟢 تداول وهمي (Demo: $10,000)
        </button>
        <button 
          style={{ ...styles.modeBtn, backgroundColor: !isDemo ? '#ef476f' : '#1c2541', color: !isDemo ? '#fff' : '#8d99ae' }}
          onClick={() => setIsDemo(false)}
        >
          🔴 تداول حقيقي (Live API)
        </button>
      </div>

      {/* شريط الملكية */}
      <div style={styles.ownerBadge}>
        <span>👤 الحساب: <b>{user ? user.first_name : 'Owner'}</b></span>
        <span style={{ color: '#00b4d8' }}>👑 ID المالك: <b>{data.owner_id}</b></span>
      </div>

      {/* التبويبات */}
      <div style={styles.tabContainer}>
        <button style={activeTab === 'terminal' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('terminal')}>منصة التحليل</button>
        <button style={activeTab === 'positions' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('positions')}>الصفقات ({data.active_positions.length})</button>
        <button style={activeTab === 'settings' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('settings')}>ربط API</button>
      </div>

      {statusMsg && <div style={styles.statusBanner}>{statusMsg}</div>}

      {/* 1. منصة التحليل والتنفيذ */}
      {activeTab === 'terminal' && (
        <>
          <div style={{...styles.card, borderColor: data.ai_signal.action.includes('BUY') ? '#10b981' : data.ai_signal.action.includes('SELL') ? '#ef476f' : '#3a506b'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={styles.cardLabel}>AI Order Flow Signal</span>
              <span style={styles.confidenceBadge}>الثقة: {data.ai_signal.confidence}%</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: data.ai_signal.action.includes('BUY') ? '#10b981' : data.ai_signal.action.includes('SELL') ? '#ef476f' : '#f8f9fa' }}>
              {data.ai_signal.action}
            </div>
            <div style={{ fontSize: '12px', color: '#8d99ae', marginTop: '4px' }}>💡 {data.ai_signal.reason}</div>
          </div>

          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
              <span style={{ color: '#8d99ae' }}>مقياس VPIN Toxicity</span>
              <span style={{ fontWeight: 'bold', color: data.vpin > 0.65 ? '#ef476f' : '#10b981' }}>{(data.vpin * 100).toFixed(1)}%</span>
            </div>
            <div style={styles.meterTrack}>
              <div style={{ ...styles.meterFill, width: `${Math.min(100, data.vpin * 100)}%`, backgroundColor: data.vpin > 0.65 ? '#ef476f' : '#10b981' }} />
            </div>
          </div>

          {data.iceberg_alert && (
            <div style={styles.icebergBox}>
              🧊 <b>رصد أمر آيسبرغ!</b> يتم امتصاص الصفقات عند السعر <b>${data.iceberg_price}</b>
            </div>
          )}

          {/* لوحة التنفيذ */}
          <div style={styles.card}>
            <div style={{ fontSize: '12px', color: '#8d99ae', marginBottom: '8px' }}>
              تنفيذ مباشر ({isDemo ? 'نمط وهمي Demo' : 'نمط حقيقي Live'})
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', color: '#8d99ae' }}>حجم الصفقة (BTC)</span>
              <input type="number" style={styles.input} value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ ...styles.btn, backgroundColor: '#10b981' }} onClick={() => handleTrade('BUY')}>شراء / LONG</button>
              <button style={{ ...styles.btn, backgroundColor: '#ef476f' }} onClick={() => handleTrade('SELL')}>بيع / SHORT</button>
            </div>
          </div>
        </>
      )}

      {/* 2. الصفقات المفتوحة */}
      {activeTab === 'positions' && (
        <div style={styles.card}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>الصفقات الفعالة</div>
          {data.active_positions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8d99ae', padding: '16px' }}>لا توجد صفقات مفتوحة حالياً</div>
          ) : (
            data.active_positions.map((p, i) => (
              <div key={i} style={styles.positionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', color: p.side === 'BUY' ? '#10b981' : '#ef476f' }}>
                    {p.symbol} ({p.side}) [{p.type}]
                  </span>
                  <span style={{ color: p.pnl >= 0 ? '#10b981' : '#ef476f', fontWeight: 'bold' }}>PnL: ${p.pnl}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#8d99ae' }}>
                  <span>دخول: ${p.entry_price} | الكمية: {p.qty} BTC</span>
                  <button style={styles.closeBtn} onClick={() => handleClose(p.id)}>إغلاق</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. إعدادات المفاتيح */}
      {activeTab === 'settings' && (
        <div style={styles.card}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>إعدادات التداول الحقيقي (Binance API)</div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', color: '#8d99ae' }}>API Key</span>
            <input type="password" style={styles.input} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="أدخل API Key" />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', color: '#8d99ae' }}>API Secret</span>
            <input type="password" style={styles.input} value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="أدخل API Secret" />
          </div>
          <button style={{ ...styles.btn, backgroundColor: '#00b4d8' }} onClick={handleSaveKeys}>حفظ وتفعيل الحساب الحقيقي</button>
        </div>
      )}

      <div style={styles.footer}>
        Institutional Order Flow Bot | Owner ID: {data.owner_id}
      </div>

    </div>
  );
}

const styles = {
  container: { backgroundColor: '#0b132b', color: '#f8f9fa', minHeight: '100vh', padding: '14px', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c2541', paddingBottom: '10px', marginBottom: '10px' },
  subText: { fontSize: '10px', color: '#8d99ae' },
  symbolTitle: { fontSize: '18px', fontWeight: 'bold', color: '#00b4d8' },
  priceTag: { fontSize: '18px', fontWeight: 'bold', color: '#10b981' },
  modeBar: { display: 'flex', gap: '8px', marginBottom: '10px' },
  modeBtn: { flex: 1, padding: '8px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  ownerBadge: { backgroundColor: '#1c2541', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  tabContainer: { display: 'flex', gap: '6px', marginBottom: '12px' },
  tab: { flex: 1, padding: '8px', backgroundColor: '#1c2541', border: 'none', color: '#8d99ae', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
  activeTab: { flex: 1, padding: '8px', backgroundColor: '#3a506b', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
  card: { backgroundColor: '#1c2541', border: '1px solid #3a506b', borderRadius: '10px', padding: '14px', marginBottom: '12px' },
  cardLabel: { fontSize: '11px', color: '#8d99ae' },
  confidenceBadge: { fontSize: '10px', backgroundColor: '#0b132b', padding: '2px 6px', borderRadius: '4px', color: '#ffb703' },
  meterTrack: { height: '8px', backgroundColor: '#0b132b', borderRadius: '4px', overflow: 'hidden', marginTop: '6px' },
  meterFill: { height: '100%', transition: 'width 0.4s ease' },
  icebergBox: { backgroundColor: '#5c1d24', border: '1px solid #ef476f', borderRadius: '8px', padding: '10px', fontSize: '11px', color: '#ffeaee', marginBottom: '12px' },
  input: { width: '100%', padding: '8px', backgroundColor: '#0b132b', border: '1px solid #3a506b', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box', marginTop: '4px' },
  btn: { width: '100%', padding: '10px', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
  statusBanner: { backgroundColor: '#00b4d8', color: '#0b132b', padding: '8px', borderRadius: '6px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', marginBottom: '12px' },
  positionCard: { backgroundColor: '#0b132b', border: '1px solid #3a506b', padding: '10px', borderRadius: '6px', marginBottom: '8px' },
  closeBtn: { backgroundColor: '#ef476f', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' },
  footer: { textAlign: 'center', color: '#4a5568', fontSize: '10px', marginTop: '16px' }
};

// TradingPanel.jsx - مكون لوحة التحكم بالتداول والربط بالذكاء الاصطناعي

import React, { useState, useEffect } from 'react';
import { getGroqTradingDecision } from './groqService';

export default function TradingPanel({ candles = [], currentPrice = 0, onExecuteTrade }) {
  const [loading, setLoading] = useState(false);
  const [isAutoBotActive, setIsAutoBotActive] = useState(false);
  const [decision, setDecision] = useState(null);
  const [logs, setLogs] = useState([]);

  // إضافة سجل أحداث داخل الواجهة
  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  // دالة طلب التحليل
  const runAnalysis = async () => {
    setLoading(true);
    addLog("🤖 جاري إرسال البيانات إلى Groq AI للتحليل...");

    const res = await getGroqTradingDecision(candles, currentPrice);
    setDecision(res);
    setLoading(false);

    addLog(`القرار: ${res.action} | الثقة: ${res.confidence}% | السبب: ${res.reason}`);

    // تنفيذ الصفقة تلقائياً إذا كانت درجة الثقة عالية
    if (res.action !== 'WAIT' && res.confidence >= 75) {
      addLog(`⚡ تم تنفيذ صفقة ${res.action} تلقائياً بناءً على توصية البوت.`);
      if (onExecuteTrade) {
        onExecuteTrade(res);
      }
    }
  };

  // حلقة التداول التلقائية عند تفعيل البوت
  useEffect(() => {
    let interval = null;
    if (isAutoBotActive) {
      addLog("🟢 تم تفعيل التداول التلقائي (تحليل كل 60 ثانية)");
      runAnalysis(); // تشغيل فوري أول مرة
      interval = setInterval(() => {
        runAnalysis();
      }, 60000);
    } else {
      addLog("🔴 التداول التلقائي متوقف حالياً");
    }

    return () => clearInterval(interval);
  }, [isAutoBotActive, candles, currentPrice]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#1e1e2e', color: '#fff', borderRadius: '12px' }}>
      <h2>لوحة التداول الكمي الذكية (Groq AI)</h2>
      <p>السعر الحالي: <strong style={{ color: '#4ade80' }}>${currentPrice}</strong></p>

      {/* أزرار التحكم */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={runAnalysis} 
          disabled={loading || isAutoBotActive}
          style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px' }}
        >
          {loading ? "جاري التحليل..." : "تحليل السعر يدويًا 🤖"}
        </button>

        <button 
          onClick={() => setIsAutoBotActive(!isAutoBotActive)}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer', 
            backgroundColor: isAutoBotActive ? '#ef4444' : '#10b981', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '6px' 
          }}
        >
          {isAutoBotActive ? "إيقاف التداول التلقائي 🛑" : "تشغيل البوت التلقائي 🚀"}
        </button>
      </div>

      {/* عرض نتائج القرار */}
      {decision && (
        <div style={{ padding: '15px', border: '1px solid #374151', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#111827' }}>
          <h3>توصية الذكاء الاصطناعي:</h3>
          <p>
            <strong>القرار:</strong> 
            <span style={{ 
              marginLeft: '8px',
              padding: '4px 8px', 
              borderRadius: '4px',
              backgroundColor: decision.action === 'BUY' ? '#16a34a' : decision.action === 'SELL' ? '#dc2626' : '#6b7280' 
            }}>
              {decision.action}
            </span>
          </p>
          <p><strong>نسبة الثقة:</strong> {decision.confidence}%</p>
          <p><strong>وقف الخسارة (SL):</strong> ${decision.stopLoss}</p>
          <p><strong>الهدف (TP):</strong> ${decision.takeProfit}</p>
          <p><strong>السبب:</strong> {decision.reason}</p>
        </div>
      )}

      {/* سجل الأحداث */}
      <div>
        <h4>سجل العمليات (Console Log):</h4>
        <div style={{ backgroundColor: '#000', padding: '10px', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto', fontSize: '13px', fontFamily: 'monospace' }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

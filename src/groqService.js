// src/groqService.js - خدمة الاتصال المباشر بـ Groq API

const GROQ_API_KEY = "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";

/**
 * جلب قرار التداول الكمي من نموذج الذكاء الاصطناعي
 * @param {Array} candles - مصفوفة الشموع السابقة [{open, high, low, close, volume}]
 * @param {number} currentPrice - السعر الحالي المباشر
 * @returns {Promise<Object>} قرار التداول بصيغة JSON
 */
export async function getGroqTradingDecision(candles, currentPrice) {
  if (!candles || candles.length === 0) {
    return { 
      action: 'WAIT', 
      confidence: 0, 
      stopLoss: 0, 
      takeProfit: 0, 
      reason: 'لا توجد بيانات شموع متاحة للتحليل' 
    };
  }

  // اقتطاع أحدث 15 شمعة لسرعة المعالجة واستجابة السيرفر
  const formattedCandles = candles.slice(-15).map(c => ({
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
    volume: Number(c.volume || 0)
  }));

  const systemPrompt = `أنت محرك تداول كمي مؤسسي (Quant Trading Engine).
وظيفتك تحليل حركة السعر المجردة (Price Action) والسيولة (Liquidity Sweeps & FVG) بدون مؤشرات متأخرة.

المطلوب منك:
1. تحليل اتجاه السعر وهيكل الشموع الأخيرة.
2. رصد وجود أي سحب سيولة من قمة/قاع سابق أو وجود فجوات سعرية (FVG).
3. اتخاذ قرار حاسم: شراء (BUY)، بيع (SELL)، أو انتظار (WAIT).
4. الالتزام الصارم بالتنسيق التالي والرد بصيغة JSON حصراً بدون أي نصوص أو مقدمات إضافية:

{
  "action": "BUY" | "SELL" | "WAIT",
  "confidence": number,
  "stopLoss": number,
  "takeProfit": number,
  "reason": "سبب القرار المباشر بناءً على حركة السعر"
}`;

  const userPrompt = `السعر الحالي: $${currentPrice}\nبيانات أحدث الشموع (OHLCV):\n${JSON.stringify(formattedCandles, null, 2)}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `خطأ في السيرفر: ${response.status}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      const parsedDecision = JSON.parse(data.choices[0].message.content);
      return parsedDecision;
    }

    throw new Error("لم يتم استلام قرار صالح من النموذج");

  } catch (error) {
    console.error("❌ خطأ أثناء الاتصال بـ Groq:", error.message);
    return {
      action: 'WAIT',
      confidence: 0,
      stopLoss: 0,
      takeProfit: 0,
      reason: `خطأ اتصال: ${error.message}`
    };
  }
}

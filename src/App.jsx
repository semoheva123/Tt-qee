import React, { useState } from 'react';
export default function App() {
const [count, setCount] = useState(0);
return (
<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
<div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-slate-700 text-center space-y-6">
<h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
مرحباً بك في React + Vite
</h1>
<p className="text-slate-300 text-sm leading-relaxed">
تم إعداد المشروع بنجاح وهو جاهز للرفع المباشر على منصة Vercel.
</p>
<div className="py-4">
<button
onClick={() => setCount((prev) => prev + 1)}
className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all font-medium text-white shadow-lg shadow-blue-500/25 cursor-pointer"
>
العداد: {count}
</button>
</div>
<div className="text-xs text-slate-400 pt-4 border-t border-slate-700/50">
مسار المكون الرئيسي: <code className="bg-slate-900 px-2 py-1 rounded text-emerald-400">src/App.jsx</code>
</div>
</div>
</div>
);
}

'use client';
import { useState } from 'react';
import API from '../lib/api';

export default function AIAssistantModal() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!query) return;
    const userMsg = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await API.post('/ai/chat', { message: query });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error: Could not retrieve answer.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white px-4 py-2.5 rounded-full shadow-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-700 transition"
      >
        <span>Ask AI Assistant</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-end p-4 z-50">
          <div className="bg-white w-full max-w-md h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-sm">HCM Lite Intelligence</h3>
                <span className="text-[10px] bg-indigo-800 px-1.5 py-0.5 rounded">AI Verified Guardrails</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white text-lg leading-none">&times;</button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50 text-xs">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-2.5 rounded-xl max-w-[80%] ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-800'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && <p className="text-gray-400 text-xs animate-pulse">Assistant is querying backend services...</p>}
            </div>

            <div className="p-3 bg-white border-t flex gap-2">
              <input
                type="text"
                placeholder="Ask about leave, attendance, payroll..."
                className="flex-1 border rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-600"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="bg-indigo-600 text-white text-xs px-3 py-2 rounded-lg font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
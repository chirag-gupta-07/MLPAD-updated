import React, { useState } from 'react';
import axios from 'axios';
import { Bot, Send, Sparkles, User, ShieldAlert, ArrowRight } from 'lucide-react';

export const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; works?: any[] }>>([
    {
      sender: 'assistant',
      text: 'Hello! I am your **MPLADS AI Risk & Decision Support Assistant**. I can help you analyze financial anomalies, search for duplicate infrastructure works, or investigate delayed projects across any Indian district or constituency.\n\nTry asking one of the sample prompts below or type your own question:'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    'Show top high risk works in Uttar Pradesh',
    'Find duplicate infrastructure projects',
    'Which projects are stalled with high fund disbursals?',
    'Summarize delayed works across all states'
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = { sender: 'user' as const, text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await axios.post('/api/assistant/query', { query });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.data.answer,
          works: res.data.highlighted_works
        }
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Sorry, I encountered an issue retrieving the analytical response. Please ensure the backend server is running.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[650px] overflow-hidden">
      
      {/* Assistant Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">MPLADS AI Insights Assistant</h3>
            <p className="text-xs text-slate-400">Contextual Natural Language Q&A on MPLADS Data Lake</p>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          <span>Decision Support Enabled</span>
        </div>
      </div>

      {/* Message Chat Flow */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-line shadow-sm ${
                m.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none'
              }`}
            >
              {m.text}

              {/* Work Cards if included */}
              {m.works && m.works.length > 0 && (
                <div className="mt-3 space-y-2 pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900 block text-[11px] uppercase">Matching Records:</span>
                  {m.works.map((w: any, wIdx: number) => (
                    <div key={wIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span className="font-mono">{w.work_id}</span>
                        {w.risk_score && <span className="text-red-600">Risk: {w.risk_score}/100</span>}
                      </div>
                      <div className="text-slate-600 mt-0.5">
                        {w.sector} · {w.district}, {w.state}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
            <span>Analyzing multi-dimensional risk database...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-1.5">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[11px] bg-white border border-slate-300 text-slate-700 px-2.5 py-1 rounded-full hover:bg-slate-100 transition"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Ask about high-risk works, duplicate projects, state overruns..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};

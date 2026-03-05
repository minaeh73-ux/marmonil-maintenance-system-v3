import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Image as ImageIcon, Search, Zap } from 'lucide-react';
import { chatWithAI, performGroundedSearch, getQuickAdvice } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'model';
  text: string;
  type?: 'text' | 'search' | 'quick';
  sources?: any[];
}

const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am Marmonil Smart Engine AI. How can I assist you with factory operations today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'search' | 'quick'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (imageBase64?: string) => {
    if (!input.trim() && !imageBase64) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let responseText = '';
      let sources: any[] = [];

      if (mode === 'search') {
        const result = await performGroundedSearch(input);
        responseText = result.text || 'No results found.';
        sources = result.sources;
      } else if (mode === 'quick') {
        responseText = await getQuickAdvice(input) || 'No advice available.';
      } else {
        responseText = await chatWithAI(input, messages.slice(-10), imageBase64) || 'I am sorry, I could not process that.';
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: responseText, 
        type: mode,
        sources: sources.length > 0 ? sources : undefined
      }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'An error occurred while communicating with the AI. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSend(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] no-print">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white w-[400px] h-[600px] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight">Smart Engine AI</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">System Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="flex border-b border-slate-100 bg-slate-50 p-3 gap-3">
              <button 
                onClick={() => setMode('chat')}
                className={`flex-1 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mode === 'chat' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <MessageSquare className="w-3 h-3" /> Chat
              </button>
              <button 
                onClick={() => setMode('search')}
                className={`flex-1 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mode === 'search' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Search className="w-3 h-3" /> Search
              </button>
              <button 
                onClick={() => setMode('quick')}
                className={`flex-1 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${mode === 'quick' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Zap className="w-3 h-3" /> Quick
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sources:</span>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((s, i) => (
                            <a key={i} href={s.web?.uri} target="_blank" rel="noreferrer" className="text-[9px] text-blue-600 hover:underline font-bold truncate max-w-[150px]">
                              {s.web?.title || 'Source'}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100 shadow-sm">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-white border-t border-slate-100">
              <div className="relative flex items-center gap-2">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={mode === 'search' ? "Search technical data..." : "Ask Marmonil AI..."}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition-colors pr-12"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleSend()}
                    disabled={isLoading || (!input.trim())}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*" 
              />
              <p className="text-[8px] text-center text-slate-400 font-black uppercase tracking-widest mt-3">
                Powered by Gemini 3.1 Pro • Marmonil Smart Engine
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900 text-white p-5 rounded-full shadow-2xl hover:bg-black transition-all group relative"
      >
        {isOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </motion.button>
    </div>
  );
};

export default AIChatbot;

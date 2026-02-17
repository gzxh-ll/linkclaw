import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Sparkles, Terminal } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 OpenClaw 智能助手。有什么我可以帮你的吗？',
      timestamp: Date.now(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // 调用后端发送消息
      const response = await invoke<string>('send_agent_message', { message: userMsg.content });
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 发送失败: ${error}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-900 text-white rounded-xl overflow-hidden border border-dark-700 shadow-2xl">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 bg-dark-800 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">OpenClaw 智能对话</h2>
            <div className="flex items-center gap-2 text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              在线
            </div>
          </div>
        </div>
        <div className="p-2 bg-dark-700 rounded-lg text-dark-400">
            <Terminal size={18} />
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-dark-900/50">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* 头像 */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-dark-700 text-brand-400 border border-dark-600'
              }`}>
                {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
              </div>

              {/* 内容气泡 */}
              <div className={`max-w-[80%] rounded-2xl p-4 shadow-md ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-dark-700 text-gray-100 border border-dark-600 rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                <div className={`text-[10px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* 加载状态 */}
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center">
              <Sparkles size={20} className="text-brand-400" />
            </div>
            <div className="bg-dark-700 rounded-2xl rounded-tl-none p-4 border border-dark-600 flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-brand-400" />
              <span className="text-sm text-gray-400">OpenClaw 正在思考...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框区域 */}
      <div className="p-4 bg-dark-800 border-t border-dark-700">
        <div className="relative flex items-end gap-2 bg-dark-900 rounded-xl border border-dark-600 p-2 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/50 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息与 OpenClaw 对话..."
            className="flex-1 bg-transparent border-none text-white placeholder-gray-500 resize-none max-h-32 p-3 focus:ring-0 custom-scrollbar"
            rows={1}
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={`p-3 rounded-lg flex-shrink-0 transition-all ${
              input.trim() && !loading
                ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20'
                : 'bg-dark-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-center text-xs text-dark-400 mt-2">
          OpenClaw 可能会产生不准确的信息。
        </p>
      </div>
    </div>
  );
}

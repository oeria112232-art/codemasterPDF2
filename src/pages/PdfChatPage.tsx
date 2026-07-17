import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useCredits } from '../contexts/CreditsContext';
import { useAuth } from '../contexts/AuthContext';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  MessageSquare, Send, Bot, User, FileText,
  Loader2, Sparkles, Trash2, Copy
} from 'lucide-react';
import { ToolPage } from '../components/ToolPage';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function PdfChatPage() {
  useTranslation();
  const { showToast } = useToast();
  useAuth();
  useCredits();
  const [pdfText, setPdfText] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const extractTextFromPdf = async (file: File) => {
    setExtracting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `\n[Page ${i}]\n${pageText}`;
      }

      setPdfText(fullText);
      setPdfName(file.name);
      setMessages([{
        role: 'assistant',
        content: `I've loaded **${file.name}** (${pdf.numPages} pages, ${fullText.length.toLocaleString()} characters). Ask me anything about this document!`,
        timestamp: new Date(),
      }]);
      showToast('PDF loaded successfully', 'success');
    } catch (err) {
      console.error('PDF extraction error:', err);
      showToast('Failed to extract text from PDF', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length > 0) await extractTextFromPdf(files[0]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !pdfText || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'AI is not configured. Please set the VITE_GEMINI_API_KEY environment variable.',
          timestamp: new Date(),
        }]);
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const contextText = pdfText.length > 30000 ? pdfText.substring(0, 30000) + '\n...(truncated)' : pdfText;

      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: `You are a helpful PDF assistant. Here is the document content:\n\n${contextText}\n\nAnswer questions about this document. Be concise and accurate. Use markdown formatting.` }],
          },
          {
            role: 'model',
            parts: [{ text: 'I understand. I have the document loaded and ready to answer questions. Please go ahead.' }],
          },
        ],
      });

      const result = await chat.sendMessage(input.trim());
      const response = result.response.text();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }]);
    } catch (err) {
      console.error('AI error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    showToast('Copied to clipboard', 'success');
  };

  const clearChat = () => {
    setMessages(pdfText ? [{
      role: 'assistant',
      content: `Chat cleared. I still have **${pdfName}** loaded. Ask me anything!`,
      timestamp: new Date(),
    }] : []);
  };

  if (!pdfText) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[2px]">AI-Powered</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
              PDF Chat
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
              Upload a PDF and ask questions about its content using AI
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl border border-slate-100 dark:border-slate-800">
            {extracting ? (
              <div className="p-20 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Extracting text...</p>
              </div>
            ) : (
              <ToolPage
                icon={MessageSquare}
                title=""
                description=""
                color="bg-blue-500"
                onProcess={handleFileUpload}
                hideContent={true}
              />
            )}
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-slate-100 dark:border-slate-800">
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Natural Language</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Ask questions in plain English</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-slate-100 dark:border-slate-800">
                <Bot className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">AI Analysis</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Powered by Google Gemini</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-slate-100 dark:border-slate-800">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Free Tool</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">No credits required</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#020617] flex flex-col h-[calc(100vh-4rem)]">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{pdfName}</p>
            <p className="text-[10px] text-slate-400 font-medium">{pdfText.length.toLocaleString()} characters</p>
          </div>
        </div>
        <button onClick={clearChat} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <Trash2 className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] opacity-50">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.role === 'assistant' && (
                  <button onClick={() => copyMessage(msg.content)} className="opacity-50 hover:opacity-100 transition-opacity">
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask a question about your PDF..."
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl flex items-center justify-center text-white transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

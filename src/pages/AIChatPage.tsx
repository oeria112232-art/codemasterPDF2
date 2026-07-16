import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bot, Send, Loader2, FileText, Upload, X, User,
    Sparkles, Download
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AIChatPage() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { user, loading } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [fileText, setFileText] = useState('');
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: t('aiChat.welcome')
            }]);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" />;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            showToast(t('examGenerator.errors.fileTooLarge'), 'error');
            return;
        }

        setAttachedFile(file);
        setMessages(prev => [...prev, {
            role: 'user',
            content: `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
        }]);

        showToast(t('aiChat.indexing'), 'info');

        try {
            const buffer = await file.arrayBuffer();
            let text = '';

            if (file.name.endsWith('.pdf')) {
                const pdfjsLib = await import('pdfjs-dist');
                const pdfWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
                pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const tc = await page.getTextContent();
                    text += tc.items.map((item: any) => item.str).join(' ') + '\n';
                }
            } else if (file.name.endsWith('.txt')) {
                text = new TextDecoder().decode(buffer);
            } else {
                showToast(t('common.error'), 'error');
                setAttachedFile(null);
                return;
            }

            setFileText(text.slice(0, 30000));
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: t('aiChat.indexSuccess')
            }]);
        } catch {
            showToast(t('aiChat.readFail'), 'error');
            setAttachedFile(null);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async () => {
        if (!input.trim() && !attachedFile) return;

        const key = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
        if (!key) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: t('aiChat.noApiKey')
            }]);
            return;
        }

        const userMessage = input.trim() || (attachedFile ? t('aiChat.attachedAnalyze', { name: attachedFile.name }) : '');
        if (!userMessage) return;

        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setIsProcessing(true);

        try {
            const systemPrompt = fileText
                ? `You are a professional data analyst. The user has attached a document. Here is the extracted text:\n\n---\n${fileText}\n---\n\nAnalyze this data and answer the user's questions. Format data into tables when appropriate. Be concise and professional.`
                : 'You are a professional data analyst and document organizer. Help the user organize, analyze, and format their data. Be concise and professional.';

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || t('aiChat.apiError'));
            }

            const data = await response.json();
            const assistantMessage = data.choices?.[0]?.message?.content || t('aiChat.apiError');

            setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
        } catch (err: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ ${err.message || t('aiChat.apiError')}`
            }]);
        } finally {
            setIsProcessing(false);
            setAttachedFile(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-700 pt-28 pb-0 min-h-screen flex flex-col">
            <div className="max-w-4xl mx-auto px-6 flex-1 flex flex-col w-full">

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 rounded-full mb-4">
                        <Bot className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[2px]">{t('tools.aiChat.title')}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {t('aiChat.intelligentAnalyst')}
                    </h1>
                </div>

                {/* API Key */}
                <div className="mb-4">
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="OpenAI API Key (optional if set in .env)"
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                    />
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-t-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden min-h-[500px] max-h-[60vh]">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-sm'
                                }`}>
                                    <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-slate-500" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex gap-4">
                                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100" />
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        {attachedFile && (
                            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-xs">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <span className="text-indigo-600 font-medium">{attachedFile.name}</span>
                                <button onClick={() => setAttachedFile(null)} className="ml-auto text-slate-400 hover:text-rose-500">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-end gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".pdf,.txt"
                                onChange={handleFileSelect}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all text-slate-500 shrink-0"
                            >
                                <Upload className="w-5 h-5" />
                            </button>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('aiChat.placeholder')}
                                rows={1}
                                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white resize-none"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isProcessing || (!input.trim() && !attachedFile)}
                                className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-indigo-600/20"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatMessage(content: string): string {
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">$1</code>')
        .replace(/\n/g, '<br/>');
}

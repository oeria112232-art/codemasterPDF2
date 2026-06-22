import { useState, useRef, useEffect } from 'react';
import {
    Bot, Send, User,
    FileText, Trash2,
    Zap, Loader2, Table2, FileOutput,
    Building2, Users, CheckCircle2,
    ChevronRight, Paperclip, X, Brain
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as pdfjsLib from 'pdfjs-dist';
import { useToast } from '../contexts/ToastContext';
import OpenAI from 'openai';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, HeadingLevel, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Setup pdf-js worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface EmployeeData {
    name: string;
    company: string;
    role: string;
    department: string;
    email: string;
    phone: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    data?: EmployeeData[];
    fileName?: string;
}

export function AIChatPage() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [attachedFileText, setAttachedFileText] = useState('');
    const [structuredData, setStructuredData] = useState<EmployeeData[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Initialize with a welcome message if empty
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: t('aiChat.welcome'),
                timestamp: new Date()
            }]);
        }
    }, [t]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAttachedFile(file);
        setIsProcessingFile(true);
        setAttachedFileText(''); // Reset text
        showToast(t('aiChat.extracting'), 'info');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

            let extractedContent = '';
            const maxPages = Math.min(pdf.numPages, 50);

            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str || '')
                    .join(' ');
                extractedContent += `[PAGE ${i}]\n${pageText}\n\n`;
            }

            if (!extractedContent.trim()) {
                throw new Error(t('aiChat.noText'));
            }

            setAttachedFileText(extractedContent);
            showToast(t('aiChat.indexSuccess'), 'success');
        } catch (error: any) {
            console.error('Extraction Error:', error);
            showToast(error.message || t('aiChat.readFail'), 'error');
            setAttachedFile(null);
        } finally {
            setIsProcessingFile(false);
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && !attachedFile) || isTyping || isProcessingFile) return;

        const userMsg: Message = {
            id: Math.random().toString(36).substr(2, 9),
            role: 'user',
            content: input || (attachedFile ? t('aiChat.attachedAnalyze', { name: attachedFile.name }) : ''),
            timestamp: new Date(),
            fileName: attachedFile ? attachedFile.name : undefined
        };

        const currentHistory = [...messages, userMsg];
        const currentFileText = attachedFileText;

        setMessages(currentHistory);
        setInput('');
        setIsTyping(true);

        if (!apiKey) {
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: 'no-key', role: 'assistant', timestamp: new Date(),
                    content: t('aiChat.noApiKey')
                }]);
                setIsTyping(false);
            }, 1000);
            return;
        }

        try {
            const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

            const systemPrompt = `You are a professional Data Intelligence Expert & Document Analyst.
            CRITICAL INSTRUCTION: There is a document attached below. You MUST use its content to answer user questions.
            If the document is a teacher's guide, physics book, or employee list, analyze it correctly.
            
            YOUR CAPABILITIES:
            1. Extract specific information (names, tables, concepts).
            2. Summarize content.
            3. If the data is a list of people/companies, ALWAYS output a JSON array labeled "DATA_JSON" inside a code block.
            4. Always respond in ARABIC.
            
            DOCUMENT CONTENT:
            ${currentFileText ? `[[ATTACHED_DOCUMENT_START]]\n${currentFileText.substring(0, 15000)}\n[[ATTACHED_DOCUMENT_END]]` : 'No document content extracted.'}`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    ...currentHistory.map(m => ({ role: m.role as any, content: m.content }))
                ],
            });

            const rawContent = response.choices[0].message.content || "";
            const jsonMatch = rawContent.match(/DATA_JSON\n([\s\S]*?)```/);

            let data: EmployeeData[] = [];
            if (jsonMatch) {
                try {
                    data = JSON.parse(jsonMatch[1].trim());
                    setStructuredData(data);
                } catch (e) { console.error("JSON Parse Error", e); }
            }

            setMessages(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                role: 'assistant',
                content: rawContent.replace(/DATA_JSON\n[\s\S]*?```/, t('aiChat.extractedAndOrganized')),
                timestamp: new Date(),
                data: data.length > 0 ? data : undefined
            }]);
        } catch (error: any) {
            console.error('API Error:', error);
            showToast(t('aiChat.apiError'), 'error');
        } finally {
            setIsTyping(false);
        }
    };

    const exportToExcel = () => {
        if (structuredData.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(structuredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, "Data_Export.xlsx");
        showToast(t('aiChat.excelExport'), "success");
    };

    const exportToWord = async () => {
        if (structuredData.length === 0) return;
        const table = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        t('aiChat.table.name'),
                        t('aiChat.table.entity'),
                        t('aiChat.table.role'),
                        t('aiChat.table.details'),
                        t('aiChat.table.details'),
                        t('aiChat.table.details')
                    ].map(h =>
                        new TableCell({ children: [new Paragraph({ text: h, alignment: AlignmentType.CENTER })], shading: { fill: "f3f4f6" } })
                    )
                }),
                ...structuredData.map(emp => new TableRow({
                    children: [emp.name, emp.company, emp.role, emp.department, emp.email, emp.phone].map(t =>
                        new TableCell({ children: [new Paragraph({ text: t, alignment: AlignmentType.RIGHT })] })
                    )
                }))
            ]
        });

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ text: t('aiChat.intelligentAnalyst'), heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                    new Paragraph({ text: `${t('privacy.lastUpdated')}: ${new Date().toLocaleDateString()}`, spacing: { after: 400 }, alignment: AlignmentType.CENTER }),
                    table
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, "Report_Export.docx");
        showToast(t('aiChat.wordExport'), "success");
    };

    return (
        <div className="flex flex-grow bg-slate-50 dark:bg-[#020617] overflow-hidden font-sans relative">
            {/* Sidebar */}
            <aside className="hidden lg:flex w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0 z-10">
                <div className="p-8 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 text-emerald-600 mb-8">
                        <div className="p-2.5 bg-emerald-500/10 rounded-2xl">
                            <Brain className="w-5 h-5" />
                        </div>
                        <h2 className="font-black uppercase tracking-[3px] text-[11px]">{t('aiChat.processingCenter')}</h2>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">{t('aiChat.actionsAvailable')}</p>
                        <ExportBtn active={structuredData.length > 0} icon={Table2} label={t('aiChat.exportExcel')} onClick={exportToExcel} color="text-emerald-500" />
                        <ExportBtn active={structuredData.length > 0} icon={FileOutput} label={t('aiChat.exportWord')} onClick={exportToWord} color="text-blue-500" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-4 text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-[11px] font-black uppercase tracking-widest leading-none">{t('aiChat.systemStatus')}</span>
                        </div>
                        <div className="space-y-4">
                            <StatusRow label={t('aiChat.engine')} value="GPT-4o Intelligence" />
                            <StatusRow label={t('aiChat.fileIndexing')} value={attachedFileText ? t('aiChat.activeExtracted') : t('aiChat.waitingFile')} />
                            <StatusRow label={t('aiChat.security')} value={t('aiChat.sslActive')} />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col relative h-full bg-white dark:bg-[#020617]">
                <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 shrink-0 z-20">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl flex items-center justify-center shadow-xl">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none mb-1.5">{t('aiChat.intelligentAnalyst')}</h3>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isProcessingFile ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">
                                    {isProcessingFile ? t('aiChat.indexing') : t('aiChat.readyToAnalyze')}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-10 flex flex-col gap-12 scroll-smooth custom-scrollbar bg-slate-50/50 dark:bg-[#020617]/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-6 duration-700`}>
                            <div className={`max-w-[90%] lg:max-w-[85%] flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl ${msg.role === 'assistant' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                    {msg.role === 'assistant' ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                </div>
                                <div className={`flex flex-col gap-6 w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-8 rounded-[2.5rem] leading-relaxed text-sm font-medium shadow-2xl border ${msg.role === 'assistant'
                                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-100 dark:border-slate-700 rounded-tl-none'
                                        : 'bg-emerald-600 text-white border-transparent rounded-tr-none'}`}>

                                        {msg.fileName && (
                                            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-white/10 rounded-xl border border-white/20">
                                                <FileText className="w-4 h-4" />
                                                <span className="text-[11px] font-black uppercase text-white/80">{msg.fileName}</span>
                                            </div>
                                        )}

                                        <div className="whitespace-pre-wrap prose prose-slate dark:prose-invert max-w-none">{msg.content}</div>
                                    </div>

                                    {msg.data && msg.role === 'assistant' && (
                                        <div className="w-full bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-2xl border border-emerald-500/20 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-right border-collapse" dir="rtl">
                                                    <thead>
                                                        <tr className="border-b dark:border-slate-700">
                                                            <th className="p-4 text-[9px] font-black uppercase text-slate-400 text-right">{t('aiChat.table.name')}</th>
                                                            <th className="p-4 text-[9px] font-black uppercase text-slate-400 text-right">{t('aiChat.table.entity')}</th>
                                                            <th className="p-4 text-[9px] font-black uppercase text-slate-400 text-right">{t('aiChat.table.role')}</th>
                                                            <th className="p-4 text-[9px] font-black uppercase text-slate-400 text-right">{t('aiChat.table.details')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-xs">
                                                        {msg.data.slice(0, 10).map((row, i) => (
                                                            <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                <td className="p-4 font-black text-slate-900 dark:text-white">{row.name}</td>
                                                                <td className="p-4 text-slate-500">{row.company}</td>
                                                                <td className="p-4 text-emerald-500 font-bold">{row.role}</td>
                                                                <td className="p-4 text-slate-500">{row.email}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start animate-in fade-in duration-300">
                            <div className="flex gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xl"><Bot className="w-6 h-6 animate-pulse" /></div>
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] rounded-tl-none shadow-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <footer className="p-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <div className="max-w-5xl mx-auto flex flex-col gap-4">

                        {attachedFile && (
                            <div className="flex items-center justify-between px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl self-start group animate-in slide-in-from-left-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <FileText className={`w-4 h-4 text-emerald-500 ${isProcessingFile ? 'animate-pulse' : ''}`} />
                                        {attachedFileText && <CheckCircle2 className="absolute -top-1 -right-1 w-2.5 h-2.5 text-emerald-600 bg-white rounded-full" />}
                                    </div>
                                    <span className="text-[11px] font-black text-emerald-600 truncate max-w-[200px]">{attachedFile.name}</span>
                                    <span className="text-[9px] font-bold text-emerald-400 bg-white/50 px-1.5 rounded uppercase">
                                        {isProcessingFile ? t('aiChat.reading') : t('aiChat.ready')}
                                    </span>
                                    <button onClick={() => { setAttachedFile(null); setAttachedFileText(''); }} className="p-1 hover:bg-emerald-500/20 rounded-md transition-all ml-2">
                                        <X className="w-3 h-3 text-emerald-600" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={t('aiChat.placeholder')}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white dark:focus:bg-slate-800 pl-16 pr-24 py-7 rounded-[3rem] outline-none transition-all font-medium text-base shadow-inner text-slate-900 dark:text-white"
                            />

                            <div className="absolute left-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 bg-white dark:bg-slate-700 shadow-lg rounded-2xl text-slate-400 hover:text-emerald-500 transition-all active:scale-90"
                                >
                                    <Paperclip className="w-6 h-6" />
                                </button>
                                <input type="file" hidden ref={fileInputRef} accept=".pdf" onChange={handleFileChange} />
                            </div>

                            <div className="absolute right-3 flex items-center gap-2">
                                <button
                                    onClick={handleSend}
                                    disabled={(!input.trim() && !attachedFile) || isTyping || isProcessingFile}
                                    className="w-16 h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.8rem] flex items-center justify-center transition-all disabled:opacity-20 active:scale-95 shadow-2xl shadow-emerald-600/40"
                                >
                                    {isTyping ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

function ExportBtn({ icon: Icon, label, onClick, active, color }: any) {
    return (
        <button
            onClick={onClick}
            disabled={!active}
            className={`group w-full px-6 py-5 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-all hover:-translate-y-1 shadow-sm hover:shadow-xl disabled:opacity-20 disabled:grayscale`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-900 ${color}`}><Icon className="w-5 h-5" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">{label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
        </button>
    );
}

function StatusRow({ label, value }: any) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{value}</span>
        </div>
    );
}

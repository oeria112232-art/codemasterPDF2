import { useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    X, Loader2,
    Rows, LayoutGrid, Maximize2,
    Plus, Trash2,
    Scissors, CheckCircle2, Circle
} from 'lucide-react';
import { PDFDocument } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import JSZip from 'jszip';

// Setup worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface SplitRange {
    id: string;
    from: number;
    to: number;
}

interface SplitEditorProps {
    file: File;
    onClose: () => void;
}

export function SplitEditor({ file, onClose }: SplitEditorProps) {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const isRtl = i18n.language === 'ar';

    const [loading, setLoading] = useState(true);
    const [numPages, setNumPages] = useState(0);
    const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
    const [isProcessing, setIsProcessing] = useState(false);

    const [mode, setMode] = useState<'range' | 'pages' | 'size'>('range');
    const [rangeType, setRangeType] = useState<'custom' | 'fixed'>('custom');
    const [fixedInterval, setFixedInterval] = useState(1);
    const [ranges, setRanges] = useState<SplitRange[]>([
        { id: Math.random().toString(36).substr(2, 9), from: 1, to: 1 }
    ]);
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [mergeAfterSplit, setMergeAfterSplit] = useState(false);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const buffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
                setPdfProxy(pdf);
                setNumPages(pdf.numPages);

                // Set initial range to full document
                setRanges([{ id: Math.random().toString(36).substr(2, 9), from: 1, to: pdf.numPages }]);
                // Default selected pages for "Extract Pages" mode
                setSelectedPages(Array.from({ length: pdf.numPages }, (_, i) => i + 1));

                setLoading(false);
            } catch (err) {
                console.error(err);
                showToast(t('common.error'), 'error');
                onClose();
            }
        };
        loadPdf();
    }, [file, onClose, showToast, t]);

    const getThumbnail = useCallback(async (pageNum: number) => {
        if (!pdfProxy || thumbnails[pageNum]) return;

        try {
            const page = await pdfProxy.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.3 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d')!;
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            setThumbnails(prev => ({ ...prev, [pageNum]: canvas.toDataURL() }));
        } catch (err) {
            console.error('Thumbnail error:', err);
        }
    }, [pdfProxy, thumbnails]);

    useEffect(() => {
        if (!loading && pdfProxy) {
            if (mode === 'range') {
                ranges.forEach(r => {
                    getThumbnail(r.from);
                    getThumbnail(r.to);
                });
            } else if (mode === 'pages') {
                // For pages mode, we might want to load all visible thumbnails
                // but for performance, we only load the first 12 or on demand
                for (let i = 1; i <= Math.min(numPages, 12); i++) {
                    getThumbnail(i);
                }
            }
        }
    }, [ranges, loading, pdfProxy, getThumbnail, mode, numPages]);

    const addRange = () => {
        const lastRange = ranges[ranges.length - 1];
        const nextFrom = Math.min(lastRange.to + 1, numPages);
        setRanges([...ranges, {
            id: Math.random().toString(36).substr(2, 9),
            from: nextFrom,
            to: numPages
        }]);
    };

    const updateRange = (id: string, field: 'from' | 'to', value: number) => {
        const val = Math.max(1, Math.min(value, numPages));
        setRanges(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
    };

    const removeRange = (id: string) => {
        if (ranges.length > 1) {
            setRanges(prev => prev.filter(r => r.id !== id));
        }
    };

    const togglePage = (p: number) => {
        setSelectedPages(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a, b) => a - b));
    };

    const selectAll = () => setSelectedPages(Array.from({ length: numPages }, (_, i) => i + 1));
    const selectOdd = () => setSelectedPages(Array.from({ length: numPages }, (_, i) => i + 1).filter(p => p % 2 !== 0));
    const selectEven = () => setSelectedPages(Array.from({ length: numPages }, (_, i) => i + 1).filter(p => p % 2 === 0));

    const handleSplit = async () => {
        try {
            setIsProcessing(true);
            const originalBuffer = await file.arrayBuffer();
            const srcDoc = await PDFDocument.load(originalBuffer);

            if (mode === 'range') {
                let actualRanges = ranges;
                if (rangeType === 'fixed') {
                    actualRanges = [];
                    for (let i = 1; i <= numPages; i += fixedInterval) {
                        actualRanges.push({
                            id: i.toString(),
                            from: i,
                            to: Math.min(i + fixedInterval - 1, numPages)
                        });
                    }
                }

                if (mergeAfterSplit) {
                    const mainPdf = await PDFDocument.create();
                    for (const range of actualRanges) {
                        const indices = Array.from({ length: range.to - range.from + 1 }, (_, i) => range.from - 1 + i);
                        const copiedPages = await mainPdf.copyPages(srcDoc, indices);
                        copiedPages.forEach(p => mainPdf.addPage(p));
                    }
                    const blob = new Blob([await mainPdf.save() as any]);
                    saveAs(blob, `split_merged_${file.name}`);
                } else {
                    const zip = new JSZip();
                    for (let i = 0; i < actualRanges.length; i++) {
                        const range = actualRanges[i];
                        const newPdf = await PDFDocument.create();
                        const indices = Array.from({ length: range.to - range.from + 1 }, (_, i) => range.from - 1 + i);
                        const copiedPages = await newPdf.copyPages(srcDoc, indices);
                        copiedPages.forEach(p => newPdf.addPage(p));
                        const pdfBytes = await newPdf.save();
                        zip.file(`split_range_${i + 1}_${file.name}`, pdfBytes);
                    }
                    const content = await zip.generateAsync({ type: 'blob' });
                    saveAs(content, `split_ranges_${file.name}.zip`);
                }
            } else if (mode === 'pages') {
                if (selectedPages.length === 0) {
                    showToast(t('toolPage.selectFile'), 'error');
                    return;
                }

                if (mergeAfterSplit) {
                    const mainPdf = await PDFDocument.create();
                    const indices = selectedPages.map(p => p - 1);
                    const copiedPages = await mainPdf.copyPages(srcDoc, indices);
                    copiedPages.forEach(p => mainPdf.addPage(p));
                    const blob = new Blob([await mainPdf.save() as any]);
                    saveAs(blob, `extracted_pages_${file.name}`);
                } else {
                    const zip = new JSZip();
                    // Export each page as separate PDF
                    for (const p of selectedPages) {
                        const newPdf = await PDFDocument.create();
                        const [copiedPage] = await newPdf.copyPages(srcDoc, [p - 1]);
                        newPdf.addPage(copiedPage);
                        const pdfBytes = await newPdf.save();
                        zip.file(`page_${p}_${file.name}`, pdfBytes);
                    }
                    const content = await zip.generateAsync({ type: 'blob' });
                    saveAs(content, `extracted_pages_${file.name}.zip`);
                }
            }

            showToast(t('editor.exportSuccess'), 'success');
            onClose();
        } catch (err) {
            console.error(err);
            showToast(t('common.error'), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
        </div>
    );

    return (
        <div className={`fixed inset-0 z-[100] bg-[#f8f9fa] flex flex-col font-sans overflow-hidden ${isRtl ? 'rtl' : 'ltr'}`}>
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all"><X className="w-5 h-5" /></button>
                    <div className="h-8 w-[1px] bg-slate-200 mx-2" />
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold text-slate-900 truncate max-w-[300px]">{file.name}</h2>
                        <span className="text-[10px] text-slate-400 font-medium">PDF Tool · Split Engine</span>
                    </div>
                </div>
                <button
                    onClick={handleSplit} disabled={isProcessing}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-rose-200 active:scale-95 disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                    {t('splitTool.splitPdf')}
                </button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <aside className="w-85 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-xl overflow-y-auto custom-scrollbar">
                    <div className="p-6">
                        <h3 className="text-xl font-black text-slate-800 mb-8">{t('splitTool.options')}</h3>

                        <div className="grid grid-cols-3 gap-2 mb-8 bg-slate-100 p-1 rounded-2xl">
                            <ModeTab
                                active={mode === 'range'} onClick={() => setMode('range')}
                                icon={Rows} label={t('splitTool.range')}
                            />
                            <ModeTab
                                active={mode === 'pages'} onClick={() => setMode('pages')}
                                icon={LayoutGrid} label={t('splitTool.pages')}
                            />

                        </div>

                        {mode === 'range' ? (
                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">{t('splitTool.rangeMode')}</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <RangeTypeBtn
                                            active={rangeType === 'custom'} onClick={() => setRangeType('custom')}
                                            label={t('splitTool.customRange')}
                                        />
                                        <RangeTypeBtn
                                            active={rangeType === 'fixed'} onClick={() => setRangeType('fixed')}
                                            label={t('splitTool.fixedRange')}
                                        />
                                    </div>
                                </div>

                                {rangeType === 'custom' ? (
                                    <div className="space-y-4">
                                        {ranges.map((range, idx) => (
                                            <div key={range.id} className="p-5 bg-slate-50 border border-slate-200 rounded-3xl relative group animate-in slide-in-from-right-4 duration-300">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-[11px] font-black text-rose-500 uppercase tracking-widest">{t('splitTool.rangeLabel')} {idx + 1}</span>
                                                    {ranges.length > 1 && (
                                                        <button onClick={() => removeRange(range.id)} className="p-1.5 hover:bg-rose-100 text-rose-400 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <span className="text-[10px] text-slate-400 font-bold">{t('splitTool.fromPage')}</span>
                                                        <input
                                                            type="number" value={range.from}
                                                            onChange={(e) => updateRange(range.id, 'from', parseInt(e.target.value))}
                                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <span className="text-[10px] text-slate-400 font-bold">{t('splitTool.toPage')}</span>
                                                        <input
                                                            type="number" value={range.to}
                                                            onChange={(e) => updateRange(range.id, 'to', parseInt(e.target.value))}
                                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            onClick={addRange}
                                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-sm font-black text-slate-400 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50/50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            {t('splitTool.addRange')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t('splitTool.rangeLabel')}</label>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-bold text-slate-600">{t('splitTool.splitPdf')} {fixedInterval} {t('splitTool.pages')} </span>
                                            <input
                                                type="number" value={fixedInterval}
                                                onChange={(e) => setFixedInterval(Math.max(1, parseInt(e.target.value)))}
                                                className="w-20 p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                <label className="flex items-start gap-4 p-5 bg-slate-50 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all border border-slate-100 shadow-sm">
                                    <input
                                        type="checkbox" checked={mergeAfterSplit}
                                        onChange={(e) => setMergeAfterSplit(e.target.checked)}
                                        className="mt-1 w-5 h-5 rounded-lg border-slate-300 text-rose-500 focus:ring-rose-500"
                                    />
                                    <span className="text-xs font-bold text-slate-600 leading-relaxed">{t('splitTool.mergeRanges')}</span>
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={selectAll} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100">Select All</button>
                                    <button onClick={() => setSelectedPages([])} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100">Clear</button>
                                    <button onClick={selectOdd} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100">Odd Pages</button>
                                    <button onClick={selectEven} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100">Even Pages</button>
                                </div>

                                <label className="flex items-start gap-4 p-5 bg-slate-50 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all border border-slate-100 shadow-sm">
                                    <input
                                        type="checkbox" checked={mergeAfterSplit}
                                        onChange={(e) => setMergeAfterSplit(e.target.checked)}
                                        className="mt-1 w-5 h-5 rounded-lg border-slate-300 text-rose-500 focus:ring-rose-500"
                                    />
                                    <span className="text-xs font-bold text-slate-600 leading-relaxed">{t('splitTool.mergeRanges')}</span>
                                </label>

                                <p className="text-[10px] text-slate-400 font-bold px-2 italic">Select the pages you want to extract from the PDF file.</p>
                            </div>
                        )}
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto bg-[#eef0f2] p-12 custom-scrollbar flex flex-col items-center">
                    <div className="w-full max-w-5xl">
                        {mode === 'range' && (
                            <div className="space-y-12 w-full">
                                {rangeType === 'custom' ? ranges.map((range, idx) => (
                                    <div key={range.id} className="relative animate-in slide-in-from-bottom-8 duration-500">
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white px-6 py-1.5 rounded-full shadow-md text-[10px] font-black text-rose-500 uppercase tracking-[4px] z-10 border border-slate-100">
                                            {t('splitTool.rangeLabel')} {idx + 1}
                                        </div>
                                        <div className="p-12 bg-white/40 border-2 border-dashed border-slate-300 rounded-[40px] flex items-center justify-center gap-12 group hover:bg-white/60 transition-all">
                                            <RangeThumbnail src={thumbnails[range.from]} pageNum={range.from} />
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-16 h-[2px] bg-slate-300 relative">
                                                    <div className="absolute inset-0 bg-rose-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-rose-400 transition-colors">...</span>
                                                <div className="w-16 h-[2px] bg-slate-300 relative">
                                                    <div className="absolute inset-0 bg-rose-500 origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                                                </div>
                                            </div>
                                            <RangeThumbnail src={thumbnails[range.to]} pageNum={range.to} />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center p-20 border-2 border-dashed border-slate-300 rounded-[3rem] bg-white/30">
                                        <Maximize2 className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                                        <h4 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Fixed Interval Splitting</h4>
                                        <p className="text-slate-400 font-bold mt-2">Every {fixedInterval} pages will be saved as a new PDF.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === 'pages' && (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {Array.from({ length: numPages }, (_, i) => i + 1).map(p => {
                                    const isSelected = selectedPages.includes(p);
                                    return (
                                        <div
                                            key={p}
                                            onClick={() => { togglePage(p); getThumbnail(p); }}
                                            className={`relative cursor-pointer group animate-in zoom-in duration-300`}
                                            style={{ animationDelay: `${(p % 12) * 50}ms` }}
                                        >
                                            <div className={`bg-white p-2 rounded-2xl shadow-xl transition-all border-2 ${isSelected ? 'border-rose-500 scale-105' : 'border-transparent hover:border-slate-200'}`}>
                                                {thumbnails[p] ? (
                                                    <img src={thumbnails[p]} className="w-full h-auto rounded-lg" alt={`Page ${p}`} />
                                                ) : (
                                                    <div className="w-full aspect-[1/1.4] bg-slate-50 rounded-lg flex items-center justify-center">
                                                        <Loader2 className="w-4 h-4 text-slate-200 animate-spin" />
                                                    </div>
                                                )}
                                                <div className="mt-2 text-center text-[10px] font-black text-slate-400">{p}</div>
                                            </div>
                                            <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all ${isSelected ? 'bg-rose-500 text-white translate-x-2 -translate-y-2' : 'bg-white text-slate-200 opacity-0 group-hover:opacity-100'}`}>
                                                {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}


                    </div>
                </main>
            </div>
        </div>
    );
}

function ModeTab({ active, onClick, icon: Icon, label, premium }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all relative ${active ? 'bg-white text-rose-500 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
        >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            {premium && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full border border-white" />
            )}
        </button>
    );
}

function RangeTypeBtn({ active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`py-3 rounded-xl text-[11px] font-bold transition-all border-2 ${active ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}
        >
            {label}
        </button>
    );
}

function RangeThumbnail({ src, pageNum }: any) {
    return (
        <div className="relative animate-in zoom-in duration-500">
            <div className="bg-white p-2 rounded-2xl shadow-2xl border border-slate-100 transform transition-transform group-hover:scale-105">
                {src ? (
                    <img src={src} className="w-40 h-auto rounded-lg" alt={`Page ${pageNum}`} />
                ) : (
                    <div className="w-40 h-56 bg-white rounded-lg flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-slate-200 animate-spin" />
                    </div>
                )}
                <div className="mt-2 text-center text-[10px] font-black text-slate-400">{pageNum}</div>
            </div>
        </div>
    );
}

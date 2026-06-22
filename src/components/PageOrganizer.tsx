import React, { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    X, Loader2, GripVertical, Trash2,
    RotateCw, RotateCcw, ZoomIn, ZoomOut, CheckCircle2
} from 'lucide-react';
import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';

interface PageOrganizerProps {
    file: File;
    toolType?: string;
    onClose: () => void;
}

interface PageData {
    id: string;
    num: number;
    url: string;
    rotation: number;
}

export function PageOrganizer({ file, toolType, onClose }: PageOrganizerProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [pages, setPages] = useState<PageData[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        const loadThumbnails = async () => {
            try {
                const buffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
                const thumbs: PageData[] = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const vp = page.getViewport({ scale: 0.5 });
                    const canvas = document.createElement('canvas');
                    canvas.width = vp.width;
                    canvas.height = vp.height;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp } as any).promise;
                    thumbs.push({
                        id: Math.random().toString(36).substr(2, 9),
                        num: i,
                        url: canvas.toDataURL(),
                        rotation: 0
                    });
                }
                setPages(thumbs);
                setLoading(false);
            } catch (err) {
                console.error(err);
                onClose();
            }
        };
        loadThumbnails();
    }, [file]);

    const rotatePage = (index: number, direction: 'cw' | 'ccw') => {
        const newPages = [...pages];
        const amount = direction === 'cw' ? 90 : -90;
        newPages[index].rotation = (newPages[index].rotation + amount) % 360;
        setPages(newPages);
    };
    const rotateAll = (direction: 'cw' | 'ccw') => {
        const amount = direction === 'cw' ? 90 : -90;
        setPages(pages.map(p => ({ ...p, rotation: (p.rotation + amount) % 360 })));
    };

    const deletePage = (index: number) => {
        if (pages.length <= 1) {
            alert(t('organizer.cannotDelete'));
            return;
        }
        setPages(pages.filter((_, i) => i !== index));
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('index', index.toString());
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        const sourceIndex = parseInt(e.dataTransfer.getData('index'));
        const newPages = [...pages];
        const [moved] = newPages.splice(sourceIndex, 1);
        newPages.splice(targetIndex, 0, moved);
        setPages(newPages);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
            const newPdf = await PDFDocument.create();

            const originalPages = pdfDoc.getPages();

            for (const pData of pages) {
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [pData.num - 1]);
                if (pData.rotation !== 0) {
                    const currentRotation = copiedPage.getRotation().angle;
                    copiedPage.setRotation(degrees(currentRotation + pData.rotation));
                }
                newPdf.addPage(copiedPage);
            }

            const out = await newPdf.save();
            saveAs(new Blob([out as any]), `organized_${file.name}`);
            onClose();
        } catch (err) {
            console.error(err);
            alert(t('organizer.errorSaving'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#f8fafc] dark:bg-[#0f172a] flex flex-col font-sans animate-in fade-in duration-300 overflow-hidden">
            <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 z-20">
                <div className="flex items-center gap-6">
                    <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-500 transition-all active:scale-90">
                        <X className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">{file.name}</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">{toolType === 'rotate' ? t('tools.rotate.title') : t('organizer.mode')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => rotateAll('ccw')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all flex items-center gap-2 font-bold text-xs">
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden lg:inline">{t('organizer.rotateAllLeft')}</span>
                    </button>
                    <button onClick={() => rotateAll('cw')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all flex items-center gap-2 font-bold text-xs">
                        <RotateCw className="w-4 h-4" />
                        <span className="hidden lg:inline">{t('organizer.rotateAllRight')}</span>
                    </button>
                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800 mx-2" />
                </div>

                <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-all"><ZoomOut className="w-4 h-4" /></button>
                    <span className="px-3 text-xs font-bold text-slate-600 dark:text-slate-300">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-all"><ZoomIn className="w-4 h-4" /></button>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-indigo-500/30"
                >
                    {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    {isSaving ? t('organizer.processing') : t('organizer.applyChanges')}
                </button>
            </header >

            <main className="flex-1 overflow-y-auto p-12 scroll-smooth custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-400 font-black uppercase tracking-[3px] text-[10px]">{t('organizer.analyzing')}</p>
                    </div>
                ) : (
                    <div
                        className="grid gap-12 transition-all duration-500 mx-auto"
                        style={{
                            gridTemplateColumns: `repeat(auto-fill, minmax(${200 * zoom}px, 1fr))`,
                            maxWidth: '1600px'
                        }}
                    >
                        {pages.map((p, i) => (
                            <div
                                key={p.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, i)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, i)}
                                className="group relative flex flex-col items-center animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500"
                            >
                                <div className="relative w-full bg-white dark:bg-slate-800 p-3 rounded-[32px] shadow-2xl border-4 border-transparent group-hover:border-indigo-500/50 group-hover:shadow-indigo-500/10 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-2">
                                    <div
                                        className="overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 transition-transform duration-300 shadow-inner"
                                        style={{ transform: `rotate(${p.rotation}deg)` }}
                                    >
                                        <img src={p.url} alt={`Page ${p.num}`} className="w-full h-auto select-none" />
                                    </div>

                                    <div className="absolute top-6 left-6 w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-xl border-2 border-white dark:border-slate-800">
                                        {i + 1}
                                    </div>

                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 flex flex-col gap-2">
                                        <button onClick={() => rotatePage(i, 'ccw')} title={t('organizer.rotateLeft')} className="p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shadow-lg hover:bg-slate-50 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                                        <button onClick={() => rotatePage(i, 'cw')} title={t('organizer.rotateRight')} className="p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shadow-lg hover:bg-slate-50 transition-colors"><RotateCw className="w-4 h-4" /></button>
                                        <button onClick={() => deletePage(i)} title={t('organizer.deletePage')} className="p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>

                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 text-slate-400">
                                        <GripVertical className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    {t('organizer.originalPage', { num: p.num })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <footer className="h-12 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {t('organizer.hint', { count: pages.length })}
                </p>
            </footer>
        </div >
    );
}

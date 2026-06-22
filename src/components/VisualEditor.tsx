import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    X, Type, Crop as CropIcon,
    ShieldAlert, Loader2, Trash2, Check,
    Undo2, Redo2, ZoomIn, ZoomOut, Move,
    Sparkles, Layers,
    Maximize2
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';

// Setup worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface VisualEditorProps {
    file: File;
    toolType: string;
    onClose: () => void;
}

interface PageItem {
    id: string;
    page: number;
    x: number;
    y: number;
    type: 'text' | 'redaction' | 'image';
    content?: string;
    imgUrl?: string;
    imgData?: Uint8Array;
    w?: number;
    h?: number;
    color?: { r: number, g: number, b: number };
    fontSize?: number;
}

export function VisualEditor({ file, toolType, onClose }: VisualEditorProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [items, setItems] = useState<PageItem[]>([]);
    const [history, setHistory] = useState<PageItem[][]>([]);
    const [redoStack, setRedoStack] = useState<PageItem[][]>([]);
    const [selectedTool, setSelectedTool] = useState(toolType);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null); // For text editing
    const [isSaving, setIsSaving] = useState(false);
    const [zoom, setZoom] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Crop State (0-100%)
    const [cropMargins, setCropMargins] = useState({ t: 10, b: 10, l: 10, r: 10 });

    const pushHistory = useCallback((newItems: PageItem[]) => {
        setHistory(prev => [...prev, items]);
        setItems(newItems);
        setRedoStack([]);
    }, [items]);

    const undo = () => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setRedoStack([items, ...redoStack]);
        setItems(prev);
        setHistory(history.slice(0, -1));
    };

    const redo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[0];
        setHistory([...history, items]);
        setItems(next);
        setRedoStack(redoStack.slice(1));
    };

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const buffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
                setPdfProxy(pdf);
                setLoading(false);
            } catch (err) {
                console.error(err);
                onClose();
            }
        };
        loadPdf();
    }, [file, onClose]);

    // Handle Delete Key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && activeId && !editingId) {
                const newItems = items.filter(it => it.id !== activeId);
                pushHistory(newItems);
                setActiveId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeId, editingId, items, pushHistory]);

    const handlePageClick = (pageNum: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (activeId || editingId) {
            if (!editingId) setActiveId(null);
            return;
        }
        if (selectedTool === 'crop') return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (selectedTool === 'edit') {
            // Add Text Mode
            const newItem: PageItem = {
                id: Math.random().toString(36).substr(2, 9),
                page: pageNum, x, y, type: 'text', content: '',
                color: { r: 0, g: 0, b: 0 }, fontSize: 16
            };
            pushHistory([...items, newItem]);
            setActiveId(newItem.id);
            setEditingId(newItem.id);
        } else if (selectedTool === 'redact') {
            const newItem: PageItem = {
                id: Math.random().toString(36).substr(2, 9),
                page: pageNum, x, y, type: 'redaction', w: 15, h: 5
            };
            pushHistory([...items, newItem]);
            setActiveId(newItem.id);
        }
    };

    const updateItem = (id: string, updates: Partial<PageItem>) => {
        const newItems = items.map(it => it.id === id ? { ...it, ...updates } : it);
        setItems(newItems);
    };

    const finishEditing = (id: string, content: string) => {
        if (!content.trim()) {
            // Remove empty item
            setItems(prev => prev.filter(it => it.id !== id));
        } else {
            updateItem(id, { content });
        }
        setEditingId(null);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
            const pages = pdfDoc.getPages();
            const standardFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            for (const item of items) {
                const page = pages[item.page - 1];
                const { width, height } = page.getSize();
                const pdfX = (item.x / 100) * width;
                const pdfY = (1 - (item.y / 100)) * height;

                if (item.type === 'text' && item.content) {
                    const font = item.fontSize && item.fontSize > 20 ? boldFont : standardFont;
                    page.drawText(item.content, {
                        x: pdfX, y: pdfY,
                        size: item.fontSize || 14,
                        font, color: item.color ? rgb(item.color.r, item.color.g, item.color.b) : rgb(0, 0, 0)
                    });
                } else if (item.type === 'redaction') {
                    const rW = (item.w! / 100) * width;
                    const rH = (item.h! / 100) * height;
                    page.drawRectangle({ x: pdfX - rW / 2, y: pdfY - rH / 2, width: rW, height: rH, color: rgb(0, 0, 0) });
                }
            }

            if (selectedTool === 'crop') {
                pages.forEach(p => {
                    const { width, height } = p.getSize();
                    const top = (cropMargins.t / 100) * height;
                    const bottom = (cropMargins.b / 100) * height;
                    const left = (cropMargins.l / 100) * width;
                    const right = (cropMargins.r / 100) * width;
                    p.setMediaBox(left, bottom, width - right - left, height - top - bottom);
                    p.setCropBox(left, bottom, width - right - left, height - top - bottom);
                });
            }

            const blob = new Blob([await pdfDoc.save()]);
            saveAs(blob, `edited_${file.name}`);
            showToast(t('editor.exportSuccess'), 'success');
            onClose();
        } catch (err) {
            console.error(err);
            showToast(t('editor.critError'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const activeItem = items.find(it => it.id === activeId);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 border-none flex flex-col font-sans overflow-hidden animate-in fade-in duration-500">
            <input type="file" hidden ref={fileInputRef} accept="image/*" className="hidden" />

            <header className="h-20 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-8 shrink-0 z-30 shadow-2xl">
                <div className="flex items-center gap-8">
                    <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-400 transition-all active:scale-90"><X className="w-5 h-5" /></button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            <h2 className="text-sm font-black text-white tracking-widest uppercase truncate max-w-[200px]">{file.name}</h2>
                        </div>
                        <div className="flex gap-4 items-center mt-1.5">
                            <div className="flex gap-1.5">
                                <button onClick={undo} disabled={history.length === 0} className="p-1.5 rounded-lg bg-slate-800/50 text-slate-500 hover:text-white disabled:opacity-20 hover:bg-slate-800"><Undo2 className="w-3.5 h-3.5" /></button>
                                <button onClick={redo} disabled={redoStack.length === 0} className="p-1.5 rounded-lg bg-slate-800/50 text-slate-500 hover:text-white disabled:opacity-20 hover:bg-slate-800"><Redo2 className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="h-3 w-[1px] bg-slate-800" />
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{selectedTool} {t('editor.active')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex items-center bg-slate-950 p-1.5 rounded-[1.5rem] border border-slate-800">
                    <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 transition-all"><ZoomOut className="w-4 h-4" /></button>
                    <div className="px-5 text-[10px] font-black text-slate-300 w-16 text-center">{Math.round(zoom * 100)}%</div>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 transition-all"><ZoomIn className="w-4 h-4" /></button>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Hi-Def Engine</span>
                    </div>
                    <button
                        onClick={handleSave} disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-indigo-600/30"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {isSaving ? t('editor.finalize') : t('editor.exportResult')}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <aside className="w-20 lg:w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                        <p className="hidden lg:block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-2">{t('editor.workspaceTools')}</p>
                        <ToolBtn active={selectedTool === 'edit'} onClick={() => setSelectedTool('edit')} icon={Type} label={t('editor.textContent')} desc={t('editor.textDesc')} />
                        <ToolBtn active={selectedTool === 'redact'} onClick={() => setSelectedTool('redact')} icon={ShieldAlert} label={t('editor.privacyMask')} desc={t('editor.maskDesc')} />
                        <ToolBtn active={selectedTool === 'crop'} onClick={() => setSelectedTool('crop')} icon={CropIcon} label={t('editor.boundaryCrop')} desc={t('editor.cropDesc')} />

                        {(activeItem || selectedTool === 'crop') && (
                            <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col gap-6 animate-in slide-in-from-left-4 duration-300">
                                <div className="flex items-center justify-between px-2">
                                    <p className="hidden lg:block text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('editor.configuration')}</p>
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                        <Settings2 className="w-4 h-4" />
                                    </div>
                                </div>

                                {selectedTool === 'crop' ? (
                                    <div className="flex flex-col gap-5 px-2">
                                        <CropInput label={t('editor.topMargin')} value={cropMargins.t} onChange={(v: number) => setCropMargins({ ...cropMargins, t: v })} />
                                        <CropInput label={t('editor.bottomMargin')} value={cropMargins.b} onChange={(v: number) => setCropMargins({ ...cropMargins, b: v })} />
                                        <CropInput label={t('editor.leftMargin')} value={cropMargins.l} onChange={(v: number) => setCropMargins({ ...cropMargins, l: v })} />
                                        <CropInput label={t('editor.rightMargin')} value={cropMargins.r} onChange={(v: number) => setCropMargins({ ...cropMargins, r: v })} />
                                    </div>
                                ) : activeItem?.type === 'text' ? (
                                    <>
                                        <div className="flex flex-col gap-2 px-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('editor.colorPalette')}</label>
                                            <input
                                                type="color"
                                                className="w-full h-10 bg-slate-800 rounded-xl border-none cursor-pointer p-1"
                                                value={`#${((1 << 24) + ((activeItem.color?.r || 0) * 255 << 16) + ((activeItem.color?.g || 0) * 255 << 8) + ((activeItem.color?.b || 0) * 255)).toString(16).slice(1)}`}
                                                onChange={(e) => {
                                                    const hex = e.target.value;
                                                    const r = parseInt(hex.slice(1, 3), 16) / 255;
                                                    const g = parseInt(hex.slice(3, 5), 16) / 255;
                                                    const b = parseInt(hex.slice(5, 7), 16) / 255;
                                                    updateItem(activeItem.id, { color: { r, g, b } });
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2 px-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex justify-between">
                                                {t('editor.fontDimension')} <span>{activeItem.fontSize}px</span>
                                            </label>
                                            <input
                                                type="range" min="8" max="72"
                                                value={activeItem.fontSize || 14}
                                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500"
                                                onChange={(e) => updateItem(activeItem.id, { fontSize: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </>
                                ) : (activeItem?.type === 'redaction') && (
                                    <div className="flex flex-col gap-5 px-2">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('editor.boundingWidth')}</label>
                                            <input type="range" min="1" max="100" value={activeItem.w} onChange={(e) => updateItem(activeItem.id, { w: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('editor.boundingHeight')}</label>
                                            <input type="range" min="1" max="100" value={activeItem.h} onChange={(e) => updateItem(activeItem.id, { h: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500" />
                                        </div>
                                    </div>
                                )}

                                {activeId && (
                                    <button
                                        onClick={() => { pushHistory(items.filter(it => it.id !== activeId)); setActiveId(null); }}
                                        className="mt-4 flex items-center justify-center gap-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[2px] border border-rose-500/30"
                                    >
                                        <Trash2 className="w-4 h-4" /> {t('editor.purgeElement')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                <main className="flex-1 bg-slate-950 overflow-y-auto p-12 scroll-smooth flex flex-col items-center gap-16 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-6">
                            <div className="w-20 h-20 border-[6px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <div className="text-center">
                                <p className="text-indigo-400 font-black uppercase tracking-[6px] text-xs">{t('editor.highFidelityRender')}</p>
                                <p className="text-slate-600 text-[10px] font-bold mt-2 uppercase">{t('editor.deciphering')}</p>
                            </div>
                        </div>
                    ) : (
                        pdfProxy && Array.from({ length: pdfProxy.numPages }, (_, i) => (
                            <EditorPage
                                key={i + 1} pageNum={i + 1} zoom={zoom} pdf={pdfProxy}
                                items={items.filter(it => it.page === i + 1)}
                                activeId={activeId}
                                editingId={editingId}
                                onSelect={(id: string) => setActiveId(id)}
                                onClick={(e: React.MouseEvent<HTMLDivElement>) => handlePageClick(i + 1, e)}
                                updatePos={(id: string, x: number, y: number) => updateItem(id, { x, y })}
                                onEditFinish={finishEditing}
                                isCropMode={selectedTool === 'crop'}
                                cropMargins={cropMargins}
                            />
                        ))
                    )}
                </main>
            </div>
        </div>
    );
}

function ToolBtn({ active, onClick, icon: Icon, label, desc }: any) {
    return (
        <button
            onClick={onClick}
            className={`p-5 rounded-[2rem] flex flex-col lg:flex-row items-center lg:items-start gap-4 transition-all border-2 text-left w-full ${active
                ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-600/30 -translate-y-1'
                : 'bg-slate-800/20 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
        >
            <div className={`p-3 rounded-2xl shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="hidden lg:block overflow-hidden">
                <p className={`font-black text-xs uppercase tracking-widest ${active ? 'text-white' : 'text-slate-200'}`}>{label}</p>
                <p className="text-[9px] opacity-40 mt-1 font-bold truncate">{desc}</p>
            </div>
        </button>
    );
}

function CropInput({ label, value, onChange }: any) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex justify-between">{label} <span>{value}%</span></label>
            <input type="range" min="0" max="40" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500" />
        </div>
    );
}

function EditorPage({ pageNum, pdf, zoom, items, activeId, editingId, onSelect, onClick, updatePos, onEditFinish, isCropMode, cropMargins }: any) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const render = async () => {
            const page = await pdf.getPage(pageNum);
            const vp = page.getViewport({ scale: 1.5 * zoom });
            setSize({ w: vp.width, h: vp.height });
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = vp.width; canvas.height = vp.height;
                await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
            }
        };
        render();
    }, [pdf, pageNum, zoom]);

    return (
        <div className="flex flex-col items-center">
            <div className="mb-6 flex items-center gap-3">
                <div className="h-[1px] w-8 bg-slate-800" />
                <span className="text-[10px] font-black text-indigo-500/50 uppercase tracking-[4px]">Page Index {pageNum}</span>
                <div className="h-[1px] w-8 bg-slate-800" />
            </div>
            <div
                className={`relative bg-white shadow-[0_0_150px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300 ${isCropMode ? 'ring-4 ring-indigo-500/50 cursor-ns-resize' : 'cursor-crosshair'}`}
                style={{ width: size.w, height: size.h }}
                onClick={onClick}
            >
                <canvas ref={canvasRef} className="block pointer-events-none" />

                {isCropMode && (
                    <div className="absolute inset-0 pointer-events-none transition-all duration-300">
                        {/* Marginal Shading */}
                        <div className="absolute top-0 inset-x-0 bg-slate-900/60 backdrop-blur-[2px] border-b border-indigo-500/50 transition-all" style={{ height: `${cropMargins.t}%` }} />
                        <div className="absolute bottom-0 inset-x-0 bg-slate-900/60 backdrop-blur-[2px] border-t border-indigo-500/50 transition-all" style={{ height: `${cropMargins.b}%` }} />
                        <div className="absolute left-0 inset-y-0 bg-slate-900/60 backdrop-blur-[2px] border-r border-indigo-500/50 transition-all" style={{ width: `${cropMargins.l}%`, top: `${cropMargins.t}%`, bottom: `${cropMargins.b}%` }} />
                        <div className="absolute right-0 inset-y-0 bg-slate-900/60 backdrop-blur-[2px] border-l border-indigo-500/50 transition-all" style={{ width: `${cropMargins.r}%`, top: `${cropMargins.t}%`, bottom: `${cropMargins.b}%` }} />

                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="px-6 py-2 bg-indigo-600 rounded-full shadow-2xl animate-pulse">
                                <span className="text-[10px] font-black text-white uppercase tracking-[4px]">Adjust Projection</span>
                            </div>
                        </div>
                    </div>
                )}

                {items.map((it: PageItem) => (
                    <DraggableItem
                        key={it.id} item={it} zoom={zoom}
                        active={activeId === it.id}
                        isEditing={editingId === it.id}
                        onSelect={(id: string) => onSelect(id)}
                        updatePos={(id: string, x: number, y: number) => updatePos(id, x, y)}
                        onEditFinish={onEditFinish}
                    />
                ))}
            </div>
        </div>
    );
}

function DraggableItem({ item, zoom, active, isEditing, onSelect, updatePos, onEditFinish }: any) {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditing) return; // Don't drag while editing text
        e.stopPropagation();
        onSelect(item.id);
        setIsDragging(true);
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    useEffect(() => {
        if (!isDragging) return;
        const handleMove = (e: MouseEvent) => {
            const parent = (e.target as HTMLElement).closest('.relative');
            if (!parent) return;
            const rect = parent.getBoundingClientRect();
            const nx = ((e.clientX - rect.left) / rect.width) * 100;
            const ny = ((e.clientY - rect.top) / rect.height) * 100;
            updatePos(item.id, nx, ny);
        };
        const handleUp = () => setIsDragging(false);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [isDragging, item.id, updatePos]);

    return (
        <div
            onMouseDown={handleMouseDown}
            className={`absolute group cursor-move flex items-center justify-center transition-all ${active ? 'ring-4 ring-indigo-500/80 shadow-[0_0_40px_rgba(79,70,229,0.5)] z-50' : 'hover:ring-2 hover:ring-indigo-300/50'
                } ${item.type === 'redaction' ? 'bg-slate-950' : ''}`}
            style={{
                left: `${item.x}%`, top: `${item.y}%`,
                width: item.w ? `${item.w}%` : 'auto',
                height: item.h ? `${item.h}%` : 'auto',
                transform: 'translate(-50%, -50%)',
            }}
        >
            {item.type === 'text' && (
                isEditing ? (
                    <textarea
                        ref={inputRef}
                        defaultValue={item.content}
                        className="bg-transparent text-black resize-none outline-none overflow-hidden font-bold text-center border-none p-0 m-0 w-40 min-w-[100px]"
                        style={{
                            fontSize: `${(item.fontSize || 14) * zoom}px`,
                            color: item.color ? `rgb(${item.color.r * 255}, ${item.color.g * 255}, ${item.color.b * 255})` : 'black',
                        }}
                        onBlur={(e) => onEditFinish(item.id, e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onEditFinish(item.id, e.currentTarget.value);
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span
                        style={{
                            color: item.color ? `rgb(${item.color.r * 255}, ${item.color.g * 255}, ${item.color.b * 255})` : 'black',
                            fontSize: `${(item.fontSize || 14) * zoom}px`
                        }}
                        className="font-bold whitespace-nowrap px-2"
                    >
                        {item.content || 'Start Typing...'}
                    </span>
                )
            )}

            {active && !isEditing && (
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-indigo-600 rounded-xl shadow-2xl flex items-center justify-center animate-in zoom-in-50">
                    <Move className="w-4 h-4 text-white" />
                </div>
            )}
        </div>
    );
}

function Settings2(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
        </svg>
    );
}

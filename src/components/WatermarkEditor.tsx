import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    X, Loader2, Save,
    ImageIcon, Bold, Italic,
    Grid3X3, RotateCw, Plus,
    Type as FontIcon, ZoomIn, Droplets
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts, degrees } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';

// Setup worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface WatermarkEditorProps {
    file: File;
    onClose: () => void;
}

type WatermarkPosition = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';

export function WatermarkEditor({ file, onClose }: WatermarkEditorProps) {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const isRtl = i18n.language === 'ar';

    const [loading, setLoading] = useState(true);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Filter/Preview state
    const [mode, setMode] = useState<'text' | 'image'>('text');
    const [wmText, setWmText] = useState('ONE PDF');
    const [imgData, setImgData] = useState<Uint8Array | null>(null);
    const [imgUrl, setImgUrl] = useState<string | null>(null);

    const [pos, setPos] = useState<WatermarkPosition>('mc');
    const [isMosaic, setIsMosaic] = useState(false);
    const [transparency, setTransparency] = useState(0.5);
    const [rotation, setRotation] = useState(45);
    const [fontSize, setFontSize] = useState(50);
    const [color, setColor] = useState('#6366f1'); // Indigo 500
    const [isBold, setIsBold] = useState(true);
    const [isItalic, setIsItalic] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const buffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

                const thumbs: string[] = [];
                for (let i = 1; i <= Math.min(pdf.numPages, 12); i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 0.3 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const context = canvas.getContext('2d')!;
                    await page.render({ canvasContext: context, viewport, canvas }).promise;
                    thumbs.push(canvas.toDataURL());
                }
                setThumbnails(thumbs);
                setLoading(false);
            } catch (err) {
                console.error(err);
                showToast(t('common.error'), 'error');
                onClose();
            }
        };
        loadPdf();
    }, [file, onClose, showToast, t]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const buffer = await file.arrayBuffer();
        setImgData(new Uint8Array(buffer));
        setImgUrl(URL.createObjectURL(file));
        setMode('image');
    };

    const handleApply = async () => {
        try {
            setIsSaving(true);
            const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
            const pages = pdfDoc.getPages();
            const font = await pdfDoc.embedFont(isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);

            const r = parseInt(color.slice(1, 3), 16) / 255;
            const g = parseInt(color.slice(3, 5), 16) / 255;
            const b = parseInt(color.slice(5, 7), 16) / 255;

            let watermarkImage: any = null;
            if (mode === 'image' && imgData) {
                try { watermarkImage = await pdfDoc.embedPng(imgData); }
                catch { watermarkImage = await pdfDoc.embedJpg(imgData); }
            }

            for (const page of pages) {
                const { width, height } = page.getSize();

                const draw = (x: number, y: number) => {
                    if (mode === 'text' && wmText) {
                        page.drawText(wmText, {
                            x, y,
                            size: fontSize,
                            font,
                            color: rgb(r, g, b),
                            opacity: transparency,
                            rotate: degrees(rotation),
                        });
                    } else if (mode === 'image' && watermarkImage) {
                        const iW = watermarkImage.width * (fontSize / 100);
                        const iH = watermarkImage.height * (fontSize / 100);
                        page.drawImage(watermarkImage, {
                            x, y,
                            width: iW,
                            height: iH,
                            opacity: transparency,
                            rotate: degrees(rotation),
                        });
                    }
                };

                if (isMosaic) {
                    const stepX = width / 3;
                    const stepY = height / 3;
                    for (let i = 0; i <= 3; i++) {
                        for (let j = 0; j <= 3; j++) {
                            draw(i * stepX, j * stepY);
                        }
                    }
                } else {
                    let finalX = width / 2;
                    let finalY = height / 2;
                    const pX = width * 0.1;
                    const pY = height * 0.1;

                    switch (pos) {
                        case 'tl': finalX = pX; finalY = height - pY; break;
                        case 'tc': finalX = width / 2; finalY = height - pY; break;
                        case 'tr': finalX = width - pX; finalY = height - pY; break;
                        case 'ml': finalX = pX; finalY = height / 2; break;
                        case 'mc': finalX = width / 2; finalY = height / 2; break;
                        case 'mr': finalX = width - pX; finalY = height / 2; break;
                        case 'bl': finalX = pX; finalY = pY; break;
                        case 'bc': finalX = width / 2; finalY = pY; break;
                        case 'br': finalX = width - pX; finalY = pY; break;
                    }
                    draw(finalX, finalY);
                }
            }

            const blob = new Blob([await pdfDoc.save() as any]);
            saveAs(blob, `watermarked_${file.name}`);
            showToast(t('editor.exportSuccess'), 'success');
            onClose();
        } catch (err) {
            console.error(err);
            showToast(t('common.error'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        </div>
    );

    return (
        <div className={`fixed inset-0 z-[100] bg-[#f0f2f5] flex flex-col font-sans overflow-hidden ${isRtl ? 'rtl' : 'ltr'}`}>
            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />

            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all"><X className="w-5 h-5" /></button>
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{file.name}</h2>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{t('tools.watermark.title')}</span>
                    </div>
                </div>
                <button
                    onClick={handleApply} disabled={isSaving}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-rose-200 active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('watermarkTool.addWatermark')}
                </button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-xl overflow-y-auto custom-scrollbar">
                    <div className="p-6">
                        <h3 className="text-lg font-black text-slate-800 mb-6">{t('watermarkTool.options')}</h3>

                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <button
                                onClick={() => setMode('image')}
                                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${mode === 'image' ? 'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-inner' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                            >
                                <ImageIcon className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{t('watermarkTool.placeImage')}</span>
                            </button>
                            <button
                                onClick={() => setMode('text')}
                                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${mode === 'text' ? 'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-inner' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                            >
                                <FontIcon className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{t('watermarkTool.placeText')}</span>
                            </button>
                        </div>

                        {mode === 'text' ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t('watermarkTool.textLabel')}</label>
                                    <textarea
                                        value={wmText}
                                        onChange={(e) => setWmText(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">{t('watermarkTool.formatting')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        <FormatBtn active={isBold} onClick={() => setIsBold(!isBold)} icon={Bold} />
                                        <FormatBtn active={isItalic} onClick={() => setIsItalic(!isItalic)} icon={Italic} />
                                        <div className="h-10 w-[1px] bg-slate-200 mx-1" />
                                        <input
                                            type="color" value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                            className="w-10 h-10 p-1 bg-white border border-slate-200 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full p-8 border-2 border-dashed border-slate-200 rounded-3xl hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/50 transition-all flex flex-col items-center gap-4 group"
                                >
                                    {imgUrl ? (
                                        <img src={imgUrl} className="h-20 w-auto object-contain rounded shadow-lg" alt="Watermark" />
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-all">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-500">{t('watermarkTool.selectImage')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        <div className="mt-8 pt-8 border-t border-slate-100 space-y-8">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">{t('watermarkTool.position')}</label>
                                <div className="flex items-center justify-between gap-6">
                                    <div className="grid grid-cols-3 gap-2 bg-slate-100 p-2 rounded-xl">
                                        {(['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'] as WatermarkPosition[]).map(p => (
                                            <button
                                                key={p} onClick={() => setPos(p)}
                                                className={`w-8 h-8 rounded-lg transition-all ${pos === p ? 'bg-rose-500 shadow-lg scale-110' : 'bg-white hover:bg-slate-50'}`}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setIsMosaic(!isMosaic)}
                                        className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${isMosaic ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                                    >
                                        <Grid3X3 className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase">{t('watermarkTool.mosaic')}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <Slider label={t('watermarkTool.transparency')} icon={Droplets} value={transparency} max={1} step={0.1} onChange={setTransparency} display={`${Math.round(transparency * 100)}%`} />
                                <Slider label={t('watermarkTool.rotation')} icon={RotateCw} value={rotation} max={360} onChange={setRotation} display={`${rotation}°`} />
                                <Slider label={mode === 'text' ? t('editor.fontDimension') : 'Size'} icon={mode === 'text' ? FontIcon : ZoomIn} value={fontSize} min={10} max={200} onChange={setFontSize} display={`${fontSize}px`} />
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto bg-[#eef0f2] p-12 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
                        {thumbnails.map((thumb, i) => (
                            <div key={i} className="flex flex-col gap-3 group animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="relative bg-white p-2 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 overflow-hidden border border-slate-200">
                                    <img src={thumb} className="w-full h-auto rounded-lg" alt={`Page ${i + 1}`} />

                                    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-center items-center">
                                        <div className={`w-full h-full relative overflow-hidden flex items-center justify-center ${isMosaic ? 'grid grid-cols-3 grid-rows-3' : ''}`}>
                                            {isMosaic ? (
                                                Array.from({ length: 9 }).map((_, idx) => (
                                                    <div key={idx} className="flex items-center justify-center opacity-30">
                                                        <PreviewElement mode={mode} text={wmText} img={imgUrl} size={fontSize * 0.2} rotation={rotation} color={color} isBold={isBold} />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className={`absolute w-full h-full flex p-4 ${getPosClass(pos)}`} style={{ opacity: transparency }}>
                                                    <PreviewElement mode={mode} text={wmText} img={imgUrl} size={fontSize * 0.4} rotation={rotation} color={color} isBold={isBold} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="absolute top-4 left-4 w-8 h-8 bg-slate-900/60 backdrop-blur-md rounded-xl flex items-center justify-center text-white text-[10px] font-black border border-white/20">
                                        {i + 1}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}

function FormatBtn({ active, onClick, icon: Icon }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
        >
            <Icon className="w-4 h-4" />
        </button>
    );
}

function Slider({ label, icon: Icon, value, max, step = 1, min = 0, onChange, display }: any) {
    return (
        <div>
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 text-slate-500">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                </div>
                <span className="text-[10px] font-black text-indigo-500">{display}</span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-full appearance-none accent-indigo-600"
            />
        </div>
    );
}

function PreviewElement({ mode, text, img, size, rotation, color, isBold }: any) {
    if (mode === 'image' && img) {
        return <img src={img} className="max-w-full max-h-full object-contain" style={{ transform: `rotate(${rotation}deg)`, width: size * 2 }} alt="Preview" />;
    }
    return (
        <span
            className="whitespace-nowrap select-none overflow-hidden"
            style={{
                fontSize: size,
                transform: `rotate(${rotation}deg)`,
                color: color,
                fontWeight: isBold ? '900' : '500'
            }}
        >
            {text || 'ONE PDF'}
        </span>
    );
}

function getPosClass(pos: WatermarkPosition) {
    switch (pos) {
        case 'tl': return 'items-start justify-start';
        case 'tc': return 'items-start justify-center text-center';
        case 'tr': return 'items-start justify-end text-right';
        case 'ml': return 'items-center justify-start';
        case 'mc': return 'items-center justify-center text-center';
        case 'mr': return 'items-center justify-end text-right';
        case 'bl': return 'items-end justify-start';
        case 'bc': return 'items-end justify-center text-center';
        case 'br': return 'items-end justify-end text-right';
        default: return 'items-center justify-center';
    }
}

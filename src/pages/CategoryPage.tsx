import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Combine, Scissors, Minimize2, Edit3, Divide, RotateCw,
    FilePlus2, Crop, LifeBuoy, Lock, Unlock, FileBadge,
    FileSignature, ShieldAlert, FileImage, Image, Code,
    ArrowLeft, Sparkles, FileText, FileSpreadsheet, Presentation, FileType
} from 'lucide-react';
import { ToolCard } from '../components/ToolCard';

export function CategoryPage() {
    const { id } = useParams();
    const { t } = useTranslation();

    const categories: any = {
        optimize: {
            title: t('app.categories.optimize.title'),
            description: t('app.categories.optimize.desc'),
            tools: [
                { icon: Combine, title: t('tools.merge.title'), description: t('tools.merge.description'), path: '/merge', color: 'bg-rose-500' },
                { icon: Scissors, title: t('tools.split.title'), description: t('tools.split.description'), path: '/split', color: 'bg-sky-500' },
                { icon: Minimize2, title: t('tools.compress.title'), description: t('tools.compress.description'), path: '/compress', color: 'bg-emerald-500' }
            ]
        },
        edit: {
            title: t('app.categories.edit.title'),
            description: t('app.categories.edit.desc'),
            tools: [
                { icon: Edit3, title: t('tools.edit.title'), description: t('tools.edit.description'), path: '/edit', color: 'bg-orange-500' },
                { icon: Divide, title: t('tools.organize.title'), description: t('tools.organize.description'), path: '/organize', color: 'bg-teal-600' },
                { icon: RotateCw, title: t('tools.rotate.title'), description: t('tools.rotate.description'), path: '/rotate', color: 'bg-rose-400' },
                { icon: FilePlus2, title: t('tools.pageNumbers.title'), description: t('tools.pageNumbers.description'), path: '/page-numbers', color: 'bg-lime-600' },
                { icon: Crop, title: t('tools.crop.title'), description: t('tools.crop.description'), path: '/crop', color: 'bg-green-600' },
                { icon: LifeBuoy, title: t('tools.repair.title'), description: t('tools.repair.description'), path: '/repair', color: 'bg-red-500' }
            ]
        },
        security: {
            title: t('app.categories.security.title'),
            description: t('app.categories.security.desc'),
            tools: [
                { icon: Lock, title: t('tools.protect.title'), description: t('tools.protect.description'), path: '/protect', color: 'bg-indigo-600' },
                { icon: Unlock, title: t('tools.unlock.title'), description: t('tools.unlock.description'), path: '/unlock', color: 'bg-purple-500' },
                { icon: FileBadge, title: t('tools.watermark.title'), description: t('tools.watermark.description'), path: '/watermark', color: 'bg-blue-600' },
                { icon: FileSignature, title: t('tools.sign.title'), description: t('tools.sign.description'), path: '/sign', color: 'bg-cyan-600' },
                { icon: ShieldAlert, title: t('tools.redact.title'), description: t('tools.redact.description'), path: '/redact', color: 'bg-black' }
            ]
        },
        convert: {
            title: t('app.categories.convert.title'),
            description: t('app.categories.convert.desc'),
            tools: [
                { icon: FileImage, title: t('tools.pdfToJpg.title'), description: t('tools.pdfToJpg.description'), path: '/pdf-to-jpg', color: 'bg-amber-500' },
                { icon: Image, title: t('tools.jpgToPdf.title'), description: t('tools.jpgToPdf.description'), path: '/jpg-to-pdf', color: 'bg-fuchsia-500' },
                { icon: Code, title: t('tools.htmlToPdf.title'), description: t('tools.htmlToPdf.description'), path: '/html-to-pdf', color: 'bg-slate-700' },
                { icon: FileText, title: t('tools.pdfToWord.title'), description: t('tools.pdfToWord.description'), path: '/pdf-to-word', color: 'bg-blue-600' },
                { icon: FileType, title: t('tools.wordToPdf.title'), description: t('tools.wordToPdf.description'), path: '/word-to-pdf', color: 'bg-indigo-600' },
                { icon: FileSpreadsheet, title: t('tools.pdfToExcel.title'), description: t('tools.pdfToExcel.description'), path: '/pdf-to-excel', color: 'bg-emerald-600' },
                { icon: FileSpreadsheet, title: t('tools.excelToPdf.title'), description: t('tools.excelToPdf.description'), path: '/excel-to-pdf', color: 'bg-emerald-700' },
                { icon: Presentation, title: t('tools.pdfToPowerPoint.title'), description: t('tools.pdfToPowerPoint.description'), path: '/pdf-to-powerpoint', color: 'bg-orange-600' },
                { icon: Presentation, title: t('tools.powerPointToPdf.title'), description: t('tools.powerPointToPdf.description'), path: '/powerpoint-to-pdf', color: 'bg-orange-700' }
            ]
        }
    };

    const category = id ? categories[id] : null;

    if (!category) return null;

    return (
        <div className="bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-700 pt-32 pb-20">
            <div className="max-w-7xl mx-auto px-6">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-12 group">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">{t('app.nav.home')}</span>
                </Link>

                <header className="mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-[3px] mb-8">
                        <Sparkles className="w-3 h-3" />
                        {category.title}
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-6">
                        {category.description}
                    </h1>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {category.tools.map((tool: any, index: number) => (
                        <div key={index} className="animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${index * 50}ms` }}>
                            <ToolCard
                                icon={tool.icon}
                                title={tool.title}
                                description={tool.description}
                                path={tool.path}
                                color={tool.color}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

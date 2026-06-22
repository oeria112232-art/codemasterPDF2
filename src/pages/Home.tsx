import {
  Combine, Scissors, Minimize2, FileImage, Lock, Unlock,
  RotateCw, Image, FileBadge, FilePlus2, FileSignature, Divide,
  Edit3, Crop, LifeBuoy, ShieldAlert, Sparkles, Zap, ShieldCheck, Globe,
  FileText, FileSpreadsheet, Presentation, FileType, Languages
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../components/ToolCard';

export function Home() {
  const { t } = useTranslation();

  const categories = [

    {
      id: "optimize",
      title: t('app.categories.optimize.title'),
      description: t('app.categories.optimize.desc'),
      tools: [
        { icon: Combine, title: t('tools.merge.title'), description: t('tools.merge.description'), path: '/merge', color: 'bg-rose-500' },
        { icon: Scissors, title: t('tools.split.title'), description: t('tools.split.description'), path: '/split', color: 'bg-sky-500' },
        { icon: Minimize2, title: t('tools.compress.title'), description: t('tools.compress.description'), path: '/compress', color: 'bg-emerald-500' }
      ]
    },
    {
      id: "edit",
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
    {
      id: "security",
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
    {
      id: "convert",
      title: t('app.categories.convert.title'),
      description: t('app.categories.convert.desc'),
      tools: [
        { icon: FileImage, title: t('tools.pdfToJpg.title'), description: t('tools.pdfToJpg.description'), path: '/pdf-to-jpg', color: 'bg-amber-500' },
        { icon: Image, title: t('tools.jpgToPdf.title'), description: t('tools.jpgToPdf.description'), path: '/jpg-to-pdf', color: 'bg-fuchsia-500' },
        { icon: Globe, title: t('tools.htmlToPdf.title'), description: t('tools.htmlToPdf.description'), path: '/html-to-pdf', color: 'bg-slate-700' },
        { icon: FileText, title: t('tools.pdfToWord.title'), description: t('tools.pdfToWord.description'), path: '/pdf-to-word', color: 'bg-blue-600' },
        { icon: FileType, title: t('tools.wordToPdf.title'), description: t('tools.wordToPdf.description'), path: '/word-to-pdf', color: 'bg-indigo-600' },
        { icon: FileSpreadsheet, title: t('tools.pdfToExcel.title'), description: t('tools.pdfToExcel.description'), path: '/pdf-to-excel', color: 'bg-emerald-600' },
        { icon: FileSpreadsheet, title: t('tools.excelToPdf.title'), description: t('tools.excelToPdf.description'), path: '/excel-to-pdf', color: 'bg-emerald-700' },
        { icon: Presentation, title: t('tools.pdfToPowerPoint.title'), description: t('tools.pdfToPowerPoint.description'), path: '/pdf-to-powerpoint', color: 'bg-orange-600' },
        { icon: Presentation, title: t('tools.powerPointToPdf.title'), description: t('tools.powerPointToPdf.description'), path: '/powerpoint-to-pdf', color: 'bg-orange-700' },
        { icon: Languages, title: t('tools.translatePdf.title'), description: t('tools.translatePdf.description'), path: '/translate-pdf', color: 'bg-indigo-600' }
      ]
    }
  ];

  return (
    <div className="bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-700">
      {/* Hero Section */}
      {/* Hero Section */}
      <section className="relative pt-20 md:pt-32 pb-12 md:pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent -z-10" />
        <div className="absolute top-20 right-[10%] w-48 md:w-64 h-48 md:h-64 bg-rose-500/5 blur-[80px] md:blur-[100px] rounded-full -z-10 animate-pulse" />
        <div className="absolute top-40 left-[10%] w-60 md:w-80 h-60 md:h-80 bg-blue-500/5 blur-[100px] md:blur-[120px] rounded-full -z-10 animate-pulse delay-700" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] md:text-xs font-black uppercase tracking-[2px] md:tracking-[3px] mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Sparkles className="w-3 h-3" />
            {t('app.hero.powerTools')}
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white mb-6 md:mb-8 tracking-tight leading-tight md:leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-500 delay-100 px-2">
            {t('app.heroTitle').split(' ').map((word, i) => (
              <span key={i} className={i > 4 ? "text-indigo-600" : ""}>{word} </span>
            ))}
          </h1>
          <p className="text-sm md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-8 md:mb-12 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-500 delay-200 px-4">
            {t('app.description')}
          </p>

          <div className="flex flex-wrap justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-500 delay-300">
            <button className="px-6 md:px-10 py-3.5 md:py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm md:text-lg shadow-2xl shadow-indigo-600/30 transition-all hover:-translate-y-1 active:scale-95" onClick={() => document.getElementById('tools-grid')?.scrollIntoView({ behavior: 'smooth' })}>
              {t('app.hero.getStarted')}
            </button>
          </div>
        </div>
      </section>

      {/* Categorized Tools Sections */}
      <section id="tools-grid" className="py-16 md:py-20 max-w-7xl mx-auto px-6 space-y-20 md:space-y-32">
        {categories.map((cat, catIdx) => (
          <div key={cat.id} className="animate-in fade-in slide-in-from-bottom-12 duration-500" style={{ animationDelay: `${catIdx * 150}ms` }}>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 px-2 gap-4">
              <div>
                <p className="text-indigo-600 font-black uppercase tracking-[4px] text-xs mb-3">{cat.title}</p>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{cat.description}</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-8">
              {cat.tools.map((tool, index) => (
                <div key={index} className="animate-in fade-in zoom-in duration-700" style={{ animationDelay: `${(catIdx * 100) + (index * 50)}ms` }}>
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
        ))}
      </section>

      {/* Features Detail */}
      <section className="py-24 md:py-32 bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            <FeatureItem icon={Zap} title={t('app.features.fast')} desc={t('app.features.fastDesc')} />
            <FeatureItem icon={ShieldCheck} title={t('app.features.secure')} desc={t('app.features.secureDesc')} />
            <FeatureItem icon={Globe} title={t('app.features.cloud')} desc={t('app.features.cloudDesc')} />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 md:py-40 text-center relative overflow-hidden px-6">
        <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-indigo-500/5 to-transparent -z-10" />
        <h2 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white mb-8 md:mb-10 tracking-tight">{t('app.hero.workflowTitle')}</h2>
        <p className="text-slate-500 font-bold mb-10 md:mb-12 uppercase tracking-[3px] md:tracking-[5px] text-[10px] md:text-xs">{t('app.hero.joinUsers')}</p>
        <button className="px-10 md:px-12 py-5 md:py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-lg md:text-xl shadow-2xl transition-all hover:scale-110 active:scale-95">
          {t('app.hero.optimizeNow')}
        </button>
      </section>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc }: any) {
  return (
    <div className="group flex flex-col items-start gap-6">
      <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center transition-all group-hover:-translate-y-2 group-hover:rotate-6 group-hover:bg-indigo-600 group-hover:text-white">
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

import {
  Combine, Scissors, Minimize2, FileImage, Lock, Unlock,
  RotateCw, Image, FileBadge, FilePlus2, FileSignature, Divide,
  Edit3, Crop, LifeBuoy, ShieldAlert, Sparkles, Zap, ShieldCheck, Globe,
  FileText, FileSpreadsheet, Presentation, FileType
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
        { icon: Presentation, title: t('tools.powerPointToPdf.title'), description: t('tools.powerPointToPdf.description'), path: '/powerpoint-to-pdf', color: 'bg-orange-700' }
      ]
    }
  ];

  return (
    <div className="bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-300">
      <section className="relative pt-16 md:pt-24 pb-10 md:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            {t('app.hero.powerTools')}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white mb-5 tracking-tight leading-[1.1] px-2">
            {t('app.heroTitle').split(' ').map((word, i) => (
              <span key={i} className={i > 4 ? "text-indigo-600" : ""}>{word} </span>
            ))}
          </h1>
          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-8 font-normal leading-relaxed px-4">
            {t('app.description')}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm shadow-lg shadow-indigo-600/20 transition-all hover:shadow-xl hover:shadow-indigo-600/30 active:scale-[0.98]" onClick={() => document.getElementById('tools-grid')?.scrollIntoView({ behavior: 'smooth' })}>
              {t('app.hero.getStarted')}
            </button>
          </div>
        </div>
      </section>

      <section id="tools-grid" className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 space-y-16 md:space-y-24">
        {categories.map((cat, catIdx) => (
          <div key={cat.id}>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-10 gap-3">
              <div>
                <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-2">{cat.title}</p>
                <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">{cat.description}</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
              {cat.tools.map((tool, index) => (
                <ToolCard
                  key={index}
                  icon={tool.icon}
                  title={tool.title}
                  description={tool.description}
                  path={tool.path}
                  color={tool.color}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="py-16 md:py-24 bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            <FeatureItem icon={Zap} title={t('app.features.fast')} desc={t('app.features.fastDesc')} />
            <FeatureItem icon={ShieldCheck} title={t('app.features.secure')} desc={t('app.features.secureDesc')} />
            <FeatureItem icon={Globe} title={t('app.features.cloud')} desc={t('app.features.cloudDesc')} />
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32 text-center relative overflow-hidden px-6">
        <h2 className="text-3xl md:text-5xl font-semibold text-slate-900 dark:text-white mb-6 tracking-tight">{t('app.hero.workflowTitle')}</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 text-sm">{t('app.hero.joinUsers')}</p>
        <button className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium text-sm shadow-lg transition-all hover:shadow-xl active:scale-[0.98]">
          {t('app.hero.optimizeNow')}
        </button>
      </section>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc }: any) {
  return (
    <div className="group flex flex-col items-start gap-4">
      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:ring-0 group-hover:shadow-lg group-hover:shadow-indigo-600/20">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1.5">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

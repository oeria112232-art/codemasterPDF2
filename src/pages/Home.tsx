import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Combine, Scissors, Minimize2, FileImage, Lock, Unlock,
  RotateCw, Image, FileBadge, FilePlus2, FileSignature, Divide,
  Edit3, Crop, LifeBuoy, ShieldAlert, Sparkles, Zap, ShieldCheck, Globe,
  FileText, FileSpreadsheet, Presentation, FileType,
  MessageSquare, GitCompareArrows, Layers, ArrowRight, Star,
  ChevronRight, Play, CheckCircle2, Infinity, TrendingUp, Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../components/ToolCard';

export function Home() {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);

  const STATS = [
    { value: '10M+', label: t('home.stats.filesProcessed'), icon: FileText },
    { value: '500K+', label: t('home.stats.activeUsers'), icon: Users },
    { value: '28+', label: t('home.stats.pdfTools'), icon: Zap },
    { value: '99.9%', label: t('home.stats.uptime'), icon: TrendingUp },
  ];

  const TESTIMONIALS = [
    { name: t('home.testimonials.items.0.name'), role: t('home.testimonials.items.0.role'), text: t('home.testimonials.items.0.text'), rating: 5 },
    { name: t('home.testimonials.items.1.name'), role: t('home.testimonials.items.1.role'), text: t('home.testimonials.items.1.text'), rating: 5 },
    { name: t('home.testimonials.items.2.name'), role: t('home.testimonials.items.2.role'), text: t('home.testimonials.items.2.text'), rating: 5 },
  ];

  const COMPARISON = [
    { feature: t('home.comparison.features.pdfProcessing'), codemaster: true, adobe: true, smallpdf: true },
    { feature: t('home.comparison.features.aiChat'), codemaster: true, adobe: false, smallpdf: false },
    { feature: t('home.comparison.features.contractAnalysis'), codemaster: true, adobe: false, smallpdf: false },
    { feature: t('home.comparison.features.batchProcessing'), codemaster: true, adobe: true, smallpdf: true },
    { feature: t('home.comparison.features.clientSide'), codemaster: true, adobe: false, smallpdf: false },
    { feature: t('home.comparison.features.freeTier'), codemaster: true, adobe: false, smallpdf: true },
    { feature: t('home.comparison.features.openSource'), codemaster: true, adobe: false, smallpdf: false },
  ];

  useEffect(() => {
    const target = 10000000;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, []);

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
    },
    {
      id: "intelligence",
      title: t('home.intelligenceSuite.title'),
      description: t('home.intelligenceSuite.subtitle'),
      tools: [
        { icon: MessageSquare, title: t('home.intelligenceTools.pdfChat.title'), description: t('home.intelligenceTools.pdfChat.desc'), path: '/pdf-to-chat', color: 'bg-blue-500' },
        { icon: GitCompareArrows, title: t('home.intelligenceTools.pdfCompare.title'), description: t('home.intelligenceTools.pdfCompare.desc'), path: '/pdf-to-compare', color: 'bg-purple-500' },
        { icon: Layers, title: t('home.intelligenceTools.batchProcess.title'), description: t('home.intelligenceTools.batchProcess.desc'), path: '/batch-process', color: 'bg-amber-500' },
        { icon: Sparkles, title: t('home.intelligenceTools.aiSummarize.title'), description: t('home.intelligenceTools.aiSummarize.desc'), path: '/ai-summarize', color: 'bg-violet-500' },
        { icon: ShieldAlert, title: t('home.intelligenceTools.contractAnalyzer.title'), description: t('home.intelligenceTools.contractAnalyzer.desc'), path: '/contract-analyzer', color: 'bg-red-500' },
      ]
    }
  ];

  return (
    <div className="bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-300 overflow-hidden">

      {/* HERO */}
      <section className="relative pt-20 md:pt-32 pb-20 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            {t('app.hero.powerTools')}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-[0.95] px-2">
            {t('app.heroTitle').split(' ').map((word, i) => (
              <span key={i} className={i > 4 ? "text-indigo-600" : ""}>{word} </span>
            ))}
          </h1>

          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed px-4">
            {t('app.description')}
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Link to="/signup" className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all hover:shadow-2xl hover:shadow-indigo-600/30 active:scale-[0.98] flex items-center gap-2">
              {t('app.hero.getStarted')} <ArrowRight className="w-4 h-4" />
            </Link>
            <button className="px-10 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-2"
              onClick={() => document.getElementById('tools-grid')?.scrollIntoView({ behavior: 'smooth' })}>
              {t('app.hero.viewTools')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-3 mx-auto">
                    <Icon className="w-5 h-5 text-indigo-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {i === 0 ? `${(count / 1000000).toFixed(0)}M+` : stat.value}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TOOLS GRID */}
      <section id="tools-grid" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 space-y-20 md:space-y-28">
        {categories.map((cat) => (
          <div key={cat.id}>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-12 gap-3">
              <div>
                <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-2">{cat.title}</p>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{cat.description}</h2>
              </div>
              {cat.id === 'intelligence' && (
                <Link to="/dashboard" className="text-sm font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 transition-colors">
                  {t('home.viewAll')} <ArrowRight className="w-4 h-4" />
                </Link>
              )}
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

      {/* FEATURES */}
      <section className="py-20 md:py-28 bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">{t('home.whyCodeMaster.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto">{t('home.whyCodeMaster.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            <FeatureItem icon={Zap} title={t('app.features.fast')} desc={t('app.features.fastDesc')} />
            <FeatureItem icon={ShieldCheck} title={t('app.features.secure')} desc={t('app.features.secureDesc')} />
            <FeatureItem icon={Globe} title={t('app.features.cloud')} desc={t('app.features.cloudDesc')} />
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">{t('home.comparison.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400">{t('home.comparison.subtitle')}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
            <div className="grid grid-cols-4 text-xs font-black uppercase tracking-widest">
              <div className="p-4 text-slate-400">{t('home.comparison.headers.feature')}</div>
              <div className="p-4 text-center text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10">{t('home.comparison.headers.codemaster')}</div>
              <div className="p-4 text-center text-slate-400">{t('home.comparison.headers.adobe')}</div>
              <div className="p-4 text-center text-slate-400">{t('home.comparison.headers.smallpdf')}</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} className={`grid grid-cols-4 text-sm border-t border-slate-100 dark:border-slate-800 ${i % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                <div className="p-4 font-medium text-slate-700 dark:text-slate-300">{row.feature}</div>
                <div className="p-4 text-center bg-indigo-50/50 dark:bg-indigo-900/5">
                  {row.codemaster ? <CheckCircle2 className="w-5 h-5 text-indigo-500 mx-auto" /> : <span className="text-slate-300">-</span>}
                </div>
                <div className="p-4 text-center">
                  {row.adobe ? <CheckCircle2 className="w-5 h-5 text-slate-300 mx-auto" /> : <span className="text-slate-300">-</span>}
                </div>
                <div className="p-4 text-center">
                  {row.smallpdf ? <CheckCircle2 className="w-5 h-5 text-slate-300 mx-auto" /> : <span className="text-slate-300">-</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 md:py-28 bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">{t('home.testimonials.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400">{t('home.testimonials.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 italic">"{testimonial.text}"</p>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{testimonial.name}</p>
                  <p className="text-[10px] text-slate-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-36 text-center relative overflow-hidden px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent" />
        <div className="relative">
          <h2 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">{t('app.hero.workflowTitle')}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 text-sm max-w-md mx-auto">{t('app.hero.joinUsers')}</p>
          <Link to="/signup" className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-lg transition-all hover:shadow-xl active:scale-[0.98] inline-flex items-center gap-2">
            {t('app.hero.optimizeNow')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc }: any) {
  return (
    <div className="group flex flex-col items-start gap-4">
      <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:ring-0 group-hover:shadow-lg group-hover:shadow-indigo-600/20">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

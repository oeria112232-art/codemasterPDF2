import { Link } from 'react-router-dom';
import { LucideIcon, ArrowRight } from 'lucide-react';

import { useTranslation } from 'react-i18next';

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  path: string;
  color: string;
}

export function ToolCard({ icon: Icon, title, description, path, color }: ToolCardProps) {
  const { t } = useTranslation();
  return (
    <Link
      to={path}
      className="group relative bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border border-slate-200 dark:border-slate-800 transition-all duration-500 hover:border-indigo-500/50 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-3 dark:hover:bg-slate-800/50 flex flex-col h-full overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-5 md:p-8 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
        <ArrowRight className="w-5 h-5 text-indigo-500" />
      </div>

      <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${color} flex items-center justify-center mb-4 md:mb-8 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
        <Icon className="w-5 h-5 md:w-7 md:h-7 text-white" />
      </div>

      <div className="flex-1">
        <h3 className="text-base md:text-xl font-black text-slate-900 dark:text-white mb-2 md:mb-3 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {title}
        </h3>
        <p className="text-slate-400 dark:text-slate-500 text-[10px] md:text-sm font-medium leading-relaxed line-clamp-2 md:line-clamp-none">
          {description}
        </p>
      </div>

      <div className="mt-4 md:mt-8 pt-4 md:pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t('common.openTool')}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
      </div>
    </Link>
  );
}

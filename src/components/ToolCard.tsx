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
      className="group relative bg-white dark:bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5 dark:hover:bg-slate-800/50 flex flex-col h-full"
    >
      <div className="absolute top-3 right-3 md:top-4 md:right-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 duration-200">
        <ArrowRight className="w-4 h-4 text-indigo-500" />
      </div>

      <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg ${color} flex items-center justify-center mb-3 md:mb-5 group-hover:scale-105 transition-all duration-200`}>
        <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
      </div>

      <div className="flex-1">
        <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white mb-1 md:mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {title}
        </h3>
        <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>

      <div className="mt-3 md:mt-5 pt-3 md:pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{t('common.openTool')}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
      </div>
    </Link>
  );
}

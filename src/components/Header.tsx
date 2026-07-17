import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText, Moon, Sun, Globe, User, ChevronDown, Menu, X,
  Combine, Scissors, Minimize2, Edit3,
  RotateCw, Crop, Lock, Unlock,
  FileBadge, FileSignature, FileImage, Image,
  FileSpreadsheet, Presentation, MessageSquare, GitCompareArrows
} from 'lucide-react';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    {
      title: t('app.categories.optimize.title'),
      tools: [
        { icon: Combine, label: t('tools.merge.title'), path: '/merge' },
        { icon: Scissors, label: t('tools.split.title'), path: '/split' },
        { icon: Minimize2, label: t('tools.compress.title'), path: '/compress' }
      ]
    },
    {
      title: t('app.categories.security.title'),
      tools: [
        { icon: Lock, label: t('tools.protect.title'), path: '/protect' },
        { icon: Unlock, label: t('tools.unlock.title'), path: '/unlock' },
        { icon: FileBadge, label: t('tools.watermark.title'), path: '/watermark' },
        { icon: FileSignature, label: t('tools.sign.title'), path: '/sign' }
      ]
    },
    {
      title: t('app.categories.edit.title'),
      tools: [
        { icon: Edit3, label: t('tools.edit.title'), path: '/edit' },
        { icon: RotateCw, label: t('tools.rotate.title'), path: '/rotate' },
        { icon: Crop, label: t('tools.crop.title'), path: '/crop' }
      ]
    },
    {
      title: t('app.categories.convert.title'),
      tools: [
        { icon: FileImage, label: t('tools.pdfToJpg.title'), path: '/pdf-to-jpg' },
        { icon: Image, label: t('tools.jpgToPdf.title'), path: '/jpg-to-pdf' },
        { icon: Globe, label: t('tools.htmlToPdf.title'), path: '/html-to-pdf' },
        { icon: FileText, label: t('tools.pdfToWord.title'), path: '/pdf-to-word' },
        { icon: FileSpreadsheet, label: t('tools.pdfToExcel.title'), path: '/pdf-to-excel' },
        { icon: Presentation, label: t('tools.pdfToPowerPoint.title'), path: '/pdf-to-powerpoint' },
        { icon: FileText, label: t('tools.wordToPdf.title'), path: '/word-to-pdf' },
        { icon: FileSpreadsheet, label: t('tools.excelToPdf.title'), path: '/excel-to-pdf' },
        { icon: Presentation, label: t('tools.powerPointToPdf.title'), path: '/powerpoint-to-pdf' },
      ]
    },
    {
      title: "Intelligence",
      tools: [
        { icon: MessageSquare, label: "PDF Chat", path: '/pdf-to-chat' },
        { icon: GitCompareArrows, label: "PDF Compare", path: '/pdf-to-compare' },
      ]
    }
  ];

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  return (
    <header className={`sticky top-0 z-[60] transition-all duration-300 ${scrolled
      ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 py-3'
      : 'bg-white/80 dark:bg-slate-900/80 py-4'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all group">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-none">{t('app.title')}</span>
              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider leading-none mt-0.5">{t('app.nav.proSuite')}</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            <NavLink to="/" label={t('app.nav.home')} />
            <div
              className="relative group"
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                {t('app.nav.tools')}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
              </div>

              <div className={`
                absolute top-full left-1/2 -translate-x-1/2 w-[720px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 
                rounded-xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 p-6 transition-all duration-200 
                ${menuOpen ? 'opacity-100 visible translate-y-2' : 'opacity-0 invisible translate-y-1'}
              `}>
                <div className="grid grid-cols-5 gap-6">
                  {categories.map((cat, i) => (
                    <div key={i} className="space-y-3">
                      <Link
                        to={`/tools/${['optimize', 'security', 'edit', 'convert', 'intelligence'][i]}`}
                        className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {cat.title}
                      </Link>
                      <div className="space-y-0.5">
                        {cat.tools.map((tool, j) => (
                          <Link
                            key={j}
                            to={tool.path}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group/item"
                          >
                            <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover/item:bg-indigo-100 dark:group-hover/item:bg-indigo-900/30 group-hover/item:text-indigo-600 transition-colors">
                              <tool.icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{tool.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <NavLink to="/about" label={t('app.nav.about')} />
            <NavLink to="/contact" label={t('app.nav.contact')} />
            <NavLink to="/pricing" label="Pricing" />
            {user && <NavLink to="/dashboard" label="Dashboard" />}
          </nav>

          <div className="lg:hidden flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <div className={`
              lg:hidden fixed inset-0 top-[52px] bg-white dark:bg-slate-950 z-50 p-6 overflow-y-auto transition-transform duration-200
              ${menuOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}
          `}>
            <div className="space-y-5">
              <Link to="/" onClick={() => setMenuOpen(false)} className="block text-lg font-semibold text-slate-900 dark:text-white">{t('app.nav.home')}</Link>
              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div>
                <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">{t('app.nav.tools')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {categories.flatMap(c => c.tools).slice(0, 8).map((tool, i) => (
                    <Link key={i} to={tool.path} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <tool.icon className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{tool.label}</span>
                    </Link>
                  ))}
                  <Link to="/" onClick={() => setMenuOpen(false)} className="col-span-2 text-center p-2.5 text-sm font-medium text-indigo-500">View All Tools</Link>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              <Link to="/about" onClick={() => setMenuOpen(false)} className="block text-base font-medium text-slate-600 dark:text-slate-400">{t('app.nav.about')}</Link>
              <Link to="/contact" onClick={() => setMenuOpen(false)} className="block text-base font-medium text-slate-600 dark:text-slate-400">{t('app.nav.contact')}</Link>

              <div className="pt-4 flex gap-3">
                {user ? (
                  <button onClick={() => { signOut(); setMenuOpen(false); }} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium text-slate-900 dark:text-white text-sm">
                    Sign Out
                  </button>
                ) : (
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 py-2.5 bg-indigo-600 text-white text-center rounded-lg font-medium text-sm">
                    {t('app.nav.signIn')}
                  </Link>
                )}
                <button onClick={() => { toggleTheme(); }} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400"
              aria-label="Toggle language"
            >
              <Globe className="w-4 h-4" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 rounded-lg transition-all group"
              >
                <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-md flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium hidden sm:block">
                  {user.email?.split('@')[0]}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-all hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98]"
              >
                <User className="w-4 h-4" />
                <span>{t('app.nav.signIn')}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, label }: { to: string, label: string }) {
  return (
    <Link to={to} className="text-slate-600 dark:text-slate-400 font-medium text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative group">
      {label}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full" />
    </Link>
  );
}

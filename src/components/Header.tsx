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
  FileSpreadsheet, Presentation
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
    }
  ];

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  return (
    <header className={`sticky top-0 z-[60] transition-all duration-500 ${scrolled
      ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 py-2'
      : 'bg-transparent py-4'
      }`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-all active:scale-95 group">
            <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:rotate-6 transition-transform">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{t('app.title')}</span>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">{t('app.nav.proSuite')}</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-10">
            <NavLink to="/" label={t('app.nav.home')} />
            <div
              className="relative py-4 group"
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-colors cursor-pointer group-hover:text-indigo-600">
                {t('app.nav.tools')}
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Mega Menu */}
              <div className={`
                absolute top-full left-1/2 -translate-x-1/2 w-[800px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 
                rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] p-8 transition-all duration-500 
                ${menuOpen ? 'opacity-100 visible translate-y-2' : 'opacity-0 invisible translate-y-10'}
              `}>
                <div className="grid grid-cols-4 gap-8">
                  {categories.map((cat, i) => (
                    <div key={i} className="space-y-4">
                      <Link
                        to={`/tools/${['optimize', 'security', 'edit', 'convert'][i]}`}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 hover:text-indigo-600 transition-colors"
                      >
                        {cat.title}
                      </Link>
                      <div className="space-y-1">
                        {cat.tools.map((tool, j) => (
                          <Link
                            key={j}
                            to={tool.path}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group/item"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover/item:bg-indigo-600 group-hover/item:text-white transition-colors">
                              <tool.icon className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover/item:text-indigo-600 transition-colors">{tool.label}</span>
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
          </nav>

          {/* Mobile Menu Button - Visible on small screens */}
          <div className="lg:hidden flex items-center gap-4">
            <button
              onClick={() => setMenuOpen(!menuOpen)} // Reusing menuOpen state for mobile toggle
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Navigation Drawer */}
          <div className={`
              lg:hidden fixed inset-0 top-16 bg-white dark:bg-slate-950 z-50 p-6 overflow-y-auto transition-transform duration-300
              ${menuOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}
          `}>
            <div className="space-y-6">
              {/* Mobile Links */}
              <Link to="/" onClick={() => setMenuOpen(false)} className="block text-xl font-black text-slate-900 dark:text-white">{t('app.nav.home')}</Link>
              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Mobile Tools Category */}
              <div>
                <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4">{t('app.nav.tools')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {categories.flatMap(c => c.tools).slice(0, 8).map((tool, i) => (
                    <Link key={i} to={tool.path} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      <tool.icon className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{tool.label}</span>
                    </Link>
                  ))}
                  <Link to="/" onClick={() => setMenuOpen(false)} className="col-span-2 text-center p-3 text-xs font-bold text-indigo-500">View All Tools</Link>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              <Link to="/about" onClick={() => setMenuOpen(false)} className="block text-lg font-bold text-slate-600 dark:text-slate-400">{t('app.nav.about')}</Link>
              <Link to="/contact" onClick={() => setMenuOpen(false)} className="block text-lg font-bold text-slate-600 dark:text-slate-400">{t('app.nav.contact')}</Link>

              <div className="pt-6 flex gap-4">
                {user ? (
                  <button onClick={() => { signOut(); setMenuOpen(false); }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-900 rounded-xl font-bold text-slate-900 dark:text-white">
                    Sign Out
                  </button>
                ) : (
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 py-3 bg-indigo-600 text-white text-center rounded-xl font-bold">
                    {t('app.nav.signIn')}
                  </Link>
                )}
                <button onClick={() => { toggleTheme(); }} className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />

            <button
              onClick={toggleLanguage}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400"
              aria-label="Toggle language"
            >
              <Globe className="w-5 h-5" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-3 pl-2 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-indigo-500/10 hover:text-indigo-600 rounded-2xl transition-all group"
              >
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-600/20">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
                  {user.email?.split('@')[0]}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl"
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
    <Link to={to} className="text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative group py-2">
      {label}
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full" />
    </Link>
  );
}

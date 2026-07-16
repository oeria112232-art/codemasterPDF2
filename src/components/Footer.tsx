import { Link } from 'react-router-dom';
import { FileText, Heart, Instagram } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-5">
            <Link to="/" className="flex items-center gap-2.5 mb-5 group">
              <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-none">{t('app.title')}</span>
                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider leading-none mt-0.5">{t('app.nav.intelligenceSuite')}</span>
              </div>
            </Link>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
              {t('footer.description')}
            </p>
            <div className="flex gap-2.5">
              <SocialLink href="https://t.me/codemaster6" icon={(props: any) => (
                <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
              )} />
              <SocialLink href="https://tiktok.com/@code1master" icon={(props: any) => (
                <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>
              )} />
              <SocialLink href="https://www.instagram.com/1code_master?igsh=c2xtOWs0ZnZ2ZHJr" icon={Instagram} />
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-10">
            <FooterCol title={t('footer.systems')}>
              <FooterLink to="/" label={t('app.nav.home')} />
              <FooterLink to="/about" label={t('footer.intelligence')} />
              <FooterLink to="/contact" label={t('footer.support')} />
            </FooterCol>
            <FooterCol title={t('footer.legal')}>
              <FooterLink to="/terms" label={t('footer.terms')} />
              <FooterLink to="/privacy" label={t('footer.privacy')} />
            </FooterCol>
            <FooterCol title={t('footer.connectivity')}>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 mb-2">{t('footer.identity')}</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{t('footer.live')}</span>
                </div>
              </div>
            </FooterCol>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} {t('footer.copyright')}
          </p>
          <div className="flex items-center gap-1.5 text-slate-400 text-sm">
            {t('footer.engineered')} <Heart className="w-3.5 h-3.5 text-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: any) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      <ul className="flex flex-col gap-3">
        {children}
      </ul>
    </div>
  );
}

function FooterLink({ to, label }: any) {
  return (
    <li>
      <Link to={to} className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
        {label}
      </Link>
    </li>
  );
}

function SocialLink({ icon: Icon, href }: any) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-indigo-600 hover:text-white transition-all">
      <Icon className="w-4 h-4" />
    </a>
  );
}



import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, Upload, Sparkles, FileText, Globe, Shield, Zap } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

export default function LandingPage() {
  const { t } = useTranslation()

  const features = [
    {
      icon: Upload,
      title: t('examGenerator.landing.features.upload.title'),
      description: t('examGenerator.landing.features.upload.desc'),
    },
    {
      icon: Sparkles,
      title: t('examGenerator.landing.features.ai.title'),
      description: t('examGenerator.landing.features.ai.desc'),
    },
    {
      icon: FileText,
      title: t('examGenerator.landing.features.formats.title'),
      description: t('examGenerator.landing.features.formats.desc'),
    },
    {
      icon: Globe,
      title: t('examGenerator.landing.features.bilingual.title'),
      description: t('examGenerator.landing.features.bilingual.desc'),
    },
    {
      icon: Shield,
      title: t('examGenerator.landing.features.secure.title'),
      description: t('examGenerator.landing.features.secure.desc'),
    },
    {
      icon: Zap,
      title: t('examGenerator.landing.features.instant.title'),
      description: t('examGenerator.landing.features.instant.desc'),
    },
  ]

  const howItWorks = [
    {
      number: "01",
      title: t('examGenerator.landing.steps.one.title'),
      description: t('examGenerator.landing.steps.one.desc'),
    },
    {
      number: "02",
      title: t('examGenerator.landing.steps.two.title'),
      description: t('examGenerator.landing.steps.two.desc'),
    },
    {
      number: "03",
      title: t('examGenerator.landing.steps.three.title'),
      description: t('examGenerator.landing.steps.three.desc'),
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}


      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-balance bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent pb-2 leading-normal">
              {t('examGenerator.landing.hero.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">{t('examGenerator.landing.hero.subtitle')}</p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link to="/exam-generator/dashboard">
                <Button size="lg" className="gap-2">
                  {t('examGenerator.landing.hero.cta')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Image/Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl -z-10"></div>
            <Card className="p-8 shadow-2xl">
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-4">
                  <FileText className="w-16 h-16 mx-auto text-primary" />
                  <p className="text-muted-foreground">
                    {t('examGenerator.landing.preview')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold">{t('examGenerator.landing.features.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('examGenerator.landing.features.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold">{t('examGenerator.landing.howItWorks.title')}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white text-2xl font-bold flex items-center justify-center mx-auto shadow-lg">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary to-purple-600 text-white">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-4xl font-bold">{t('examGenerator.landing.cta.title')}</h2>
          <p className="text-xl opacity-90">{t('examGenerator.landing.cta.subtitle')}</p>
          <Link to="/exam-generator/dashboard">
            <Button size="lg" variant="secondary" className="gap-2">
              {t('examGenerator.landing.cta.button')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}

    </div>
  )
}

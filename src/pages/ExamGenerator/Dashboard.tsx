

import { AuthGuard } from "@/components/exam-generator/auth-guard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, History } from "lucide-react"
// Removed unused imports

import { UploadInterface } from "@/components/exam-generator/upload-interface"
import { ExamHistory } from "@/components/exam-generator/exam-history"
import { useTranslation } from "react-i18next"

export default function DashboardPage() {
  const { t } = useTranslation()

  // Removed unused userName and auth logic since header is gone
  // If we need auth later, we can re-add it or use a context

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Header */}


        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-balance">{t('examGenerator.dashboardTitle')}</h1>
              <p className="text-lg text-muted-foreground">{t('examGenerator.configDesc')}</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="create" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="create" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t('examGenerator.createExam')}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  {t('examGenerator.history')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-6">
                <UploadInterface />
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <ExamHistory />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}

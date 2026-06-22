

import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ExamRecord {
  id: string
  title: string
  date: string
  questions: number
  difficulty: string
  language?: string
  sourceSummary?: string
  questionData?: Array<{
    type: string
    question: string
    options?: string[]
    answer: string
    explanation?: string
  }>
}

export default function ResultsPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [exam, setExam] = useState<ExamRecord | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const history = JSON.parse(localStorage.getItem("examHistory") || "[]") as ExamRecord[]
    const found = history.find((item) => item.id === id)
    setExam(found || null)
  }, [id])

  const handleDownload = () => {
    if (!exam?.questionData?.length) return
    const lines = [
      `Title: ${exam.title}`,
      `Date: ${exam.date}`,
      `Difficulty: ${exam.difficulty}`,
      "",
      ...exam.questionData.flatMap((question, index) => {
        const header = `${index + 1}. (${question.type}) ${question.question}`
        const options = question.options?.map((option, optIndex) => `   ${String.fromCharCode(65 + optIndex)}. ${option}`) || []
        const answer = `   Answer: ${question.answer}`
        const explanation = question.explanation ? `   Explanation: ${question.explanation}` : ""
        return [header, ...options, answer, explanation, ""].filter(Boolean)
      }),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${exam.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40) || "exam"}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-lg">
          <CardHeader>
            <CardTitle>{t('common.error')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t('examGenerator.noHistory')}</p>
            <Link to="/exam-generator/dashboard">
              <Button>{t('examGenerator.dashboardTitle')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-10">
      <div className="container mx-auto max-w-4xl space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">{exam.title}</CardTitle>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>{t('examGenerator.date')}: {exam.date}</div>
              <div>{t('examGenerator.difficulty')}: {exam.difficulty}</div>
              {exam.sourceSummary && <div>{t('examGenerator.sourceSummary')}: {exam.sourceSummary}</div>}
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Button onClick={handleDownload}>{t('examGenerator.download')} TXT</Button>
            <Link to="/exam-generator/dashboard">
              <Button variant="outline">{t('examGenerator.dashboardTitle')}</Button>
            </Link>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {exam.questionData?.length ? (
            exam.questionData.map((question, index) => (
              <Card key={`${exam.id}-${index}`} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{`${index + 1}. ${question.question}`}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {question.options?.length ? (
                    <ul className="space-y-1">
                      {question.options.map((option, optIndex) => (
                        <li key={`${exam.id}-${index}-opt-${optIndex}`}>{`${String.fromCharCode(
                          65 + optIndex
                        )}. ${option}`}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div>
                    <span className="font-semibold">{t('examGenerator.correctAnswer')}:</span> {question.answer}
                  </div>
                  {question.explanation && (
                    <div>
                      <span className="font-semibold">{t('examGenerator.explanation')}:</span> {question.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="shadow-sm">
              <CardContent className="py-6 text-sm text-muted-foreground">
                No question data found for this exam.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

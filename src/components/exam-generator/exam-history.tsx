

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Eye, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

interface ExamRecord {
  id: string
  title: string
  date: string
  questions: number
  difficulty: string
  questionData?: Array<{
    type: string
    question: string
    options?: string[]
    answer: string
    explanation?: string
  }>
}

export function ExamHistory() {
  const [exams, setExams] = useState<ExamRecord[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    // Load exam history from localStorage
    const history = localStorage.getItem("examHistory")
    if (history) {
      try {
        setExams(JSON.parse(history))
      } catch {
        setExams([])
      }
    }
  }, [])

  const handleDownload = (exam: ExamRecord) => {
    if (!exam.questionData?.length) return
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

  const handleDelete = (id: string) => {
    const updated = exams.filter((exam) => exam.id !== id)
    setExams(updated)
    localStorage.setItem("examHistory", JSON.stringify(updated))
  }

  if (exams.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('examGenerator.noHistory')}</h3>
              <p className="text-muted-foreground">{t('examGenerator.examHistoryDesc')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('examGenerator.examHistory')}</CardTitle>
          <CardDescription>{t('examGenerator.examHistoryDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{exam.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {exam.date} - {exam.questions} {t('examGenerator.questions')} - {exam.difficulty}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/exam-generator/results/${exam.id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(exam)}
                  disabled={!exam.questionData?.length}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(exam.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

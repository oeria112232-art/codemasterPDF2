

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Upload, FileText, X, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { generateExam } from "@/lib/exam-generator/api"
import { useTranslation } from "react-i18next"

export function UploadInterface() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadMethod, setUploadMethod] = useState<"text" | "file">("text")
  const [textContent, setTextContent] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [questionTypes, setQuestionTypes] = useState({
    mcq: true,
    trueFalse: true,
    shortAnswer: false,
    essay: false,
  })
  const [difficulty, setDifficulty] = useState("medium")
  const [numQuestions, setNumQuestions] = useState("20")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingStatus, setGeneratingStatus] = useState(t('examGenerator.generating'))
  const [error, setError] = useState<string | null>(null)

  // Update effect to handle language change for status if not currently generating? 
  // Probably not strictly necessary for "Generating..." but good practice.
  // Actually, we can just initialize it.

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleGenerate = async () => {
    if ((uploadMethod === "text" && !textContent) || (uploadMethod === "file" && !selectedFile)) {
      return
    }

    if (!Object.values(questionTypes).some((v) => v)) {
      setError(t('examGenerator.errors.selectType'))
      return
    }

    setIsGenerating(true)
    setGeneratingStatus(t('examGenerator.initializing'))
    setError(null)

    try {
      const formData = new FormData()
      formData.append("method", uploadMethod)
      formData.append("difficulty", difficulty)
      formData.append("numQuestions", numQuestions)
      formData.append("questionTypes", JSON.stringify(questionTypes))

      if (uploadMethod === "text") {
        formData.append("text", textContent)
      } else if (selectedFile) {
        if (selectedFile.size > 50 * 1024 * 1024) {
          throw new Error(t('examGenerator.errors.fileTooLarge'))
        }
        formData.append("file", selectedFile)
      }

      const response = await generateExam(formData, (status) => {
        // Map status strings to translation keys if possible, or just pass through
        // specific mapping for known statuses
        if (status === "Reading content...") setGeneratingStatus(t('examGenerator.readingContent'))
        else if (status === "Analyzing materials...") setGeneratingStatus(t('examGenerator.analyzing'))
        else if (status === "Generating questions...") setGeneratingStatus(t('examGenerator.generatingQuestions'))
        else if (status === "Validating questions...") setGeneratingStatus(t('examGenerator.validating'))
        else setGeneratingStatus(status)
      })

      const exam = response.exam;

      const examId = crypto.randomUUID()
      const examRecord = {
        id: examId,
        title: exam.title || "Generated Exam",
        date: new Date().toLocaleString(),
        questions: exam.questions.length,
        difficulty,
        language: exam.language,
        sourceSummary: exam.sourceSummary,
        questionData: exam.questions,
      }

      const history = JSON.parse(localStorage.getItem("examHistory") || "[]")
      history.unshift(examRecord)
      localStorage.setItem("examHistory", JSON.stringify(history))
      localStorage.setItem("currentExamId", examId)

      navigate(`/exam-generator/results/${examId}`)
    } catch (err) {
      console.error(err);
      let message = err instanceof Error ? err.message : t('common.error');

      // Handle Rate Limit specifically
      if (message.includes("429") || message.includes("Rate limit") || message.includes("quota")) {
        message = t('examGenerator.errors.quotaExceeded');
      }

      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Method */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('examGenerator.uploadTitle')}</CardTitle>
          <CardDescription>{t('examGenerator.uploadDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Method Toggle */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant={uploadMethod === "text" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setUploadMethod("text")}
            >
              <FileText className="w-4 h-4 mr-2" />
              {t('examGenerator.pasteText')}
            </Button>
            <Button
              type="button"
              variant={uploadMethod === "file" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setUploadMethod("file")}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('examGenerator.uploadFile')}
            </Button>
          </div>

          {/* Text Input */}
          {uploadMethod === "text" && (
            <div className="space-y-2">
              <Label htmlFor="content">{t('examGenerator.studyMaterial')}</Label>
              <Textarea
                id="content"
                placeholder={t('examGenerator.placeholder')}
                className="min-h-[200px] resize-none"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{textContent.length} {t('examGenerator.characters')}</p>
            </div>
          )}

          {/* File Upload */}
          {uploadMethod === "file" && (
            <div className="space-y-2">
              <Label>{t('examGenerator.uploadLabel')}</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                {selectedFile ? (
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(2)} {t('examGenerator.kb')}</p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('examGenerator.dragDrop')}
                      <br />
                      {t('examGenerator.formats')}
                    </p>
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      {t('examGenerator.selectFile')}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Configuration */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('examGenerator.configTitle')}</CardTitle>
          <CardDescription>{t('examGenerator.configDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {/* Question Types */}
          <div className="space-y-3">
            <Label>{t('examGenerator.questionTypes')}</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={questionTypes.mcq}
                  onChange={(e) => setQuestionTypes({ ...questionTypes, mcq: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">{t('examGenerator.mcq')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={questionTypes.trueFalse}
                  onChange={(e) => setQuestionTypes({ ...questionTypes, trueFalse: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">{t('examGenerator.trueFalse')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={questionTypes.shortAnswer}
                  onChange={(e) => setQuestionTypes({ ...questionTypes, shortAnswer: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">{t('examGenerator.shortAnswer')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={questionTypes.essay}
                  onChange={(e) => setQuestionTypes({ ...questionTypes, essay: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">{t('examGenerator.essay')}</span>
              </label>
            </div>
          </div>

          {/* Difficulty & Number of Questions */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">{t('examGenerator.difficulty')}</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t('examGenerator.easy')}</SelectItem>
                  <SelectItem value="medium">{t('examGenerator.medium')}</SelectItem>
                  <SelectItem value="hard">{t('examGenerator.hard')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numQuestions">{t('examGenerator.numQuestions')}</Label>
              <Input
                id="numQuestions"
                type="number"
                min="5"
                max="50"
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
              />
            </div>
          </div>

          {/* Generate Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleGenerate}
            disabled={
              isGenerating ||
              (uploadMethod === "text" && !textContent) ||
              (uploadMethod === "file" && !selectedFile) ||
              !Object.values(questionTypes).some((v) => v)
            }
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {generatingStatus}
              </>
            ) : (
              t('examGenerator.generateBtn')
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

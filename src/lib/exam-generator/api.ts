import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import OpenAI from "openai";

// Configure PDF.js worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type QuestionType = "mcq" | "true_false" | "short_answer" | "essay"

const MIN_TEXT_LENGTH = 200


interface GeneratedQuestion {
    type: QuestionType
    question: string
    options?: string[]
    answer: string
    explanation?: string
    evidence?: string
}

interface GeneratePayload {
    title: string
    language: string
    questions: GeneratedQuestion[]
    sourceSummary?: string
}

function coerceQuestionTypes(raw: string | null): QuestionType[] {
    if (!raw) return ["mcq", "true_false"]
    try {
        const parsed = JSON.parse(raw) as Record<string, boolean>
        const map: Record<string, QuestionType> = {
            mcq: "mcq",
            trueFalse: "true_false",
            shortAnswer: "short_answer",
            essay: "essay",
        }
        return Object.entries(parsed)
            .filter(([, enabled]) => Boolean(enabled))
            .map(([key]) => map[key])
            .filter(Boolean)
    } catch {
        return ["mcq", "true_false"]
    }
}

function extractJson(content: string) {
    const firstBrace = content.indexOf("{")
    const lastBrace = content.lastIndexOf("}")
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error("Model response did not include JSON.")
    }
    const jsonText = content.slice(firstBrace, lastBrace + 1)
    return JSON.parse(jsonText) as GeneratePayload
}

function isGroundedQuestion(question: GeneratedQuestion, material: string) {
    const normalizedMaterial = material.toLowerCase()
    const bannedPattern =
        /(exam|question types|instructions|material is missing|insufficient|provided material)/i
    if (bannedPattern.test(question.question) || bannedPattern.test(question.answer)) {
        return false
    }
    const evidence = (question.evidence || "").trim()
    if (evidence.length < 10) {
        return false
    }
    return normalizedMaterial.includes(evidence.toLowerCase())
}

function getFileExtension(filename: string) {
    return filename.split('.').pop()?.toLowerCase() || '';
}

async function extractTextFromFile(file: File) {
    const buffer = await file.arrayBuffer()
    const extension = getFileExtension(file.name)

    if (extension === "pdf") {
        // PDF.js extraction
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + "\n";
        }

        if (fullText.trim().length >= MIN_TEXT_LENGTH) {
            return fullText;
        }

        // Fallback: OCR not implemented in client-side version for simplicity and API key safety.
        // If text is empty, it's likely a scanned PDF.
        return fullText;
    }

    if (extension === "docx") {
        const docx = await mammoth.extractRawText({ arrayBuffer: buffer })
        return docx.value
    }

    if (extension === "txt") {
        return new TextDecoder().decode(buffer)
    }

    throw new Error("Unsupported file type.")
}


export async function generateExam(formData: FormData, onStatus?: (status: string) => void) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const openai = new OpenAI({
        apiKey: apiKey || "dummy",
        dangerouslyAllowBrowser: true,
        timeout: 60000 // 60s timeout
    });

    if (!apiKey) {
        throw new Error("Missing VITE_OPENAI_API_KEY in environment variables.");
    }

    const method = (formData.get("method") || "text").toString()
    const difficulty = (formData.get("difficulty") || "medium").toString()
    const numQuestionsRaw = (formData.get("numQuestions") || "20").toString()
    const numQuestions = Number.parseInt(numQuestionsRaw, 10)
    const questionTypes = coerceQuestionTypes(formData.get("questionTypes")?.toString() ?? null)

    let content = ""
    let sourceName = ""

    onStatus?.("Reading content...")

    if (method === "text") {
        content = (formData.get("text") || "").toString()
        sourceName = "Pasted Text"
    } else {
        const file = formData.get("file")
        if (!(file instanceof File)) {
            throw new Error("Missing file upload.")
        }
        sourceName = file.name
        content = await extractTextFromFile(file)
    }

    const trimmed = content.trim()
    if (!trimmed) {
        throw new Error("No readable content found.")
    }

    onStatus?.("Analyzing materials...")
    const limitedContent = trimmed.slice(0, 30000)
    const prompt = [
        `Generates an exam based strictly on the following requirements:`,
        `- Total Questions: ${Number.isFinite(numQuestions) ? numQuestions : 20}`,
        `- Difficulty Level: ${difficulty}`,
        `- Question Types Allowed: ${questionTypes.join(", ")}`,
        `- For 'mcq', provide exactly 4 options.`,
        `- For 'true_false', options are strictly ["True", "False"].`,
        `- Language: Detect and match the language of the source text.`,
        `- Constraints:`,
        `  - Do NOT create questions about the instruction text itself.`,
        `  - Do NOT mention 'this text' or 'provided material' in the final questions. Make them sound like a real exam.`,
        `  - Include an exact quote in the 'evidence' field for verification.`,
        `  - Return valid JSON only.`,
        `Output Format:`,
        `{
            "title": "Exam Title",
            "language": "en | ar | es ...",
            "sourceSummary": "Brief topic summary...",
            "questions": [
                {
                    "type": "mcq",
                    "question": "...",
                    "options": ["A", "B", "C", "D"],
                    "answer": "Correct Option Text",
                    "explanation": "Why it is correct...",
                    "evidence": "Quote from text..."
                }
            ]
        }`,
        `Study Material (Truncated):`,
        `<<<BEGIN_MATERIAL>>>`,
        limitedContent,
        `<<<END_MATERIAL>>>`,
    ].join("\n")

    onStatus?.("Generating questions...")
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
            {
                role: "system",
                content: "You are a professional educational assessment AI. Generate high-quality, grounded exam questions based strictly on the provided text.",
            },
            { role: "user", content: prompt },
        ],
    })

    const rawContent = response.choices?.[0]?.message?.content || ""
    const parsed = extractJson(rawContent)

    if (!parsed.questions?.length) {
        throw new Error("No questions returned by the model.")
    }

    onStatus?.("Validating questions...")
    const groundedQuestions = parsed.questions.filter((question) => isGroundedQuestion(question, trimmed))

    if (!groundedQuestions.length) {
        throw new Error("No grounded questions could be generated from the provided material.")
    }

    return {
        exam: {
            ...parsed,
            questions: groundedQuestions,
        },
        sourceName,
    }
}

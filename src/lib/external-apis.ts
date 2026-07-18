/**
 * External API integrations for enhanced tool quality.
 * All APIs use free tiers — keys are optional, tools fall back to client-side if missing.
 */

const PROXY_BASE = '/.netlify/functions/proxy';
const CONVERT_BASE = '/.netlify/functions/convert';

// ─── Server-Side Conversion (highest quality — bypasses CORS) ──
// Uses Netlify Function that calls ConvertFleet/CloudConvert server-side
// This is the preferred conversion method for PDF→Word/Excel/PPT

export async function serverConvert(
  file: File,
  targetFormat: string,
  onProgress?: (pct: number) => void
): Promise<{ blob: Blob; service: string } | null> {
  try {
    onProgress?.(10);

    const arrayBuf = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuf).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    onProgress?.(40);
    const res = await fetch(CONVERT_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: base64,
        fileName: file.name,
        targetFormat,
      }),
    });

    onProgress?.(80);
    if (!res.ok) {
      console.warn(`Server convert failed: ${res.status}`);
      return null;
    }

    const service = res.headers.get('X-Conversion-Service') || 'unknown';
    const blob = await res.blob();
    onProgress?.(100);
    return { blob, service };
  } catch (e) {
    console.warn('Server convert failed:', e);
    return null;
  }
}

// ─── ConvertFleet (Best free option — no registration needed) ────
// Free: 200 credits, then $15/mo for 1500 credits
// No API key required for basic use!
// Sign up (optional): https://convertfleet.com/signup

export async function convertFleet(
  file: File,
  outputFormat: string,
  onProgress?: (pct: number) => void
): Promise<Blob | null> {
  try {
    onProgress?.(10);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('to', outputFormat);

    // Try with API key first (higher limits), then without
    const apiKey = import.meta.env.VITE_CONVERTFLEET_API_KEY;
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    onProgress?.(30);
    const res = await fetch('https://api.convertfleet.com/v1/convert', {
      method: 'POST',
      headers,
      body: formData,
    });

    onProgress?.(70);
    if (!res.ok) {
      console.warn(`ConvertFleet error: ${res.status}`);
      return null;
    }

    // Response can be JSON with download_url or direct binary
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data.download_url) {
        onProgress?.(90);
        const downloadRes = await fetch(data.download_url);
        const blob = await downloadRes.blob();
        onProgress?.(100);
        return blob;
      }
      return null;
    }

    // Direct binary response
    const blob = await res.blob();
    onProgress?.(100);
    return blob;
  } catch (e) {
    console.warn('ConvertFleet failed:', e);
    return null;
  }
}

// ─── CloudConvert (PDF→Word, PDF→PPT) ────────────────────────────
// Free: 5 conversions/day, 100MB limit
// Sign up: https://cloudconvert.com/ → API Settings

export async function cloudConvert(
  file: File,
  outputFormat: string,
  onProgress?: (pct: number) => void
): Promise<Blob | null> {
  const apiKey = import.meta.env.VITE_CLOUDCONVERT_API_KEY;
  if (!apiKey) return null;

  try {
    onProgress?.(10);
    // Step 1: Create a job
    const createRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-file': { operation: 'import/base64' },
          'convert-file': {
            operation: 'convert',
            input: 'import-file',
            output_format: outputFormat,
          },
          'export-file': {
            operation: 'export/url',
            input: 'convert-file',
          },
        },
      }),
    });

    if (!createRes.ok) return null;
    const job = await createRes.json();
    const importTask = job.data.tasks.find((t: any) => t.name === 'import-file');

    onProgress?.(30);
    // Step 2: Upload file
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.readAsDataURL(file);
    });

    const uploadRes = await fetch(importTask.result.form_url, {
      method: 'PUT',
      body: Uint8Array.from(atob(base64), c => c.charCodeAt(0)),
      headers: { 'Content-Type': 'application/octet-stream' },
    });

    if (!uploadRes.ok) return null;
    onProgress?.(50);

    // Step 3: Wait for job completion
    const jobId = job.data.id;
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const status = await statusRes.json();
      onProgress?.(50 + Math.min(40, attempts * 2));

      if (status.data.status === 'finished') break;
      if (status.data.status === 'failed') return null;
      attempts++;
    }

    // Step 4: Download result
    const jobRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const jobData = await jobRes.json();
    const exportTask = jobData.data.tasks.find((t: any) => t.name === 'export-file');
    if (!exportTask?.result?.files?.[0]?.url) return null;

    onProgress?.(90);
    const downloadRes = await fetch(exportTask.result.files[0].url);
    const blob = await downloadRes.blob();
    onProgress?.(100);
    return blob;
  } catch (e) {
    console.warn('CloudConvert failed:', e);
    return null;
  }
}

// ─── PDF.co (PDF→Excel, PDF→CSV) ────────────────────────────────
// Free: 50 credits/month
// Sign up: https://app.pdf.co/signup → API Key

export async function pdfCoConvert(
  file: File,
  outputFormat: 'excel' | 'csv',
  onProgress?: (pct: number) => void
): Promise<Blob | null> {
  const apiKey = import.meta.env.VITE_PDFCO_API_KEY;
  if (!apiKey) return null;

  try {
    onProgress?.(10);
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.readAsDataURL(file);
    });

    onProgress?.(30);
    const res = await fetch('https://api.pdf.co/v1/pdf/convert/to/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: base64,
        name: `output.${outputFormat === 'excel' ? 'xlsx' : 'csv'}`,
        outputFormat,
        apiKey,
      }),
    });

    onProgress?.(60);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.url) return null;

    onProgress?.(80);
    const downloadRes = await fetch(data.url);
    const blob = await downloadRes.blob();
    onProgress?.(100);
    return blob;
  } catch (e) {
    console.warn('PDF.co failed:', e);
    return null;
  }
}

// ─── Groq API (fast AI — alternative to Gemini) ──────────────────
// Free: 30 RPM, 30K tokens/min
// Sign up: https://console.groq.com → API Keys

export async function groqChat(
  messages: { role: string; content: string }[],
  options: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'llama-3.1-70b-versatile',
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || '';
}

// ─── Groq Streaming ──────────────────────────────────────────────
export async function groqChatStream(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  options: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<void> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'llama-3.1-70b-versatile',
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.3,
      stream: true,
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const content = json.choices[0]?.delta?.content;
        if (content) onChunk(content);
      } catch { /* skip malformed */ }
    }
  }
}

// ─── Mistral AI (structured extraction) ──────────────────────────
// Free tier available
// Sign up: https://console.mistral.ai → API Keys

export async function mistralChat(
  messages: { role: string; content: string }[],
  options: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
  if (!apiKey) throw new Error('Mistral API key not configured');

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'mistral-small-latest',
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Mistral API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || '';
}

// ─── Auto-select best available AI provider ──────────────────────
export async function autoAI(
  messages: { role: string; content: string }[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<{ provider: string; text: string }> {
  // Try Groq first (fastest, free)
  if (import.meta.env.VITE_GROQ_API_KEY) {
    try {
      const text = await groqChat(messages, options);
      return { provider: 'groq', text };
    } catch { /* fall through */ }
  }

  // Try Mistral
  if (import.meta.env.VITE_MISTRAL_API_KEY) {
    try {
      const text = await mistralChat(messages, options);
      return { provider: 'mistral', text };
    } catch { /* fall through */ }
  }

  // Fallback: will be handled by caller (Gemini client-side)
  throw new Error('No external AI provider configured');
}

// ─── Auto-select best conversion provider ────────────────────────
export async function autoConvert(
  file: File,
  targetFormat: string,
  onProgress?: (pct: number) => void
): Promise<{ provider: string; blob: Blob } | null> {
  // 1. Try server-side conversion first (highest quality, bypasses CORS)
  const serverResult = await serverConvert(file, targetFormat, onProgress);
  if (serverResult) return { provider: serverResult.service, blob: serverResult.blob };

  // 2. Try ConvertFleet client-side (free, no registration)
  const cfResult = await convertFleet(file, targetFormat, onProgress);
  if (cfResult) return { provider: 'convertfleet', blob: cfResult };

  // 3. Try CloudConvert (needs API key)
  if (['docx', 'pptx'].includes(targetFormat)) {
    const result = await cloudConvert(file, targetFormat, onProgress);
    if (result) return { provider: 'cloudconvert', blob: result };
  }

  // 4. Try PDF.co for Excel (needs API key)
  if (targetFormat === 'xlsx') {
    const result = await pdfCoConvert(file, 'excel', onProgress);
    if (result) return { provider: 'pdfco', blob: result };
  }

  return null;
}

// ─── Check which services are configured ─────────────────────────
export function getAvailableServices() {
  return {
    convertfleet: true, // No API key required
    cloudconvert: !!import.meta.env.VITE_CLOUDCONVERT_API_KEY,
    pdfco: !!import.meta.env.VITE_PDFCO_API_KEY,
    groq: !!import.meta.env.VITE_GROQ_API_KEY,
    mistral: !!import.meta.env.VITE_MISTRAL_API_KEY,
    gemini: !!import.meta.env.VITE_GEMINI_API_KEY,
  };
}

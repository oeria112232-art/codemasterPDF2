import { ref, get, set, runTransaction } from 'firebase/database';
import { database } from './firebase';

export interface CreditPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  badge?: string;
}

export const CREDIT_PLANS: CreditPlan[] = [
  { id: 'free', name: 'Free', credits: 100, price: 0, currency: 'USD' },
  { id: 'basic', name: 'Basic', credits: 500, price: 4.99, currency: 'USD', badge: 'Popular' },
  { id: 'pro', name: 'Pro', credits: 2000, price: 14.99, currency: 'USD', badge: 'Best Value' },
  { id: 'business', name: 'Business', credits: 10000, price: 49.99, currency: 'USD' },
  { id: 'enterprise', name: 'Enterprise', credits: 999999, price: 99.99, currency: 'USD', badge: 'Unlimited' },
];

export interface ToolCost {
  toolId: string;
  name: string;
  credits: number;
  isFree: boolean;
  description: string;
}

export const TOOL_COSTS: ToolCost[] = [
  { toolId: 'merge', name: 'Merge PDF', credits: 5, isFree: false, description: 'Combine multiple PDF files' },
  { toolId: 'split', name: 'Split PDF', credits: 5, isFree: false, description: 'Split a PDF into multiple files' },
  { toolId: 'compress', name: 'Compress PDF', credits: 5, isFree: false, description: 'Reduce PDF file size' },
  { toolId: 'rotate', name: 'Rotate PDF', credits: 2, isFree: false, description: 'Rotate PDF pages' },
  { toolId: 'protect', name: 'Protect PDF', credits: 5, isFree: false, description: 'Add password protection' },
  { toolId: 'unlock', name: 'Unlock PDF', credits: 5, isFree: false, description: 'Remove PDF password' },
  { toolId: 'watermark', name: 'Watermark', credits: 10, isFree: false, description: 'Add text/image watermark' },
  { toolId: 'sign', name: 'Sign PDF', credits: 10, isFree: false, description: 'Add digital signature' },
  { toolId: 'page-numbers', name: 'Page Numbers', credits: 3, isFree: false, description: 'Add page numbers' },
  { toolId: 'organize', name: 'Organize Pages', credits: 5, isFree: false, description: 'Reorder pages' },
  { toolId: 'edit', name: 'Visual Edit', credits: 10, isFree: false, description: 'Edit PDF visually' },
  { toolId: 'crop', name: 'Crop PDF', credits: 5, isFree: false, description: 'Crop PDF pages' },
  { toolId: 'repair', name: 'Repair PDF', credits: 5, isFree: false, description: 'Fix corrupted PDFs' },
  { toolId: 'redact', name: 'Redact PDF', credits: 10, isFree: false, description: 'Permanently remove content' },
  { toolId: 'pdf-to-word', name: 'PDF to Word', credits: 15, isFree: false, description: 'Convert PDF to DOCX' },
  { toolId: 'pdf-to-excel', name: 'PDF to Excel', credits: 15, isFree: false, description: 'Convert PDF to XLSX' },
  { toolId: 'pdf-to-powerpoint', name: 'PDF to PowerPoint', credits: 15, isFree: false, description: 'Convert PDF to PPTX' },
  { toolId: 'pdf-to-jpg', name: 'PDF to Image', credits: 10, isFree: false, description: 'Convert PDF pages to images' },
  { toolId: 'word-to-pdf', name: 'Word to PDF', credits: 10, isFree: false, description: 'Convert DOCX to PDF' },
  { toolId: 'excel-to-pdf', name: 'Excel to PDF', credits: 10, isFree: false, description: 'Convert XLSX to PDF' },
  { toolId: 'powerpoint-to-pdf', name: 'PowerPoint to PDF', credits: 10, isFree: false, description: 'Convert PPTX to PDF' },
  { toolId: 'jpg-to-pdf', name: 'Image to PDF', credits: 5, isFree: false, description: 'Convert images to PDF' },
  { toolId: 'html-to-pdf', name: 'HTML to PDF', credits: 10, isFree: false, description: 'Convert web pages to PDF' },
  { toolId: 'batch-process', name: 'Batch Process', credits: 2, isFree: false, description: 'Process multiple files at once (per file)' },
  { toolId: 'metadata-editor', name: 'Metadata Editor', credits: 3, isFree: false, description: 'Edit PDF title, author, keywords' },
  { toolId: 'flatten-pdf', name: 'Flatten PDF', credits: 5, isFree: false, description: 'Remove interactive form fields' },
  { toolId: 'ocr-pdf', name: 'OCR PDF', credits: 15, isFree: false, description: 'Extract text from scanned PDFs' },
  { toolId: 'fill-forms', name: 'Fill PDF Forms', credits: 10, isFree: false, description: 'Fill interactive PDF form fields' },
  { toolId: 'delete-pages', name: 'Delete Pages', credits: 5, isFree: false, description: 'Remove pages from PDF' },
];

export function getToolCost(toolId: string): ToolCost | undefined {
  return TOOL_COSTS.find(t => t.toolId === toolId);
}

export function canAfford(credits: number, toolId: string): boolean {
  const cost = getToolCost(toolId);
  if (!cost) return false;
  if (cost.isFree) return true;
  return credits >= cost.credits;
}

function isPermissionDenied(err: any): boolean {
  return err?.message?.includes('permission_denied') || err?.code === 'PERMISSION_DENIED';
}

export async function getCredits(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const creditsRef = ref(database, `users/${userId}/credits`);
    const snapshot = await get(creditsRef);
    if (snapshot.exists()) return snapshot.val();
    try {
      await set(creditsRef, 100);
      return 100;
    } catch {
      return 0;
    }
  } catch (err) {
    if (isPermissionDenied(err)) return 0;
    console.warn('getCredits failed:', err);
    return 0;
  }
}

export async function useCredits(userId: string, toolId: string): Promise<{ success: boolean; remaining: number; error?: string }> {
  if (!userId) return { success: false, remaining: 0, error: 'Not authenticated' };

  const cost = getToolCost(toolId);
  if (!cost) return { success: false, remaining: 0, error: 'Unknown tool' };
  if (cost.isFree) {
    const credits = await getCredits(userId);
    return { success: true, remaining: credits };
  }

  try {
    const creditsRef = ref(database, `users/${userId}/credits`);
    const result = await runTransaction(creditsRef, (currentCredits: number | null) => {
      const current = currentCredits || 0;
      if (current < cost.credits) return current;
      return current - cost.credits;
    });

    if (result.committed) {
      return { success: true, remaining: result.snapshot.val() as number };
    }
    return { success: false, remaining: 0, error: 'Insufficient credits' };
  } catch (err) {
    if (isPermissionDenied(err)) {
      return { success: true, remaining: 0 };
    }
    return { success: false, remaining: 0, error: 'Credits system unavailable' };
  }
}

export async function addCredits(userId: string, amount: number, _reason?: string): Promise<number> {
  if (!userId) return 0;
  try {
    const creditsRef = ref(database, `users/${userId}/credits`);
    const result = await runTransaction(creditsRef, (currentCredits: number | null) => {
      return (currentCredits || 0) + amount;
    });
    return result.snapshot.val() as number;
  } catch {
    return 0;
  }
}

export async function trackToolUsage(userId: string, toolId: string, success: boolean): Promise<void> {
  if (!userId) return;
  try {
    const usageRef = ref(database, `users/${userId}/usage/${toolId}`);
    const snapshot = await get(usageRef);
    const current = snapshot.val() || { count: 0, lastUsed: null };
    await set(usageRef, {
      count: current.count + (success ? 1 : 0),
      lastUsed: new Date().toISOString(),
    });
  } catch {}
}

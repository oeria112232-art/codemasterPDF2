/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows common formatting tags but removes dangerous elements.
 */
export function sanitizeHtml(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove all script tags
    doc.querySelectorAll('script').forEach(el => el.remove());

    // Remove all iframe/object/embed tags
    doc.querySelectorAll('iframe, object, embed').forEach(el => el.remove());

    // Remove all event handler attributes
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.toLowerCase().startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        });
        // Remove javascript: URLs
        if (el.hasAttribute('href')) {
            const href = el.getAttribute('href');
            if (href && href.toLowerCase().startsWith('javascript:')) {
                el.removeAttribute('href');
            }
        }
        if (el.hasAttribute('src')) {
            const src = el.getAttribute('src');
            if (src && src.toLowerCase().startsWith('javascript:')) {
                el.removeAttribute('src');
            }
        }
    });

    return doc.body.innerHTML;
}

/**
 * Sanitize text input to prevent injection attacks.
 */
export function sanitizeText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Generate a unique ID (safer than Math.random for IDs).
 */
export function generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validate password strength. Returns an object with validity and feedback.
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
} {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password must be at least 8 characters');

    if (password.length >= 12) score += 1;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase and lowercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include at least one number');

    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 1;
    else feedback.push('Include at least one special character');

    // Check for common patterns
    const commonPatterns = ['123456', 'password', 'qwerty', 'abc123', 'letmein', 'admin'];
    if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
        score = Math.max(score - 2, 0);
        feedback.push('Avoid common passwords');
    }

    return {
        isValid: score >= 3 && password.length >= 8,
        score: Math.min(score, 5),
        feedback,
    };
}

/**
 * Sanitize profile display name (no special chars beyond what's needed).
 */
export function sanitizeDisplayName(name: string): string {
    return name
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[<>{}]/g, '')
        .substring(0, 100);
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Simple client-side rate limiter using localStorage.
 */
export function checkRateLimit(action: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const key = `rateLimit_${action}`;
    const now = Date.now();
    const stored = localStorage.getItem(key);

    if (!stored) {
        localStorage.setItem(key, JSON.stringify({ count: 1, firstAttempt: now }));
        return true;
    }

    const { count, firstAttempt } = JSON.parse(stored);

    if (now - firstAttempt > windowMs) {
        localStorage.setItem(key, JSON.stringify({ count: 1, firstAttempt: now }));
        return true;
    }

    if (count >= maxAttempts) {
        return false;
    }

    localStorage.setItem(key, JSON.stringify({ count: count + 1, firstAttempt }));
    return true;
}

/**
 * Format a date string for display.
 */
export function formatDate(dateString: string | undefined): string {
    if (!dateString) return '—';
    try {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
}

/**
 * Calculate account age in a human-readable format.
 */
export function getAccountAge(creationDate: string | undefined): string {
    if (!creationDate) return '—';
    const created = new Date(creationDate);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days < 1) return 'Today';
    if (days < 30) return `${days} day${days > 1 ? 's' : ''}`;
    if (days < 365) {
        const months = Math.floor(days / 30);
        return `${months} month${months > 1 ? 's' : ''}`;
    }
    const years = Math.floor(days / 365);
    const remMonths = Math.floor((days % 365) / 30);
    return `${years} year${years > 1 ? 's' : ''}${remMonths > 0 ? ` ${remMonths} month${remMonths > 1 ? 's' : ''}` : ''}`;
}

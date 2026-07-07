// Anti-spam utilities

// Honeypot field names (bots fill these, humans don't)
export const HONEYPOT_FIELDS = ["website_url", "fax_number", "company_name"];

// Suspicious patterns
const SPAM_PATTERNS = [
  /\b(buy|cheap|discount|free money|click here|act now|limited time)\b/i,
  /\b(viagra|cialis|pharmacy|casino|lottery|winner|prize)\b/i,
  /https?:\/\/[^\s]+\.(ru|cn|tk|ml|ga|cf)\b/i,
  /(.)\1{10,}/, // Repeated characters
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,
];

// Profanity filter (basic)
const BLOCKED_WORDS = [
  // Add words as needed
];

const URL_REGEX = /https?:\/\/[^\s]+/g;

export interface SpamCheckResult {
  isSpam: boolean;
  reason?: string;
  spamScore: number;
}

export function checkForSpam(content: string, metadata?: {
  honeypotValues?: Record<string, string>;
  userAgent?: string;
  ip?: string;
}): SpamCheckResult {
  let score = 0;
  let reason = "";

  // 1. Honeypot check
  if (metadata?.honeypotValues) {
    for (const [field, value] of Object.entries(metadata.honeypotValues)) {
      if (value && value.length > 0) {
        return { isSpam: true, reason: "honeypot_triggered", spamScore: 100 };
      }
    }
  }

  // 2. Pattern matching
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      score += 30;
      reason = `pattern_match:${pattern.source.slice(0, 30)}`;
    }
  }

  // 3. Too many URLs
  const urls = content.match(URL_REGEX) || [];
  if (urls.length > 3) {
    score += 20;
    reason = "too_many_urls";
  }

  // 4. Excessive caps
  const capsRatio = (content.replace(/[^A-Z]/g, "").length) / content.length;
  if (capsRatio > 0.7 && content.length > 20) {
    score += 15;
    reason = "excessive_caps";
  }

  // 5. Very short content with links
  if (content.length < 20 && urls.length > 0) {
    score += 25;
    reason = "short_with_link";
  }

  // 6. Repetitive content
  const words = content.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
    score += 20;
    reason = "repetitive_content";
  }

  return {
    isSpam: score >= 50,
    reason,
    spamScore: Math.min(100, score),
  };
}

export function createHoneypotField() {
  const field = HONEYPOT_FIELDS[Math.floor(Math.random() * HONEYPOT_FIELDS.length)];
  return {
    name: field,
    label: "Leave this empty",
    style: "position:absolute;left:-9999px;opacity:0;height:0;width:0;overflow:hidden;" as const,
  };
}

// Content length limits
export const CONTENT_LIMITS = {
  comment: { min: 1, max: 2000 },
  review: { min: 10, max: 5000 },
  bio: { min: 0, max: 500 },
  title: { min: 1, max: 200 },
  description: { min: 0, max: 5000 },
} as const;

export function validateContentLength(
  content: string,
  type: keyof typeof CONTENT_LIMITS
): { valid: boolean; error?: string } {
  const limits = CONTENT_LIMITS[type];
  if (content.length < limits.min) {
    return { valid: false, error: `Minimum ${limits.min} characters` };
  }
  if (content.length > limits.max) {
    return { valid: false, error: `Maximum ${limits.max} characters` };
  }
  return { valid: true };
}

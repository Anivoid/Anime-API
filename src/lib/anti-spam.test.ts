import { describe, it, expect } from "vitest";
import {
  createHoneypotField,
  checkForSpam,
  validateContentLength,
  CONTENT_LIMITS,
  HONEYPOT_FIELDS,
} from "@/lib/anti-spam";

describe("Honeypot", () => {
  it("creates a honeypot field with name and label", () => {
    const hp = createHoneypotField();
    expect(HONEYPOT_FIELDS).toContain(hp.name);
    expect(hp.label).toBeTruthy();
    expect(hp.style).toContain("position:absolute");
  });

  it("passes check when no honeypot values", () => {
    const result = checkForSpam("normal content");
    expect(result.isSpam).toBe(false);
  });

  it("fails when honeypot has value (bot filled it)", () => {
    const hp = createHoneypotField();
    const result = checkForSpam("bot content", {
      honeypotValues: { [hp.name]: "spam bot" },
    });
    expect(result.isSpam).toBe(true);
    expect(result.reason).toBe("honeypot_triggered");
  });

  it("passes when honeypot is empty string", () => {
    const hp = createHoneypotField();
    const result = checkForSpam("human content", {
      honeypotValues: { [hp.name]: "" },
    });
    expect(result.isSpam).toBe(false);
  });
});

describe("checkForSpam", () => {
  it("detects normal content as not spam", () => {
    const result = checkForSpam("This is a normal comment about the anime.");
    expect(result.isSpam).toBe(false);
    expect(result.spamScore).toBeLessThan(50);
  });

  it("detects excessive URLs as spam", () => {
    const result = checkForSpam("Visit https://a.com and https://b.com and https://c.com and https://d.com and https://e.com https://f.tk");
    expect(result.isSpam).toBe(true);
  });

  it("detects all caps as spam", () => {
    // Keywords (buy/free/click) => +30, .tk URL domain => +30, and caps => +15 = 75
    const result = checkForSpam("BUY NOW FREE MONEY CLICK HERE AT https://prize.tk WIN BIG");
    expect(result.isSpam).toBe(true);
  });

  it("detects spam keywords with script injection", () => {
    const result = checkForSpam("buy now free money <script>document.write('spam')</script> click here");
    expect(result.isSpam).toBe(true);
  });

  it("detects script injection with malicious domain", () => {
    const result = checkForSpam("<script>location='http://evil.tk'</script> click here");
    expect(result.isSpam).toBe(true);
  });
});

describe("CONTENT_LIMITS", () => {
  it("has comment limits", () => {
    expect(CONTENT_LIMITS.comment.min).toBe(1);
    expect(CONTENT_LIMITS.comment.max).toBe(2000);
  });

  it("has review limits", () => {
    expect(CONTENT_LIMITS.review.min).toBe(10);
    expect(CONTENT_LIMITS.review.max).toBe(5000);
  });
});

describe("validateContentLength", () => {
  it("validates normal comment", () => {
    const result = validateContentLength("Great episode!", "comment");
    expect(result.valid).toBe(true);
  });

  it("rejects empty comment", () => {
    const result = validateContentLength("", "comment");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects too long comment", () => {
    const result = validateContentLength("x".repeat(2001), "comment");
    expect(result.valid).toBe(false);
  });

  it("validates bio (allows empty)", () => {
    const result = validateContentLength("", "bio");
    expect(result.valid).toBe(true);
  });

  it("validates review with min length", () => {
    const result = validateContentLength("short", "review");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Minimum");
  });

  it("validates title", () => {
    const result = validateContentLength("My Title", "title");
    expect(result.valid).toBe(true);
  });

  it("rejects title that is too long", () => {
    const result = validateContentLength("x".repeat(201), "title");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Maximum");
  });
});

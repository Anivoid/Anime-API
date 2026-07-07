import { describe, it, expect, beforeEach } from "vitest";
import { reportError, reportWarning, getRecentErrors, getErrorStats } from "@/lib/error-monitor";

describe("reportError", () => {
  it("creates an error report from Error object", () => {
    const report = reportError(new Error("test error"), { api: "test" });
    expect(report.id).toMatch(/^err_/);
    expect(report.level).toBe("error");
    expect(report.message).toBe("test error");
    expect(report.context).toEqual({ api: "test" });
    expect(report.timestamp).toBeTruthy();
  });

  it("creates an error report from string", () => {
    const report = reportError("string error");
    expect(report.level).toBe("error");
    expect(report.message).toBe("string error");
  });

  it("captures stack trace for Error objects", () => {
    const error = new Error("with stack");
    const report = reportError(error);
    expect(report.stack).toBeTruthy();
  });

  it("does not capture stack for string errors", () => {
    const report = reportError("string only");
    expect(report.stack).toBeUndefined();
  });
});

describe("reportWarning", () => {
  it("creates a warning report", () => {
    const report = reportWarning("test warning", { component: "test" });
    expect(report.level).toBe("warning");
    expect(report.message).toBe("test warning");
    expect(report.context).toEqual({ component: "test" });
  });
});

describe("getRecentErrors", () => {
  it("returns recent errors within limit", () => {
    const recent = getRecentErrors(3);
    expect(recent.length).toBeLessThanOrEqual(3);
  });

  it("returns items with correct structure", () => {
    const recent = getRecentErrors(1);
    if (recent.length > 0) {
      expect(recent[0]).toHaveProperty("id");
      expect(recent[0]).toHaveProperty("level");
      expect(recent[0]).toHaveProperty("message");
      expect(recent[0]).toHaveProperty("timestamp");
    }
  });
});

describe("getErrorStats", () => {
  it("returns stats with correct structure", () => {
    const stats = getErrorStats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("last24h");
    expect(stats).toHaveProperty("last1h");
    expect(stats).toHaveProperty("errors");
    expect(stats).toHaveProperty("warnings");
    expect(stats).toHaveProperty("recent");
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.last24h).toBe("number");
    expect(typeof stats.errors).toBe("number");
    expect(typeof stats.warnings).toBe("number");
    expect(Array.isArray(stats.recent)).toBe(true);
  });

  it("errors + warnings <= last24h", () => {
    const stats = getErrorStats();
    expect(stats.errors + stats.warnings).toBeLessThanOrEqual(stats.last24h);
  });
});

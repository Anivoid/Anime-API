// Error monitoring and logging

export interface ErrorReport {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "info";
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string;
  url?: string;
  userAgent?: string;
}

// In-memory error store (production: send to Sentry/Datadog)
const errorStore: ErrorReport[] = [];
const MAX_ERRORS = 1000;

let errorIdCounter = 0;

export function reportError(
  error: Error | string,
  context?: Record<string, unknown>
): ErrorReport {
  const id = `err_${++errorIdCounter}_${Date.now()}`;
  const report: ErrorReport = {
    id,
    timestamp: new Date().toISOString(),
    level: "error",
    message: typeof error === "string" ? error : error.message,
    stack: typeof error === "object" ? error.stack : undefined,
    context,
  };

  errorStore.unshift(report);
  if (errorStore.length > MAX_ERRORS) errorStore.pop();

  // Console output for development
  console.error(`[ErrorMonitor] ${report.message}`, {
    id: report.id,
    context: report.context,
    stack: report.stack?.split("\n").slice(0, 5).join("\n"),
  });

  return report;
}

export function reportWarning(
  message: string,
  context?: Record<string, unknown>
): ErrorReport {
  const id = `warn_${++errorIdCounter}_${Date.now()}`;
  const report: ErrorReport = {
    id,
    timestamp: new Date().toISOString(),
    level: "warning",
    message,
    context,
  };

  errorStore.unshift(report);
  if (errorStore.length > MAX_ERRORS) errorStore.pop();

  console.warn(`[ErrorMonitor] ${report.message}`, report.context);

  return report;
}

export function getErrorStats() {
  const now = Date.now();
  const last24h = errorStore.filter(
    (e) => now - new Date(e.timestamp).getTime() < 86400000
  );
  const last1h = errorStore.filter(
    (e) => now - new Date(e.timestamp).getTime() < 3600000
  );

  return {
    total: errorStore.length,
    last24h: last24h.length,
    last1h: last1h.length,
    errors: last24h.filter((e) => e.level === "error").length,
    warnings: last24h.filter((e) => e.level === "warning").length,
    recent: errorStore.slice(0, 50),
  };
}

export function getRecentErrors(limit = 50) {
  return errorStore.slice(0, limit);
}

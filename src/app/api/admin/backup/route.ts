import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { reportError } from "@/lib/error-monitor";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, readdir } from "fs/promises";
import { join } from "path";

const execAsync = promisify(exec);
const BACKUP_DIR = join(process.cwd(), "backups");

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // List existing backups
    try {
      const files = await readdir(BACKUP_DIR);
      const backups = files
        .filter((f) => f.endsWith(".db"))
        .map((f) => ({ name: f, path: join(BACKUP_DIR, f) }))
        .sort((a, b) => b.name.localeCompare(a.name));

      return NextResponse.json({ backups });
    } catch {
      return NextResponse.json({ backups: [] });
    }
  } catch (error) {
    console.error("Error listing backups:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Backup API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action, backupName } = await request.json();

    if (action === "backup") {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const name = backupName || `backup-${timestamp}`;
      const dbPath = join(process.cwd(), "prisma", "dev.db");
      const backupPath = join(BACKUP_DIR, `${name}.db`);

      // Create backups directory
      try {
        await writeFile(BACKUP_DIR + "/.keep", "");
      } catch {}

      // Copy database
      await execAsync(`cp "${dbPath}" "${backupPath}"`);

      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "BACKUP_CREATE",
          entity: "System",
          details: `Created backup: ${name}.db`,
        },
      });

      return NextResponse.json({ success: true, name: `${name}.db` });
    }

    if (action === "restore") {
      if (!backupName) {
        return NextResponse.json({ error: "Backup name required" }, { status: 400 });
      }

      const dbPath = join(process.cwd(), "prisma", "dev.db");
      const backupPath = join(BACKUP_DIR, backupName);

      // Restore database
      await execAsync(`cp "${backupPath}" "${dbPath}"`);

      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "BACKUP_RESTORE",
          entity: "System",
          details: `Restored from backup: ${backupName}`,
        },
      });

      return NextResponse.json({ success: true, message: "Database restored. Restart the server." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error with backup:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Backup API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const backupName = searchParams.get("name");

    if (!backupName) {
      return NextResponse.json({ error: "Backup name required" }, { status: 400 });
    }

    const backupPath = join(BACKUP_DIR, backupName);
    const { rm } = await import("fs/promises");
    await rm(backupPath, { force: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting backup:", error);
    reportError(error instanceof Error ? error : "Unknown error", { api: "Backup API" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

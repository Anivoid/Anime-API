import { NextResponse } from "next/server";

export async function GET() {
  const providers: { id: string; name: string }[] = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push({ id: "google", name: "Google" });
  }
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    providers.push({ id: "discord", name: "Discord" });
  }

  return NextResponse.json(providers);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        notifEpisodes: true,
        notifComments: true,
        notifMentions: true,
        notifBrowser: true,
        notifEmail: true,
        email: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notifEpisodes, notifComments, notifMentions, notifBrowser, notifEmail } = body;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(notifEpisodes !== undefined && { notifEpisodes }),
        ...(notifComments !== undefined && { notifComments }),
        ...(notifMentions !== undefined && { notifMentions }),
        ...(notifBrowser !== undefined && { notifBrowser }),
        ...(notifEmail !== undefined && { notifEmail }),
      },
      select: {
        notifEpisodes: true,
        notifComments: true,
        notifMentions: true,
        notifBrowser: true,
        notifEmail: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

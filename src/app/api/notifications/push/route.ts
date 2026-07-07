import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint, keys } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        pushEndpoint: endpoint,
        pushKeys: JSON.stringify(keys || {}),
        notifBrowser: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error registering push:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        pushEndpoint: null,
        pushKeys: null,
        notifBrowser: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unregistering push:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

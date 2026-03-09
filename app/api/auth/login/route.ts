export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  createSession,
  verifyPassword
} from "@/lib/auth";
import { badRequest, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const parsed = credentialsSchema.safeParse(payload);

    if (!parsed.success) {
      return badRequest("Invalid payload", parsed.error.flatten());
    }

    const username = parsed.data.username.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createSession(user.id);
    const response = NextResponse.json({
      id: user.id,
      username: user.username
    });
    attachSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export const dynamic = "force-dynamic";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, createSession, hashPassword } from "@/lib/auth";
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
    const passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash
      }
    });

    const token = await createSession(user.id);
    const response = NextResponse.json({
      id: user.id,
      username: user.username
    });
    attachSessionCookie(response, token);

    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    console.error(error);
    return serverError();
  }
}

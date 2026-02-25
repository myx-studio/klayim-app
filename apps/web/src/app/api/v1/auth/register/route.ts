import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api";
import type { ApiResponse, User } from "@klayim/shared/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const data = await api<ApiResponse<{ user: User }>>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      const errorData = error.data as { error?: string } | undefined;
      return NextResponse.json(
        { success: false, error: errorData?.error || "Registration failed" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api";
import type { ApiResponse } from "@klayim/shared/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const data = await api<ApiResponse<null>>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: "Failed to process request" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

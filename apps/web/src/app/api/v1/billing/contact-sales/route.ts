import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api";
import type { ApiResponse } from "@klayim/shared/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Contact sales is public - no auth required
    const data = await api<ApiResponse<null>>(
      "/billing/contact-sales",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      const errorData = error.data as { error?: string } | undefined;
      return NextResponse.json(
        { success: false, error: errorData?.error || "Failed to submit contact request" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

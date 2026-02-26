import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import type { ApiResponse } from "@klayim/shared/types";

interface CheckNameResponse {
  available: boolean;
  suggestion?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name parameter is required" },
        { status: 400 }
      );
    }

    // Generate Bearer token (base64 encoded userId) for backend auth
    const token = Buffer.from(session.user.id).toString("base64");

    const data = await api<ApiResponse<CheckNameResponse>>(
      `/organizations/check-name?name=${encodeURIComponent(name)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      const errorData = error.data as { error?: string } | undefined;
      return NextResponse.json(
        { success: false, error: errorData?.error || "Failed to check name availability" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

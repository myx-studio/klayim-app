import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import type { ApiResponse, Organization } from "@klayim/shared/types";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Generate Bearer token (base64 encoded userId) for backend auth
    const token = Buffer.from(session.user.id).toString("base64");

    const data = await api<ApiResponse<{ organization: Organization }>>(
      "/organizations/me",
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
        { success: false, error: errorData?.error || "No organization found" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

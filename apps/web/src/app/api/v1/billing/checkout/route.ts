import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import type { ApiResponse, CheckoutSessionResponse } from "@klayim/shared/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const token = Buffer.from(session.user.id).toString("base64");

    const data = await api<ApiResponse<CheckoutSessionResponse>>(
      "/billing/checkout",
      {
        method: "POST",
        body: JSON.stringify(body),
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
        { success: false, error: errorData?.error || "Failed to create checkout session" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api";
import type { ApiResponse, UserProfile } from "@klayim/shared/types";

interface LoginResponseData {
  user: UserProfile;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const data = await api<ApiResponse<LoginResponseData>>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

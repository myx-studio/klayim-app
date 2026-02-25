import { api, ApiError } from "@/lib/api";
import type { ApiResponse } from "@klayim/shared/types";
import { NextRequest, NextResponse } from "next/server";

interface SubscribeResponseData {
  alreadySubscribed: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const data = await api<ApiResponse<SubscribeResponseData>>("/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

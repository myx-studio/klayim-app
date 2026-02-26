import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import type { ApiResponse, Organization } from "@klayim/shared/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const token = Buffer.from(session.user.id).toString("base64");

    const data = await api<ApiResponse<{ organization: Organization }>>(
      `/organizations/${id}`,
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
        { success: false, error: errorData?.error || "Organization not found" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const token = Buffer.from(session.user.id).toString("base64");

    const data = await api<ApiResponse<{ organization: Organization }>>(
      `/organizations/${id}`,
      {
        method: "PATCH",
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
        { success: false, error: errorData?.error || "Failed to update organization" },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

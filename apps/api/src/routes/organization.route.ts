import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  completeOnboardingStepSchema,
  paginationSchema,
} from "@klayim/shared/schemas";
import { organizationService } from "@/services/index.js";
import type {
  ApiResponse,
  Organization,
  OrganizationWithRole,
  OrganizationMember,
  MemberWithUser,
  PaginatedResult,
} from "@klayim/shared/types";
import { z } from "zod";

const organizations = new Hono();

// GET /organizations/check-name - Check organization name availability
// NOTE: This route MUST be before /:id to prevent "check-name" being interpreted as an ID
organizations.get(
  "/check-name",
  zValidator("query", z.object({ name: z.string().min(2).max(50) })),
  async (c) => {
    const { name } = c.req.valid("query");
    const userId = c.get("userId") as string | undefined;

    // If user is authenticated, exclude their own organization from the check
    const result = await organizationService.checkNameAvailability(name, userId);

    return c.json<ApiResponse<{ available: boolean; suggestion?: string }>>({
      success: true,
      data: result,
    });
  }
);

// GET /organizations/me - Get current user's default organization
// NOTE: This route MUST be before /:id to prevent "me" being interpreted as an ID
organizations.get("/me", async (c) => {
  const userId = c.get("userId") as string | undefined;

  if (!userId) {
    return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
  }

  const organization = await organizationService.getUserDefaultOrganization(userId);

  if (!organization) {
    return c.json<ApiResponse<null>>({ success: false, error: "No organization found" }, 404);
  }

  return c.json<ApiResponse<{ organization: Organization }>>({
    success: true,
    data: { organization },
  });
});

// GET /organizations - List user's organizations
organizations.get("/", zValidator("query", paginationSchema), async (c) => {
  const userId = c.get("userId") as string | undefined;

  if (!userId) {
    return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
  }

  const params = c.req.valid("query");
  const result = await organizationService.getUserOrganizations(userId, params);

  return c.json<ApiResponse<PaginatedResult<OrganizationWithRole>>>({
    success: true,
    data: result,
  });
});

// POST /organizations - Create organization
organizations.post("/", zValidator("json", createOrganizationSchema), async (c) => {
  const userId = c.get("userId") as string | undefined;

  if (!userId) {
    return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
  }

  const input = c.req.valid("json");
  const result = await organizationService.createOrganization(input, userId);

  if ("error" in result) {
    return c.json<ApiResponse<null>>({ success: false, error: result.error }, 400);
  }

  return c.json<ApiResponse<{ organization: Organization; member: OrganizationMember }>>(
    { success: true, data: result },
    201
  );
});

// GET /organizations/:id - Get organization
organizations.get("/:id", async (c) => {
  const userId = c.get("userId") as string | undefined;
  const id = c.req.param("id");

  if (!userId) {
    return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
  }

  const result = await organizationService.getOrganizationWithRole(id, userId);

  if (!result) {
    return c.json<ApiResponse<null>>({ success: false, error: "Organization not found" }, 404);
  }

  return c.json<ApiResponse<OrganizationWithRole>>({
    success: true,
    data: result,
  });
});

// GET /organizations/slug/:slug - Get organization by slug
organizations.get("/slug/:slug", async (c) => {
  const userId = c.get("userId") as string | undefined;
  const slug = c.req.param("slug");

  if (!userId) {
    return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
  }

  const org = await organizationService.getOrganizationBySlug(slug);
  if (!org) {
    return c.json<ApiResponse<null>>({ success: false, error: "Organization not found" }, 404);
  }

  const result = await organizationService.getOrganizationWithRole(org.id, userId);
  if (!result) {
    return c.json<ApiResponse<null>>({ success: false, error: "Organization not found" }, 404);
  }

  return c.json<ApiResponse<OrganizationWithRole>>({
    success: true,
    data: result,
  });
});

// PATCH /organizations/:id - Update organization
organizations.patch("/:id", zValidator("json", updateOrganizationSchema), async (c) => {
  const userId = c.get("userId") as string | undefined;
  const id = c.req.param("id");

  if (!userId) {
    return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
  }

  const input = c.req.valid("json");
  const result = await organizationService.updateOrganization(id, input, userId);

  if ("error" in result) {
    const status = result.error === "Permission denied" ? 403 : 400;
    return c.json<ApiResponse<null>>({ success: false, error: result.error }, status);
  }

  return c.json<ApiResponse<Organization>>({
    success: true,
    data: result,
  });
});

// DELETE /organizations/:id - Delete organization
organizations.delete("/:id", async (c) => {
  const userId = c.get("userId") as string | undefined;
  const id = c.req.param("id");

  if (!userId) {
    return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
  }

  const result = await organizationService.deleteOrganization(id, userId);

  if (!result.success) {
    const status = result.error?.includes("Permission") ? 403 : 400;
    return c.json<ApiResponse<null>>({ success: false, error: result.error }, status);
  }

  return c.json<ApiResponse<null>>({
    success: true,
    message: "Organization deleted",
  });
});

// POST /organizations/:id/onboarding - Complete onboarding step
organizations.post(
  "/:id/onboarding",
  zValidator("json", completeOnboardingStepSchema),
  async (c) => {
    const userId = c.get("userId") as string | undefined;
    const id = c.req.param("id");

    if (!userId) {
      return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
    }

    const { step, skip } = c.req.valid("json");
    const result = await organizationService.completeOnboardingStep(id, step, userId, skip);

    if ("error" in result) {
      const status = result.error === "Permission denied" ? 403 : 400;
      return c.json<ApiResponse<null>>({ success: false, error: result.error }, status);
    }

    return c.json<ApiResponse<Organization>>({
      success: true,
      data: result,
    });
  }
);

// GET /organizations/:id/members - List members
organizations.get("/:id/members", zValidator("query", paginationSchema), async (c) => {
  const userId = c.get("userId") as string | undefined;
  const id = c.req.param("id");

  if (!userId) {
    return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
  }

  const params = c.req.valid("query");
  const result = await organizationService.getMembers(id, userId, params);

  if ("error" in result) {
    return c.json<ApiResponse<null>>({ success: false, error: result.error }, 403);
  }

  return c.json<ApiResponse<PaginatedResult<MemberWithUser>>>({
    success: true,
    data: result,
  });
});

// POST /organizations/:id/members - Add member
organizations.post(
  "/:id/members",
  zValidator("json", z.object({ userId: z.string(), role: inviteMemberSchema.shape.role })),
  async (c) => {
    const currentUserId = c.get("userId") as string | undefined;
    const orgId = c.req.param("id");

    if (!currentUserId) {
      return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
    }

    const { userId: targetUserId, role } = c.req.valid("json");
    const result = await organizationService.addMember(orgId, targetUserId, role, currentUserId);

    if ("error" in result) {
      const status = result.error === "Permission denied" ? 403 : 400;
      return c.json<ApiResponse<null>>({ success: false, error: result.error }, status);
    }

    return c.json<ApiResponse<OrganizationMember>>({ success: true, data: result }, 201);
  }
);

// PATCH /organizations/:id/members/:memberId - Update member role
organizations.patch(
  "/:id/members/:memberId",
  zValidator("json", updateMemberRoleSchema),
  async (c) => {
    const userId = c.get("userId") as string | undefined;
    const orgId = c.req.param("id");
    const memberId = c.req.param("memberId");

    if (!userId) {
      return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
    }

    const { role } = c.req.valid("json");
    const result = await organizationService.updateMemberRole(orgId, memberId, role, userId);

    if ("error" in result) {
      const status = result.error === "Permission denied" ? 403 : 400;
      return c.json<ApiResponse<null>>({ success: false, error: result.error }, status);
    }

    return c.json<ApiResponse<OrganizationMember>>({
      success: true,
      data: result,
    });
  }
);

// DELETE /organizations/:id/members/:memberId - Remove member
organizations.delete("/:id/members/:memberId", async (c) => {
  const userId = c.get("userId") as string | undefined;
  const orgId = c.req.param("id");
  const memberId = c.req.param("memberId");

  if (!userId) {
    return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
  }

  const result = await organizationService.removeMember(orgId, memberId, userId);

  if (!result.success) {
    const status = result.error?.includes("Permission") ? 403 : 400;
    return c.json<ApiResponse<null>>({ success: false, error: result.error }, status);
  }

  return c.json<ApiResponse<null>>({
    success: true,
    message: "Member removed",
  });
});

// POST /organizations/:id/leave - Leave organization
organizations.post("/:id/leave", async (c) => {
  const userId = c.get("userId") as string | undefined;
  const orgId = c.req.param("id");

  if (!userId) {
    return c.json<ApiResponse<null>>({ success: false, error: "Unauthorized" }, 401);
  }

  const result = await organizationService.leaveOrganization(orgId, userId);

  if (!result.success) {
    return c.json<ApiResponse<null>>({ success: false, error: result.error }, 400);
  }

  return c.json<ApiResponse<null>>({
    success: true,
    message: "Left organization",
  });
});

export { organizations as organizationRoutes };

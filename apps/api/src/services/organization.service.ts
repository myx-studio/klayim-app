import {
  organizationRepository,
  organizationMemberRepository,
  userRepository,
} from "@/repositories/index.js";
import type {
  Organization,
  OrganizationWithRole,
  OrganizationMember,
  MemberWithUser,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationMemberRole,
  OnboardingStep,
  PaginationParams,
  PaginatedResult,
} from "@klayim/shared/types";

export class OrganizationService {
  // Organization CRUD

  async createOrganization(
    input: CreateOrganizationInput,
    userId: string
  ): Promise<{ organization: Organization; member: OrganizationMember } | { error: string }> {
    // Check slug availability if provided
    if (input.slug) {
      const isAvailable = await organizationRepository.isSlugAvailable(input.slug);
      if (!isAvailable) {
        return { error: "Slug is already taken" };
      }
    }

    // Create organization
    const organization = await organizationRepository.create(input);

    // Add user as owner
    const member = await organizationMemberRepository.createOwner(organization.id, userId);

    // Update user's default organization if not set
    const user = await userRepository.findById(userId);
    if (user && !user.defaultOrganizationId) {
      await userRepository.update(userId, { defaultOrganizationId: organization.id });
    }

    return { organization, member };
  }

  async getOrganization(id: string): Promise<Organization | null> {
    return organizationRepository.findById(id);
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    return organizationRepository.findBySlug(slug);
  }

  async getOrganizationWithRole(
    id: string,
    userId: string
  ): Promise<OrganizationWithRole | null> {
    const organization = await organizationRepository.findById(id);
    if (!organization) {
      return null;
    }

    const role = await organizationMemberRepository.getUserRole(id, userId);
    if (!role) {
      return null; // User is not a member
    }

    return {
      ...organization,
      currentUserRole: role,
    };
  }

  async getUserOrganizations(
    userId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<OrganizationWithRole>> {
    const members = await organizationMemberRepository.findByUser(userId);

    if (members.length === 0) {
      return { data: [], hasMore: false };
    }

    const orgsWithRoles: OrganizationWithRole[] = [];
    for (const member of members) {
      const org = await organizationRepository.findById(member.organizationId);
      if (org) {
        orgsWithRoles.push({
          ...org,
          currentUserRole: member.role,
        });
      }
    }

    // Apply pagination
    const limit = params?.limit ?? 20;
    const offset = params?.cursor ? orgsWithRoles.findIndex((o) => o.id === params.cursor) + 1 : 0;
    const paginatedData = orgsWithRoles.slice(offset, offset + limit);
    const hasMore = offset + limit < orgsWithRoles.length;

    return {
      data: paginatedData,
      hasMore,
      nextCursor: hasMore ? paginatedData[paginatedData.length - 1]?.id : undefined,
    };
  }

  async updateOrganization(
    id: string,
    input: UpdateOrganizationInput,
    userId: string
  ): Promise<Organization | { error: string }> {
    // Check permission
    const role = await organizationMemberRepository.getUserRole(id, userId);
    if (!role || !["owner", "administrator"].includes(role)) {
      return { error: "Permission denied" };
    }

    // Check slug availability if changing
    if (input.slug) {
      const isAvailable = await organizationRepository.isSlugAvailable(input.slug, id);
      if (!isAvailable) {
        return { error: "Slug is already taken" };
      }
    }

    const updated = await organizationRepository.update(id, input);
    if (!updated) {
      return { error: "Organization not found" };
    }

    return updated;
  }

  async deleteOrganization(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
    // Check permission - only owner can delete
    const role = await organizationMemberRepository.getUserRole(id, userId);
    if (role !== "owner") {
      return { success: false, error: "Only owner can delete organization" };
    }

    // Delete all members first
    const members = await organizationMemberRepository.findByOrganization(id);
    for (const member of members.data) {
      await organizationMemberRepository.delete(member.id);
    }

    // Delete organization
    const deleted = await organizationRepository.delete(id);
    return { success: deleted };
  }

  // Onboarding

  async completeOnboardingStep(
    organizationId: string,
    step: OnboardingStep,
    userId: string,
    skip = false
  ): Promise<Organization | { error: string }> {
    // Check permission
    const role = await organizationMemberRepository.getUserRole(organizationId, userId);
    if (!role || !["owner", "administrator"].includes(role)) {
      return { error: "Permission denied" };
    }

    const updated = await organizationRepository.updateOnboardingStep(organizationId, step, skip);
    if (!updated) {
      return { error: "Organization not found" };
    }

    return updated;
  }

  // Members

  async getMembers(
    organizationId: string,
    userId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<MemberWithUser> | { error: string }> {
    // Check if user is member
    const isMember = await organizationMemberRepository.isUserMember(organizationId, userId);
    if (!isMember) {
      return { error: "Permission denied" };
    }

    return organizationMemberRepository.findByOrganizationWithUsers(organizationId, params);
  }

  async addMember(
    organizationId: string,
    targetUserId: string,
    role: OrganizationMemberRole,
    invitedBy: string
  ): Promise<OrganizationMember | { error: string }> {
    // Check permission
    const inviterRole = await organizationMemberRepository.getUserRole(organizationId, invitedBy);
    if (!inviterRole || !["owner", "administrator"].includes(inviterRole)) {
      return { error: "Permission denied" };
    }

    // Check if target user exists
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      return { error: "User not found" };
    }

    // Check if already a member
    const existingMember = await organizationMemberRepository.findByOrgAndUser(
      organizationId,
      targetUserId
    );
    if (existingMember) {
      return { error: "User is already a member" };
    }

    // Can't add someone as owner
    if (role === "owner") {
      return { error: "Cannot add member as owner" };
    }

    const member = await organizationMemberRepository.createMember(
      organizationId,
      targetUserId,
      role,
      invitedBy
    );

    // Increment member count
    await organizationRepository.incrementMemberCount(organizationId);

    return member;
  }

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: OrganizationMemberRole,
    userId: string
  ): Promise<OrganizationMember | { error: string }> {
    // Check permission
    const userRole = await organizationMemberRepository.getUserRole(organizationId, userId);
    if (!userRole || !["owner", "administrator"].includes(userRole)) {
      return { error: "Permission denied" };
    }

    const member = await organizationMemberRepository.findById(memberId);
    if (!member || member.organizationId !== organizationId) {
      return { error: "Member not found" };
    }

    // Can't change owner role
    if (member.role === "owner") {
      return { error: "Cannot change owner role" };
    }

    // Can't promote to owner
    if (newRole === "owner") {
      return { error: "Cannot promote to owner" };
    }

    // Admins can't change other admins
    if (userRole === "administrator" && member.role === "administrator") {
      return { error: "Administrators cannot modify other administrators" };
    }

    const updated = await organizationMemberRepository.updateRole(memberId, newRole);
    if (!updated) {
      return { error: "Failed to update role" };
    }

    return updated;
  }

  async removeMember(
    organizationId: string,
    memberId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Check permission
    const userRole = await organizationMemberRepository.getUserRole(organizationId, userId);
    if (!userRole || !["owner", "administrator"].includes(userRole)) {
      return { success: false, error: "Permission denied" };
    }

    const member = await organizationMemberRepository.findById(memberId);
    if (!member || member.organizationId !== organizationId) {
      return { success: false, error: "Member not found" };
    }

    // Can't remove owner
    if (member.role === "owner") {
      return { success: false, error: "Cannot remove owner" };
    }

    // Admins can't remove other admins
    if (userRole === "administrator" && member.role === "administrator") {
      return { success: false, error: "Administrators cannot remove other administrators" };
    }

    const deleted = await organizationMemberRepository.delete(memberId);
    if (deleted) {
      await organizationRepository.decrementMemberCount(organizationId);
    }

    return { success: deleted };
  }

  async leaveOrganization(
    organizationId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const member = await organizationMemberRepository.findByOrgAndUser(organizationId, userId);
    if (!member) {
      return { success: false, error: "Not a member" };
    }

    // Owner can't leave
    if (member.role === "owner") {
      return { success: false, error: "Owner cannot leave organization. Transfer ownership first." };
    }

    const deleted = await organizationMemberRepository.delete(member.id);
    if (deleted) {
      await organizationRepository.decrementMemberCount(organizationId);
    }

    return { success: deleted };
  }

  // Permission helpers

  async canManageOrganization(organizationId: string, userId: string): Promise<boolean> {
    const role = await organizationMemberRepository.getUserRole(organizationId, userId);
    return role === "owner" || role === "administrator";
  }

  async canEditContent(organizationId: string, userId: string): Promise<boolean> {
    const role = await organizationMemberRepository.getUserRole(organizationId, userId);
    return role === "owner" || role === "administrator" || role === "editor";
  }

  async canViewContent(organizationId: string, userId: string): Promise<boolean> {
    const role = await organizationMemberRepository.getUserRole(organizationId, userId);
    return role !== null;
  }
}

export const organizationService = new OrganizationService();

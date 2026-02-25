import type {
  OrganizationMember,
  OrganizationMemberRole,
} from "@klayim/shared/types";

export class OrganizationMemberEntity implements OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  invitedBy?: string;
  invitedAt?: string;
  joinedAt?: string;
  createdAt: string;
  updatedAt?: string;

  constructor(data: OrganizationMember) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.userId = data.userId;
    this.role = data.role;
    this.invitedBy = data.invitedBy;
    this.invitedAt = data.invitedAt;
    this.joinedAt = data.joinedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static createOwner(
    id: string,
    organizationId: string,
    userId: string
  ): OrganizationMemberEntity {
    const now = new Date().toISOString();
    return new OrganizationMemberEntity({
      id,
      organizationId,
      userId,
      role: "owner",
      joinedAt: now,
      createdAt: now,
    });
  }

  static createFromInvitation(
    id: string,
    organizationId: string,
    userId: string,
    role: OrganizationMemberRole,
    invitedBy: string
  ): OrganizationMemberEntity {
    const now = new Date().toISOString();
    return new OrganizationMemberEntity({
      id,
      organizationId,
      userId,
      role,
      invitedBy,
      invitedAt: now,
      joinedAt: now,
      createdAt: now,
    });
  }

  updateRole(role: OrganizationMemberRole): OrganizationMemberEntity {
    return new OrganizationMemberEntity({
      ...this.toJSON(),
      role,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): OrganizationMember {
    return {
      id: this.id,
      organizationId: this.organizationId,
      userId: this.userId,
      role: this.role,
      invitedBy: this.invitedBy,
      invitedAt: this.invitedAt,
      joinedAt: this.joinedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

import { firestore } from "@/lib/index.js";
import { OrganizationMemberEntity } from "@/models/index.js";
import type {
  OrganizationMember,
  OrganizationMemberRole,
  MemberWithUser,
  PaginationParams,
  PaginatedResult,
} from "@klayim/shared/types";

const COLLECTION = "organization_members";

export class OrganizationMemberRepository {
  private collection = firestore.collection(COLLECTION);

  async findById(id: string): Promise<OrganizationMember | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapToMember(doc.id, doc.data()!);
  }

  async findByOrgAndUser(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember | null> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.mapToMember(doc.id, doc.data());
  }

  async findByOrganization(
    organizationId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<OrganizationMember>> {
    const limit = params?.limit ?? 20;
    let query = this.collection
      .where("organizationId", "==", organizationId)
      .orderBy("createdAt", "desc")
      .limit(limit + 1);

    if (params?.cursor) {
      const cursorDoc = await this.collection.doc(params.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const data = docs.slice(0, limit).map((doc) => this.mapToMember(doc.id, doc.data()));

    return {
      data,
      hasMore,
      nextCursor: hasMore ? docs[limit - 1].id : undefined,
    };
  }

  async findByOrganizationWithUsers(
    organizationId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<MemberWithUser>> {
    const membersResult = await this.findByOrganization(organizationId, params);

    // Fetch user details for each member
    const membersWithUsers: MemberWithUser[] = [];
    for (const member of membersResult.data) {
      const userDoc = await firestore.collection("users").doc(member.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        membersWithUsers.push({
          id: member.id,
          role: member.role,
          joinedAt: member.joinedAt,
          user: {
            id: member.userId,
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
          },
        });
      }
    }

    return {
      data: membersWithUsers,
      hasMore: membersResult.hasMore,
      nextCursor: membersResult.nextCursor,
    };
  }

  async findByUser(userId: string): Promise<OrganizationMember[]> {
    const snapshot = await this.collection
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => this.mapToMember(doc.id, doc.data()));
  }

  async createOwner(organizationId: string, userId: string): Promise<OrganizationMember> {
    const docRef = this.collection.doc();
    const entity = OrganizationMemberEntity.createOwner(docRef.id, organizationId, userId);

    await docRef.set(this.mapToFirestore(entity));

    return entity.toJSON();
  }

  async createMember(
    organizationId: string,
    userId: string,
    role: OrganizationMemberRole,
    invitedBy: string
  ): Promise<OrganizationMember> {
    const docRef = this.collection.doc();
    const entity = OrganizationMemberEntity.createFromInvitation(
      docRef.id,
      organizationId,
      userId,
      role,
      invitedBy
    );

    await docRef.set(this.mapToFirestore(entity));

    return entity.toJSON();
  }

  async updateRole(id: string, role: OrganizationMemberRole): Promise<OrganizationMember | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const existing = this.mapToMember(doc.id, doc.data()!);
    const entity = new OrganizationMemberEntity(existing);
    const updated = entity.updateRole(role);

    await this.collection.doc(id).update({
      role,
      updatedAt: new Date().toISOString(),
    });

    return updated.toJSON();
  }

  async delete(id: string): Promise<boolean> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return false;
    }

    await this.collection.doc(id).delete();
    return true;
  }

  async deleteByOrgAndUser(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.findByOrgAndUser(organizationId, userId);
    if (!member) {
      return false;
    }
    return this.delete(member.id);
  }

  async countByOrganization(organizationId: string): Promise<number> {
    const snapshot = await this.collection
      .where("organizationId", "==", organizationId)
      .count()
      .get();

    return snapshot.data().count;
  }

  async isUserMember(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.findByOrgAndUser(organizationId, userId);
    return member !== null;
  }

  async getUserRole(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMemberRole | null> {
    const member = await this.findByOrgAndUser(organizationId, userId);
    return member?.role ?? null;
  }

  private mapToMember(id: string, data: FirebaseFirestore.DocumentData): OrganizationMember {
    return {
      id,
      organizationId: data.organizationId,
      userId: data.userId,
      role: data.role,
      invitedBy: data.invitedBy,
      invitedAt: data.invitedAt,
      joinedAt: data.joinedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapToFirestore(entity: OrganizationMemberEntity): Record<string, unknown> {
    const data = entity.toJSON();
    const { id, ...rest } = data;
    return rest;
  }
}

export const organizationMemberRepository = new OrganizationMemberRepository();

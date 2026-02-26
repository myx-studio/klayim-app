import { firestore } from "@/lib/index.js";
import { OrganizationEntity } from "@/models/index.js";
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  PaginationParams,
  PaginatedResult,
  OnboardingStep,
} from "@klayim/shared/types";

const COLLECTION = "organizations";

export class OrganizationRepository {
  private collection = firestore.collection(COLLECTION);

  async findById(id: string): Promise<Organization | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapToOrganization(doc.id, doc.data()!);
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const snapshot = await this.collection
      .where("slug", "==", slug.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.mapToOrganization(doc.id, doc.data());
  }

  async findByUserId(
    userId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<Organization>> {
    // This will be used in conjunction with member repository
    // For now, we'll need to get org IDs from members first
    const limit = params?.limit ?? 20;

    // Get member records for this user
    const memberSnapshot = await firestore
      .collection("organization_members")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit + 1)
      .get();

    if (memberSnapshot.empty) {
      return { data: [], hasMore: false };
    }

    const orgIds = memberSnapshot.docs.map((doc) => doc.data().organizationId);
    const hasMore = orgIds.length > limit;
    const idsToFetch = orgIds.slice(0, limit);

    // Fetch organizations
    const orgs: Organization[] = [];
    for (const orgId of idsToFetch) {
      const org = await this.findById(orgId);
      if (org) {
        orgs.push(org);
      }
    }

    return {
      data: orgs,
      hasMore,
      nextCursor: hasMore ? idsToFetch[idsToFetch.length - 1] : undefined,
    };
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<Organization>> {
    const limit = params?.limit ?? 20;
    let query = this.collection.orderBy("createdAt", "desc").limit(limit + 1);

    if (params?.cursor) {
      const cursorDoc = await this.collection.doc(params.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const data = docs
      .slice(0, limit)
      .map((doc) => this.mapToOrganization(doc.id, doc.data()));

    return {
      data,
      hasMore,
      nextCursor: hasMore ? docs[limit - 1].id : undefined,
    };
  }

  async create(input: CreateOrganizationInput): Promise<Organization> {
    const docRef = this.collection.doc();
    const entity = OrganizationEntity.create(docRef.id, input);

    await docRef.set(this.mapToFirestore(entity));

    return entity.toJSON();
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const existing = this.mapToOrganization(doc.id, doc.data()!);
    const entity = new OrganizationEntity(existing);
    const updated = entity.update(input);

    await this.collection.doc(id).update({
      ...input,
      updatedAt: new Date().toISOString(),
    });

    return updated.toJSON();
  }

  async updateOnboardingStep(
    id: string,
    step: OnboardingStep,
    skip = false
  ): Promise<Organization | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const existing = this.mapToOrganization(doc.id, doc.data()!);
    const entity = new OrganizationEntity(existing);
    const updated = entity.completeOnboardingStep(step, skip);

    await this.collection.doc(id).update({
      onboarding: updated.onboarding,
      updatedAt: new Date().toISOString(),
    });

    return updated.toJSON();
  }

  async updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<boolean> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return false;
    }

    await this.collection.doc(id).update({
      stripeCustomerId,
      updatedAt: new Date().toISOString(),
    });

    return true;
  }

  async incrementMemberCount(id: string): Promise<void> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return;
    }

    const existing = this.mapToOrganization(doc.id, doc.data()!);
    await this.collection.doc(id).update({
      memberCount: existing.memberCount + 1,
      updatedAt: new Date().toISOString(),
    });
  }

  async decrementMemberCount(id: string): Promise<void> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return;
    }

    const existing = this.mapToOrganization(doc.id, doc.data()!);
    await this.collection.doc(id).update({
      memberCount: Math.max(1, existing.memberCount - 1),
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(id: string): Promise<boolean> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return false;
    }

    await this.collection.doc(id).delete();
    return true;
  }

  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findBySlug(slug);
    if (!existing) {
      return true;
    }
    return excludeId ? existing.id === excludeId : false;
  }

  private mapToOrganization(
    id: string,
    data: FirebaseFirestore.DocumentData
  ): Organization {
    return {
      id,
      name: data.name,
      slug: data.slug,
      logo: data.logo,
      description: data.description,
      website: data.website,
      stripeCustomerId: data.stripeCustomerId,
      activePlan: data.activePlan,
      memberCount: data.memberCount || 1,
      onboarding: data.onboarding,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapToFirestore(entity: OrganizationEntity): Record<string, unknown> {
    const data = entity.toJSON();
    const { id, ...rest } = data;
    const result: Record<string, unknown> = { ...rest };
    // Remove undefined values (Firestore doesn't accept undefined)
    Object.keys(result).forEach((key) => {
      if (result[key] === undefined) {
        delete result[key];
      }
    });
    return result;
  }
}

export const organizationRepository = new OrganizationRepository();

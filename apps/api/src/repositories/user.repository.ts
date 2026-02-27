import { firestore } from "@/lib/index.js";
import { UserEntity } from "@/models/index.js";
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  PaginationParams,
  PaginatedResult,
  UserWithPassword,
} from "@/types/index.js";

const COLLECTION = "users";

export class UserRepository {
  private collection = firestore.collection(COLLECTION);

  async findById(id: string): Promise<User | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapToUser(doc.id, doc.data()!);
  }

  async findByIdWithPassword(id: string): Promise<UserWithPassword | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapToUserWithPassword(doc.id, doc.data()!);
  }

  async findByEmail(email: string): Promise<User | null> {
    const snapshot = await this.collection
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.mapToUser(doc.id, doc.data());
  }

  async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    const snapshot = await this.collection
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.mapToUserWithPassword(doc.id, doc.data());
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<User>> {
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
    const data = docs.slice(0, limit).map((doc) => this.mapToUser(doc.id, doc.data()));

    return {
      data,
      hasMore,
      nextCursor: hasMore ? docs[limit - 1].id : undefined,
    };
  }

  async create(input: CreateUserInput & { passwordHash?: string }): Promise<User> {
    const docRef = this.collection.doc();
    const entity = UserEntity.create(docRef.id, {
      ...input,
      email: input.email.toLowerCase(),
    });

    await docRef.set(this.mapToFirestore(entity));

    return entity.toJSON();
  }

  async completeProfile(
    id: string,
    name: string,
    passwordHash: string
  ): Promise<User | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    await this.collection.doc(id).update({
      name,
      passwordHash,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    });

    return this.findById(id);
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const existing = this.mapToUserWithPassword(doc.id, doc.data()!);
    const entity = new UserEntity(existing);
    const updated = entity.update(input);

    await this.collection.doc(id).update({
      ...input,
      updatedAt: new Date().toISOString(),
    });

    return updated.toJSON();
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return false;
    }

    await this.collection.doc(id).update({
      passwordHash,
      updatedAt: new Date().toISOString(),
    });

    return true;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.collection.doc(id).update({
      lastLoginAt: new Date().toISOString(),
    });
  }

  async verifyEmail(id: string): Promise<User | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    await this.collection.doc(id).update({
      emailVerified: true,
      status: "active",
      updatedAt: new Date().toISOString(),
    });

    const updated = await this.findById(id);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return false;
    }

    await this.collection.doc(id).delete();
    return true;
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

  private mapToUser(id: string, data: FirebaseFirestore.DocumentData): User {
    return {
      id,
      email: data.email,
      name: data.name,
      avatar: data.avatar,
      type: data.type,
      status: data.status,
      emailVerified: data.emailVerified,
      onboardingCompleted: data.onboardingCompleted,
      lastLoginAt: data.lastLoginAt,
      defaultOrganizationId: data.defaultOrganizationId,
      stripeCustomerId: data.stripeCustomerId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapToUserWithPassword(
    id: string,
    data: FirebaseFirestore.DocumentData
  ): UserWithPassword {
    return {
      ...this.mapToUser(id, data),
      passwordHash: data.passwordHash,
    };
  }

  private mapToFirestore(entity: UserEntity): Record<string, unknown> {
    const data = entity.toJSON();
    const { id, ...rest } = data;
    const result: Record<string, unknown> = {
      ...rest,
      passwordHash: entity.passwordHash,
    };
    // Remove undefined values (Firestore doesn't accept undefined)
    Object.keys(result).forEach((key) => {
      if (result[key] === undefined) {
        delete result[key];
      }
    });
    return result;
  }
}

export const userRepository = new UserRepository();

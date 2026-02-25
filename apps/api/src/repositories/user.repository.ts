import { firestore } from "../lib/index.js";
import { UserEntity } from "../models/index.js";
import type {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  PaginationParams,
  PaginatedResult,
} from "../types/index.js";
import type { IRepository } from "./base.repository.js";

const COLLECTION = "users";

export class UserRepository
  implements IRepository<User, CreateUserDTO, UpdateUserDTO>
{
  private collection = firestore.collection(COLLECTION);

  async findById(id: string): Promise<User | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapToEntity(doc.id, doc.data()!);
  }

  async findByEmail(email: string): Promise<User | null> {
    const snapshot = await this.collection
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.mapToEntity(doc.id, doc.data());
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
    const data = docs.slice(0, limit).map((doc) => this.mapToEntity(doc.id, doc.data()));

    return {
      data,
      hasMore,
      nextCursor: hasMore ? docs[limit - 1].id : undefined,
    };
  }

  async create(dto: CreateUserDTO): Promise<User> {
    const docRef = this.collection.doc();
    const entity = UserEntity.create(docRef.id, dto);

    await docRef.set(this.mapToFirestore(entity));

    return entity.toJSON();
  }

  async update(id: string, dto: UpdateUserDTO): Promise<User | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const existing = this.mapToEntity(doc.id, doc.data()!);
    const updated = new UserEntity(existing).update(dto);

    await this.collection.doc(id).update(this.mapToFirestore(updated));

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

  private mapToEntity(
    id: string,
    data: FirebaseFirestore.DocumentData
  ): User {
    return {
      id,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      disabled: data.disabled,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapToFirestore(
    entity: UserEntity
  ): Record<string, unknown> {
    const data = entity.toJSON();
    const { id, ...rest } = data;
    return rest;
  }
}

export const userRepository = new UserRepository();

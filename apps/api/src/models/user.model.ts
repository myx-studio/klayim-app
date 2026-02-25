import type { User, CreateUserInput, UpdateUserInput } from "@klayim/shared/types";

export class UserEntity implements User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  type: User["type"];
  status: User["status"];
  emailVerified?: boolean;
  lastLoginAt?: string;
  defaultOrganizationId?: string;
  createdAt: string;
  updatedAt?: string;
  passwordHash?: string;

  constructor(data: User & { passwordHash?: string }) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.avatar = data.avatar;
    this.type = data.type;
    this.status = data.status;
    this.emailVerified = data.emailVerified;
    this.lastLoginAt = data.lastLoginAt;
    this.defaultOrganizationId = data.defaultOrganizationId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.passwordHash = data.passwordHash;
  }

  static create(
    id: string,
    input: CreateUserInput & { passwordHash: string }
  ): UserEntity {
    return new UserEntity({
      id,
      email: input.email,
      name: input.name,
      type: input.type ?? "customer",
      status: "pending",
      emailVerified: false,
      createdAt: new Date().toISOString(),
      passwordHash: input.passwordHash,
    });
  }

  update(input: UpdateUserInput): UserEntity {
    return new UserEntity({
      ...this.toJSON(),
      ...input,
      updatedAt: new Date().toISOString(),
      passwordHash: this.passwordHash,
    });
  }

  setLastLogin(): UserEntity {
    return new UserEntity({
      ...this.toJSON(),
      lastLoginAt: new Date().toISOString(),
      passwordHash: this.passwordHash,
    });
  }

  setEmailVerified(): UserEntity {
    return new UserEntity({
      ...this.toJSON(),
      emailVerified: true,
      status: "active",
      updatedAt: new Date().toISOString(),
      passwordHash: this.passwordHash,
    });
  }

  toJSON(): User {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatar: this.avatar,
      type: this.type,
      status: this.status,
      emailVerified: this.emailVerified,
      lastLoginAt: this.lastLoginAt,
      defaultOrganizationId: this.defaultOrganizationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toProfile(): { id: string; email: string; name: string; avatar?: string; type: User["type"] } {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatar: this.avatar,
      type: this.type,
    };
  }
}

import type { User, CreateUserDTO, UpdateUserDTO } from "../types/index.js";

export class UserEntity implements User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  disabled?: boolean;
  createdAt: string;
  updatedAt?: string;

  constructor(data: User) {
    this.id = data.id;
    this.email = data.email;
    this.displayName = data.displayName;
    this.photoURL = data.photoURL;
    this.disabled = data.disabled;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static create(id: string, dto: CreateUserDTO): UserEntity {
    return new UserEntity({
      id,
      email: dto.email,
      displayName: dto.displayName,
      photoURL: dto.photoURL,
      createdAt: new Date().toISOString(),
    });
  }

  update(dto: UpdateUserDTO): UserEntity {
    return new UserEntity({
      ...this,
      ...dto,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): User {
    return {
      id: this.id,
      email: this.email,
      displayName: this.displayName,
      photoURL: this.photoURL,
      disabled: this.disabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

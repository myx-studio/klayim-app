import type { Timestamps } from "./common.js";

// App-level user types
export type UserType = "superadmin" | "customer";

export type UserStatus = "active" | "inactive" | "pending";

export interface User extends Timestamps {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  type: UserType;
  status: UserStatus;
  emailVerified?: boolean;
  lastLoginAt?: string;
  defaultOrganizationId?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  type: UserType;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  type?: UserType;
}

export interface UpdateUserInput {
  name?: string;
  avatar?: string;
  status?: UserStatus;
  defaultOrganizationId?: string;
}

// For superadmin only
export interface AdminUpdateUserInput extends UpdateUserInput {
  type?: UserType;
}

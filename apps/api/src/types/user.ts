import type { Timestamps } from "./common.js";

export interface User extends Timestamps {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  disabled?: boolean;
}

export interface CreateUserDTO {
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface UpdateUserDTO {
  displayName?: string;
  photoURL?: string;
  disabled?: boolean;
}

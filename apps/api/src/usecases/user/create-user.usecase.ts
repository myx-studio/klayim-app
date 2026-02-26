import { userRepository } from "@/repositories/index.js";
import type { CreateUserInput, User } from "@/types/index.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export interface CreateUserResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class CreateUserUseCase {
  async execute(input: CreateUserInput): Promise<CreateUserResult> {
    // Check if email already exists
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      return {
        success: false,
        error: "Email already exists",
      };
    }

    // Hash password if provided
    const passwordHash = input.password
      ? await bcrypt.hash(input.password, SALT_ROUNDS)
      : undefined;

    const user = await userRepository.create({
      ...input,
      passwordHash,
    });

    return {
      success: true,
      user,
    };
  }
}

export const createUserUseCase = new CreateUserUseCase();

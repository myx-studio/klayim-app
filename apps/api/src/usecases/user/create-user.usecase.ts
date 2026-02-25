import { userRepository } from "../../repositories/index.js";
import type { CreateUserDTO, User } from "../../types/index.js";

export interface CreateUserResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class CreateUserUseCase {
  async execute(dto: CreateUserDTO): Promise<CreateUserResult> {
    // Check if email already exists
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) {
      return {
        success: false,
        error: "Email already exists",
      };
    }

    const user = await userRepository.create(dto);

    return {
      success: true,
      user,
    };
  }
}

export const createUserUseCase = new CreateUserUseCase();

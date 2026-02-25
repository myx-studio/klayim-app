import { userRepository } from "@/repositories/index.js";
import type { UpdateUserInput, User } from "@/types/index.js";

export interface UpdateUserResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class UpdateUserUseCase {
  async execute(id: string, input: UpdateUserInput): Promise<UpdateUserResult> {
    const user = await userRepository.update(id, input);

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    return {
      success: true,
      user,
    };
  }
}

export const updateUserUseCase = new UpdateUserUseCase();

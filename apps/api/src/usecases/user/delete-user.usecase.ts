import { userRepository } from "@/repositories/index.js";

export interface DeleteUserResult {
  success: boolean;
  error?: string;
}

export class DeleteUserUseCase {
  async execute(id: string): Promise<DeleteUserResult> {
    const deleted = await userRepository.delete(id);

    if (!deleted) {
      return {
        success: false,
        error: "User not found",
      };
    }

    return {
      success: true,
    };
  }
}

export const deleteUserUseCase = new DeleteUserUseCase();

import { userRepository } from "../../repositories/index.js";
import type { User } from "../../types/index.js";

export class GetUserUseCase {
  async execute(id: string): Promise<User | null> {
    return userRepository.findById(id);
  }
}

export const getUserUseCase = new GetUserUseCase();

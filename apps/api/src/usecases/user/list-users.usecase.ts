import { userRepository } from "../../repositories/index.js";
import type { PaginationParams, PaginatedResult, User } from "../../types/index.js";

export class ListUsersUseCase {
  async execute(params?: PaginationParams): Promise<PaginatedResult<User>> {
    return userRepository.findAll(params);
  }
}

export const listUsersUseCase = new ListUsersUseCase();

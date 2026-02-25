import type { PaginationParams, PaginatedResult } from "../types/index.js";

export interface IRepository<T, CreateDTO, UpdateDTO> {
  findById(id: string): Promise<T | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResult<T>>;
  create(dto: CreateDTO): Promise<T>;
  update(id: string, dto: UpdateDTO): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

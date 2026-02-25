import { Hono } from "hono";
import {
  getUserUseCase,
  listUsersUseCase,
  createUserUseCase,
  updateUserUseCase,
  deleteUserUseCase,
} from "@/usecases/index.js";
import type { ApiResponse, User, PaginatedResult } from "@/types/index.js";

const userRoute = new Hono();

// List users with pagination
userRoute.get("/", async (c) => {
  const limit = Number(c.req.query("limit")) || 20;
  const cursor = c.req.query("cursor");

  const result = await listUsersUseCase.execute({ limit, cursor });

  const response: ApiResponse<PaginatedResult<User>> = {
    success: true,
    data: result,
  };

  return c.json(response);
});

// Get user by ID
userRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = await getUserUseCase.execute(id);

  if (!user) {
    const response: ApiResponse = {
      success: false,
      error: "User not found",
    };
    return c.json(response, 404);
  }

  const response: ApiResponse<User> = {
    success: true,
    data: user,
  };

  return c.json(response);
});

// Create user
userRoute.post("/", async (c) => {
  const body = await c.req.json();
  const result = await createUserUseCase.execute(body);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      error: result.error,
    };
    return c.json(response, 400);
  }

  const response: ApiResponse<User> = {
    success: true,
    data: result.user,
    message: "User created successfully",
  };

  return c.json(response, 201);
});

// Update user
userRoute.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const result = await updateUserUseCase.execute(id, body);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      error: result.error,
    };
    return c.json(response, 404);
  }

  const response: ApiResponse<User> = {
    success: true,
    data: result.user,
    message: "User updated successfully",
  };

  return c.json(response);
});

// Delete user
userRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await deleteUserUseCase.execute(id);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      error: result.error,
    };
    return c.json(response, 404);
  }

  const response: ApiResponse = {
    success: true,
    message: "User deleted successfully",
  };

  return c.json(response);
});

export { userRoute };

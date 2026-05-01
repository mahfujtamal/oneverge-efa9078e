import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(13, "Password must be at least 13 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one digit")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

export const validatePassword = (password: string) => {
  const result = passwordSchema.safeParse(password);
  return {
    isValid: result.success,
    errors: result.success ? [] : result.error.errors.map((e) => e.message),
  };
};

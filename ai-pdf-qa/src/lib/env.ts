import { z } from "zod";

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});

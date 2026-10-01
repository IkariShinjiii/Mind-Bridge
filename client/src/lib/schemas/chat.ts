import { z } from "zod";

export const MESSAGE_MAX_LENGTH = 2000;

/** A chat message about to be sent. */
export const chatMessageSchema = z.object({
  studentId: z.string().min(1, "No conversation selected."),
  senderId: z.string().optional(),
  senderName: z.string().optional(),
  senderRole: z.enum(["student", "counselor", "admin"]).optional(),
  text: z.string().trim().min(1, "Type a message first.").max(MESSAGE_MAX_LENGTH, `Messages can be at most ${MESSAGE_MAX_LENGTH} characters.`),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

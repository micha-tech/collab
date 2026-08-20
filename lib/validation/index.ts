import { z } from "zod";
import {
  CHAT_MAX_LENGTH,
  DEFAULT_MEETING_TITLE,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_TITLE_LENGTH,
} from "../constants";

export const meetingSlugSchema = z
  .string()
  .min(4)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid meeting code");

export const createMeetingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(MAX_TITLE_LENGTH)
    .default(DEFAULT_MEETING_TITLE),
  allowGuests: z.boolean().default(true),
});

export const joinMeetingSchema = z.object({
  slug: meetingSlugSchema,
  displayName: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(MAX_DISPLAY_NAME_LENGTH),
});

export const endMeetingSchema = z.object({
  slug: meetingSlugSchema,
});

export const livekitTokenSchema = z.object({
  meetingSlug: meetingSlugSchema,
  displayName: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(MAX_DISPLAY_NAME_LENGTH),
});

export const sendMessageSchema = z.object({
  meetingId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(CHAT_MAX_LENGTH, `Message must be at most ${CHAT_MAX_LENGTH} characters`),
});

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(MAX_DISPLAY_NAME_LENGTH),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

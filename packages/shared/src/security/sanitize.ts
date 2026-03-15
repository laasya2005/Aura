import { z } from "zod";

// E.164 phone number validation
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export const phoneSchema = z
  .string()
  .trim()
  .regex(E164_REGEX, "Phone must be in E.164 format (e.g., +15551234567)");

export function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone);
}

export function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[^\d+]/g, "");

  if (!normalized.startsWith("+") && normalized.length === 10) {
    normalized = `+1${normalized}`;
  } else if (
    !normalized.startsWith("+") &&
    normalized.length === 11 &&
    normalized.startsWith("1")
  ) {
    normalized = `+${normalized}`;
  }

  return normalized;
}

export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

export function sanitizeInput(input: string, maxLength = 10000): string {
  let sanitized = input.trim();
  sanitized = stripControlChars(sanitized);
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

// Email validation schema
export const emailSchema = z.string().email().trim().toLowerCase().max(254);

// Common string schemas
export const nameSchema = z.string().trim().min(1).max(100);
export const textSchema = z.string().trim().min(1).max(10000);
export const timezoneSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z_]+\/[A-Za-z_]+$/);

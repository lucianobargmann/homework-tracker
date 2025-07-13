// Simple in-memory rate limiter for submission attempts
export const submissionAttempts = new Map<string, { count: number; lastAttempt: number }>();
export const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
export const MAX_ATTEMPTS = 5; // Max 5 attempts per minute per user

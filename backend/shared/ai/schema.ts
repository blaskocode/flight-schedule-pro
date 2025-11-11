import { z } from 'zod';

/**
 * Zod schema for AI reschedule suggestions
 * Guarantees exactly 3 options with proper structure
 */
export const rescheduleResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        slot: z
          .string()
          .describe('ISO 8601 datetime string (e.g., "2025-11-09T14:00:00Z")'),
        priority: z
          .number()
          .int()
          .min(1)
          .max(3)
          .describe('Priority ranking: 1 = best, 2 = good, 3 = acceptable'),
        reasoning: z
          .string()
          .describe(
            'Bullet points explaining why this time slot is optimal (2-3 sentences)'
          ),
        weatherForecast: z
          .string()
          .describe('Brief weather forecast summary (e.g., "Clear skies, winds 8kt")'),
        confidence: z
          .enum(['high', 'medium', 'low'])
          .describe(
            'Confidence level in this suggestion based on data quality'
          ),
        instructorAvailable: z
          .boolean()
          .describe('Whether the instructor is available at this time'),
        aircraftAvailable: z
          .boolean()
          .describe('Whether the aircraft is available at this time'),
      })
    )
    .length(3)
    .describe('Exactly 3 reschedule options, ordered by priority (1 = best)'),
});

export type RescheduleResponse = z.infer<typeof rescheduleResponseSchema>;


import { z } from 'zod';
const timezone = z.string().refine((s) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: s });
    return true;
  } catch {
    return false;
  }
}, 'Invalid timezone');
export const businessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .regex(/^[a-z][a-z0-9-]{2,49}$/)
    .refine(
      (s) =>
        !['admin', 'api', 'login', 'signup', 'dashboard', 'slotdove', 'www', 'support'].includes(s),
      'Reserved URL',
    ),
  description: z.string().max(1000).default(''),
  industry: z.string().max(60).default('consulting'),
  timezone,
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'INR']),
  locale: z.enum(['de', 'en']),
  email: z.email(),
  phone: z.string().max(30).default(''),
  address: z.string().max(300).default(''),
});
export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(1000).default(''),
  duration_minutes: z.coerce.number().int().min(5).max(480),
  price_cents: z.coerce.number().int().min(0).max(10000000),
  buffer_before: z.coerce.number().int().min(0).max(120),
  buffer_after: z.coerce.number().int().min(0).max(120),
  color: z
    .string()
    .regex(/^#[a-fA-F0-9]{6}$/)
    .default('#7560e8'),
  active: z.boolean().default(true),
});
export const customerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  phone: z.string().max(30).default(''),
  notes: z.string().max(2000).default(''),
});
export const bookingSchema = z.object({
  business_id: z.uuid(),
  service_id: z.uuid(),
  staff_id: z.uuid(),
  starts_at: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  phone: z.string().max(30).default(''),
  notes: z.string().max(1000).default(''),
  idempotency_key: z.uuid(),
  website: z.string().max(0).optional(),
  consent: z.literal(true),
});
export const statusSchema = z.enum(['confirmed', 'cancelled', 'completed', 'no_show']);
export const hoursSchema = z
  .object({
    staff_id: z.uuid(),
    weekday: z.number().int().min(0).max(6),
    starts: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    ends: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine((v) => v.ends > v.starts, 'End must be after start');
export const settingsSchema = z.object({
  notifications_enabled: z.boolean(),
  reminder_hours: z.array(z.union([z.literal(2), z.literal(24)])).max(2),
  name: z.string().min(2).max(100),
  description: z.string().max(1000),
  timezone,
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'INR']),
  locale: z.enum(['de', 'en']),
  email: z.email(),
  phone: z.string().max(30),
  address: z.string().max(300),
  brand_color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  min_notice_minutes: z.coerce.number().int().min(0).max(10080),
  max_advance_days: z.coerce.number().int().min(1).max(365),
  slot_interval: z.coerce.number().int().min(5).max(120),
  cancellation_hours: z.coerce.number().int().min(0).max(720),
  auto_confirm: z.boolean(),
  published: z.boolean(),
});

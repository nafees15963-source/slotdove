import type { Workspace, Business } from './types';
const iso = (d: number, h: number, m = 0) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
};
export const previewBusiness: Business = {
  id: '00000000-0000-4000-8000-000000000001',
  owner_id: '00000000-0000-4000-8000-000000000009',
  name: 'Salon Aurora',
  slug: 'salon-aurora',
  description: 'Friseur & Beauty in Berlin',
  industry: 'hair',
  timezone: 'Europe/Berlin',
  currency: 'EUR',
  locale: 'de',
  email: 'hallo@example.com',
  phone: '',
  address: 'Musterstraße 1, Berlin',
  brand_color: '#0d7f79',
  published: false,
  status: 'active',
  is_demo: false,
  demo_expires_at: null,
  min_notice_minutes: 120,
  max_advance_days: 60,
  slot_interval: 15,
  cancellation_hours: 24,
  auto_confirm: true,
  created_at: iso(-30, 9),
  notifications_enabled: true,
  reminder_hours: [24],
  logo_path: null,
};
const b = previewBusiness.id;
const s1 = '00000000-0000-4000-8000-000000000101',
  s2 = '00000000-0000-4000-8000-000000000102',
  st1 = '00000000-0000-4000-8000-000000000201',
  st2 = '00000000-0000-4000-8000-000000000202';
const booking = (i: number, d: number, h: number, sid: string, staff: string | null, name: string, status: Workspace['bookings'][0]['status'] = 'confirmed') => ({
  id: `00000000-0000-4000-8000-0000000003${String(i).padStart(2, '0')}`,
  booking_number: `SD-7K3F${i}Q`,
  business_id: b,
  staff_id: staff,
  service_id: sid,
  customer_id: '00000000-0000-4000-8000-000000000401',
  starts_at: iso(d, h),
  ends_at: iso(d, h + 1),
  status,
  service_name: sid === s1 ? 'Haarschnitt' : 'Färben',
  customer_name: name,
  price_cents: sid === s1 ? 3500 : 6500,
  notes: '',
  internal_notes: '',
  created_at: iso(-2, 9),
  is_sample: false,
});
export const previewWorkspace: Workspace = {
  business: previewBusiness,
  role: 'owner',
  services: [
    { id: s1, business_id: b, name: 'Haarschnitt', description: 'Waschen, Schneiden, Föhnen', duration_minutes: 45, price_cents: 3500, buffer_before: 0, buffer_after: 10, color: '#0d7f79', active: true },
    { id: s2, business_id: b, name: 'Färben', description: '', duration_minutes: 90, price_cents: 6500, buffer_before: 0, buffer_after: 15, color: '#f2994a', active: true },
  ],
  staff: [
    { id: st1, business_id: b, name: 'Lena', user_id: null, active: true },
    { id: st2, business_id: b, name: 'Mehmet', user_id: null, active: true },
  ],
  customers: [{ id: '00000000-0000-4000-8000-000000000401', business_id: b, name: 'Anna Müller', email: 'anna@example.com', phone: '', notes: '', created_at: iso(-10, 9) }],
  bookings: [
    booking(1, 0, 10, s1, st1, 'Anna Müller'),
    booking(2, 0, 14, s2, st2, 'Jonas Weber'),
    booking(3, 1, 9, s1, null, 'Sara Klein'),
    booking(4, 2, 11, s2, st1, 'Tim Braun', 'pending'),
    booking(5, -1, 15, s1, st2, 'Mia Lang', 'completed'),
    booking(6, -3, 12, s1, st1, 'Paul Roth', 'no_show'),
  ],
  availability: [1, 2, 3, 4, 5].flatMap((weekday, i) => [
    { id: `00000000-0000-4000-8000-0000000005${i}1`, business_id: b, staff_id: st1, weekday, starts: '09:00:00', ends: '13:00:00' },
    { id: `00000000-0000-4000-8000-0000000005${i}2`, business_id: b, staff_id: st1, weekday, starts: '14:00:00', ends: '18:00:00' },
  ]),
  blocks: [],
  notifications: [],
  assignments: [{ service_id: s1, staff_id: st1 }, { service_id: s2, staff_id: st1 }, { service_id: s1, staff_id: st2 }],
  plan: 'free',
  features: ['assistant', 'chat', 'smart_slots', 'insights_pro'],
  announcements: [],
  support: false,
  stats: { total: 6, confirmed: 3, cancelled: 0, completed: 1, no_show: 1, customers: 1, popular: [{ name: 'Haarschnitt', count: 4 }] },
};

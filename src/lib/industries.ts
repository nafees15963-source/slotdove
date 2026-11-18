/** Business categories with ready-made service templates. Prices in cents. */
export type IndustryTemplate = {
  id: string;
  emoji: string;
  de: string;
  en: string;
  group: 'beauty' | 'health' | 'sport' | 'service' | 'education' | 'other';
  staffWord: { de: string; en: string };
  services: { de: string; en: string; minutes: number; price: number; after?: number }[];
};
export const industries: IndustryTemplate[] = [
  {
    id: 'hair',
    emoji: '💇',
    de: 'Friseur',
    en: 'Hair salon',
    group: 'beauty',
    staffWord: { de: 'Stylist:in', en: 'Stylist' },
    services: [
      { de: 'Haarschnitt Damen', en: "Women's haircut", minutes: 45, price: 4500, after: 10 },
      { de: 'Haarschnitt Herren', en: "Men's haircut", minutes: 30, price: 2800, after: 5 },
      { de: 'Färben', en: 'Colouring', minutes: 90, price: 6900, after: 15 },
      { de: 'Waschen & Föhnen', en: 'Wash & blow-dry', minutes: 30, price: 2500 },
    ],
  },
  {
    id: 'barber',
    emoji: '💈',
    de: 'Barbershop',
    en: 'Barbershop',
    group: 'beauty',
    staffWord: { de: 'Barber', en: 'Barber' },
    services: [
      { de: 'Haarschnitt', en: 'Haircut', minutes: 30, price: 2500, after: 5 },
      { de: 'Bart trimmen', en: 'Beard trim', minutes: 20, price: 1500 },
      { de: 'Haarschnitt + Bart', en: 'Haircut + beard', minutes: 45, price: 3500, after: 5 },
    ],
  },
  {
    id: 'beauty',
    emoji: '💄',
    de: 'Kosmetik & Beauty',
    en: 'Beauty & cosmetics',
    group: 'beauty',
    staffWord: { de: 'Kosmetiker:in', en: 'Beautician' },
    services: [
      { de: 'Gesichtsbehandlung', en: 'Facial', minutes: 60, price: 6500, after: 10 },
      { de: 'Wimpernlifting', en: 'Lash lift', minutes: 45, price: 4900 },
      { de: 'Augenbrauen zupfen', en: 'Brow shaping', minutes: 20, price: 1500 },
    ],
  },
  {
    id: 'nails',
    emoji: '💅',
    de: 'Nagelstudio',
    en: 'Nail studio',
    group: 'beauty',
    staffWord: { de: 'Nageldesigner:in', en: 'Nail artist' },
    services: [
      { de: 'Maniküre', en: 'Manicure', minutes: 45, price: 3000 },
      { de: 'Gel-Neumodellage', en: 'Gel full set', minutes: 90, price: 5500, after: 10 },
      { de: 'Auffüllen', en: 'Refill', minutes: 60, price: 4000 },
    ],
  },
  {
    id: 'massage',
    emoji: '💆',
    de: 'Massage & Wellness',
    en: 'Massage & wellness',
    group: 'health',
    staffWord: { de: 'Therapeut:in', en: 'Therapist' },
    services: [
      { de: 'Massage 30 Min.', en: 'Massage 30 min', minutes: 30, price: 3500, after: 10 },
      { de: 'Massage 60 Min.', en: 'Massage 60 min', minutes: 60, price: 6000, after: 15 },
      { de: 'Hot Stone', en: 'Hot stone', minutes: 75, price: 7900, after: 15 },
    ],
  },
  {
    id: 'physio',
    emoji: '🦴',
    de: 'Physiotherapie',
    en: 'Physiotherapy',
    group: 'health',
    staffWord: { de: 'Therapeut:in', en: 'Therapist' },
    services: [
      { de: 'Krankengymnastik', en: 'Physiotherapy session', minutes: 25, price: 3000, after: 5 },
      { de: 'Manuelle Therapie', en: 'Manual therapy', minutes: 30, price: 4000, after: 5 },
      { de: 'Erstbefund', en: 'Initial assessment', minutes: 45, price: 5000 },
    ],
  },
  {
    id: 'medical',
    emoji: '🩺',
    de: 'Arzt- & Therapiepraxis',
    en: 'Medical practice',
    group: 'health',
    staffWord: { de: 'Behandler:in', en: 'Practitioner' },
    services: [
      { de: 'Sprechstunde', en: 'Consultation', minutes: 15, price: 0 },
      { de: 'Vorsorge', en: 'Check-up', minutes: 30, price: 0 },
      { de: 'Beratungsgespräch', en: 'Counselling', minutes: 50, price: 0 },
    ],
  },
  {
    id: 'dental',
    emoji: '🦷',
    de: 'Zahnarzt',
    en: 'Dentist',
    group: 'health',
    staffWord: { de: 'Zahnärzt:in', en: 'Dentist' },
    services: [
      { de: 'Kontrolle', en: 'Check-up', minutes: 20, price: 0 },
      { de: 'Professionelle Zahnreinigung', en: 'Professional cleaning', minutes: 60, price: 9000 },
    ],
  },
  {
    id: 'pets',
    emoji: '🐕',
    de: 'Hundesalon & Tierpraxis',
    en: 'Pet grooming & vet',
    group: 'health',
    staffWord: { de: 'Groomer:in', en: 'Groomer' },
    services: [
      { de: 'Kleiner Hund komplett', en: 'Small dog full groom', minutes: 60, price: 4500, after: 15 },
      { de: 'Großer Hund komplett', en: 'Large dog full groom', minutes: 120, price: 8000, after: 15 },
      { de: 'Krallen schneiden', en: 'Nail trim', minutes: 15, price: 1000 },
    ],
  },
  {
    id: 'fitness',
    emoji: '🏋️',
    de: 'Fitness & Personal Training',
    en: 'Fitness & personal training',
    group: 'sport',
    staffWord: { de: 'Trainer:in', en: 'Trainer' },
    services: [
      { de: 'Personal Training', en: 'Personal training', minutes: 60, price: 7000 },
      { de: 'Probetraining', en: 'Trial session', minutes: 45, price: 0 },
    ],
  },
  {
    id: 'yoga',
    emoji: '🧘',
    de: 'Yoga & Pilates',
    en: 'Yoga & pilates',
    group: 'sport',
    staffWord: { de: 'Lehrer:in', en: 'Teacher' },
    services: [
      { de: 'Einzelstunde', en: 'Private class', minutes: 60, price: 6000 },
      { de: 'Schnupperstunde', en: 'Taster class', minutes: 45, price: 1500 },
    ],
  },
  {
    id: 'tattoo',
    emoji: '🖋️',
    de: 'Tattoo & Piercing',
    en: 'Tattoo & piercing',
    group: 'beauty',
    staffWord: { de: 'Artist', en: 'Artist' },
    services: [
      { de: 'Beratung', en: 'Consultation', minutes: 30, price: 0 },
      { de: 'Kleines Tattoo', en: 'Small tattoo', minutes: 90, price: 12000, after: 15 },
      { de: 'Piercing', en: 'Piercing', minutes: 30, price: 4000 },
    ],
  },
  {
    id: 'driving',
    emoji: '🚗',
    de: 'Fahrschule',
    en: 'Driving school',
    group: 'education',
    staffWord: { de: 'Fahrlehrer:in', en: 'Instructor' },
    services: [
      { de: 'Fahrstunde 45 Min.', en: 'Driving lesson 45 min', minutes: 45, price: 6000 },
      { de: 'Doppelstunde', en: 'Double lesson', minutes: 90, price: 11500 },
    ],
  },
  {
    id: 'tutoring',
    emoji: '📚',
    de: 'Nachhilfe & Kurse',
    en: 'Tutoring & courses',
    group: 'education',
    staffWord: { de: 'Lehrkraft', en: 'Tutor' },
    services: [
      { de: 'Nachhilfe 60 Min.', en: 'Tutoring 60 min', minutes: 60, price: 3500 },
      { de: 'Probestunde', en: 'Trial lesson', minutes: 45, price: 0 },
    ],
  },
  {
    id: 'consulting',
    emoji: '💼',
    de: 'Beratung & Coaching',
    en: 'Consulting & coaching',
    group: 'service',
    staffWord: { de: 'Berater:in', en: 'Consultant' },
    services: [
      { de: 'Erstgespräch', en: 'Intro call', minutes: 30, price: 0 },
      { de: 'Beratung 60 Min.', en: 'Session 60 min', minutes: 60, price: 12000 },
    ],
  },
  {
    id: 'photo',
    emoji: '📷',
    de: 'Fotografie',
    en: 'Photography',
    group: 'service',
    staffWord: { de: 'Fotograf:in', en: 'Photographer' },
    services: [
      { de: 'Portrait-Shooting', en: 'Portrait shoot', minutes: 60, price: 14900, after: 15 },
      { de: 'Bewerbungsfotos', en: 'Headshots', minutes: 30, price: 6900 },
    ],
  },
  {
    id: 'repair',
    emoji: '🔧',
    de: 'Werkstatt & Reparatur',
    en: 'Workshop & repair',
    group: 'service',
    staffWord: { de: 'Mechaniker:in', en: 'Mechanic' },
    services: [
      { de: 'Inspektion', en: 'Inspection', minutes: 120, price: 15000 },
      { de: 'Reifenwechsel', en: 'Tyre change', minutes: 30, price: 3500 },
      { de: 'Kostenvoranschlag', en: 'Estimate', minutes: 20, price: 0 },
    ],
  },
  {
    id: 'transport',
    emoji: '🚕',
    de: 'Taxi & Fahrdienst',
    en: 'Taxi & transport',
    group: 'service',
    staffWord: { de: 'Fahrer:in', en: 'Driver' },
    services: [
      { de: 'Flughafentransfer', en: 'Airport transfer', minutes: 60, price: 5500, after: 15 },
      { de: 'Stadtfahrt', en: 'City ride', minutes: 30, price: 2000, after: 10 },
      { de: 'Krankenfahrt', en: 'Medical transport', minutes: 60, price: 0, after: 15 },
    ],
  },
  {
    id: 'cleaning',
    emoji: '🧽',
    de: 'Reinigung & Handwerk',
    en: 'Cleaning & trades',
    group: 'service',
    staffWord: { de: 'Mitarbeiter:in', en: 'Worker' },
    services: [
      { de: 'Besichtigung', en: 'Site visit', minutes: 30, price: 0, after: 30 },
      { de: 'Reinigung 2 Std.', en: 'Cleaning 2 h', minutes: 120, price: 7000, after: 30 },
    ],
  },
  {
    id: 'other',
    emoji: '✨',
    de: 'Etwas anderes',
    en: 'Something else',
    group: 'other',
    staffWord: { de: 'Mitarbeiter:in', en: 'Team member' },
    services: [{ de: 'Termin', en: 'Appointment', minutes: 30, price: 0 }],
  },
];
export const industryIds = industries.map((i) => i.id);
export function industryById(id: string | null | undefined) {
  return (
    industries.find((i) => i.id === id) ||
    // Older accounts used a smaller list.
    industries.find((i) => i.id === ({ education: 'tutoring' } as Record<string, string>)[id || '']) ||
    industries[industries.length - 1]
  );
}
export const hourPresets = {
  weekdays: { de: 'Mo–Fr 9–18 Uhr', en: 'Mon–Fri 9am–6pm', days: [1, 2, 3, 4, 5], starts: '09:00', ends: '18:00' },
  saturday: { de: 'Mo–Sa 9–18 Uhr', en: 'Mon–Sat 9am–6pm', days: [1, 2, 3, 4, 5, 6], starts: '09:00', ends: '18:00' },
  late: { de: 'Di–Sa 10–20 Uhr', en: 'Tue–Sat 10am–8pm', days: [2, 3, 4, 5, 6], starts: '10:00', ends: '20:00' },
  none: { de: 'Später festlegen', en: 'Set later', days: [] as number[], starts: '09:00', ends: '18:00' },
} as const;
export type HourPreset = keyof typeof hourPresets;

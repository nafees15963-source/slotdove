import Image from 'next/image';
import {
  Activity,
  BookOpen,
  Brush,
  CalendarCheck,
  Camera,
  Car,
  Dog,
  Dumbbell,
  Flower2,
  Hand,
  HeartPulse,
  Home,
  MessagesSquare,
  Palette,
  PenTool,
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { normalize } from './ai/text';

/** Local "AI" for service pictures: recognises the service from its name and picks a matching motif. */
export const artIcons: Record<string, LucideIcon> = {
  scissors: Scissors,
  palette: Palette,
  brush: Brush,
  sparkles: Sparkles,
  hand: Hand,
  flower: Flower2,
  heart: HeartPulse,
  activity: Activity,
  dumbbell: Dumbbell,
  stethoscope: Stethoscope,
  smile: Smile,
  dog: Dog,
  car: Car,
  camera: Camera,
  pen: PenTool,
  book: BookOpen,
  chat: MessagesSquare,
  home: Home,
  calendar: CalendarCheck,
};
const rules: [string, RegExp][] = [
  ['hand', /nagel|nail|manik|manic|pedik|pedic|gel|shellac/],
  ['palette', /faerb|farb|color|colour|straehn|balayage|toenung|blond|ombre/],
  ['scissors', /haar|schnitt|cut|barber|bart|beard|frisur|fade|styling|foehn|hair/],
  ['sparkles', /kosmetik|gesicht|facial|beauty|wimper|lash|braue|brow|make ?up|haut|peeling|microneedling/],
  ['flower', /wellness|spa|aroma|sauna|entspann|relax/],
  ['heart', /massage|hot stone|lymph|reflexzon/],
  ['activity', /physio|krankengym|therapie|reha|osteo|manuelle/],
  ['dumbbell', /training|fitness|personal|kraft|workout|coach(ing)? sport/],
  ['flower', /yoga|pilates|meditation/],
  ['stethoscope', /arzt|sprechstunde|vorsorge|check|untersuch|impf|praxis|behandlung|doctor/],
  ['smile', /zahn|dental|bleaching|prophylaxe|tooth/],
  ['dog', /hund|katze|tier|pet|groom|krall/],
  ['car', /fahr|auto|reifen|inspektion|werkstatt|transfer|taxi|car|tyre|tire/],
  ['camera', /foto|photo|shooting|bewerbungsbild|portrait/],
  ['pen', /tattoo|piercing|permanent/],
  ['book', /nachhilfe|kurs|unterricht|lesson|lern|probestunde|tutor/],
  ['chat', /beratung|gespraech|coaching|consult|termin mit|call|erstgespraech/],
  ['home', /reinig|clean|haushalt|besichtigung|handwerk|montage/],
  ['brush', /maler|lack|design|kunst/],
];
export function suggestArt(name: string, description = '') {
  const text = normalize(`${name} ${description}`);
  return rules.find(([, re]) => re.test(text))?.[0] || 'calendar';
}
const publicUrl = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-logos/${path}`;
/** Picture of a service: the uploaded photo, otherwise a generated illustration in the service colour. */
export function ServiceArt({ service, size = 56 }: { service: { name: string; description?: string; color: string; art?: string; image_path?: string | null }; size?: number }) {
  if (service.image_path)
    return <Image className="service-art photo" src={publicUrl(service.image_path)} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  const Icon = artIcons[service.art || ''] || artIcons[suggestArt(service.name, service.description)];
  return (
    <span
      className="service-art"
      aria-hidden
      style={{
        width: size,
        height: size,
        background: `radial-gradient(120% 120% at 20% 10%, ${service.color}55, transparent 60%), linear-gradient(140deg, ${service.color}, ${service.color}cc)`,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.7} color="#fff" />
    </span>
  );
}

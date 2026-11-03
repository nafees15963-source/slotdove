import { BookingFlow } from '@/components/booking-flow';
export const metadata = { title: 'Book an appointment', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <BookingFlow slug={(await params).slug} />;
}

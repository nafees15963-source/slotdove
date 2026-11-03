import { PrivateLink } from '@/components/private-link';
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  return <PrivateLink invite />;
}

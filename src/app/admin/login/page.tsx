import { AuthForm } from '@/components/auth-form';
export const metadata = {
  title: 'Slotdove · Admin Login',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AuthForm mode="login" admin />;
}

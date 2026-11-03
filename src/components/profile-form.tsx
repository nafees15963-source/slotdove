'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useI18n } from './providers';
import { Button } from './ui/button';
import { api, friendlyError } from '@/lib/api-client';
const schema = z.object({ name: z.string().min(2).max(100), locale: z.enum(['en', 'de']) });
type Profile = z.infer<typeof schema>;
export function ProfileForm() {
  const { t, locale } = useI18n(),
    [email, setEmail] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Profile>({ resolver: zodResolver(schema), defaultValues: { name: '', locale } });
  useEffect(() => {
    let active = true;
    api<Profile & { email: string }>('/api/profile')
      .then((p) => {
        if (active) {
          reset({ name: p.name, locale: p.locale });
          setEmail(p.email);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [reset]);
  return (
    <form
      className="panel settings-section stack"
      onSubmit={handleSubmit(async (values) => {
        try {
          await api('/api/profile', 'POST', values);
          toast.success(t.saved);
        } catch (e) {
          toast.error(friendlyError(e, locale));
        }
      })}
    >
      <h3>{t.profile}</h3>
      <div className="field">
        <label htmlFor="profile-name">{t.accountName}</label>
        <input id="profile-name" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name && (
          <small role="alert">
            {locale === 'de'
              ? 'Bitte gib 2 bis 100 Zeichen ein.'
              : 'Please enter 2 to 100 characters.'}
          </small>
        )}
      </div>
      <div className="field">
        <label htmlFor="profile-email">{t.email}</label>
        <input id="profile-email" value={email} readOnly />
      </div>
      <div className="field">
        <label htmlFor="profile-locale">{t.language}</label>
        <select id="profile-locale" {...register('locale')}>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
      </div>
      <Button disabled={isSubmitting}>{t.save}</Button>
    </form>
  );
}

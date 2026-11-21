import { it, expect, vi, afterEach } from 'vitest';
vi.mock('server-only', () => ({}));
import { appointmentEmail, sendEmail, escapeHtml } from '../src/lib/email';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('escapes customer-controlled HTML in email templates', () => {
  const r = appointmentEmail({
    kind: 'confirmation',
    locale: 'de',
    business: '<script>alert(1)</script>',
    service: '<img src=x>',
    date: '10 Nov',
    timezone: 'Europe/Berlin',
    status: 'confirmed',
    address: 'A & B',
  });
  expect(r.html).not.toContain('<script>');
  expect(r.html).toContain('&lt;img');
  expect(r.html).toContain('A &amp; B');
});
it('pending approval is never called a confirmed appointment', () => {
  const r = appointmentEmail({
    kind: 'confirmation',
    locale: 'en',
    business: 'Example',
    service: 'Session',
    date: '10 Nov',
    timezone: 'UTC',
    status: 'pending',
    address: '',
  });
  expect(r.subject).toBe('Your appointment request · Example');
  expect(r.subject).not.toMatch(/confirmed/i);
});
it('missing sender cannot report email success', async () => {
  vi.stubEnv('RESEND_API_KEY', 'test-placeholder');
  vi.stubEnv('EMAIL_FROM', '');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  expect(
    await sendEmail({
      to: 'nobody@example.invalid',
      subject: 'Test',
      html: 'test',
      idempotencyKey: 'test',
    }),
  ).toEqual({ state: 'unavailable' });
  expect(fetch).not.toHaveBeenCalled();
});
it('provider rejection is an error, never a success', async () => {
  vi.stubEnv('RESEND_API_KEY', 'test-placeholder');
  vi.stubEnv('EMAIL_FROM', 'test@example.invalid');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })));
  await expect(
    sendEmail({
      to: 'nobody@example.invalid',
      subject: 'Test',
      html: 'test',
      idempotencyKey: 'unique',
    }),
  ).rejects.toThrow('EMAIL_PROVIDER_429');
});
it('provider acceptance keeps its id and uses an idempotency key', async () => {
  vi.stubEnv('RESEND_API_KEY', 'test-placeholder');
  vi.stubEnv('EMAIL_FROM', 'test@example.invalid');
  const f = vi.fn().mockResolvedValue(new Response('{"id":"message-id"}', { status: 200 }));
  vi.stubGlobal('fetch', f);
  expect(
    await sendEmail({
      to: 'nobody@example.invalid',
      subject: 'Test',
      html: 'test',
      idempotencyKey: 'unique',
    }),
  ).toEqual({ state: 'accepted', id: 'message-id' });
  expect(f.mock.calls[0][1].headers['Idempotency-Key']).toBe('unique');
});
it('escaping is complete for HTML attributes', () => {
  expect(escapeHtml('"\'<>')).toBe('&quot;&#39;&lt;&gt;');
});
it('brevo is used when its key is set and gets sender name and address', async () => {
  vi.stubEnv('BREVO_API_KEY', 'test-placeholder');
  vi.stubEnv('RESEND_API_KEY', '');
  vi.stubEnv('EMAIL_FROM', 'Slotdove <test@example.invalid>');
  const f = vi.fn().mockResolvedValue(new Response('{"messageId":"<m@x>"}', { status: 201 }));
  vi.stubGlobal('fetch', f);
  expect(await sendEmail({ to: 'nobody@example.invalid', subject: 'Test', html: 'x', idempotencyKey: 'k' })).toEqual({ state: 'accepted', id: '<m@x>' });
  expect(f.mock.calls[0][0]).toBe('https://api.brevo.com/v3/smtp/email');
  const body = JSON.parse(f.mock.calls[0][1].body);
  expect(body.sender).toEqual({ name: 'Slotdove', email: 'test@example.invalid' });
  expect(body.to).toEqual([{ email: 'nobody@example.invalid' }]);
  vi.unstubAllEnvs();
});

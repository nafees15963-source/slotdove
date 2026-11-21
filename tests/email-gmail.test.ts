import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: '<k@slotdove>' });
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock('nodemailer', () => ({ default: { createTransport } }));
import { emailConfigured, emailProvider, sendEmail } from '../src/lib/email';

it('gmail wins when user and app password are set, and sends as that address', async () => {
  vi.stubEnv('GMAIL_USER', 'Project@Example.invalid');
  vi.stubEnv('GMAIL_APP_PASSWORD', 'abcd efgh ijkl mnop');
  vi.stubEnv('BREVO_API_KEY', 'x');
  vi.stubEnv('EMAIL_FROM', 'Slotdove <other@example.invalid>');
  expect(emailProvider()).toBe('gmail');
  expect(emailConfigured()).toBe(true);
  expect(await sendEmail({ to: 'nobody@example.invalid', subject: 'Hi', html: 'x', idempotencyKey: 'wl approve/1' })).toEqual({ state: 'accepted', id: '<k@slotdove>' });
  const opts = (createTransport.mock.calls[0] as unknown as [{ auth: { pass: string }; host: string }])[0];
  expect(opts.host).toBe('smtp.gmail.com');
  expect(opts.auth.pass).toBe('abcdefghijklmnop');
  expect(sendMail.mock.calls[0][0].from).toBe('Slotdove <project@example.invalid>');
  expect(sendMail.mock.calls[0][0].messageId).toBe('<wlapprove1@slotdove>');
});
it('rejects header injection in recipient or subject', async () => {
  await expect(sendEmail({ to: 'a@example.invalid\r\nBcc: x@example.invalid', subject: 'Hi', html: 'x', idempotencyKey: 'k' })).rejects.toThrow('EMAIL_INVALID_HEADER');
});
it('apps script provider posts secret and mail, and fails loudly on rejection', async () => {
  vi.stubEnv('GMAIL_SCRIPT_URL', 'https://script.google.com/macros/s/abc/exec');
  vi.stubEnv('GMAIL_SCRIPT_SECRET', 'x'.repeat(30));
  vi.stubEnv('EMAIL_FROM', '');
  expect(emailProvider()).toBe('script');
  const f = vi.fn().mockResolvedValueOnce(new Response('{"ok":true,"id":"k1"}')).mockResolvedValueOnce(new Response('{"ok":false,"error":"Falsches Geheimwort"}'));
  vi.stubGlobal('fetch', f);
  expect(await sendEmail({ to: 'nobody@example.invalid', subject: 'Hi', html: 'x', idempotencyKey: 'k' })).toEqual({ state: 'accepted', id: 'k1' });
  const body = JSON.parse(f.mock.calls[0][1].body);
  expect(body).toMatchObject({ to: 'nobody@example.invalid', name: 'Slotdove', key: 'k' });
  await expect(sendEmail({ to: 'nobody@example.invalid', subject: 'Hi', html: 'x', idempotencyKey: 'k2' })).rejects.toThrow('Falsches Geheimwort');
  vi.unstubAllGlobals();
});

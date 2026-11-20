'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronUp, Lightbulb } from 'lucide-react';
import { Button } from '../ui/button';
import { Heading } from './common';
import { useI18n } from '../providers';
import { useWorkspace } from './shell';
import { api, friendlyError } from '@/lib/api-client';

type Wish = { id: string; title: string; description: string; status: string; admin_note: string; votes: number; own: boolean; voted: boolean };
const statusDe: Record<string, [string, string]> = {
  new: ['Neu', 'New'],
  planned: ['Geplant', 'Planned'],
  in_progress: ['In Arbeit', 'In progress'],
  done: ['Fertig', 'Done'],
};
/** Feature wishes with voting – shows what businesses really need during the test phase. */
export function Wishes() {
  const { locale } = useI18n(),
    w = useWorkspace(),
    de = locale === 'de';
  const [list, setList] = useState<Wish[] | null>(null),
    [busy, setBusy] = useState(false);
  const load = useCallback(() => api<{ wishes: Wish[] }>('/api/wishes').then((r) => setList(r.wishes)).catch((e) => toast.error(friendlyError(e, locale))), [locale]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <Heading
        title={de ? 'Wünsche & Ideen' : 'Wishes & ideas'}
        description={de ? 'Was fehlt dir? Trag es ein oder stimme für die Ideen anderer ab. Die meistgewünschten Funktionen bauen wir zuerst.' : 'What is missing? Add it or vote for others. Most wanted features come first.'}
      />
      <div className="panel panel-body" style={{ marginBottom: 18 }}>
        <form
          className="wish-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = Object.fromEntries(new FormData(form));
            setBusy(true);
            try {
              await api('/api/wishes', 'POST', { title: f.title, description: f.description, business_id: w.business.id });
              form.reset();
              toast.success(de ? 'Danke! Dein Wunsch ist eingetragen.' : 'Thanks! Your wish was added.');
              await load();
            } catch (err) {
              toast.error(friendlyError(err, locale));
            } finally {
              setBusy(false);
            }
          }}
        >
          <input name="title" required minLength={3} maxLength={120} placeholder={de ? 'z. B. Termine per SMS bestätigen' : 'e.g. SMS confirmations'} aria-label={de ? 'Wunsch' : 'Wish'} />
          <textarea name="description" maxLength={2000} rows={2} placeholder={de ? 'Optional: Warum wäre das hilfreich?' : 'Optional: why would it help?'} aria-label={de ? 'Beschreibung' : 'Description'} />
          <Button type="submit" disabled={busy}>
            <Lightbulb size={15} /> {de ? 'Wunsch eintragen' : 'Add wish'}
          </Button>
        </form>
      </div>
      <div className="wish-list">
        {(list || []).map((x) => (
          <div className="panel wish" key={x.id}>
            <button
              className={`wish-vote ${x.voted ? 'on' : ''}`}
              aria-pressed={x.voted}
              aria-label={de ? 'Abstimmen' : 'Vote'}
              onClick={async () => {
                try {
                  const r = await api<{ voted: boolean; votes: number }>('/api/wishes', 'POST', { action: 'vote', id: x.id });
                  setList((l) => (l || []).map((y) => (y.id === x.id ? { ...y, voted: r.voted, votes: r.votes } : y)));
                } catch (err) {
                  toast.error(friendlyError(err, locale));
                }
              }}
            >
              <ChevronUp size={16} />
              <strong>{x.votes}</strong>
            </button>
            <div className="grow">
              <div className="row">
                <strong>{x.title}</strong>
                {x.status !== 'new' && <span className="badge">{(statusDe[x.status] || statusDe.new)[de ? 0 : 1]}</span>}
                {x.own && <span className="badge">{de ? 'von dir' : 'yours'}</span>}
              </div>
              {x.description && <p className="muted">{x.description}</p>}
              {x.admin_note && <p className="wish-note">{x.admin_note}</p>}
            </div>
          </div>
        ))}
        {list && !list.length && <p className="muted">{de ? 'Noch keine Wünsche – sei die erste Person!' : 'No wishes yet.'}</p>}
      </div>
    </>
  );
}

'use client';
import { useWorkspace } from './shell';
import { useI18n } from '../providers';
import { Overview } from './overview';
import { Schedule, Availability } from './schedule';
import { Entities } from './entities';
import { Settings, Analytics, Notifications, Integrations, Billing } from './settings';
export function PageContent({ section }: { section: string }) {
  const w = useWorkspace(),
    { t } = useI18n();
  if (w.role === 'staff' && !['overview', 'calendar', 'appointments'].includes(section))
    return <div className="notice">{t.notAuthorized}</div>;
  switch (section) {
    case 'calendar':
      return <Schedule />;
    case 'appointments':
      return <Schedule listOnly />;
    case 'customers':
    case 'services':
    case 'staff':
      return <Entities kind={section} key={`${section}:${w.business.id}`} />;
    case 'availability':
      return <Availability />;
    case 'booking':
      return <Settings bookingOnly />;
    case 'settings':
      return <Settings />;
    case 'analytics':
      return <Analytics />;
    case 'notifications':
      return <Notifications />;
    case 'integrations':
      return <Integrations />;
    case 'billing':
      return <Billing />;
    default:
      return <Overview />;
  }
}

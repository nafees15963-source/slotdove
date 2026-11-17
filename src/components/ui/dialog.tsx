'use client';
import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../providers';
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="dialog-overlay" />
        <D.Content className="dialog-content">
          <div className="dialog-heading">
            <div>
              <D.Title>{title}</D.Title>
              <D.Description className={description ? 'muted' : 'sr-only'}>
                {description || title}
              </D.Description>
            </div>
            <D.Close className="btn btn-ghost btn-icon" aria-label={t.close}>
              <X size={20} />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

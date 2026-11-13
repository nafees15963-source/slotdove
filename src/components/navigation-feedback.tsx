'use client';
import { useLinkStatus } from 'next/link';
export function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className="nav-pending" role="status" aria-label="Loading">
      <span className="spinner" />
    </span>
  ) : null;
}

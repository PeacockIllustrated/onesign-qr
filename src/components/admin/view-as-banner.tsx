import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export function ViewAsBanner({
  orgName,
  orgId,
}: {
  orgName: string;
  orgId: string;
}) {
  return (
    <div className="bg-destructive/15 text-destructive border-b border-destructive/30 px-4 py-2 text-sm flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          <strong className="uppercase tracking-widest mr-2 text-xs">
            Admin · read-only preview
          </strong>
          of <strong>{orgName}</strong>
        </span>
      </span>
      <Link
        href={`/admin/orgs/${orgId}`}
        className="shrink-0 font-semibold underline hover:no-underline"
      >
        Exit preview
      </Link>
    </div>
  );
}

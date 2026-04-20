import Link from 'next/link';

export function ViewAsBanner({
  orgName,
  orgId,
}: {
  orgName: string;
  orgId: string;
}) {
  return (
    <div className="bg-red-600 text-white px-4 py-2 text-sm flex justify-between items-center">
      <span>
        ADMIN · READ-ONLY PREVIEW of <strong>{orgName}</strong>
      </span>
      <Link
        href={`/admin/orgs/${orgId}`}
        className="underline text-white"
      >
        Exit preview
      </Link>
    </div>
  );
}

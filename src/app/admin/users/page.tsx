import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function UsersListPage() {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  const users = data?.users ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Users</h1>
      <div className="bg-white border rounded divide-y">
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="block p-4 hover:bg-gray-50 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{u.email ?? '(no email)'}</div>
              <div className="text-xs text-gray-500 font-mono truncate">
                {u.id}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {u.created_at
                ? new Date(u.created_at).toLocaleDateString()
                : ''}
            </div>
          </Link>
        ))}
      </div>
      {users.length === 100 && (
        <p className="mt-4 text-xs text-gray-500">
          Showing first 100. Pagination not yet implemented.
        </p>
      )}
    </div>
  );
}

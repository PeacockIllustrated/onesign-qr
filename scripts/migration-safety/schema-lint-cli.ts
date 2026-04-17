import { join } from 'node:path';
import { lintMigrationsDirectory } from './schema-lint';

const dir = join(process.cwd(), 'supabase', 'migrations');
const { violations } = lintMigrationsDirectory(dir);

if (violations.length > 0) {
  console.error('Migration schema-lint failed:');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('Migration schema-lint passed.');

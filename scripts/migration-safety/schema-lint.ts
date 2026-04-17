import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROTECTED_TABLE = 'qr_codes';
const PROTECTED_COLUMNS = [
  'slug',
  'destination_url',
  'is_active',
  'analytics_enabled',
  'mode',
];

export interface LintResult {
  violations: string[];
}

/**
 * Strips SQL line comments (-- ...) and block comments so pattern matching
 * only looks at executable SQL.
 */
function stripComments(sql: string): string {
  const withoutBlock = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutBlock
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

export function lintMigrationContent(sql: string): LintResult {
  const violations: string[] = [];
  const cleaned = stripComments(sql);
  const normalized = cleaned.toLowerCase();

  // DROP TABLE qr_codes
  if (
    new RegExp(`drop\\s+table\\s+(if\\s+exists\\s+)?${PROTECTED_TABLE}\\b`).test(
      normalized
    )
  ) {
    violations.push(
      `DROP TABLE on protected table "${PROTECTED_TABLE}" is forbidden.`
    );
  }

  // Find ALTER TABLE qr_codes ... statements, then check the body of each.
  const alterRegex = new RegExp(
    `alter\\s+table\\s+(only\\s+)?${PROTECTED_TABLE}\\b([^;]*);`,
    'g'
  );
  let match: RegExpExecArray | null;
  while ((match = alterRegex.exec(normalized)) !== null) {
    const body = match[2];
    for (const col of PROTECTED_COLUMNS) {
      const bodyPatterns = [
        new RegExp(`drop\\s+column\\s+(if\\s+exists\\s+)?${col}\\b`),
        new RegExp(`rename\\s+column\\s+${col}\\b`),
        new RegExp(`alter\\s+column\\s+${col}\\s+type\\b`),
        new RegExp(`alter\\s+column\\s+${col}\\s+set\\s+data\\s+type\\b`),
      ];
      if (bodyPatterns.some((p) => p.test(body))) {
        violations.push(
          `Forbidden change to protected column "${PROTECTED_TABLE}.${col}". ` +
            `This column is relied on by the production redirect handler.`
        );
      }
    }
  }

  return { violations };
}

export function lintMigrationsDirectory(dir: string): LintResult {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const allViolations: string[] = [];
  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf8');
    const { violations } = lintMigrationContent(content);
    for (const v of violations) {
      allViolations.push(`${file}: ${v}`);
    }
  }
  return { violations: allViolations };
}

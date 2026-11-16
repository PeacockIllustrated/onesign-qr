/**
 * Minimal in-memory stand-in for the Supabase query builder, enough for the
 * MCP tools: select/insert/update with eq/is/order/range/or filters.
 */
type Row = Record<string, any>;

export class FakeDb {
  tables: Record<string, Row[]> = {};
  rpcResults: Record<string, unknown[]> = {};

  from(table: string) {
    this.tables[table] ??= [];
    return new Query(this, table);
  }

  async rpc(name: string) {
    const queue = this.rpcResults[name] ?? [];
    return { data: queue.shift() ?? null, error: null };
  }
}

class Query {
  private filters: Array<(r: Row) => boolean> = [];
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;
  private wantCount = false;
  private rangeFrom = 0;
  private rangeTo = Infinity;
  private selectCols = '*';

  constructor(private db: FakeDb, private table: string) {}

  select(cols = '*', opts?: { count?: string }) {
    this.selectCols = cols;
    if (opts?.count) this.wantCount = true;
    return this;
  }
  insert(row: Row | Row[]) { this.op = 'insert'; this.payload = row; return this; }
  delete() { this.op = 'delete'; return this; }
  update(row: Row) { this.op = 'update'; this.payload = row; return this; }
  eq(col: string, v: unknown) { this.filters.push((r) => r[col] === v); return this; }
  is(col: string, v: unknown) { this.filters.push((r) => (r[col] ?? null) === v); return this; }
  gte(col: string, v: string) { this.filters.push((r) => r[col] >= v); return this; }
  order() { return this; }
  limit() { return this; }
  range(a: number, b: number) { this.rangeFrom = a; this.rangeTo = b; return this; }
  or(expr: string) {
    const term = /ilike\.%(.*?)%/.exec(expr)?.[1]?.toLowerCase() ?? '';
    this.filters.push((r) => `${r.name} ${r.destination_url}`.toLowerCase().includes(term));
    return this;
  }

  private withJoins(r: Row): Row {
    if (this.table === 'qr_codes' && this.selectCols.includes('qr_styles')) {
      return { ...r, qr_styles: (this.db.tables.qr_styles ?? []).filter((s) => s.qr_id === r.id) };
    }
    return { ...r };
  }

  private run(): { data: any; error: any; count?: number } {
    const rows = this.db.tables[this.table];
    if (this.op === 'insert') {
      const inputs = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const out: Row[] = [];
      for (const input of inputs) {
        const row: Row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), deleted_at: null, total_scans: 0, is_active: true, ...input };
        if ((this.table === 'qr_codes' || this.table === 'bio_link_pages') && row.slug && rows.some((r) => r.slug === row.slug)) {
          return { data: null, error: { code: '23505', message: 'duplicate' } };
        }
        rows.push(row);
        if (this.table === 'qr_codes') {
          (this.db.tables.qr_styles ??= []).push({
            qr_id: row.id, foreground_color: '#000000', background_color: '#FFFFFF',
            error_correction: 'M', quiet_zone: 4, module_shape: 'square', eye_shape: 'square',
          });
        }
        out.push(this.withJoins(row));
      }
      return { data: out, error: null };
    }
    if (this.op === 'delete') {
      const keep = rows.filter((r) => !this.filters.every((f) => f(r)));
      this.db.tables[this.table] = keep;
      return { data: null, error: null };
    }
    const matched = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === 'update') {
      matched.forEach((r) => Object.assign(r, this.payload));
      return { data: matched.map((r) => this.withJoins(r)), error: null };
    }
    const page = matched.slice(this.rangeFrom, this.rangeTo + 1).map((r) => this.withJoins(r));
    return { data: page, error: null, count: this.wantCount ? matched.length : undefined };
  }

  async single() {
    const res = this.run();
    if (res.error) return res;
    return { data: res.data[0] ?? null, error: res.data[0] ? null : { code: 'PGRST116' } };
  }
  async maybeSingle() {
    const res = this.run();
    if (res.error) return res;
    return { data: res.data[0] ?? null, error: null };
  }
  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return Promise.resolve(this.run()).then(resolve, reject);
  }
}

import { randomUUID } from 'node:crypto';
import { Pool, types } from 'pg';

// Match PGlite's bigint/date representation for this small, synthetic fixture.
const fixtureTypes = {
  getTypeParser(oid, format) {
    if (oid === 20) return Number;
    if (oid === 1082) return (value) => value;
    return types.getTypeParser(oid, format);
  },
};

export async function createIsolatedPostgres(connectionString) {
  const control = new Pool({ connectionString, max: 1 });
  // Only this fresh, generated database can be dropped by the test harness.
  const databaseName = `bga_test_${randomUUID().replaceAll('-', '')}`;
  await control.query(`create database "${databaseName}"`);
  const databaseUrl = new URL(connectionString);
  databaseUrl.pathname = `/${databaseName}`;
  const pool = new Pool({ connectionString: databaseUrl.toString(), max: 6, types: fixtureTypes });
  return {
    query: (sql, params) => pool.query(sql, params),
    exec: (sql) => pool.query(sql),
    async transaction(callback) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await callback({
          query: (sql, params) => client.query(sql, params),
          exec: (sql) => client.query(sql),
        });
        await client.query('commit');
        return result;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
      try {
        await control.query(`drop database "${databaseName}"`);
      } finally {
        await control.end();
      }
    },
  };
}

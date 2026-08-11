import "server-only";
import { Pool, type PoolClient } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __mensorCrmPool: Pool | undefined;
}

export function crmPool() {
  const connectionString = process.env.CRM_DATABASE_URL;
  if (!connectionString) throw new Error("CRM_DATABASE_URL não configurada");
  if (!global.__mensorCrmPool) {
    global.__mensorCrmPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return global.__mensorCrmPool;
}

export async function withCrmTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await crmPool().connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

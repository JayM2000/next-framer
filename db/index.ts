import { Pool, type PoolClient, type QueryResultRow } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env.local");
}

// Global bypass for Neon/Aiven self-signed certificates during dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Decode CA certificate from base64 env variable
const caCert = process.env.DATABASE_CA_CERT
    ? Buffer.from(process.env.DATABASE_CA_CERT, "base64").toString("utf-8")
    : undefined;

// Singleton pool — reused across requests
function createPool() {
    return new Pool({
        connectionString: process.env.DATABASE_URL,
        max: parseInt(process.env.DATABASE_POOL_MAX ?? "10"),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        ssl: caCert
            ? { rejectUnauthorized: false, ca: caCert }
            : false,
    });
}

declare global {
    // Survive Next.js dev hot-reloads without exhausting connections
    let _pgPool: Pool | undefined;
}

const pool: Pool =
    process.env.NODE_ENV === "development"
        ? (globalThis._pgPool ??= createPool())
        : createPool();

// Raw query helper — parameterized to prevent SQL injection
export async function query<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
) {
    const result = await pool.query<T>(sql, params);
    return result.rows;
}

// Transaction helper — checks out one client, runs callback, releases it
export async function withTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release(); // always return client to pool
    }
}

export default pool;
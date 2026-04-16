import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool, type PoolClient, type QueryResultRow } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env.local");
}

// Global bypass for Neon/Aiven self-signed certificates during dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


// Singleton pool — reused across requests
function createPool() {
    return new Pool({
        connectionString: process.env.DATABASE_URL,
        // user: process.env.POSTGRES_USER,
        // host: process.env.POSTGRES_HOST,
        // database: process.env.POSTGRES_DATABASE,
        // password: process.env.POSTGRES_PASSWORD,
        // port: Number(process.env.POSTGRES_PORT),
        max: parseInt(process.env.DATABASE_POOL_MAX ?? "10"),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        // ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false,
        ssl: {
            rejectUnauthorized: false,
            ca: fs.readFileSync(path.join(__dirname, 'ca.pem')).toString()
        }
    });
}

declare global {
    // Survive Next.js dev hot-reloads without exhausting connections
    var _pgPool: Pool | undefined;
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
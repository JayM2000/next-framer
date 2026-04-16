import { readFileSync } from "fs";
import path, { join } from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local manually
const envPath = join(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [key, ...rest] = trimmed.split("=");
  process.env[key.trim()] = rest.join("=").trim();
}

// Bypass self-signed cert error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    ca: readFileSync(join(__dirname, 'ca.pem')).toString()
  }
});

const schemaFiles = [
  "users.sql",
  "users_migrations_001.sql",
  "users_migrations_002.sql",
  "users_migrations_003.sql",
  "users_migrations_004.sql",
  "vault_items.sql",
  "vault_tags.sql",
  "vault_item_tags.sql",
  "vault_migrations_001.sql",
];

async function runSchemas() {
  const client = await pool.connect();
  try {
    for (const file of schemaFiles) {
      const filePath = join(__dirname, "schemas", file);
      const sql = readFileSync(filePath, "utf-8");
      console.log(`⏳ Running ${file}...`);
      await client.query(sql);
      console.log(`✅ ${file} executed successfully`);
    }
    console.log("\n🎉 All schemas applied!");
  } catch (err) {
    console.error("❌ Error running schema:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runSchemas();
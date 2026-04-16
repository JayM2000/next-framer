import { Client } from "pg";

const source = new Client({
  connectionString: process.env.EC2_DB_URL,
});

const target = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  await source.connect();
  await target.connect();

  const res = await source.query("SELECT * FROM users");

  for (const row of res.rows) {
    await target.query(
      `INSERT INTO users (id, name, email) VALUES ($1, $2, $3)`,
      [row.id, row.name, row.email]
    );
  }

  console.log("Migration done ✅");
}

migrate();
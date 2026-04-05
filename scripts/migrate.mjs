import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "migrations");

loadEnvFiles([
  path.join(projectRoot, ".env.local"),
  path.join(projectRoot, ".env"),
  path.join(projectRoot, "src", ".env.local"),
  path.join(projectRoot, "src", ".env"),
]);

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST || process.env.VITE_MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || process.env.VITE_MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE || process.env.VITE_MYSQL_DATABASE || "close_statement_hub",
  user: process.env.MYSQL_USER || process.env.VITE_MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || process.env.VITE_MYSQL_PASSWORD || "",
});

try {
  await ensureMigrationsTable();
  const migrationFiles = await getMigrationFiles();

  if (process.argv.includes("--status")) {
    await printStatus(migrationFiles);
  } else {
    await runMigrations(migrationFiles);
  }
} finally {
  await connection.end();
}

async function ensureMigrationsTable() {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_schema_migrations_name (name)
    ) ENGINE=InnoDB
  `);
}

async function getMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".mjs"))
    .sort((left, right) => left.localeCompare(right));
}

async function printStatus(migrationFiles) {
  const [rows] = await connection.query(
    "SELECT name, applied_at FROM schema_migrations ORDER BY name",
  );

  const applied = new Map(rows.map((row) => [row.name, row.applied_at]));
  if (!migrationFiles.length) {
    console.log("No migration files found.");
    return;
  }

  console.log("Migration status:");
  for (const fileName of migrationFiles) {
    const status = applied.has(fileName) ? "APPLIED" : "PENDING";
    const suffix = applied.has(fileName) ? ` (${applied.get(fileName)})` : "";
    console.log(`- ${fileName}: ${status}${suffix}`);
  }
}

async function runMigrations(migrationFiles) {
  if (!migrationFiles.length) {
    console.log("No migrations to run.");
    return;
  }

  const [rows] = await connection.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((row) => row.name));
  const pending = migrationFiles.filter((fileName) => !applied.has(fileName));

  if (!pending.length) {
    console.log("Database is up to date.");
    return;
  }

  const context = createMigrationContext();

  for (const fileName of pending) {
    const migrationPath = path.join(migrationsDir, fileName);
    const migrationModule = await import(pathToFileURL(migrationPath).href);
    const migrationUp = migrationModule.up;

    if (typeof migrationUp !== "function") {
      throw new Error(`Migration ${fileName} does not export an 'up' function.`);
    }

    console.log(`Applying ${fileName}...`);
    await migrationUp(context);
    await connection.execute(
      "INSERT INTO schema_migrations (name) VALUES (?)",
      [fileName],
    );
    console.log(`Applied ${fileName}`);
  }
}

function createMigrationContext() {
  return {
    connection,
    query: (sql, params = []) => connection.execute(sql, params),
    helpers: {
      tableExists: (tableName) => tableExists(tableName),
      viewExists: (viewName) => viewExists(viewName),
      columnExists: (tableName, columnName) => columnExists(tableName, columnName),
      indexExists: (tableName, indexName) => indexExists(tableName, indexName),
      foreignKeyExists: (tableName, constraintName) => foreignKeyExists(tableName, constraintName),
      createTableIfMissing: async (tableName, createSql) => {
        if (!(await tableExists(tableName))) {
          await connection.execute(createSql);
        }
      },
      addColumnIfMissing: async (tableName, columnName, definition) => {
        if (!(await columnExists(tableName, columnName))) {
          await connection.execute(
            `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`,
          );
        }
      },
      addIndexIfMissing: async (tableName, indexName, createSql) => {
        if (!(await indexExists(tableName, indexName))) {
          await connection.execute(createSql);
        }
      },
      addForeignKeyIfMissing: async (tableName, constraintName, alterSql) => {
        if (!(await foreignKeyExists(tableName, constraintName))) {
          await connection.execute(`ALTER TABLE \`${tableName}\` ${alterSql}`);
        }
      },
      createOrReplaceView: async (viewName, selectSql) => {
        await connection.execute(`DROP VIEW IF EXISTS \`${viewName}\``);
        await connection.execute(`CREATE VIEW \`${viewName}\` AS ${selectSql}`);
      },
    },
  };
}

async function tableExists(tableName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND table_type = 'BASE TABLE'
      LIMIT 1
    `,
    [tableName],
  );
  return rows.length > 0;
}

async function viewExists(viewName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.views
      WHERE table_schema = DATABASE()
        AND table_name = ?
      LIMIT 1
    `,
    [viewName],
  );
  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
      LIMIT 1
    `,
    [tableName, columnName],
  );
  return rows.length > 0;
}

async function indexExists(tableName, indexName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?
      LIMIT 1
    `,
    [tableName, indexName],
  );
  return rows.length > 0;
}

async function foreignKeyExists(tableName, constraintName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.referential_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = ?
        AND constraint_name = ?
      LIMIT 1
    `,
    [tableName, constraintName],
  );
  return rows.length > 0;
}

function loadEnvFiles(filePaths) {
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

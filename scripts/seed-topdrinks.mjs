import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const seedDir = path.join(projectRoot, "seeds", "topdrinks");

loadEnvFiles([
  path.join(projectRoot, ".env.local"),
  path.join(projectRoot, ".env"),
  path.join(projectRoot, "src", ".env.local"),
  path.join(projectRoot, "src", ".env"),
]);

const dryRun = process.argv.includes("--dry-run");

if (!fs.existsSync(seedDir)) {
  throw new Error(`Seed directory not found: ${seedDir}`);
}

const seedFiles = fs
  .readdirSync(seedDir)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));

if (!seedFiles.length) {
  throw new Error(`No SQL seed files found in ${seedDir}`);
}

if (dryRun) {
  console.log("TopDrinks seed files:");
  for (const fileName of seedFiles) {
    console.log(`- ${fileName}`);
  }
  process.exit(0);
}

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST || process.env.VITE_MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || process.env.VITE_MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE || process.env.VITE_MYSQL_DATABASE || "close_statement_hub",
  user: process.env.MYSQL_USER || process.env.VITE_MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || process.env.VITE_MYSQL_PASSWORD || "",
  multipleStatements: true,
});

try {
  await connection.beginTransaction();

  for (const fileName of seedFiles) {
    const filePath = path.join(seedDir, fileName);
    const sql = fs.readFileSync(filePath, "utf8");
    console.log(`Applying ${fileName}...`);
    await connection.query(sql);
  }

  await connection.commit();
  console.log("TopDrinks seed applied successfully.");
  console.log("Demo company: TopDrinks Distribution");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
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

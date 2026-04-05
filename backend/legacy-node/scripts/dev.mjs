import { spawn } from "node:child_process";

const children = [];

function run(name, command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
    shutdown();
  });

  children.push(child);
}

function shutdown() {
  while (children.length) {
    const child = children.pop();
    if (child && !child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run("api", "node", ["server/server.mjs"]);
run("vite", "npx", ["vite"]);

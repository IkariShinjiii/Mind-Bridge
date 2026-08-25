// Run this once, from the server/ folder, to create an admin account:
//
//   node seed-admin.js
//
// Admin accounts aren't created through the sign-up form on purpose — a
// public "become an admin" option would be a real security hole for an app
// handling confidential student data. This script writes directly to
// data.json instead.

import { createInterface } from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { hashPassword } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data.json");

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { users: [], responses: [], appointments: [], availability: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  const name = await ask("Admin name: ");
  const email = await ask("Admin email: ");
  const password = await ask("Admin password (min 6 chars): ");
  rl.close();

  if (!name || !email || !password || password.length < 6) {
    console.error("All fields are required and the password must be at least 6 characters.");
    process.exit(1);
  }

  const data = readData();
  if (data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    console.error("An account with that email already exists.");
    process.exit(1);
  }

  const user = {
    id: Date.now().toString(),
    name,
    email,
    password: await hashPassword(password),
    role: "admin",
    emailVerified: true,
    verifyToken: null,
    verifyTokenExpires: null,
    resetToken: null,
    resetTokenExpires: null,
    approved: true,
    active: true,
    createdAt: new Date().toISOString(),
  };

  data.users.push(user);
  writeData(data);

  console.log(`\n✅ Admin account created for ${email}. Log in with the password you just set.`);
}

main();

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

// ---------------------------------------------------------------------------
// Load .env
// ---------------------------------------------------------------------------
const envFile = path.join(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8')
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    });
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const REGION = process.env.COGNITO_REGION;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@admin.com';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Admin123!';

if (!REGION || !USER_POOL_ID) {
  console.error('Missing COGNITO_REGION or COGNITO_USER_POOL_ID in .env');
  process.exit(1);
}

if (!ADMIN_PASS) {
  console.error(
    'ADMIN_PASSWORD is required.\n' +
      'Run:  ADMIN_PASSWORD=YourP@ss node scripts/seed-admin.js\n' +
      'Or add ADMIN_PASSWORD to your .env file.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------
async function seed() {
  const client = new CognitoIdentityProviderClient({ region: REGION });

  // 1. Create user (idempotent)
  let userExists = false;
  try {
    await client.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: ADMIN_EMAIL }));
    userExists = true;
    console.log(`  ℹ  User already exists — skipping creation`);
  } catch (e) {
    if (e.name !== 'UserNotFoundException') throw e;
  }

  if (!userExists) {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: ADMIN_EMAIL,
        UserAttributes: [
          { Name: 'email', Value: ADMIN_EMAIL },
          { Name: 'email_verified', Value: 'true' },
        ],
        MessageAction: 'SUPPRESS', // skip the Cognito welcome email
      }),
    );
    console.log(`  ✓  Created user: ${ADMIN_EMAIL}`);
  }

  // 2. Set a permanent password (clears FORCE_CHANGE_PASSWORD state)
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: ADMIN_EMAIL,
      Password: ADMIN_PASS,
      Permanent: true,
    }),
  );
  console.log('  ✓  Permanent password set');

  // 3. Add to Admins group (idempotent — Cognito silently ignores duplicates)
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: ADMIN_EMAIL,
      GroupName: 'Admins',
    }),
  );
  console.log('  ✓  Added to Admins group');

  console.log(`\n  Admin ready → ${ADMIN_EMAIL}`);
}

console.log('\nSeeding admin user…');
seed().catch((e) => {
  console.error('\nSeeder failed:', e.message ?? e);
  process.exit(1);
});

// ============================================================================
// tenancy.js — shared helper for multi-tenant HackHub Lambdas
//
// Shipped as a Lambda Layer under /opt/nodejs/tenancy.js, so handlers do:
//   const t = require('/opt/nodejs/tenancy');
//
// Provides:
//   getConnection()                      -> cached mysql2 connection (creds from Secrets Manager)
//   getCaller(event)                     -> { email, groups[] }  (tolerates REST v1 + HTTP v2 event shapes)
//   resolveHackathonId(event)            -> hackathon_id from path param (fallback: header, query, body)
//   assertMembership(conn, caller, hid, role) -> throws {statusCode:403} unless authorized (Admins bypass)
//   respond(statusCode, bodyObj)         -> API Gateway proxy response with CORS headers
//   HttpError                            -> throwable carrying a statusCode
//
// mysql2 is provided by the layer's own node_modules. AWS SDK v3 is built into
// the nodejs22.x runtime (no bundling needed).
// ============================================================================

const mysql = require('mysql2/promise');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const secretsManager = new SecretsManagerClient({ region: REGION });

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Hackathon-Id',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

// A throwable that handlers can let bubble; the DB/response layer maps it to a
// clean API Gateway response instead of a 500.
class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function respond(statusCode, bodyObj) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj),
  };
}

// ---- DB ---------------------------------------------------------------------
let cachedConnection = null;
let cachedCreds = null;

async function getDbCredentials() {
  if (cachedCreds) return cachedCreds;
  if (!process.env.DB_SECRET_ARN) throw new Error('DB_SECRET_ARN is not set');
  const data = await secretsManager.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
  cachedCreds = JSON.parse(data.SecretString);
  return cachedCreds;
}

async function getConnection() {
  if (cachedConnection && cachedConnection.connection && cachedConnection.connection.state !== 'disconnected') {
    try {
      await cachedConnection.query('SELECT 1');
      return cachedConnection;
    } catch (e) {
      cachedConnection = null; // stale; reconnect below
    }
  }
  const creds = await getDbCredentials();
  cachedConnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: creds.username,
    password: creds.password,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    charset: 'utf8mb4',
  });
  return cachedConnection;
}

// ---- Identity ---------------------------------------------------------------
// Reads Cognito claims from either the REST API v1 shape
// (event.requestContext.authorizer.claims) or HTTP API v2
// (event.requestContext.authorizer.jwt.claims).
function getCaller(event) {
  const rc = (event && event.requestContext) || {};
  const authorizer = rc.authorizer || {};
  const claims = authorizer.claims || (authorizer.jwt && authorizer.jwt.claims) || {};
  const email = claims.email || claims['cognito:username'] || null;
  let groups = claims['cognito:groups'] || [];
  if (typeof groups === 'string') {
    // Cognito may serialize groups as "[Admins Hosts]" or "Admins,Hosts".
    groups = groups.replace(/^\[|\]$/g, '').split(/[,\s]+/).filter(Boolean);
  }
  return { email, groups };
}

function isAdmin(caller) {
  return Array.isArray(caller.groups) && caller.groups.includes('Admins');
}

// ---- Hackathon resolution ---------------------------------------------------
function resolveHackathonId(event) {
  const pp = (event && event.pathParameters) || {};
  if (pp.hackathonId) return pp.hackathonId;
  const headers = (event && event.headers) || {};
  const hv = headers['X-Hackathon-Id'] || headers['x-hackathon-id'];
  if (hv) return hv;
  const qs = (event && event.queryStringParameters) || {};
  if (qs.hackathonId || qs.hackathon_id) return qs.hackathonId || qs.hackathon_id;
  if (event && typeof event.body === 'string') {
    try {
      const b = JSON.parse(event.body);
      if (b.hackathonId || b.hackathon_id) return b.hackathonId || b.hackathon_id;
    } catch (e) { /* ignore */ }
  } else if (event && event.body && typeof event.body === 'object') {
    if (event.body.hackathonId || event.body.hackathon_id) return event.body.hackathonId || event.body.hackathon_id;
  }
  return null;
}

// ---- Authorization ----------------------------------------------------------
// Ensures `caller` may act on `hackathonId` with `requiredRole`.
//   - Admins bypass all checks.
//   - Hosts are authorized if they own the hackathon (Hackathon.owner_email)
//     OR have a 'host' membership row.
//   - Otherwise a Hackathon_Membership row (hackathon_id, email, role) must exist.
// Throws HttpError(403) / HttpError(400) on failure.
async function assertMembership(conn, caller, hackathonId, requiredRole) {
  if (!hackathonId) throw new HttpError(400, 'Missing hackathon id');
  if (!caller || !caller.email) throw new HttpError(401, 'Unauthenticated');
  if (isAdmin(caller)) return true;

  if (requiredRole === 'host') {
    const [rows] = await conn.execute(
      `SELECT 1 FROM Hackathon WHERE hackathon_id = ? AND owner_email = ?
       UNION
       SELECT 1 FROM Hackathon_Membership WHERE hackathon_id = ? AND email_address = ? AND role = 'host' LIMIT 1`,
      [hackathonId, caller.email, hackathonId, caller.email]
    );
    if (rows.length === 0) throw new HttpError(403, 'Not a host of this hackathon');
    return true;
  }

  const [rows] = await conn.execute(
    'SELECT 1 FROM Hackathon_Membership WHERE hackathon_id = ? AND email_address = ? AND role = ? LIMIT 1',
    [hackathonId, caller.email, requiredRole]
  );
  if (rows.length === 0) throw new HttpError(403, `Not a ${requiredRole} of this hackathon`);
  return true;
}

module.exports = {
  HttpError,
  respond,
  getConnection,
  getDbCredentials,
  getCaller,
  isAdmin,
  resolveHackathonId,
  assertMembership,
  CORS_HEADERS,
};

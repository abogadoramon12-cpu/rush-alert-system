const fs = require("fs");
const path = require("path");

const dataDirectory = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "database"
);

const dataFile = path.join(
  dataDirectory,
  "audit-log.json"
);


/* =====================================================
   STORAGE
===================================================== */

function ensureStorage() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, {
      recursive: true,
    });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(
      dataFile,
      "[]",
      "utf8"
    );
  }
}


/* =====================================================
   READ LOGS
===================================================== */

function readLogs() {
  ensureStorage();

  try {
    const content =
      fs.readFileSync(
        dataFile,
        "utf8"
      );

    const logs =
      JSON.parse(content);

    return Array.isArray(logs)
      ? logs
      : [];

  } catch (error) {
    return [];
  }
}


/* =====================================================
   WRITE LOGS
===================================================== */

function writeLogs(logs) {
  ensureStorage();

  fs.writeFileSync(
    dataFile,
    JSON.stringify(
      logs,
      null,
      2
    ),
    "utf8"
  );
}


/* =====================================================
   CREATE AUDIT LOG
===================================================== */

function createAuditLog({
  alertId,
  pccId,
  coordinator,
  event,
  timestamp = new Date(),
  details = {},
}) {

  const logs = readLogs();

  const log = {
    id:
      "log-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2, 8),

    alertId,
    pccId,
    coordinator,
    event,

    timestamp:
      timestamp instanceof Date
        ? timestamp.toISOString()
        : timestamp,

    details,
  };

  logs.push(log);

  writeLogs(logs);

  return log;
}


/* =====================================================
   GET ALL AUDIT LOGS
===================================================== */

function getAllAuditLogs() {
  return readLogs().sort(
    (a, b) =>
      new Date(b.timestamp) -
      new Date(a.timestamp)
  );
}


/* =====================================================
   GET AUDIT LOGS FOR PCC
===================================================== */

function getAuditLogsForPcc(pccId) {
  return getAllAuditLogs().filter(
    (log) =>
      log.pccId === pccId
  );
}


/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  createAuditLog,
  getAllAuditLogs,
  getAuditLogsForPcc,
};


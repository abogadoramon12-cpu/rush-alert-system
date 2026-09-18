const fs = require("fs");
const path = require("path");

const dataDirectory =
  path.join(__dirname, "..", "..", "..", "database");

const dataFile =
  path.join(
    dataDirectory,
    "rush-alerts.json"
  );

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

function readRushes() {
  ensureStorage();

  try {
    const content =
      fs.readFileSync(
        dataFile,
        "utf8"
      );

    const rushes =
      JSON.parse(content);

    return Array.isArray(rushes)
      ? rushes
      : [];
  } catch (error) {
    console.error(
      "Unable to read rush storage:",
      error
    );

    return [];
  }
}

function writeRushes(rushes) {
  ensureStorage();

  fs.writeFileSync(
    dataFile,
    JSON.stringify(
      rushes,
      null,
      2
    ),
    "utf8"
  );
}

function addRushes(alerts) {
  if (!Array.isArray(alerts)) {
    return {
      newAlerts: [],
      existingAlerts: [],
    };
  }

  const rushes = readRushes();

  const newAlerts = [];
  const existingAlerts = [];

  alerts.forEach((incomingAlert) => {
    const existingIndex =
      rushes.findIndex(
        (existingAlert) =>
          existingAlert.fingerprint ===
          incomingAlert.fingerprint
      );

    if (
      existingIndex !== -1
    ) {
      existingAlerts.push(
        rushes[existingIndex]
      );

      return;
    }

    rushes.push(
      incomingAlert
    );

    newAlerts.push(
      incomingAlert
    );
  });

  writeRushes(rushes);

  return {
    newAlerts,
    existingAlerts,
  };
}

function getAllRushes() {
  return readRushes();
}

function getRushesForPcc(pccId) {
  return readRushes().filter(
    (alert) =>
      alert.pccId === pccId
  );
}

function getRushById(id) {
  return (
    readRushes().find(
      (alert) =>
        alert.id === id
    ) || null
  );
}

function acknowledgeRush(id) {
  const rushes =
    readRushes();

  const index =
    rushes.findIndex(
      (alert) =>
        alert.id === id
    );

  if (index === -1) {
    return null;
  }

  rushes[index] = {
    ...rushes[index],
    status:
      "ACKNOWLEDGED",
    acknowledgedAt:
      new Date().toISOString(),
  };

  writeRushes(rushes);

  return rushes[index];
}

function completeRush(id) {
  const rushes =
    readRushes();

  const index =
    rushes.findIndex(
      (alert) =>
        alert.id === id
    );

  if (index === -1) {
    return null;
  }

  rushes[index] = {
    ...rushes[index],
    status:
      "COMPLETED",
    completedAt:
      new Date().toISOString(),
  };

  writeRushes(rushes);

  return rushes[index];
}

module.exports = {
  addRushes,
  getAllRushes,
  getRushesForPcc,
  getRushById,
  acknowledgeRush,
  completeRush,
};

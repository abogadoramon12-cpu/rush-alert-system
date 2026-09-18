const crypto = require("crypto");

const RushAlert = require("../models/rushAlert");

function isRushReminder(text) {
  if (!text) {
    return false;
  }

  const value = String(text).trim();

  // Explicit negative rush indicators.
  if (/rush\s*:\s*false\b/i.test(value)) {
    return false;
  }

  if (/\bno\s+rush\b/i.test(value)) {
    return false;
  }

  // Explicit positive rush indicator.
  if (/rush\s*:\s*true\b/i.test(value)) {
    return true;
  }

  // Detect actual rush wording.
  return /\brush\b/i.test(value);
}

function createFingerprint(data) {
  const source = [
    data.date,
    data.coordinator,
    data.action,
    data.fileType,
    data.orderType,
    data.reminderDate,
    data.patientName,
    data.patientState,
    data.fileActivityNote,
    data.queue,
    data.reason,
    data.clientName,
    data.billerCollector,
  ]
    .map((value) =>
      String(value ?? "")
        .trim()
        .toLowerCase()
    )
    .join("|");

  return crypto
    .createHash("sha256")
    .update(source)
    .digest("hex");
}

function detectRushAlerts(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("Rows must be an array.");
  }

  const alerts = [];

  rows.forEach((row, index) => {
    const date = row["Date"] || "";
    const name = row["Name"] || "";
    const action = row["Action(s)"] || "";
    const fileType = row["File Type"] || "";

    const orderType =
      row["Order Type ↕"] ||
      row["Order Type"] ||
      "";

    const reminderDate =
      row["Reminder Date ↕"] ||
      row["Reminder Date"] ||
      "";

    const patientName =
      row["Patient Name ↕"] ||
      row["Patient Name"] ||
      "";

    const patientState =
      row["Patient State ↕"] ||
      row["Patient State"] ||
      "";

    const fileActivityNote =
      row["File Activity Note ↑"] ||
      row["File Activity Note"] ||
      "";

    const queue =
      row["Queue ↕"] ||
      row["Queue"] ||
      "";

    const reason =
      row["Reason ↕"] ||
      row["Reason"] ||
      "";

    const clientName =
      row["Client Name ↕"] ||
      row["Client Name"] ||
      "";

    const billerCollector =
      row["Biller/Collector ↕"] ||
      row["Biller/Collector"] ||
      "";

    // Rush detection ONLY uses File Activity Note.
    if (!isRushReminder(fileActivityNote)) {
      return;
    }

    const fingerprint =
      createFingerprint({
        date,
        coordinator: name,
        action,
        fileType,
        orderType,
        reminderDate,
        patientName,
        patientState,
        fileActivityNote,
        queue,
        reason,
        clientName,
        billerCollector,
      });

    const detectedAt = new Date();

    const deadline = new Date(
      detectedAt.getTime() +
        60 * 60 * 1000
    );

    const alert =
      new RushAlert({
        id:
          "rush-" +
          fingerprint,
        date,
        coordinator: name,
        reminder: fileActivityNote,
        detectedAt,
        deadline,
      });

    alert.fingerprint =
      fingerprint;

    alert.action = action;
    alert.fileType = fileType;
    alert.orderType = orderType;
    alert.reminderDate = reminderDate;
    alert.patientName = patientName;
    alert.patientState = patientState;
    alert.queue = queue;
    alert.reason = reason;
    alert.clientName = clientName;
    alert.billerCollector =
      billerCollector;

    alerts.push(alert);
  });

  return alerts;
}

module.exports = {
  isRushReminder,
  createFingerprint,
  detectRushAlerts,
};

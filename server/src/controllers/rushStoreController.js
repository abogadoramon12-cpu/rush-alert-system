const {
  getAllRushes,
  getRushesForPcc,
  acknowledgeRush,
  completeRush,
} = require("../services/rushStore");

const { 
  createAuditLog,
} = require("../services/auditLogStore");


/* =====================================================
   GET ALL RUSHES
===================================================== */

function getAllRushesController(req, res) {
  return res.status(200).json({
    success: true,
    count: getAllRushes().length,
    alerts: getAllRushes(),
  });
}


/* =====================================================
   GET RUSHES FOR PCC
===================================================== */

function getPccRushesController(req, res) {
  const { pccId } = req.params;

  return res.status(200).json({
    success: true,
    pccId,
    alerts: getRushesForPcc(pccId),
  });
}


/* =====================================================
   ACKNOWLEDGE RUSH
===================================================== */

function acknowledgeRushController(req, res) {
  const { id } = req.params;

  const alert =
    acknowledgeRush(id);

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: "Rush alert not found.",
    });
  }


  /* -----------------------------------------------------
     CREATE AUDIT LOG
  ----------------------------------------------------- */

  const auditLog = createAuditLog({
    alertId: alert.id,
    pccId: alert.pccId,
    coordinator: alert.coordinator,
    event: "ACKNOWLEDGED",
    timestamp: alert.acknowledgedAt,

    details: {
      patientName:
        alert.patientName,

      reminder:
        alert.reminder,

      detectedAt:
        alert.detectedAt,
    },
  });


  /* -----------------------------------------------------
     SOCKET.IO
  ----------------------------------------------------- */

  const io =
    req.app.get("io");

  if (io) {

    /*
     * Notify supervisors that the rush itself changed.
     */
    io.to("supervisors").emit(
      "rush:updated",
      alert
    );


    /*
     * Notify the PCC that owns the rush.
     */
    if (alert.pccId) {

      io.to(
        "pcc:" + alert.pccId
      ).emit(
        "rush:updated",
        alert
      );

    }


    /*
     * Send the NEW AUDIT EVENT to supervisors.
     */
    io.to("supervisors").emit(
      "audit:new",
      auditLog
    );

  }


  /* -----------------------------------------------------
     RESPONSE
  ----------------------------------------------------- */

  return res.status(200).json({
    success: true,
    alert,
  });
}


/* =====================================================
   COMPLETE RUSH
===================================================== */

function completeRushController(req, res) {
  const { id } = req.params;

  const alert =
    completeRush(id);

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: "Rush alert not found.",
    });
  }


  /* -----------------------------------------------------
     CALCULATE COMPLETION DURATION
  ----------------------------------------------------- */

  const completedAt =
    new Date(
      alert.completedAt
    );

  const detectedAt =
    new Date(
      alert.detectedAt
    );

  const completionDurationMs =
    completedAt.getTime() -
    detectedAt.getTime();

  const completionDurationSeconds =
    Math.max(
      0,
      Math.floor(
        completionDurationMs / 1000
      )
    );


  /* -----------------------------------------------------
     CREATE AUDIT LOG
  ----------------------------------------------------- */

  const auditLog = createAuditLog({
    alertId: alert.id,
    pccId: alert.pccId,
    coordinator: alert.coordinator,
    event: "COMPLETED",
    timestamp: alert.completedAt,

    details: {
      patientName:
        alert.patientName,

      reminder:
        alert.reminder,

      detectedAt:
        alert.detectedAt,

      completionDurationSeconds,
    },
  });


  /* -----------------------------------------------------
     SOCKET.IO
  ----------------------------------------------------- */

  const io =
    req.app.get("io");

  if (io) {

    /*
     * Notify supervisors that the rush itself changed.
     */
    io.to("supervisors").emit(
      "rush:updated",
      alert
    );


    /*
     * Notify the PCC that owns the rush.
     */
    if (alert.pccId) {

      io.to(
        "pcc:" + alert.pccId
      ).emit(
        "rush:updated",
        alert
      );

    }


    /*
     * Send the NEW AUDIT EVENT to supervisors.
     */
    io.to("supervisors").emit(
      "audit:new",
      auditLog
    );

  }


  /* -----------------------------------------------------
     RESPONSE
  ----------------------------------------------------- */

  return res.status(200).json({
    success: true,
    alert,
  });
}


/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  getAllRushesController,
  getPccRushesController,
  acknowledgeRushController,
  completeRushController,
};


const {
  getAllRushes,
  getRushesForPcc,
  acknowledgeRush,
  completeRush,
} = require("../services/rushStore");

function getAllRushesController(req, res) {
  return res.status(200).json({
    success: true,
    count: getAllRushes().length,
    alerts: getAllRushes(),
  });
}

function getPccRushesController(req, res) {
  const { pccId } = req.params;

  return res.status(200).json({
    success: true,
    pccId,
    alerts: getRushesForPcc(pccId),
  });
}

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

  const io =
    req.app.get("io");

  if (io) {
    io.to("supervisors").emit(
      "rush:updated",
      alert
    );

    if (alert.pccId) {
      io.to(
        "pcc:" + alert.pccId
      ).emit(
        "rush:updated",
        alert
      );
    }
  }

  return res.status(200).json({
    success: true,
    alert,
  });
}

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

  const io =
    req.app.get("io");

  if (io) {
    io.to("supervisors").emit(
      "rush:updated",
      alert
    );

    if (alert.pccId) {
      io.to(
        "pcc:" + alert.pccId
      ).emit(
        "rush:updated",
        alert
      );
    }
  }

  return res.status(200).json({
    success: true,
    alert,
  });
}

module.exports = {
  getAllRushesController,
  getPccRushesController,
  acknowledgeRushController,
  completeRushController,
};

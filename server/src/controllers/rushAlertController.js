const {
  detectRushAlerts,
} = require("../services/rushDetector");

function detectRushAlertsController(req, res) {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        message: "Rows must be an array.",
      });
    }

    const alerts = detectRushAlerts(rows);

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error("Rush detection error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to detect rush alerts.",
    });
  }
}

module.exports = {
  detectRushAlertsController,
};

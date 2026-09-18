const {
  getAllAuditLogs,
  getAuditLogsForPcc,
} = require("../services/auditLogStore");

function getAllAuditLogsController(req, res) {
  const logs = getAllAuditLogs();

  return res.status(200).json({
    success: true,
    count: logs.length,
    logs,
  });
}

function getPccAuditLogsController(req, res) {
  const { pccId } = req.params;

  const logs =
    getAuditLogsForPcc(pccId);

  return res.status(200).json({
    success: true,
    pccId,
    count: logs.length,
    logs,
  });
}

module.exports = {
  getAllAuditLogsController,
  getPccAuditLogsController,
};
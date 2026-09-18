const express = require("express");

const {
  getAllAuditLogsController,
  getPccAuditLogsController,
} = require("../controllers/auditLogController");

const router = express.Router();

router.get(
  "/",
  getAllAuditLogsController
);

router.get(
  "/pcc/:pccId",
  getPccAuditLogsController
);

module.exports = router;
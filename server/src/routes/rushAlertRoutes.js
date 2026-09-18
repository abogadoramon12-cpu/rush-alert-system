const express = require("express");

const {
  detectRushAlertsController,
} = require("../controllers/rushAlertController");

const router = express.Router();

router.post("/detect", detectRushAlertsController);

module.exports = router;

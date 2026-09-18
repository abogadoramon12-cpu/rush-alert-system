const express = require("express");

const {
  getAllRushesController,
  getPccRushesController,
  acknowledgeRushController,
  completeRushController,
} = require("../controllers/rushStoreController");

const router = express.Router();

router.get(
  "/",
  getAllRushesController
);

router.get(
  "/pcc/:pccId",
  getPccRushesController
);

router.patch(
  "/:id/acknowledge",
  acknowledgeRushController
);

router.patch(
  "/:id/complete",
  completeRushController
);

module.exports = router;

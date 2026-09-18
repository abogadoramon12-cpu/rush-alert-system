const express = require("express");
const multer = require("multer");

const {
  uploadSpreadsheetController,
} = require("../controllers/uploadController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post(
  "/spreadsheet",
  upload.single("file"),
  uploadSpreadsheetController
);

module.exports = router;

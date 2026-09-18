const XLSX = require("xlsx");

const {
  detectRushAlerts,
} = require("../services/rushDetector");

const {
  addRushes,
} = require("../services/rushStore");

const {
  findPccByName,
} = require("../config/pccUsers");

function uploadSpreadsheetController(
  req,
  res
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload an Excel or CSV file.",
      });
    }

    const workbook =
      XLSX.read(
        req.file.buffer,
        {
          type: "buffer",
          cellDates: true,
        }
      );

    const sheetName =
      workbook.SheetNames[0];

    const worksheet =
      workbook.Sheets[
        sheetName
      ];

    const rows =
      XLSX.utils.sheet_to_json(
        worksheet,
        {
          defval: "",
        }
      );

    const detectedAlerts =
      detectRushAlerts(
        rows
      );

    const assignedAlerts =
      detectedAlerts.map(
        (alert) => {
          const pcc =
            findPccByName(
              alert.coordinator
            );

          if (!pcc) {
            return {
              ...alert,
              pccId: null,
              pccEmail: null,
            };
          }

          return {
            ...alert,
            pccId: pcc.id,
            pccEmail:
              pcc.email,
          };
        }
      );

    /*
      addRushes() checks the persistent
      server storage.

      Existing rush:
        - NOT duplicated
        - original deadline preserved
        - original status preserved

      New rush:
        - saved permanently
        - emitted to PCC
        - emitted to supervisors
    */

    const {
      newAlerts,
      existingAlerts,
    } =
      addRushes(
        assignedAlerts
      );

    const io =
      req.app.get("io");

    const notifications = [];

    newAlerts.forEach(
      (alert) => {
        const pcc =
          findPccByName(
            alert.coordinator
          );

        if (!pcc) {
          console.log(
            "No PCC account found for:",
            alert.coordinator
          );

          notifications.push({
            alertId:
              alert.id,
            coordinator:
              alert.coordinator,
            delivered:
              false,
            duplicate:
              false,
            reason:
              "No matching PCC account.",
          });

          return;
        }

        if (!io) {
          console.log(
            "Socket.IO is not available."
          );

          notifications.push({
            alertId:
              alert.id,
            coordinator:
              alert.coordinator,
            delivered:
              false,
            duplicate:
              false,
            reason:
              "Socket.IO unavailable.",
          });

          return;
        }

        const room =
          "pcc:" +
          pcc.id;

        io.to(room).emit(
          "rush:new",
          alert
        );

        io.to(
          "supervisors"
        ).emit(
          "rush:new",
          alert
        );

        console.log(
          "NEW rush alert sent to:",
          pcc.name,
          "?",
          room
        );

        notifications.push({
          alertId:
            alert.id,
          coordinator:
            alert.coordinator,
          pccId:
            pcc.id,
          delivered:
            true,
          duplicate:
            false,
        });
      }
    );

    existingAlerts.forEach(
      (alert) => {
        notifications.push({
          alertId:
            alert.id,
          coordinator:
            alert.coordinator,
          pccId:
            alert.pccId,
          delivered:
            false,
          duplicate:
            true,
          reason:
            "This rush already exists and was not duplicated.",
        });
      }
    );

    return res.status(200).json({
      success: true,

      fileName:
        req.file.originalname,

      sheetName,

      totalRows:
        rows.length,

      rushCount:
        assignedAlerts.length,

      newRushCount:
        newAlerts.length,

      duplicateRushCount:
        existingAlerts.length,

      alerts:
        assignedAlerts,

      notifications,
    });

  } catch (error) {
    console.error(
      "Spreadsheet upload error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process spreadsheet.",
    });
  }
}

module.exports = {
  uploadSpreadsheetController,
};

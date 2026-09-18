const XLSX = require("xlsx");

const rows = [
  {
    "Date": "09/18/2026",
    "Name": "Harry Mangubat",
    "Action(s)": "Review rush request",
    "Red": "Yes",
    "Yellow": "",
    "File Type": "New Intake",
    "Order Type ?": "Transport",
    "Reminder Date ?": "09/18/2026",
    "Patient Name ?": "TEST EXCEL PATIENT",
    "Patient State ?": "CO",
    "File Activity Note ?": "RUSH - New Intake : Excel Upload Test",
    "Queue ?": "Rush",
    "Reason ?": "Transport",
    "Client Name ?": "TEST CLIENT",
    "Biller/Collector ?": "Test Biller"
  },
  {
    "Date": "09/18/2026",
    "Name": "John Cruz",
    "Action(s)": "Regular follow-up",
    "Red": "",
    "Yellow": "",
    "File Type": "Documentation",
    "Order Type ?": "Standard",
    "Reminder Date ?": "09/18/2026",
    "Patient Name ?": "REGULAR PATIENT",
    "Patient State ?": "TX",
    "File Activity Note ?": "Routine follow-up - no rush",
    "Queue ?": "Standard",
    "Reason ?": "Follow-up",
    "Client Name ?": "REGULAR CLIENT",
    "Biller/Collector ?": "Regular Biller"
  }
];

const worksheet =
  XLSX.utils.json_to_sheet(rows);

const workbook =
  XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
  workbook,
  worksheet,
  "Reminder Bucket"
);

XLSX.writeFile(
  workbook,
  "test-pcc-rush.xlsx"
);

console.log(
  "Created test-pcc-rush.xlsx"
);

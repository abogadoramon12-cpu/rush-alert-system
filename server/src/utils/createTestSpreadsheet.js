const XLSX = require("xlsx");

const rows = [
  {
    Date: "09/18/2026",
    "Care Coordinator": "Maria Santos",
    Reminder: "RUSH - New Intake",
  },
  {
    Date: "09/18/2026",
    "Care Coordinator": "John Cruz",
    Reminder: "Follow up with client",
  },
  {
    Date: "09/18/2026",
    "Care Coordinator": "Anna Reyes",
    Reminder: "RUSH/New Intake - DOS 09/19",
  },
  {
    Date: "09/18/2026",
    "Care Coordinator": "Pedro Garcia",
    Reminder: "Regular documentation follow-up",
  },
];

const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
  workbook,
  worksheet,
  "Reminders"
);

XLSX.writeFile(
  workbook,
  "test-rush-reminders.xlsx"
);

console.log("Test spreadsheet created successfully.");

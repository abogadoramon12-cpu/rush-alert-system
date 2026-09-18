const {
  detectRushAlerts,
} = require("../services/rushDetector");

const testRows = [
  {
    date: "09/18/2026",
    coordinator: "Maria Santos",
    reminder: "RUSH - New Intake",
  },
  {
    date: "09/18/2026",
    coordinator: "John Cruz",
    reminder: "Follow up with client",
  },
  {
    date: "09/18/2026",
    coordinator: "Anna Reyes",
    reminder: "RUSH/New Intake - DOS 09/19",
  },
];

const alerts = detectRushAlerts(testRows);

console.log("\nDetected Rush Alerts:");
console.log("----------------------");

alerts.forEach((alert) => {
  console.log({
    id: alert.id,
    coordinator: alert.coordinator,
    reminder: alert.reminder,
    status: alert.status,
    deadline: alert.deadline,
  });
});

console.log(`\nTotal rush alerts: ${alerts.length}`);

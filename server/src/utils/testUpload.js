const fs = require("fs");

async function testUpload() {
  const file = fs.readFileSync("test-rush-reminders.xlsx");

  const formData = new FormData();

  const blob = new Blob(
    [file],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );

  formData.append(
    "file",
    blob,
    "test-rush-reminders.xlsx"
  );

  const response = await fetch(
    "http://localhost:5000/api/upload/spreadsheet",
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.text();

  console.log("\nUpload API Response:");
  console.log("--------------------");
  console.log(result);
}

testUpload().catch((error) => {
  console.error("\nUpload test failed:");
  console.error(error);
});

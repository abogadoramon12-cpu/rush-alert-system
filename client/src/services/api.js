const API_URL = "http://localhost:5000/api";

export async function checkServerHealth() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error("Unable to connect to the Rush Alert server.");
  }

  return response.json();
}

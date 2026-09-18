import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import App from "./App";
import PccDashboard from "./pages/PccDashboard";

function RouterApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />

        <Route path="/pcc/:pccId" element={<PccDashboard />} />

        <Route
          path="*"
          element={
            <div
              style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                background: "#090b0f",
                color: "white",
                fontFamily: "system-ui",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <h1>Page Not Found</h1>

                <Link
                  to="/"
                  style={{
                    color: "#ef4444",
                  }}
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default RouterApp;

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

function formatRemaining(deadline) {
  const difference =
    new Date(deadline).getTime() -
    Date.now();

  if (difference <= 0) {
    return "00:00:00";
  }

  const totalSeconds =
    Math.floor(difference / 1000);

  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  return [
    hours,
    minutes,
    seconds,
  ]
    .map((value) =>
      String(value).padStart(2, "0")
    )
    .join(":");
}

function App() {
  const [file, setFile] = useState(null);

  const [alerts, setAlerts] =
    useState([]);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [currentTime, setCurrentTime] =
    useState(Date.now());

  const [socketConnected, setSocketConnected] =
    useState(false);

  /*
   * Keep the countdown updating every second.
   *
   * The actual deadline comes from the server,
   * so refreshing the browser does NOT reset it.
   */
  useEffect(() => {
    const timer =
      setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);

    return () =>
      clearInterval(timer);
  }, []);

  /*
   * Load persisted rushes from the server.
   *
   * This is what makes the dashboard survive
   * browser refreshes.
   */
  async function loadRushes() {
    try {
      const response =
        await fetch(
          "http://localhost:5000/api/rush-store"
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load rush requests."
        );
      }

      if (
        data.success &&
        Array.isArray(data.alerts)
      ) {
        const activeRushes =
          data.alerts.filter(
            (alert) =>
              alert.status !==
              "COMPLETED"
          );

        setAlerts(activeRushes);
      }
    } catch (loadError) {
      console.error(
        "Unable to load persisted rushes:",
        loadError
      );

      setError(
        "Unable to load saved rush requests."
      );
    }
  }

  /*
   * Connect the supervisor dashboard
   * to the real-time Rush Alert server.
   */
  useEffect(() => {
    loadRushes();

    const socket =
      io("http://localhost:5000");

    socket.on("connect", () => {
      console.log(
        "Connected to Rush Alert server:",
        socket.id
      );

      setSocketConnected(true);

      socket.emit(
        "supervisor:join"
      );
    });

    /*
     * Only NEW rushes are added here.
     *
     * Duplicate uploads never emit rush:new
     * because the backend rejects duplicates.
     */
    socket.on(
      "rush:new",
      (alert) => {
        console.log(
          "NEW RUSH:",
          alert
        );

        setAlerts(
          (currentAlerts) => {
            const exists =
              currentAlerts.some(
                (existingAlert) =>
                  existingAlert.id ===
                  alert.id
              );

            if (exists) {
              return currentAlerts;
            }

            return [
              alert,
              ...currentAlerts,
            ];
          }
        );
      }
    );

    /*
     * Receive acknowledge/complete updates
     * from PCC dashboards.
     */
    socket.on(
      "rush:updated",
      (alert) => {
        setAlerts(
          (currentAlerts) => {
            if (
              alert.status ===
              "COMPLETED"
            ) {
              return currentAlerts.filter(
                (existingAlert) =>
                  existingAlert.id !==
                  alert.id
              );
            }

            return currentAlerts.map(
              (existingAlert) =>
                existingAlert.id ===
                alert.id
                  ? alert
                  : existingAlert
            );
          }
        );
      }
    );

    socket.on(
      "disconnect",
      () => {
        console.log(
          "Disconnected from Rush Alert server"
        );

        setSocketConnected(false);
      }
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  async function handleUpload() {
    if (!file) {
      setError(
        "Please select an Excel or CSV file."
      );

      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "http://localhost:5000/api/upload/spreadsheet",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Upload failed."
        );
      }

      /*
       * IMPORTANT:
       *
       * Do NOT use data.alerts here.
       *
       * data.alerts contains everything detected
       * in the uploaded spreadsheet, including
       * rushes that may already exist.
       *
       * Instead, reload the persisted server state.
       */
      await loadRushes();

      console.log(
        "Upload complete:",
        {
          detected:
            data.rushCount,
          new:
            data.newRushCount,
          duplicates:
            data.duplicateRushCount,
        }
      );

      /*
       * Allow selecting the same file again.
       */
      setFile(null);
    } catch (uploadError) {
      console.error(
        "Upload error:",
        uploadError
      );

      setError(
        uploadError.message
      );
    } finally {
      setUploading(false);
    }
  }

  async function acknowledgeAlert(id) {
    try {
      const response =
        await fetch(
          `http://localhost:5000/api/rush-store/${id}/acknowledge`,
          {
            method: "PATCH",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to acknowledge rush."
        );
      }

      if (
        data.success &&
        data.alert
      ) {
        setAlerts(
          (currentAlerts) =>
            currentAlerts.map(
              (alert) =>
                alert.id === id
                  ? data.alert
                  : alert
            )
        );
      }
    } catch (actionError) {
      console.error(
        "Acknowledge error:",
        actionError
      );

      setError(
        actionError.message
      );
    }
  }

  async function completeAlert(id) {
    try {
      const response =
        await fetch(
          `http://localhost:5000/api/rush-store/${id}/complete`,
          {
            method: "PATCH",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to complete rush."
        );
      }

      if (
        data.success &&
        data.alert
      ) {
        setAlerts(
          (currentAlerts) =>
            currentAlerts.filter(
              (alert) =>
                alert.id !== id
            )
        );
      }
    } catch (actionError) {
      console.error(
        "Complete error:",
        actionError
      );

      setError(
        actionError.message
      );
    }
  }

  const activeAlerts =
    alerts.filter(
      (alert) =>
        alert.status !==
        "COMPLETED"
    );

  const activeCount =
    activeAlerts.length;

  /*
   * currentTime is intentionally referenced here.
   * This causes the cards to re-render every second
   * and keeps the countdown live.
   */
  void currentTime;

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            R
          </div>

          <div>
            <strong>
              Rush Alert
            </strong>

            <span>
              Operations Dashboard
            </span>
          </div>
        </div>

        <div className="system-status">
          <span
            className={
              socketConnected
                ? "status-dot"
                : "status-dot offline"
            }
          ></span>

          {socketConnected
            ? "System Online"
            : "Connecting..."}
        </div>
      </header>

      <main className="dashboard-content">
        <section className="hero">
          <div>
            <p className="eyebrow">
              RUSH MONITORING
            </p>

            <h1>
              Stay ahead of every
              <span>
                {" "}urgent request.
              </span>
            </h1>

            <p className="hero-description">
              Upload today's reminder sheet and
              automatically identify requests that
              require immediate attention.
            </p>
          </div>

          <div className="rush-counter">
            <span>
              ACTIVE RUSH
            </span>

            <strong>
              {activeCount}
            </strong>

            <small>
              requests requiring attention
            </small>
          </div>
        </section>

        <section className="upload-panel">
          <div>
            <p className="panel-label">
              IMPORT REMINDERS
            </p>

            <h2>
              Upload today's spreadsheet
            </h2>

            <p>
              Supported formats: XLSX, XLS, CSV
            </p>
          </div>

          <div className="upload-controls">
            <label className="file-button">
              Choose File

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => {
                  setFile(
                    event.target.files[0] ||
                      null
                  );

                  setError("");
                }}
              />
            </label>

            <span className="file-name">
              {file
                ? file.name
                : "No file selected"}
            </span>

            <button
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading
                ? "Processing..."
                : "Detect Rush"}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </section>

        <section className="alerts-section">
          <div className="section-header">
            <div>
              <p className="panel-label">
                LIVE QUEUE
              </p>

              <h2>
                Rush Requests
              </h2>
            </div>

            <span className="queue-count">
              {activeCount} ACTIVE
            </span>
          </div>

          {activeAlerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                ✓
              </div>

              <h3>
                No active rush requests
              </h3>

              <p>
                Upload a reminder spreadsheet to
                begin monitoring.
              </p>
            </div>
          ) : (
            <div className="alerts-grid">
              {activeAlerts.map(
                (alert) => {
                  const remaining =
                    formatRemaining(
                      alert.deadline
                    );

                  const acknowledged =
                    alert.status ===
                    "ACKNOWLEDGED";

                  return (
                    <article
                      className={
                        acknowledged
                          ? "rush-card acknowledged"
                          : "rush-card"
                      }
                      key={
                        alert.id
                      }
                    >
                      <div className="rush-card-top">
                        <span className="rush-badge">
                          RUSH
                        </span>

                        <span
                          className={
                            acknowledged
                              ? "active-label acknowledged"
                              : "active-label"
                          }
                        >
                          ●{" "}
                          {acknowledged
                            ? "ACKNOWLEDGED"
                            : "ACTIVE"}
                        </span>
                      </div>

                      <div className="rush-card-body">
                        <p className="coordinator-label">
                          CARE COORDINATOR
                        </p>

                        <h3>
                          {
                            alert.coordinator
                          }
                        </h3>

                        <p className="reminder">
                          {
                            alert.reminder
                          }
                        </p>

                        <div className="rush-details">
                          <div>
                            <span>
                              PATIENT
                            </span>

                            <strong>
                              {
                                alert.patientName ||
                                "—"
                              }
                            </strong>
                          </div>

                          <div>
                            <span>
                              CLIENT
                            </span>

                            <strong>
                              {
                                alert.clientName ||
                                "—"
                              }
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="deadline">
                        <span>
                          SLA TIME REMAINING
                        </span>

                        <strong>
                          {remaining}
                        </strong>

                        <small>
                          1 hour from detection
                        </small>
                      </div>

                      <div className="rush-card-footer">
                        {!acknowledged && (
                          <button
                            className="secondary-button"
                            onClick={() =>
                              acknowledgeAlert(
                                alert.id
                              )
                            }
                          >
                            Acknowledge
                          </button>
                        )}

                        <button
                          className="primary-button"
                          onClick={() =>
                            completeAlert(
                              alert.id
                            )
                          }
                        >
                          Complete
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;

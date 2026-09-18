import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import API_URL from "../services/api";
import "./SupervisorDashboard.css";

const PCC_USERS = {
  "pcc-harry-mangubat": {
    name: "Harry Mangubat",
    initial: "H",
  },
  "pcc-ian-jasper-abatayo": {
    name: "Ian Jasper Abatayo",
    initial: "I",
  },
  "pcc-ma-cecilia-quipman": {
    name: "Ma Cecilia Quipman",
    initial: "M",
  },
  "pcc-junnel-delvo": {
    name: "Junnel Delvo",
    initial: "J",
  },
  "pcc-ralph-go": {
    name: "Ralph Go",
    initial: "R",
  },
  "pcc-jason-rosco": {
    name: "Jason Rosco",
    initial: "J",
  },
  "pcc-jose-nuena": {
    name: "Jose Nuena",
    initial: "J",
  },
  "pcc-jeneev-pearl-hekin": {
    name: "Jeneev Pearl Hekin",
    initial: "J",
  },
  "pcc-michael-jul-contratista": {
    name: "Michael Jul Contratista",
    initial: "M",
  },
  "pcc-abigail-basera": {
    name: "Abigail Basera",
    initial: "A",
  },
  "pcc-juvie-cagande": {
    name: "Juvie Cagande",
    initial: "J",
  },
  "pcc-reyza-cuerbo": {
    name: "Reyza Cuerbo",
    initial: "R",
  },
  "pcc-daryl-acera": {
    name: "Daryl Acera",
    initial: "D",
  },
};

const EVENT_TYPES = [
  "ALL",
  "RUSH_RECEIVED",
  "ACKNOWLEDGED",
  "COMPLETED",
  "SLA_WARNING",
  "SLA_BREACHED",
];

function generateRushDisplayId(log) {
  const requestType = (
    log.orderType ||
    log.requestType ||
    ""
  ).toLowerCase();

  const prefix =
    requestType.includes("translation") ||
    requestType.includes("interpreter") ||
    requestType.includes("interpret")
      ? "INT"
      : "TRN";

  const name = (
    log.patientName ||
    "Unknown Patient"
  )
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");

  const dateValue =
    log.timestamp ||
    log.createdAt ||
    new Date();

  const date = new Date(dateValue);

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const year = date.getFullYear();

  return `${prefix}_${name}_${month}_${day}_${year}`;
}

function SupervisorDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [socketConnected, setSocketConnected] =
    useState(false);

  const [onlinePccs, setOnlinePccs] =
    useState(new Set());

  const [selectedPcc, setSelectedPcc] =
    useState("ALL");

  const [selectedEvent, setSelectedEvent] =
    useState("ALL");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedDate, setSelectedDate] =
    useState("TODAY");

  useEffect(() => {
    document.title = "Rush Alert — Supervisor View";

    return () => {
      document.title = "Rush Alert";
    };
  }, []);

  /* =====================================================
     LOAD RUSHES + AUDIT LOGS
  ===================================================== */

  useEffect(() => {
    fetch(`${API_URL}/api/rush-store`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setAlerts(data.alerts || []);
        }
      })
      .catch(() => {});

    fetch(`${API_URL}/api/audit-logs`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setAuditLogs(
            data.logs ||
              data.auditLogs ||
              data.records ||
              []
          );
        }
      })
      .catch(() => {});
  }, []);

  /* =====================================================
     SOCKET CONNECTION
  ===================================================== */

  useEffect(() => {
    const socket = io(API_URL, {
      transports: [
        "websocket",
        "polling",
      ],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    /* ---------------------------------------------------
       SUPERVISOR CONNECTED
    --------------------------------------------------- */

    const handleConnect = () => {
      setSocketConnected(true);

      socket.emit("supervisor:join");
    };

    /* ---------------------------------------------------
       SUPERVISOR DISCONNECTED
    --------------------------------------------------- */

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    /* ---------------------------------------------------
       NEW RUSH
    --------------------------------------------------- */

    const handleRushNew = (alert) => {
      setAlerts((currentAlerts) => {
        const exists = currentAlerts.some(
          (item) => item.id === alert.id
        );

        if (exists) {
          return currentAlerts;
        }

        return [
          alert,
          ...currentAlerts,
        ];
      });

      refreshAuditLogs();
    };

    /* ---------------------------------------------------
       RUSH UPDATED
    --------------------------------------------------- */

    const handleRushUpdated = (alert) => {
      setAlerts((currentAlerts) =>
        currentAlerts.map((item) =>
          item.id === alert.id
            ? alert
            : item
        )
      );

      refreshAuditLogs();
    };

    /* ---------------------------------------------------
       LIVE AUDIT EVENT
    --------------------------------------------------- */

    const handleAuditNew = (auditLog) => {
      setAuditLogs((currentLogs) => {
        const exists = currentLogs.some(
          (item) => item.id === auditLog.id
        );

        if (exists) {
          return currentLogs;
        }

        return [
          auditLog,
          ...currentLogs,
        ];
      });
    };

    /* ---------------------------------------------------
       PCC ONLINE

       IMPORTANT:
       Backend emits:
       "pcc:online", pccId

       Therefore we receive a STRING,
       not { pccId }.
    --------------------------------------------------- */

    const handlePccOnline = (pccId) => {
      if (!pccId) {
        return;
      }

      setOnlinePccs((current) => {
        const next = new Set(current);

        next.add(pccId);

        return next;
      });
    };

    /* ---------------------------------------------------
       PCC OFFLINE

       Backend emits:
       "pcc:offline", pccId
    --------------------------------------------------- */

    const handlePccOffline = (pccId) => {
      if (!pccId) {
        return;
      }

      setOnlinePccs((current) => {
        const next = new Set(current);

        next.delete(pccId);

        return next;
      });
    };

    /* ---------------------------------------------------
       REGISTER LISTENERS
    --------------------------------------------------- */

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "rush:new",
      handleRushNew
    );

    socket.on(
      "rush:updated",
      handleRushUpdated
    );

    socket.on(
      "audit:new",
      handleAuditNew
    );

    socket.on(
      "pcc:online",
      handlePccOnline
    );

    socket.on(
      "pcc:offline",
      handlePccOffline
    );

    /* ---------------------------------------------------
       CLEANUP
    --------------------------------------------------- */

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "rush:new",
        handleRushNew
      );

      socket.off(
        "rush:updated",
        handleRushUpdated
      );

      socket.off(
        "audit:new",
        handleAuditNew
      );

      socket.off(
        "pcc:online",
        handlePccOnline
      );

      socket.off(
        "pcc:offline",
        handlePccOffline
      );

      socket.disconnect();
    };
  }, []);

  /* =====================================================
     AUDIT LOG REFRESH
  ===================================================== */

  const refreshAuditLogs = () => {
    fetch(`${API_URL}/api/audit-logs`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setAuditLogs(
            data.logs ||
              data.auditLogs ||
              data.records ||
              []
          );
        }
      })
      .catch(() => {});
  };

  const pccList = Object.entries(
    PCC_USERS
  );

  /* =====================================================
     DATE HELPERS
  ===================================================== */

  const isToday = (dateValue) => {
    if (!dateValue) {
      return false;
    }

    const date = new Date(dateValue);
    const today = new Date();

    return (
      date.getFullYear() ===
        today.getFullYear() &&
      date.getMonth() ===
        today.getMonth() &&
      date.getDate() ===
        today.getDate()
    );
  };

  /* =====================================================
     TODAY'S RUSHES
  ===================================================== */

  const todayAlerts = useMemo(() => {
    return alerts.filter((alert) =>
      isToday(alert.detectedAt)
    );
  }, [alerts]);

  /* =====================================================
     KPI DATA
  ===================================================== */

  const activeRushes =
    todayAlerts.filter(
      (alert) =>
        alert.status !== "COMPLETED"
    );

  const acknowledgedRushes =
    todayAlerts.filter(
      (alert) =>
        alert.acknowledgedAt
    );

  const completedRushes =
    todayAlerts.filter(
      (alert) =>
        alert.status === "COMPLETED"
    );

  /* =====================================================
     PCC RUSH COUNT
  ===================================================== */

  const getPccRushCount = (pccId) => {
    return todayAlerts.filter(
      (alert) =>
        alert.pccId === pccId &&
        alert.status !== "COMPLETED"
    ).length;
  };

  /* =====================================================
     EVENT LABEL
  ===================================================== */

  const getEventLabel = (event) => {
    if (!event) {
      return "Unknown Event";
    }

    return event
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  /* =====================================================
     NORMALIZE AUDIT LOG
  ===================================================== */

  const normalizeAuditLog = (
    log,
    index
    ) => {
    return {
        id:
        log.id ||
        log.logId ||
        `${log.alertId || "audit"}-${index}`,

        timestamp:
        log.timestamp ||
        log.createdAt ||
        log.date ||
        null,

        pccId:
        log.pccId ||
        log.coordinatorId ||
        null,

        coordinator:
        log.coordinator ||
        log.pccName ||
        null,

        event:
        log.event ||
        log.type ||
        "UNKNOWN",

        alertId:
        log.alertId ||
        log.rushId ||
        "-",

        patientName:
        log.details?.patientName ||
        log.patientName ||
        log.details?.patient ||
        "Unknown Patient",

        orderType:
        log.details?.orderType ||
        log.orderType ||
        null,

        requestType:
        log.details?.requestType ||
        log.requestType ||
        null,
    };
    };

  /* =====================================================
     TODAY'S AUDIT LOGS
  ===================================================== */

  const todayAuditLogs = useMemo(() => {
    return auditLogs
      .map(normalizeAuditLog)
      .filter((log) =>
        isToday(log.timestamp)
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp) -
          new Date(a.timestamp)
      );
  }, [auditLogs]);

  /* =====================================================
     FILTERED LOGS
  ===================================================== */

  const filteredLogs =
    todayAuditLogs.filter((log) => {
      const matchesPcc =
        selectedPcc === "ALL" ||
        log.pccId === selectedPcc ||
        log.coordinator ===
          PCC_USERS[selectedPcc]?.name;

      const matchesEvent =
        selectedEvent === "ALL" ||
        log.event === selectedEvent;

      const search =
        searchTerm
          .trim()
          .toLowerCase();

      const rushDisplayId =
        generateRushDisplayId(log).toLowerCase();

        const matchesSearch =
        !search ||
        log.patientName
            ?.toLowerCase()
            .includes(search) ||
        log.alertId
            ?.toLowerCase()
            .includes(search) ||
        rushDisplayId.includes(search) ||
        log.coordinator
            ?.toLowerCase()
            .includes(search);

      return (
        matchesPcc &&
        matchesEvent &&
        matchesSearch
      );
    });

  /* =====================================================
     TIME FORMAT
  ===================================================== */

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "--:--:--";
    }

    return new Date(
      timestamp
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="supervisor-dashboard">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="supervisor-header">

        <div className="supervisor-brand">

          <div className="supervisor-brand-mark">
            RA
          </div>

          <div>
            <p className="supervisor-eyebrow">
              OPERATIONS CENTER
            </p>

            <h1>
              Rush Alert Monitoring
            </h1>
          </div>

        </div>

        <div className="supervisor-header-right">

          <div className="supervisor-live-indicator">

            <span
              className={
                socketConnected
                  ? "status-dot online"
                  : "status-dot offline"
              }
            />

            <span>
              {socketConnected
                ? "Live System"
                : "Disconnected"}
            </span>

          </div>

          <div className="supervisor-role">
            SUPERVISOR
          </div>

        </div>

      </header>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="supervisor-layout">

        {/* =================================================
            TEAM MONITOR
        ================================================= */}

        <aside className="pcc-panel">

          <div className="pcc-panel-header">

            <div>

              <p className="panel-eyebrow">
                CARE COORDINATORS
              </p>

              <h2>
                Team Monitor
              </h2>

            </div>

            <span className="team-count">
              {pccList.length}
            </span>

          </div>


          {/* ALL COORDINATORS */}

          <button
            type="button"
            className={`team-filter-row ${
              selectedPcc === "ALL"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              setSelectedPcc("ALL")
            }
          >

            <div className="team-filter-icon">
              #
            </div>

            <div className="team-filter-info">

              <strong>
                All Coordinators
              </strong>

              <span>
                {todayAlerts.length} rushes today
              </span>

            </div>

          </button>


          {/* PCC LIST */}

          <div className="pcc-list">

            {pccList.map(
              ([pccId, pcc]) => {

                const rushCount =
                  getPccRushCount(
                    pccId
                  );

                const isOnline =
                  onlinePccs.has(
                    pccId
                  );

                const isSelected =
                  selectedPcc === pccId;

                return (
                  <button
                    type="button"
                    className={`pcc-row ${
                      isSelected
                        ? "selected"
                        : ""
                    }`}
                    key={pccId}
                    onClick={() =>
                      setSelectedPcc(
                        pccId
                      )
                    }
                  >

                    <div
                      className={`pcc-avatar ${
                        isOnline
                          ? "online"
                          : "offline"
                      }`}
                    >
                      {pcc.initial}
                    </div>

                    <div className="pcc-info">

                      <strong>
                        {pcc.name}
                      </strong>

                      <span>

                        <span
                          className={
                            isOnline
                              ? "status-dot online"
                              : "status-dot offline"
                          }
                        />

                        {isOnline
                          ? "Online"
                          : "Offline"}

                      </span>

                    </div>

                    <div
                      className={`pcc-rush-count ${
                        rushCount > 0
                          ? "has-rush"
                          : ""
                      }`}
                    >
                      {rushCount}
                    </div>

                  </button>
                );
              }
            )}

          </div>

        </aside>


        {/* =================================================
            MAIN WORKSPACE
        ================================================= */}

        <section className="supervisor-main">

          {/* =================================================
              WORKSPACE HEADER
          ================================================= */}

          <div className="workspace-heading">

            <div>

              <p className="workspace-eyebrow">
                DAILY OPERATIONS
              </p>

              <h2>
                Rush Activity Overview
              </h2>

              <p className="workspace-description">
                Monitor incoming rush requests,
                acknowledgements, completions,
                and SLA activity across the team.
              </p>

            </div>

            <div className="today-indicator">
              <span className="today-dot" />
              TODAY
            </div>

          </div>


          {/* =================================================
              KPI CARDS
          ================================================= */}

          <div className="kpi-grid">

            <div className="kpi-card kpi-active">

              <div className="kpi-card-top">

                <span className="kpi-icon">
                  !
                </span>

                <span className="kpi-label">
                  ACTIVE RUSHES
                </span>

              </div>

              <strong>
                {activeRushes.length}
              </strong>

              <span className="kpi-description">
                Currently requiring attention
              </span>

            </div>


            <div className="kpi-card kpi-acknowledged">

              <div className="kpi-card-top">

                <span className="kpi-icon">
                  ✓
                </span>

                <span className="kpi-label">
                  ACKNOWLEDGED
                </span>

              </div>

              <strong>
                {acknowledgedRushes.length}
              </strong>

              <span className="kpi-description">
                Rushes acknowledged today
              </span>

            </div>


            <div className="kpi-card kpi-completed">

              <div className="kpi-card-top">

                <span className="kpi-icon">
                  ✓
                </span>

                <span className="kpi-label">
                  COMPLETED
                </span>

              </div>

              <strong>
                {completedRushes.length}
              </strong>

              <span className="kpi-description">
                Rushes completed today
              </span>

            </div>


            <div className="kpi-card kpi-total">

              <div className="kpi-card-top">

                <span className="kpi-icon">
                  ∑
                </span>

                <span className="kpi-label">
                  TOTAL TODAY
                </span>

              </div>

              <strong>
                {todayAlerts.length}
              </strong>

              <span className="kpi-description">
                Rush requests received today
              </span>

            </div>

          </div>


          {/* =================================================
              ACTIVITY CONSOLE
          ================================================= */}

          <section className="activity-panel">

            <div className="activity-header">

              <div>

                <div className="activity-title-row">

                  <span className="console-indicator">
                    ●
                  </span>

                  <h3>
                    Activity Console
                  </h3>

                  <span className="live-badge">
                    LIVE
                  </span>

                </div>

                <p>
                  Real-time operational activity
                </p>

              </div>

              <div className="activity-count">
                {filteredLogs.length} EVENTS
              </div>

            </div>


            {/* =================================================
                FILTERS
            ================================================= */}

            <div className="activity-filters">

              <div className="filter-group">

                <label>
                  CARE COORDINATOR
                </label>

                <select
                  value={selectedPcc}
                  onChange={(event) =>
                    setSelectedPcc(
                      event.target.value
                    )
                  }
                >

                  <option value="ALL">
                    All Coordinators
                  </option>

                  {pccList.map(
                    ([pccId, pcc]) => (
                      <option
                        key={pccId}
                        value={pccId}
                      >
                        {pcc.name}
                      </option>
                    )
                  )}

                </select>

              </div>


              <div className="filter-group">

                <label>
                  EVENT TYPE
                </label>

                <select
                  value={selectedEvent}
                  onChange={(event) =>
                    setSelectedEvent(
                      event.target.value
                    )
                  }
                >

                  {EVENT_TYPES.map(
                    (eventType) => (
                      <option
                        key={eventType}
                        value={eventType}
                      >
                        {eventType === "ALL"
                          ? "All Events"
                          : getEventLabel(
                              eventType
                            )}
                      </option>
                    )
                  )}

                </select>

              </div>


              <div className="filter-group">

                <label>
                  DATE
                </label>

                <select
                  value={selectedDate}
                  onChange={(event) =>
                    setSelectedDate(
                      event.target.value
                    )
                  }
                >

                  <option value="TODAY">
                    Today
                  </option>

                </select>

              </div>


              <div className="filter-group filter-search">

                <label>
                  SEARCH
                </label>

                <input
                  type="text"
                  placeholder="Patient, coordinator or rush ID..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>


            {/* =================================================
                CONSOLE
            ================================================= */}

            <div className="activity-console">

              <div className="console-header">

                <span>
                  TIME
                </span>

                <span>
                  COORDINATOR
                </span>

                <span>
                  EVENT
                </span>

                <span>
                  RUSH ID
                </span>

              </div>


              {filteredLogs.length === 0 ? (

                <div className="console-empty">

                  <div className="empty-icon">
                    —
                  </div>

                  <strong>
                    No activity found
                  </strong>

                  <span>
                    There are no audit events
                    matching the current filters.
                  </span>

                </div>

              ) : (

                <div className="console-log-list">

                  {filteredLogs.map(
                    (log) => {

                      const pcc =
                        PCC_USERS[
                          log.pccId
                        ];

                      const displayName =
                        pcc?.name ||
                        log.coordinator ||
                        log.pccId ||
                        "Unknown";

                      return (
                        <div
                          className="console-row"
                          key={log.id}
                        >

                          <span className="console-time">
                            {formatTime(
                              log.timestamp
                            )}
                          </span>

                          <span className="console-pcc">

                            <span className="mini-avatar">
                              {pcc?.initial ||
                                displayName.charAt(
                                  0
                                )}
                            </span>

                            {displayName}

                          </span>

                          <span className="console-event">

                            <span
                              className={`event-dot ${log.event.toLowerCase()}`}
                            />

                            {getEventLabel(
                              log.event
                            )}

                          </span>

                          <span className="console-rush-id">
                             {generateRushDisplayId(log)}
                          </span>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

          </section>


          {/* =================================================
              SELECTED PCC SUMMARY
          ================================================= */}

          {selectedPcc !== "ALL" && (
            <div className="selected-pcc-summary">

              <div>

                <span>
                  CURRENTLY VIEWING
                </span>

                <strong>
                  {
                    PCC_USERS[
                      selectedPcc
                    ]?.name
                  }
                </strong>

              </div>

              <div className="selected-pcc-stat">

                <strong>
                  {
                    todayAlerts.filter(
                      (alert) =>
                        alert.pccId ===
                        selectedPcc
                    ).length
                  }
                </strong>

                <span>
                  Rushes Today
                </span>

              </div>

              <div className="selected-pcc-stat">

                <strong>
                  {
                    todayAlerts.filter(
                      (alert) =>
                        alert.pccId ===
                          selectedPcc &&
                        alert.status !==
                          "COMPLETED"
                    ).length
                  }
                </strong>

                <span>
                  Active
                </span>

              </div>

              <div className="selected-pcc-stat">

                <strong>
                  {
                    todayAuditLogs.filter(
                      (log) =>
                        log.pccId ===
                        selectedPcc
                    ).length
                  }
                </strong>

                <span>
                  Events
                </span>

              </div>

            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default SupervisorDashboard;


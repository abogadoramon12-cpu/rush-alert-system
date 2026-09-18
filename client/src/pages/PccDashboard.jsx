import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import "./PccDashboard.css";
import API_URL from "../services/api";

const DEFAULT_TITLE = "Rush Alert — PCC Workspace";
const WARNING_TIME = 15 * 60 * 1000;

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

/* =========================================================
   TIMER HELPERS
========================================================= */

function formatRemaining(deadline, currentTime) {
  if (!deadline) {
    return "00:00:00";
  }

  const difference =
    new Date(deadline).getTime() - currentTime;

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

function getSlaStatus(deadline, currentTime) {
  if (!deadline) {
    return "ACTIVE";
  }

  const remaining =
    new Date(deadline).getTime() -
    currentTime;

  if (remaining <= 0) {
    return "OVERDUE";
  }

  if (remaining <= WARNING_TIME) {
    return "WARNING";
  }

  return "ACTIVE";
}

/* =========================================================
   COMPONENT
========================================================= */

function PccDashboard() {
  const { pccId: PCC_ID } = useParams();

  const currentPcc =
    PCC_USERS[PCC_ID] || {
      name: "Unknown PCC",
      initial: "?",
    };

  /* =======================================================
     STATE
  ======================================================= */

  const [currentTime, setCurrentTime] =
    useState(Date.now());

  const [socketConnected, setSocketConnected] =
    useState(false);

  const [alerts, setAlerts] =
    useState([]);
  
  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
  useState(null);

  const [completedAlerts, setCompletedAlerts] =
    useState([]);

  const [newRush, setNewRush] =
    useState(null);

  /* =======================================================
     REFS
  ======================================================= */

  const audioContextRef =
    useRef(null);

  const alertedRushIdsRef =
    useRef(new Set());

  const warnedRushIdsRef =
    useRef(new Set());

  const titleIntervalRef =
    useRef(null);

  const alertsRef =
    useRef([]);

  /* =======================================================
     KEEP ALERT REF UPDATED
  ======================================================= */

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  /* =======================================================
     CLOCK
  ======================================================= */

  useEffect(() => {
    const timer =
      setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  /* =======================================================
     SLA WARNING WATCHER
  ======================================================= */

  useEffect(() => {
    const warningWatcher =
      setInterval(() => {
        const now = Date.now();

        alertsRef.current.forEach(
          (alert) => {
            if (
              alert.status === "COMPLETED" ||
              !alert.deadline
            ) {
              return;
            }

            const deadline =
              new Date(
                alert.deadline
              ).getTime();

            const remaining =
              deadline - now;

            if (
              remaining > 0 &&
              remaining <= WARNING_TIME &&
              !warnedRushIdsRef.current.has(
                alert.id
              )
            ) {
              warnedRushIdsRef.current.add(
                alert.id
              );

              playWarningSound();
            }
          }
        );
      }, 1000);

    return () => {
      clearInterval(warningWatcher);
    };
  }, []);

  /* =======================================================
     TITLE ALERT
  ======================================================= */

  function startTitleAlert() {
    if (titleIntervalRef.current) {
      clearInterval(
        titleIntervalRef.current
      );
    }

    let showingAlert = true;

    document.title =
      "🔴 NEW RUSH — Rush Alert";

    titleIntervalRef.current =
      setInterval(() => {
        document.title =
          showingAlert
            ? "🔴 NEW RUSH — Rush Alert"
            : "⚠️ ACTION REQUIRED";

        showingAlert =
          !showingAlert;
      }, 800);
  }

  function stopTitleAlert() {
    if (titleIntervalRef.current) {
      clearInterval(
        titleIntervalRef.current
      );

      titleIntervalRef.current = null;
    }

    document.title =
      DEFAULT_TITLE;
  }

  /* =======================================================
     AUDIO ENGINE
  ======================================================= */

  function getAudioContext() {
    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        return null;
      }

      if (!audioContextRef.current) {
        audioContextRef.current =
          new AudioContext();
      }

      return audioContextRef.current;
    } catch {
      return null;
    }
  }

  function unlockAudio() {
    const context =
      getAudioContext();

    if (!context) {
      return;
    }

    if (
      context.state === "suspended"
    ) {
      context.resume().catch(
        () => {}
      );
    }
  }

  /* =======================================================
     RUSH ALERT SOUND
  ======================================================= */

  function playAlertSound() {
    try {
      const context =
        getAudioContext();

      if (!context) {
        return;
      }

      if (
        context.state === "suspended"
      ) {
        context.resume().catch(
          () => {}
        );

        return;
      }

      const now =
        context.currentTime;

      const masterGain =
        context.createGain();

      masterGain.gain.setValueAtTime(
        0.0001,
        now
      );

      masterGain.gain.exponentialRampToValueAtTime(
        0.95,
        now + 0.015
      );

      masterGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 2.4
      );

      masterGain.connect(
        context.destination
      );

      function lowImpact(
        startTime,
        frequency,
        duration
      ) {
        const oscillator =
          context.createOscillator();

        const gain =
          context.createGain();

        oscillator.type = "sine";

        oscillator.frequency.setValueAtTime(
          frequency,
          startTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
          70,
          startTime + duration
        );

        gain.gain.setValueAtTime(
          0.0001,
          startTime
        );

        gain.gain.exponentialRampToValueAtTime(
          0.85,
          startTime + 0.015
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          startTime + duration
        );

        oscillator.connect(gain);
        gain.connect(masterGain);

        oscillator.start(startTime);

        oscillator.stop(
          startTime + duration
        );
      }

      function alarmTone(
        startTime,
        frequency,
        duration,
        volume
      ) {
        const oscillator =
          context.createOscillator();

        const gain =
          context.createGain();

        oscillator.type =
          "sawtooth";

        oscillator.frequency.setValueAtTime(
          frequency,
          startTime
        );

        gain.gain.setValueAtTime(
          0.0001,
          startTime
        );

        gain.gain.exponentialRampToValueAtTime(
          volume,
          startTime + 0.012
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          startTime + duration
        );

        oscillator.connect(gain);
        gain.connect(masterGain);

        oscillator.start(startTime);

        oscillator.stop(
          startTime + duration
        );
      }

      function priorityBeep(
        startTime,
        frequency,
        duration
      ) {
        const oscillator =
          context.createOscillator();

        const gain =
          context.createGain();

        oscillator.type =
          "square";

        oscillator.frequency.setValueAtTime(
          frequency,
          startTime
        );

        gain.gain.setValueAtTime(
          0.0001,
          startTime
        );

        gain.gain.exponentialRampToValueAtTime(
          0.65,
          startTime + 0.008
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          startTime + duration
        );

        oscillator.connect(gain);
        gain.connect(masterGain);

        oscillator.start(startTime);

        oscillator.stop(
          startTime + duration
        );
      }

      lowImpact(
        now,
        180,
        0.3
      );

      alarmTone(
        now + 0.3,
        850,
        0.28,
        0.52
      );

      alarmTone(
        now + 0.62,
        680,
        0.28,
        0.52
      );

      priorityBeep(
        now + 0.98,
        1200,
        0.22
      );

      priorityBeep(
        now + 1.25,
        1200,
        0.22
      );

      lowImpact(
        now + 1.55,
        170,
        0.42
      );

      alarmTone(
        now + 1.58,
        980,
        0.35,
        0.46
      );
    } catch {
      // Audio failures are safely ignored.
    }
  }

  /* =======================================================
     WARNING SOUND
  ======================================================= */

  function playWarningSound() {
    try {
      const context =
        getAudioContext();

      if (!context) {
        return;
      }

      if (
        context.state === "suspended"
      ) {
        context.resume().catch(
          () => {}
        );

        return;
      }

      const now =
        context.currentTime;

      const master =
        context.createGain();

      master.gain.setValueAtTime(
        0.0001,
        now
      );

      master.gain.exponentialRampToValueAtTime(
        0.55,
        now + 0.025
      );

      master.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 1.35
      );

      master.connect(
        context.destination
      );

      function warningTone(
        startTime,
        frequency,
        duration
      ) {
        const oscillator =
          context.createOscillator();

        const gain =
          context.createGain();

        oscillator.type = "sine";

        oscillator.frequency.setValueAtTime(
          frequency,
          startTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
          frequency * 0.75,
          startTime + duration
        );

        gain.gain.setValueAtTime(
          0.0001,
          startTime
        );

        gain.gain.exponentialRampToValueAtTime(
          0.75,
          startTime + 0.025
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          startTime + duration
        );

        oscillator.connect(gain);
        gain.connect(master);

        oscillator.start(
          startTime
        );

        oscillator.stop(
          startTime + duration
        );
      }

      warningTone(
        now,
        880,
        0.25
      );

      warningTone(
        now + 0.32,
        880,
        0.25
      );

      warningTone(
        now + 0.64,
        1175,
        0.32
      );
    } catch {
      // Audio failures are safely ignored.
    }
  }

  /* =======================================================
     AUDIO UNLOCK
  ======================================================= */

  useEffect(() => {
    const handleInteraction =
      () => {
        unlockAudio();
      };

    window.addEventListener(
      "click",
      handleInteraction
    );

    window.addEventListener(
      "keydown",
      handleInteraction
    );

    window.addEventListener(
      "touchstart",
      handleInteraction
    );

    return () => {
      window.removeEventListener(
        "click",
        handleInteraction
      );

      window.removeEventListener(
        "keydown",
        handleInteraction
      );

      window.removeEventListener(
        "touchstart",
        handleInteraction
      );
    };
  }, []);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      stopTitleAlert();

      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // Ignore cleanup errors.
        }
      }
    };
  }, []);

  /* =======================================================
     LOAD EXISTING RUSHES
  ======================================================= */

  async function loadExistingRushes() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response =
        await fetch(
          `${API_URL}/api/rush-store/pcc/${PCC_ID}`
        );

      if (!response.ok) {
        throw new Error(
          `Request failed with status ${response.status}`
        );
      }

      const data =
        await response.json();

      if (
        !data.success ||
        !Array.isArray(data.alerts)
      ) {
        throw new Error(
          "Invalid rush queue response."
        );
      }

      const activeAlerts =
        data.alerts.filter(
          (alert) =>
            alert.status !== "COMPLETED"
        );

      const completed =
        data.alerts.filter(
          (alert) =>
            alert.status === "COMPLETED"
        );

      setAlerts(activeAlerts);
      setCompletedAlerts(completed);
    } catch {
      setLoadError(
        "Unable to load the rush queue. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function retryLoadRushes() {
    loadExistingRushes();
  }

  useEffect(() => {
    loadExistingRushes();
  }, [PCC_ID]);

  /* =======================================================
     SOCKET.IO
  ======================================================= */

  useEffect(() => {
    if (!PCC_ID) {
      return;
    }

    const socket =
      io(API_URL, {
        transports: [
          "websocket",
          "polling",
        ],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

    function registerPcc() {
      socket.emit(
        "pcc:join",
        PCC_ID
      );
    }

    socket.on(
      "connect",
      async () => {
        setSocketConnected(true);

        registerPcc();

        await loadExistingRushes();
      }
    );

    /* =====================================================
       NEW RUSH
    ===================================================== */

    socket.on(
      "rush:new",
      (alert) => {
        if (
          alert.pccId &&
          alert.pccId !== PCC_ID
        ) {
          return;
        }

        if (
          alertedRushIdsRef.current.has(
            alert.id
          )
        ) {
          return;
        }

        alertedRushIdsRef.current.add(
          alert.id
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

        playAlertSound();

        setNewRush(alert);

        startTitleAlert();

        if (
          "Notification" in window &&
          Notification.permission ===
            "granted"
        ) {
          try {
            const notification =
              new Notification(
                "🔴 NEW RUSH REQUEST",
                {
                  body:
                    `${alert.coordinator || "PCC"} — ` +
                    `${alert.patientName || "Rush Request"}\n` +
                    "Immediate action required.",
                  requireInteraction:
                    true,
                  tag:
                    "rush-" +
                    alert.id,
                }
              );

            notification.onclick =
              () => {
                window.focus();
                notification.close();
              };
          } catch {
            // Ignore notification errors.
          }
        }
      }
    );

    /* =====================================================
       RUSH UPDATED
    ===================================================== */

    socket.on(
      "rush:updated",
      (alert) => {
        if (
          alert.status ===
          "COMPLETED"
        ) {
          setAlerts(
            (currentAlerts) =>
              currentAlerts.filter(
                (existingAlert) =>
                  existingAlert.id !==
                  alert.id
              )
          );

          setCompletedAlerts(
            (currentCompleted) => {
              const exists =
                currentCompleted.some(
                  (existingAlert) =>
                    existingAlert.id ===
                    alert.id
                );

              if (exists) {
                return currentCompleted.map(
                  (existingAlert) =>
                    existingAlert.id ===
                    alert.id
                      ? alert
                      : existingAlert
                );
              }

              return [
                alert,
                ...currentCompleted,
              ];
            }
          );

          setNewRush(
            (currentRush) =>
              currentRush &&
              currentRush.id ===
                alert.id
                ? null
                : currentRush
          );

          stopTitleAlert();

          return;
        }

        setAlerts(
          (currentAlerts) =>
            currentAlerts.map(
              (existingAlert) =>
                existingAlert.id ===
                alert.id
                  ? alert
                  : existingAlert
            )
        );
      }
    );

    socket.on(
      "disconnect",
      () => {
        setSocketConnected(false);
      }
    );

    socket.on(
      "connect_error",
      () => {
        setSocketConnected(false);
      }
    );

    return () => {
      socket.off("connect");
      socket.off("rush:new");
      socket.off("rush:updated");
      socket.off("disconnect");
      socket.off("connect_error");

      socket.disconnect();
    };
  }, [PCC_ID]);

  /* =======================================================
     ACKNOWLEDGE
  ======================================================= */

  async function acknowledgeAlert(id) {
    try {
      const response =
        await fetch(
          `${API_URL}/api/rush-store/${id}/acknowledge`,
          {
            method: "PATCH",
          }
        );

      const data =
        await response.json();

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

        if (
          newRush &&
          newRush.id === id
        ) {
          setNewRush(null);
          stopTitleAlert();
        }
      }
    } catch {
      // Keep UI stable if the request fails.
    }
  }

  /* =======================================================
     COMPLETE
  ======================================================= */

  async function completeAlert(id) {
    try {
      const response =
        await fetch(
          `${API_URL}/api/rush-store/${id}/complete`,
          {
            method: "PATCH",
          }
        );

      const data =
        await response.json();

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

        setCompletedAlerts(
          (currentCompleted) => [
            data.alert,
            ...currentCompleted.filter(
              (alert) =>
                alert.id !== id
            ),
          ]
        );

        warnedRushIdsRef.current.delete(
          id
        );

        alertedRushIdsRef.current.delete(
          id
        );

        if (
          newRush &&
          newRush.id === id
        ) {
          setNewRush(null);
          stopTitleAlert();
        }
      }
    } catch {
      // Keep UI stable if the request fails.
    }
  }

  /* =======================================================
     DISMISS
  ======================================================= */

  function dismissNewRush() {
    setNewRush(null);
    stopTitleAlert();
  }

  /* =======================================================
     QUEUE COUNTS
  ======================================================= */

  const receivedAlerts =
    alerts.filter(
      (alert) =>
        alert.status === "ACTIVE"
    );

  const acknowledgedAlerts =
    alerts.filter(
      (alert) =>
        alert.status === "ACKNOWLEDGED"
    );

  const receivedCount =
    receivedAlerts.length;

  const acknowledgedCount =
    acknowledgedAlerts.length;

  const completedCount =
    completedAlerts.length;

  const totalRushToday =
    receivedCount +
    acknowledgedCount +
    completedCount;


  function generateRushDisplayId(alert) {
  const requestType = (
    alert.orderType ||
    alert.requestType ||
    ""
  ).toLowerCase();

  const prefix =
    requestType.includes("translation") ||
    requestType.includes("interpreter") ||
    requestType.includes("interpret")
      ? "INT"
      : "TRN";

  const name = (
    alert.patientName ||
    "Unknown Patient"
  )
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");

  const today = new Date();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  const year = today.getFullYear();

  return `${prefix}_${name}_${month}_${day}_${year}`;
}


  /* =======================================================
     RENDER CARD
  ======================================================= */

  function renderRushCard(
  alert,
  columnType
) {
  const slaStatus =
    getSlaStatus(
      alert.deadline,
      currentTime
    );

  const remaining =
    formatRemaining(
      alert.deadline,
      currentTime
    );

  const acknowledged =
    alert.status === "ACKNOWLEDGED";

  const isCompleted =
    columnType === "completed";

  return (
    <article
      id={"rush-" + alert.id}
      className={[
        "pcc-rush-card",
        acknowledged
          ? "acknowledged"
          : "",
        isCompleted
          ? "completed"
          : "",
        `sla-${slaStatus.toLowerCase()}`,
      ]
        .filter(Boolean)
        .join(" ")}
      key={alert.id}
    >

      {/* CARD HEADER */}
      <div className="pcc-card-top">

        <div>
          <span className="pcc-rush-label">
            RUSH REQUEST
          </span>

          <div className="pcc-status">
            <span className="pcc-status-dot"></span>

            {isCompleted
              ? "COMPLETED"
              : acknowledged
              ? "ACKNOWLEDGED"
              : "ACTION REQUIRED"}
          </div>
        </div>

        <span className="pcc-request-id">
          Rush ID - {generateRushDisplayId(alert)}
        </span>

      </div>


      {/* PATIENT + REQUEST TYPE */}
      <div className="pcc-card-info-grid">

        <div className="pcc-card-info">
          <span>
            PATIENT NAME
          </span>

          <strong>
            {alert.patientName ||
              "Unknown Patient"}
          </strong>
        </div>

        <div className="pcc-card-info">
          <span>
            REQUEST TYPE
          </span>

          <strong>
            {alert.orderType ||
              alert.requestType ||
              "—"}
          </strong>
        </div>

      </div>


      {/* SLA + TIME */}
      {!isCompleted && (
        <div className="pcc-card-sla">

          <div className="pcc-sla-item">
            <span>
              SLA
            </span>

            <strong
              className={`sla-value ${slaStatus.toLowerCase()}`}
            >
              {slaStatus}
            </strong>
          </div>

          <div className="pcc-sla-item">
            <span>
              TIME
            </span>

            <strong>
              {remaining}
            </strong>
          </div>

        </div>
      )}


      {/* COMPLETED STATUS */}
      {isCompleted && (
        <div className="pcc-card-completed">

          <span>
            REQUEST STATUS
          </span>

          <strong>
            ✓ Successfully completed
          </strong>

        </div>
      )}


      {/* FILE ACTIVITY NOTE */}
      <div className="pcc-card-note">

        <span>
          FILE ACTIVITY NOTE
        </span>

        <p>
          {alert.fileActivityNote ||
            alert.reminder ||
            "No activity recorded yet."}
        </p>

      </div>


      {/* ASSIGNED TO */}
      <div className="pcc-card-footer">

        <div className="pcc-assigned">

          <span>
            ASSIGNED TO
          </span>

          <strong>
            <span className="pcc-assigned-dot"></span>

            {alert.coordinator ||
              currentPcc.name}
          </strong>

        </div>


        {/* ACTIONS */}
        {!isCompleted && (
          <div className="pcc-card-actions">

            {!acknowledged && (
              <button
                className="pcc-acknowledge"
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
              className="pcc-complete"
              onClick={() =>
                completeAlert(
                  alert.id
                )
              }
            >
              Complete
            </button>

          </div>
        )}

      </div>

    </article>
  );
}

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className={
        newRush
          ? "pcc-dashboard rush-incoming"
          : "pcc-dashboard"
      }
    >
      {/* =================================================
          INCOMING RUSH OVERLAY
      ================================================= */}

      {newRush && (
        <div className="pcc-rush-overlay">
          <div className="pcc-rush-modal">
            <div className="pcc-rush-pulse">
              !
            </div>

            <p className="pcc-overlay-label">
              INCOMING ALERT
            </p>

            <h2>
              NEW RUSH REQUEST
            </h2>

            <p className="pcc-overlay-patient">
              {newRush.patientName ||
                "Rush Request"}
            </p>

            <p className="pcc-overlay-note">
              {newRush.fileActivityNote ||
                newRush.reminder ||
                "Immediate action required."}
            </p>

            <div className="pcc-overlay-actions">
              <button
                className="pcc-overlay-view"
                onClick={() => {
                  const rushId =
                    newRush.id;

                  dismissNewRush();

                  setTimeout(() => {
                    const element =
                      document.getElementById(
                        "rush-" +
                          rushId
                      );

                    if (element) {
                      element.scrollIntoView({
                        behavior:
                          "smooth",
                        block: "center",
                      });
                    }
                  }, 50);
                }}
              >
                View Request
              </button>

              <button
                className="pcc-overlay-dismiss"
                onClick={
                  dismissNewRush
                }
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="pcc-topbar">
        <div className="pcc-brand">
          <div className="pcc-brand-mark">
            R
          </div>

          <div>
            <strong>
              Rush Alert
            </strong>

            <span>
              PCC Workspace
            </span>
          </div>
        </div>

        <div className="pcc-user">
          <div className="pcc-user-status">
            <span></span>

            {socketConnected
              ? "LIVE"
              : "CONNECTING"}
          </div>

          <div className="pcc-avatar">
            {currentPcc.initial}
          </div>

          <div className="pcc-user-info">
            <strong>
              {currentPcc.name}
            </strong>

            <small>
              PCC
            </small>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="pcc-content">
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <section className="pcc-page-intro">
          <div className="pcc-page-intro-content">
            <p className="pcc-eyebrow">
              PCC WORKSPACE
            </p>

            <h1>
              Rush
              <span>
                Operations.
              </span>
            </h1>

            <p className="pcc-intro-copy">
              Track every urgent request
              from receipt through
              completion.
            </p>
          </div>

          <div className="pcc-live-indicator">
            <span></span>

            {socketConnected
              ? "LIVE MONITORING"
              : "CONNECTING..."}
          </div>
        </section>


        {/* =================================================
            WORKFLOW + KPI
        ================================================= */}

        <section className="pcc-dashboard-grid">

          {/* =================================================
              LEFT — WORKFLOW
          ================================================= */}

          <div className="pcc-workflow-panel">

            <div className="pcc-workflow-heading">
              <div>
                <p className="pcc-eyebrow">
                  WORKFLOW
                </p>

                <h2>
                  Rush Request Pipeline
                </h2>
              </div>

              <div className="pcc-workflow-summary">
                <span>
                  {totalRushToday}
                </span>

                requests today
              </div>
            </div>


            {/* =================================================
                THREE COLUMN WORKFLOW
            ================================================= */}

            <section className="pcc-workflow">

              {/* =================================================
                  RECEIVED
              ================================================= */}

              <div className="pcc-column received-column">

                <div className="pcc-column-header">

                  <div className="pcc-column-title">

                    <div className="pcc-column-number">
                      01
                    </div>

                    <div>
                      <h3>
                        Received
                      </h3>

                      <p>
                        New rush requests
                      </p>
                    </div>

                  </div>

                  <div className="pcc-column-count">
                    {receivedCount}
                  </div>

                </div>


                <div className="pcc-column-body">
                  {isLoading ? (
                    <div className="pcc-column-empty pcc-loading-state">
                      <div className="pcc-loading-spinner"></div>

                      <strong>
                        Loading requests
                      </strong>

                      <span>
                        Checking the rush queue...
                      </span>
                    </div>
                  ) : loadError ? (
                    <div className="pcc-column-empty pcc-error-state">
                      <div className="pcc-error-icon">
                        !
                      </div>

                      <strong>
                        Unable to load requests
                      </strong>

                      <span>
                        {loadError}
                      </span>

                      <button
                        className="pcc-retry-button"
                        onClick={retryLoadRushes}
                      >
                        Retry
                      </button>
                    </div>
                  ) : receivedAlerts.length === 0 ? (
                    <div className="pcc-column-empty">
                      <div>
                        ✓
                      </div>

                      <strong>
                        Queue clear
                      </strong>

                      <span>
                        No new rush requests.
                      </span>
                    </div>
                  ) : (
                    receivedAlerts.map(
                      (alert) =>
                        renderRushCard(
                          alert,
                          "received"
                        )
                    )
                  )}
                </div>

              </div>


              {/* =================================================
                  ACKNOWLEDGED
              ================================================= */}

              <div className="pcc-column acknowledged-column">

                <div className="pcc-column-header">

                  <div className="pcc-column-title">

                    <div className="pcc-column-number">
                      02
                    </div>

                    <div>
                      <h3>
                        Acknowledged
                      </h3>

                      <p>
                        Requests in progress
                      </p>
                    </div>

                  </div>

                  <div className="pcc-column-count">
                    {acknowledgedCount}
                  </div>

                </div>


                <div className="pcc-column-body">

                  {isLoading ? (

                    <div className="pcc-column-empty pcc-loading-state">

                      <div className="pcc-loading-spinner"></div>

                      <strong>
                        Loading requests
                      </strong>

                      <span>
                        Checking the rush queue...
                      </span>

                    </div>

                  ) : acknowledgedAlerts.length === 0 ? (

                    <div className="pcc-column-empty">

                      <div>
                        —
                      </div>

                      <strong>
                        Nothing in progress
                      </strong>

                      <span>
                        Acknowledged requests appear here.
                      </span>

                    </div>

                  ) : (

                    acknowledgedAlerts.map(
                      (alert) =>
                        renderRushCard(
                          alert,
                          "acknowledged"
                        )
                    )

                  )}

                </div>

              </div>


              {/* =================================================
                  COMPLETED
              ================================================= */}

              <div className="pcc-column completed-column">

                <div className="pcc-column-header">

                  <div className="pcc-column-title">

                    <div className="pcc-column-number">
                      03
                    </div>

                    <div>
                      <h3>
                        Completed
                      </h3>

                      <p>
                        Finished rush requests
                      </p>
                    </div>

                  </div>

                  <div className="pcc-column-count">
                    {completedCount}
                  </div>

                </div>


                <div className="pcc-column-body">

                  {isLoading ? (

                    <div className="pcc-column-empty pcc-loading-state">

                      <div className="pcc-loading-spinner"></div>

                      <strong>
                        Loading requests
                      </strong>

                      <span>
                        Checking the rush queue...
                      </span>

                    </div>

                  ) : completedAlerts.length === 0 ? (

                    <div className="pcc-column-empty">

                      <div>
                        ✓
                      </div>

                      <strong>
                        No completed requests
                      </strong>

                      <span>
                        Completed rushes appear here.
                      </span>

                    </div>

                  ) : (

                    completedAlerts.map(
                      (alert) =>
                        renderRushCard(
                          alert,
                          "completed"
                        )
                    )

                  )}

                </div>

              </div>

            </section>

          </div>


          {/* =================================================
              RIGHT — KPI
          ================================================= */}

          <aside className="pcc-kpi-panel">

            <div className="pcc-kpi-card">

              <div className="pcc-kpi-icon">
                ↗
              </div>

              <div>
                <span>
                  TOTAL RUSH TODAY
                </span>

                <strong>
                  {totalRushToday}
                </strong>

                <small>
                  All requests received
                </small>
              </div>

            </div>


            <div className="pcc-kpi-card received">

              <div className="pcc-kpi-icon">
                !
              </div>

              <div>
                <span>
                  RECEIVED
                </span>

                <strong>
                  {receivedCount}
                </strong>

                <small>
                  Awaiting acknowledgment
                </small>
              </div>

            </div>


            <div className="pcc-kpi-card acknowledged">

              <div className="pcc-kpi-icon">
                ✓
              </div>

              <div>
                <span>
                  ACKNOWLEDGED
                </span>

                <strong>
                  {acknowledgedCount}
                </strong>

                <small>
                  Currently being worked
                </small>
              </div>

            </div>


            <div className="pcc-kpi-card completed">

              <div className="pcc-kpi-icon">
                ✓
              </div>

              <div>
                <span>
                  COMPLETED
                </span>

                <strong>
                  {completedCount}
                </strong>

                <small>
                  Successfully completed
                </small>
              </div>

            </div>

          </aside>

        </section>

      </main>
    </div>
  );
}

export default PccDashboard;
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import "./PccDashboard.css";

const DEFAULT_TITLE =
  "Rush Alert — PCC Workspace";

const WARNING_TIME =
  15 * 60 * 1000;

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

/* =========================
   TIMER
========================= */

function formatRemaining(
  deadline,
  currentTime
) {
  if (!deadline) {
    return "00:00:00";
  }

  const difference =
    new Date(deadline).getTime() -
    currentTime;

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

function getSlaStatus(
  deadline,
  currentTime
) {
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

/* =========================
   COMPONENT
========================= */

function PccDashboard() {
  const { pccId: PCC_ID } =
    useParams();

  const currentPcc =
    PCC_USERS[PCC_ID] || {
      name: "Unknown PCC",
      initial: "?",
    };

  const [currentTime, setCurrentTime] =
    useState(Date.now());

  const [socketConnected, setSocketConnected] =
    useState(false);

  const [alerts, setAlerts] =
    useState([]);

  const [newRush, setNewRush] =
    useState(null);

  /* =========================
     REFS
  ========================= */

  const audioContextRef =
    useRef(null);

  const alertedRushIdsRef =
    useRef(new Set());

  const warnedRushIdsRef =
    useRef(new Set());

  const titleIntervalRef =
    useRef(null);

  /*
   * Keep the latest alerts available
   * to the timer without recreating
   * the timer every time alerts change.
   */

  const alertsRef =
    useRef([]);

  /* =========================
     KEEP ALERT REF UPDATED
  ========================= */

  useEffect(() => {
    alertsRef.current =
      alerts;
  }, [alerts]);

  /* =========================
     CLOCK
  ========================= */

  useEffect(() => {
    const timer =
      setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  /* =========================
     SLA WARNING WATCHER
  ========================= */

  useEffect(() => {
    const warningWatcher =
      setInterval(() => {
        const now =
          Date.now();

        alertsRef.current.forEach(
          (alert) => {
            if (
              alert.status ===
                "COMPLETED" ||
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

            /*
             * Rush has entered
             * the 15-minute warning zone.
             */

            if (
              remaining > 0 &&
              remaining <=
                WARNING_TIME &&
              !warnedRushIdsRef.current.has(
                alert.id
              )
            ) {
              warnedRushIdsRef.current.add(
                alert.id
              );

              console.log(
                "⚠️ SLA WARNING:",
                alert.id
              );

              playWarningSound();
            }
          }
        );
      }, 1000);

    return () => {
      clearInterval(
        warningWatcher
      );
    };
  }, []);

  /* =========================
     TITLE ALERT
  ========================= */

  function startTitleAlert() {
    if (
      titleIntervalRef.current
    ) {
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
    if (
      titleIntervalRef.current
    ) {
      clearInterval(
        titleIntervalRef.current
      );

      titleIntervalRef.current =
        null;
    }

    document.title =
      DEFAULT_TITLE;
  }

  /* =========================
     AUDIO ENGINE
  ========================= */

  function getAudioContext() {
    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) {
        return null;
      }

      if (
        !audioContextRef.current
      ) {
        audioContextRef.current =
          new AudioContext();
      }

      return audioContextRef.current;
    } catch (error) {
      console.warn(
        "Unable to create audio context:",
        error
      );

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
      context.state ===
      "suspended"
    ) {
      context.resume().catch(
        (error) => {
          console.warn(
            "Unable to resume audio:",
            error
          );
        }
      );
    }
  }

  /* =========================
     RUSH ALERT SOUND
  ========================= */

  function playAlertSound() {
    try {
      const context =
        getAudioContext();

      if (!context) {
        return;
      }

      if (
        context.state ===
        "suspended"
      ) {
        console.warn(
          "Rush alarm received, but browser audio is suspended."
        );

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

        oscillator.type =
          "sine";

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
        0.30
      );

      alarmTone(
        now + 0.30,
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
    } catch (error) {
      console.warn(
        "Unable to play rush alert sound:",
        error
      );
    }
  }

  /* =========================
     WARNING SOUND
  ========================= */

  function playWarningSound() {
    try {
      /*
       * IMPORTANT:
       *
       * Use the SAME AudioContext
       * as the main rush alarm.
       *
       * This prevents the warning
       * sound from being created
       * inside a separate suspended
       * AudioContext.
       */

      const context =
        getAudioContext();

      if (!context) {
        return;
      }

      if (
        context.state ===
        "suspended"
      ) {
        console.warn(
          "SLA warning reached, but browser audio is suspended."
        );

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

        oscillator.type =
          "sine";

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

      /*
       * WARNING:
       * Two strong tones followed
       * by a short priority tone.
       */

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
    } catch (error) {
      console.warn(
        "Unable to play SLA warning sound:",
        error
      );
    }
  }

  /* =========================
     AUDIO UNLOCK
  ========================= */

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

  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    return () => {
      stopTitleAlert();

      if (
        audioContextRef.current
      ) {
        try {
          audioContextRef.current.close();
        } catch {
          // Ignore cleanup errors.
        }
      }
    };
  }, []);

  /* =========================
     LOAD SAVED RUSHES
  ========================= */

  async function loadExistingRushes() {
    try {
      const response =
        await fetch(
          "http://localhost:5000/api/rush-store/pcc/" +
            PCC_ID
        );

      const data =
        await response.json();

      if (
        data.success &&
        Array.isArray(data.alerts)
      ) {
        setAlerts(
          data.alerts
        );
      }
    } catch (error) {
      console.error(
        "Unable to load existing rushes:",
        error
      );
    }
  }

  useEffect(() => {
    loadExistingRushes();
  }, [PCC_ID]);

  /* =========================
     SOCKET.IO
  ========================= */

  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission ===
        "default"
    ) {
      Notification.requestPermission()
        .then((permission) => {
          console.log(
            "Rush Alert notification permission:",
            permission
          );
        })
        .catch((error) => {
          console.warn(
            "Notification permission request failed:",
            error
          );
        });
    }

    const socket =
      io(
        "http://localhost:5000",
        {
          transports: [
            "websocket",
            "polling",
          ],
        }
      );

    socket.on(
      "connect",
      async () => {
        console.log(
          "Connected to Rush Alert server:",
          socket.id
        );

        setSocketConnected(
          true
        );

        socket.emit(
          "pcc:join",
          PCC_ID
        );

        await loadExistingRushes();
      }
    );

    /* =========================
       NEW RUSH
    ========================= */

    socket.on(
      "rush:new",
      (alert) => {
        console.log(
          "NEW RUSH ALERT RECEIVED:",
          alert
        );

        if (
          alert.pccId &&
          alert.pccId !== PCC_ID
        ) {
          return;
        }

        /*
         * Prevent duplicate
         * real-time alerts.
         */

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

        /*
         * Immediately add the rush.
         */

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

        /*
         * IMPORTANT:
         *
         * Rush sound fires immediately.
         */

        playAlertSound();

        setNewRush(alert);

        startTitleAlert();

        /*
         * Desktop notification.
         */

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
          } catch (error) {
            console.warn(
              "Unable to create desktop notification:",
              error
            );
          }
        }
      }
    );

    /* =========================
       RUSH UPDATED
    ========================= */

    socket.on(
      "rush:updated",
      (alert) => {
        console.log(
          "RUSH UPDATED:",
          alert
        );

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

        if (
          alert.status ===
          "COMPLETED"
        ) {
          setNewRush(
            (currentRush) =>
              currentRush &&
              currentRush.id ===
                alert.id
                ? null
                : currentRush
          );

          stopTitleAlert();
        }
      }
    );

    socket.on(
      "pcc:connected",
      (data) => {
        console.log(
          "PCC room connected:",
          data
        );
      }
    );

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "Disconnected from Rush Alert server:",
          reason
        );

        setSocketConnected(
          false
        );
      }
    );

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "Socket connection error:",
          error
        );

        setSocketConnected(
          false
        );
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [PCC_ID]);

  /* =========================
     ACKNOWLEDGE
  ========================= */

  async function acknowledgeAlert(
    id
  ) {
    try {
      const response =
        await fetch(
          "http://localhost:5000/api/rush-store/" +
            id +
            "/acknowledge",
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
    } catch (error) {
      console.error(
        "Unable to acknowledge rush:",
        error
      );
    }
  }

  /* =========================
     COMPLETE
  ========================= */

  async function completeAlert(
    id
  ) {
    try {
      const response =
        await fetch(
          "http://localhost:5000/api/rush-store/" +
            id +
            "/complete",
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
    } catch (error) {
      console.error(
        "Unable to complete rush:",
        error
      );
    }
  }

  /* =========================
     DISMISS
  ========================= */

  function dismissNewRush() {
    setNewRush(null);

    stopTitleAlert();
  }

  /* =========================
     COUNTS
  ========================= */

  const activeCount =
    alerts.filter(
      (alert) =>
        alert.status ===
        "ACTIVE"
    ).length;

  const acknowledgedCount =
    alerts.filter(
      (alert) =>
        alert.status ===
        "ACKNOWLEDGED"
    ).length;

  /* =========================
     RENDER
  ========================= */

  return (
    <div
      className={
        newRush
          ? "pcc-dashboard rush-incoming"
          : "pcc-dashboard"
      }
    >
      {/* =========================
          INCOMING RUSH OVERLAY
      ========================= */}

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

      {/* =========================
          TOP BAR
      ========================= */}

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
              ? "Connected"
              : "Connecting..."}

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

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main className="pcc-content">

        <section className="pcc-welcome">

          <div>

            <p className="pcc-eyebrow">
              PCC WORKSPACE
            </p>

            <h1>
              Your rush
              <span>
                {" "}requests.
              </span>
            </h1>

            <p>
              Monitor and complete urgent
              requests before the one-hour
              SLA expires.
            </p>

          </div>

          <div className="pcc-summary">

            <div>

              <span>
                ACTIVE
              </span>

              <strong>
                {activeCount}
              </strong>

            </div>

            <div>

              <span>
                ACKNOWLEDGED
              </span>

              <strong>
                {acknowledgedCount}
              </strong>

            </div>

          </div>

        </section>

        {/* =========================
            LIVE QUEUE
        ========================= */}

        <section className="pcc-alert-section">

          <div className="pcc-section-heading">

            <div>

              <p className="pcc-eyebrow">
                LIVE QUEUE
              </p>

              <h2>
                Assigned Rush Requests
              </h2>

            </div>

            <div className="pcc-live">

              <span></span>

              {socketConnected
                ? "LIVE MONITORING"
                : "CONNECTING..."}

            </div>

          </div>

          {alerts.length === 0 ? (

            <div className="pcc-empty">

              <div className="pcc-empty-icon">
                ✓
              </div>

              <h3>
                You're all caught up
              </h3>

              <p>
                No rush requests are currently
                assigned to you.
              </p>

            </div>

          ) : (

            <div className="pcc-alert-list">

              {alerts.map(
                (alert) => {

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
                    alert.status ===
                    "ACKNOWLEDGED";

                  const cardClass =
                    [
                      "pcc-rush-card",
                      acknowledged
                        ? "acknowledged"
                        : "",
                      `sla-${slaStatus.toLowerCase()}`,
                    ]
                      .filter(Boolean)
                      .join(" ");

                  const statusClass =
                    acknowledged
                      ? "pcc-status acknowledged"
                      : "pcc-status";

                  return (
                    <article
                      id={
                        "rush-" +
                        alert.id
                      }
                      className={
                        cardClass
                      }
                      key={
                        alert.id
                      }
                    >

                      <div className="pcc-card-accent"></div>

                      {/* CARD HEADER */}

                      <div className="pcc-card-header">

                        <div>

                          <span className="pcc-rush-badge">
                            RUSH
                          </span>

                          <span
                            className={
                              statusClass
                            }
                          >
                            ●{" "}
                            {acknowledged
                              ? "ACKNOWLEDGED"
                              : "ACTION REQUIRED"}
                          </span>

                        </div>

                        <span className="pcc-request-id">
                          #
                          {alert.id}
                        </span>

                      </div>

                      {/* SLA STATUS */}

                      <div className="pcc-sla-status">

                        {slaStatus ===
                          "ACTIVE" && (
                          <span className="sla-badge sla-active">
                            ● ACTIVE
                          </span>
                        )}

                        {slaStatus ===
                          "WARNING" && (
                          <span className="sla-badge sla-warning">
                            ⚠ WARNING
                          </span>
                        )}

                        {slaStatus ===
                          "OVERDUE" && (
                          <span className="sla-badge sla-overdue">
                            🔴 OVERDUE
                          </span>
                        )}

                      </div>

                      {/* CARD MAIN */}

                      <div className="pcc-card-main">

                        <div className="pcc-patient">

                          <span>
                            PATIENT
                          </span>

                          <h3>
                            {alert.patientName ||
                              "Unknown Patient"}
                          </h3>

                          <p>
                            {alert.patientState ||
                              "—"}
                            {" • "}
                            {alert.orderType ||
                              "—"}
                          </p>

                        </div>

                        <div className="pcc-details">

                          <div>

                            <span>
                              CLIENT
                            </span>

                            <strong>
                              {alert.clientName ||
                                "—"}
                            </strong>

                          </div>

                          <div>

                            <span>
                              BILLER / COLLECTOR
                            </span>

                            <strong>
                              {alert.billerCollector ||
                                "—"}
                            </strong>

                          </div>

                        </div>

                        <div className="pcc-sla">

                          <span>
                            {slaStatus ===
                            "OVERDUE"
                              ? "SLA OVERDUE"
                              : "SLA REMAINING"}
                          </span>

                          <strong>
                            {remaining}
                          </strong>

                          <small>
                            1 hour from detection
                          </small>

                        </div>

                      </div>

                      {/* FILE NOTE */}

                      <div className="pcc-note">

                        <span>
                          FILE ACTIVITY NOTE
                        </span>

                        <p>
                          {alert.fileActivityNote ||
                            alert.reminder ||
                            "—"}
                        </p>

                      </div>

                      {/* FOOTER */}

                      <div className="pcc-card-footer">

                        <div className="pcc-assignee">

                          <span>
                            ASSIGNED TO
                          </span>

                          <strong>
                            {alert.coordinator ||
                              "—"}
                          </strong>

                        </div>

                        <div className="pcc-actions">

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
                            Complete Request
                          </button>

                        </div>

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

function unlockAudio() {
  const context = getAudioContext();

  if (!context) return;

  if (context.state === "suspended") {
    context.resume();
  }

  console.log(
    "AUDIO UNLOCK TEST:",
    audioContextRef.current?.state
  );
}

export default PccDashboard;
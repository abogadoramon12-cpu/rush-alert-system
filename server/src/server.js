const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const rushAlertRoutes = require("./routes/rushAlertRoutes");
const rushStoreRoutes = require("./routes/rushStoreRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",
    methods: ["GET", "POST", "PATCH"],
  },
});

app.set("io", io);


/* =====================================================
   ONLINE PCC CONNECTION TRACKING
===================================================== */

const pccConnections = new Map();


/* =====================================================
   EXPRESS
===================================================== */

app.use(cors());
app.use(express.json());


/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message:
      "Rush Alert System server is running",
  });
});


/* =====================================================
   ROUTES
===================================================== */

app.use(
  "/api/rush-alerts",
  rushAlertRoutes
);

app.use(
  "/api/rush-store",
  rushStoreRoutes
);

app.use(
  "/api/upload",
  uploadRoutes
);

app.use(
  "/api/audit-logs",
  auditLogRoutes
);


/* =====================================================
   SOCKET.IO
===================================================== */

io.on("connection", (socket) => {

  /* ---------------------------------------------------
     PCC JOIN
  --------------------------------------------------- */

  socket.on("pcc:join", (pccId) => {

    if (!pccId) {
      return;
    }

    const room = "pcc:" + pccId;

    socket.join(room);

    socket.data.pccId = pccId;

    const currentConnections =
      pccConnections.get(pccId) || 0;

    pccConnections.set(
      pccId,
      currentConnections + 1
    );


    /* -----------------------------------------------
       Tell all supervisors this PCC is online
    ----------------------------------------------- */

    io.to("supervisors").emit(
      "pcc:online",
      pccId
    );


    /* -----------------------------------------------
       Confirm connection to PCC
    ----------------------------------------------- */

    socket.emit(
      "pcc:connected",
      {
        success: true,
        pccId,
        room,
      }
    );
  });


  /* ---------------------------------------------------
     SUPERVISOR JOIN
  --------------------------------------------------- */

  socket.on("supervisor:join", () => {

    socket.join("supervisors");


    /* -----------------------------------------------
       Send currently connected PCCs
    ----------------------------------------------- */

    for (const [
      pccId,
      connectionCount,
    ] of pccConnections.entries()) {

      if (connectionCount > 0) {
        socket.emit(
          "pcc:online",
          pccId
        );
      }
    }
  });


  /* ---------------------------------------------------
     DISCONNECT
  --------------------------------------------------- */

  socket.on("disconnect", () => {

    const pccId =
      socket.data.pccId;

    if (!pccId) {
      return;
    }

    const currentConnections =
      pccConnections.get(pccId) || 0;

    const remainingConnections =
      Math.max(
        0,
        currentConnections - 1
      );


    if (remainingConnections === 0) {

      pccConnections.delete(
        pccId
      );


      /* ---------------------------------------------
         Tell supervisors PCC is now offline
      --------------------------------------------- */

      io.to("supervisors").emit(
        "pcc:offline",
        pccId
      );

    } else {

      pccConnections.set(
        pccId,
        remainingConnections
      );
    }
  });
});


/* =====================================================
   SERVER
===================================================== */

const PORT =
  process.env.PORT || 5000;

server.listen(PORT);


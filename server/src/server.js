const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const rushAlertRoutes = require("./routes/rushAlertRoutes");
const rushStoreRoutes = require("./routes/rushStoreRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH"],
  },
});

app.set("io", io);

const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message:
      "Rush Alert System server is running",
  });
});

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

io.on("connection", (socket) => {
  console.log(
    "Browser connected:",
    socket.id
  );

  socket.on("pcc:join", (pccId) => {
    if (!pccId) {
      return;
    }

    const room =
      "pcc:" + pccId;

    socket.join(room);

    console.log(
      "PCC joined room:",
      room
    );

    socket.emit(
      "pcc:connected",
      {
        success: true,
        pccId,
        room,
      }
    );
  });

  socket.on("supervisor:join", () => {
    socket.join(
      "supervisors"
    );

    console.log(
      "Supervisor joined room:",
      socket.id
    );
  });

  socket.on("disconnect", () => {
    console.log(
      "Browser disconnected:",
      socket.id
    );
  });
});

server.listen(PORT, () => {
  console.log(
    "Rush Alert System server running on http://localhost:" +
      PORT
  );

  console.log(
    "Socket.IO real-time server is ready."
  );
});

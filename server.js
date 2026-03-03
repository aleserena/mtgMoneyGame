const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const express = require("express");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const basePort = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port: basePort });
const handle = app.getRequestHandler();

function startServer(port) {
  const expressApp = express();
  const httpServer = createServer(expressApp);

  const io = new Server(httpServer);

  const { setupGameHandlers } = require("./src/server/gameManager");
  const { setupMatchmakingHandlers } = require("./src/server/matchmaking");

  setupGameHandlers(io);
  setupMatchmakingHandlers(io);

  expressApp.all("*", (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  httpServer
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE" && port < basePort + 10) {
        console.warn(`Port ${port} in use, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error(err);
        process.exit(1);
      }
    });
}

app.prepare().then(() => {
  startServer(basePort);
});

import { createServer } from "http";
import next from "next";
import { attachSocket } from "./src/server/socket";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const app = next({ dev, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));
  attachSocket(server);
  server.listen(port, () => console.log(`> IPL Auction ready on http://localhost:${port} (${dev ? "dev" : "prod"})`));
}).catch((e) => { console.error("Failed to start", e); process.exit(1); });

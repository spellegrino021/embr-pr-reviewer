import express from "express";
import cors from "cors";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { reviewRouter } from "./routes/review.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// API routes
app.use("/api", reviewRouter);

// Serve the React build — check Embr output layout first, then local dev layout
const embrClientDist= path.join(__dirname, "../client-dist");
const localClientDist = path.join(__dirname, "../../client/dist");
const clientDist = existsSync(embrClientDist) ? embrClientDist : localClientDist;

app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

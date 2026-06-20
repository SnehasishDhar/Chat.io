import express from "express";
import http from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// Load environment variables
dotenv.config();

import { connectDatabase } from "./database";
import { setupSockets } from "./sockets/socketHandler";
import { errorHandler } from "./middleware/errorHandler";

// Route imports
import authRoutes from "./routes/authRoutes";
import workspaceRoutes from "./routes/workspaceRoutes";
import documentRoutes, { workspaceDocumentRouter } from "./routes/documentRoutes";
import agentRoutes from "./routes/agentRoutes";
import widgetRoutes from "./routes/widgetRoutes";

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS settings
const io = new SocketServer(server, {
  cors: {
    origin: "*", // Adjust in production to allow specific origins
    methods: ["GET", "POST"],
  },
});

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP if widgets load resources from the backend
}));

app.use(cors({
  origin: "*", // Enforce specific domains in production
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later." },
});
app.use(limiter);

// Bind Socket.IO handlers
setupSockets(io);

// Static folders
app.use("/uploads", express.static("uploads"));

// API Router registration
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/conversations", agentRoutes);
app.use("/api/embed", widgetRoutes);

// Nested routes: document uploads inside workspace paths
app.use("/api/workspaces/:id/documents", workspaceDocumentRouter);

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Chat.io SaaS Chatbot Backend API" });
});

// Error handling middleware
app.use(errorHandler);

// Connect DB and boot server
const PORT = process.env.PORT || 3001;

async function bootstrap() {
  await connectDatabase();
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
  });
}

bootstrap().catch((err) => {
  console.error("Bootstrapping server failed:", err);
});

import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/mongodb.js";
import authRoutes from "./routes/auth.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import userRoutes from "./routes/user.routes.js";
import messageRoutes from "./routes/message.routes.js";
import { initSocket } from "../socket/socket.js";

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

await connectDB(process.env.MONGO_URI);

initSocket(server);

server.listen(process.env.PORT, () => console.log(`🚀 Running on http://localhost:${process.env.PORT}`));

// Catch-all for unknown routes
app.use((req, res) => {
	res.status(404).json({ status: false, message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ status: false, message: err.message || "Internal Server Error" });
});

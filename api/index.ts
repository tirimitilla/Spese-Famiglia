import express from "express";
import { setupApiRoutes } from "../apiRoutes";

const app = express();

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Registra tutte le route /api
setupApiRoutes(app);

export default app;

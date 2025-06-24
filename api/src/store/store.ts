import { ClientConnection } from "../models/types";

// Store connected WebSocket clients
export const connectedClients: Map<string, ClientConnection> = new Map();


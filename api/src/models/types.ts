import { WebSocket as WSWebSocket } from 'ws';

export interface AquaTemplatesFields {
 
    name: string,
    label: string,
    type: string,
    required: boolean,
    isArray: boolean
  }


  // Interface for client connection with user ID
export interface ClientConnection {
  socket: WSWebSocket;
  userId: string;
  connectedAt: Date;
}
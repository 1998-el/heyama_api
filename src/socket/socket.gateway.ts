import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  // on Vercel (serverless) we don't open a dedicated port: WebSockets aren't possible,
  // we just avoid trying to listen on SOCKET_PORT and crashing the boot
  port: process.env.VERCEL ? undefined : Number(process.env.SOCKET_PORT) || 3001,
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`client disconnected: ${client.id}`);
  }

  // these two are called by ObjectsService, not directly by the frontend
  notifyObjectCreated(payload: unknown) {
    this.server.emit('object-created', payload);
  }

  notifyObjectDeleted(objectId: string) {
    this.server.emit('object-deleted', objectId);
  }
}

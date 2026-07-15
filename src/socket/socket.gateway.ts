import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  port: Number(process.env.SOCKET_PORT) || 3001,
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`client déconnecté: ${client.id}`);
  }

  // ces deux là sont appelées par ObjectsService, pas par le front directement
  notifyObjectCreated(payload: unknown) {
    this.server.emit('object-created', payload);
  }

  notifyObjectDeleted(objectId: string) {
    this.server.emit('object-deleted', objectId);
  }
}

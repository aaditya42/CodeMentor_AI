import { Response } from 'express';
import { logger } from '../../lib/logger.js';
import type { SSEEvent } from '@codementor/shared';

export class SSEHandler {
  private res: Response;
  private closed: boolean = false;

  constructor(res: Response) {
    this.res = res;
    this.setupSSE();
  }

  private setupSSE() {
    this.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Handle client disconnect
    this.res.on('close', () => {
      this.closed = true;
      logger.debug('SSE client disconnected');
    });

    // Send initial connection event
    this.sendEvent({ type: 'hint_start', conversationId: '', hintLevel: 1 as any });
  }

  sendEvent(event: SSEEvent) {
    if (this.closed) return;

    try {
      this.res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (err) {
      logger.error('Error sending SSE event:', err);
      this.closed = true;
    }
  }

  sendChunk(content: string) {
    this.sendEvent({ type: 'hint_chunk', content });
  }

  sendAnalysis(data: any) {
    this.sendEvent({ type: 'analysis', data });
  }

  sendComplexity(data: any) {
    this.sendEvent({ type: 'complexity', data });
  }

  sendComplete(hintId: string) {
    this.sendEvent({ type: 'hint_complete', hintId });
    this.close();
  }

  sendError(message: string) {
    this.sendEvent({ type: 'error', message });
    this.close();
  }

  close() {
    if (!this.closed) {
      this.res.end();
      this.closed = true;
    }
  }

  get isClosed() {
    return this.closed;
  }
}

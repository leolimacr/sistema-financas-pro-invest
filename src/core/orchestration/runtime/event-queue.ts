export interface QueuedDomainEvent<T = any> {
  eventId: string;
  correlationId: string;
  causationId?: string;
  timestamp: number;
  domain: string;
  type: string;
  payload: T;
  priority: 'high' | 'normal' | 'low';
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

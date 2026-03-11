/**
 * Canonical event type constants for the customer domain.
 * Naming convention: domain.entity.action
 */
export const CustomerEvents = {
  CUSTOMER_CREATED: 'customer.customer.created',
  CUSTOMER_UPDATED: 'customer.customer.updated',
  CUSTOMER_DELETED: 'customer.customer.deleted',
} as const;

export type CustomerEventType = (typeof CustomerEvents)[keyof typeof CustomerEvents];

/**
 * Canonical event envelope for all Zorbit platform events.
 */
export interface ZorbitEventEnvelope<T = unknown> {
  eventId: string;
  eventType: CustomerEventType;
  timestamp: string;
  source: string;
  namespace: string;
  namespaceId: string;
  payload: T;
  metadata?: Record<string, string>;
}

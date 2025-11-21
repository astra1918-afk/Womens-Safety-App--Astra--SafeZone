// WhatsApp delivery monitoring and fallback system
interface DeliveryStatus {
  messageId: string;
  phoneNumber: string;
  status: 'sent' | 'delivered' | 'failed' | 'read';
  timestamp: Date;
  errorCode?: number;
  errorMessage?: string;
}

class DeliveryMonitor {
  private pendingDeliveries = new Map<string, DeliveryStatus>();
  private deliveryCallbacks = new Map<string, (status: DeliveryStatus) => void>();

  trackMessage(messageId: string, phoneNumber: string, callback?: (status: DeliveryStatus) => void) {
    const delivery: DeliveryStatus = {
      messageId,
      phoneNumber,
      status: 'sent',
      timestamp: new Date()
    };
    
    this.pendingDeliveries.set(messageId, delivery);
    
    if (callback) {
      this.deliveryCallbacks.set(messageId, callback);
    }

    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      this.cleanupMessage(messageId);
    }, 10 * 60 * 1000);
  }

  updateDeliveryStatus(messageId: string, status: 'delivered' | 'failed' | 'read', errorCode?: number, errorMessage?: string) {
    const delivery = this.pendingDeliveries.get(messageId);
    if (!delivery) return false;

    delivery.status = status;
    delivery.timestamp = new Date();
    if (errorCode) delivery.errorCode = errorCode;
    if (errorMessage) delivery.errorMessage = errorMessage;

    this.pendingDeliveries.set(messageId, delivery);

    // Execute callback if registered
    const callback = this.deliveryCallbacks.get(messageId);
    if (callback) {
      callback(delivery);
    }

    return true;
  }

  getDeliveryStatus(messageId: string): DeliveryStatus | undefined {
    return this.pendingDeliveries.get(messageId);
  }

  isDelivered(messageId: string): boolean {
    const delivery = this.pendingDeliveries.get(messageId);
    return delivery?.status === 'delivered' || delivery?.status === 'read';
  }

  isFailed(messageId: string): boolean {
    const delivery = this.pendingDeliveries.get(messageId);
    return delivery?.status === 'failed';
  }

  private cleanupMessage(messageId: string) {
    this.pendingDeliveries.delete(messageId);
    this.deliveryCallbacks.delete(messageId);
  }

  // Get all pending deliveries for monitoring
  getPendingDeliveries(): DeliveryStatus[] {
    return Array.from(this.pendingDeliveries.values());
  }

  // Check for failed deliveries that need fallback
  getFailedDeliveries(): DeliveryStatus[] {
    return Array.from(this.pendingDeliveries.values()).filter(d => d.status === 'failed');
  }
}

export const deliveryMonitor = new DeliveryMonitor();
export type { DeliveryStatus };
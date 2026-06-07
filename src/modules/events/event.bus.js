import { EventEmitter } from "node:events";
import { eventDispatcher } from "./event.dispatcher.js";
import { logger } from "../../utils/logger.js";

class AsyncEventBus extends EventEmitter {
  async publish(type, payload = {}, options = {}) {
    const event = {
      type,
      payload,
      userId: options.userId || payload?.user?.id || payload?.userId || null,
      entityType: options.entityType || payload?.entityType || null,
      entityId: options.entityId || payload?.entityId || null,
      idempotencyKey: options.idempotencyKey || payload?.idempotencyKey || null
    };
    this.emit("event.received", event);
    const result = await eventDispatcher.dispatch(event, options.client);
    this.emit("event.dispatched", { event, result });
    return result;
  }

  publishLater(type, payload = {}, options = {}) {
    setImmediate(() => {
      this.publish(type, payload, options).catch((error) => {
        logger.error("Async event publish failed.", { module: "events", type, message: error.message });
      });
    });
  }
}

export const eventBus = new AsyncEventBus();

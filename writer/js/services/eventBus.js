// services/eventBus.js
// This file provides a singleton event bus for decoupled communication between components.

class EventBus {
    constructor() {
        this.subscribers = {};
    }

    subscribe(eventName, callback) {
        if (!this.subscribers[eventName]) {
            this.subscribers[eventName] = [];
        }
        this.subscribers[eventName].push(callback);
        return () => {
            this.subscribers[eventName] = this.subscribers[eventName].filter(
                (sub) => sub !== callback
            );
        };
    }

    publish(eventName, data) {
        if (this.subscribers[eventName]) {
            this.subscribers[eventName].forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in subscriber for event '${eventName}':`, error);
                }
            });
        }
    }
}
export const eventBus = new EventBus();
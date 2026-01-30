/* eslint-disable @typescript-eslint/no-explicit-any */
export type ServiceConstructor<T> = new (...args: any[]) => T
export type AbstractServiceConstructor<T> = abstract new (...args: any[]) => T
export type ServiceKey<T> = ServiceConstructor<T> | AbstractServiceConstructor<T> | string

/**
 * ServiceLocator provides centralized access to engine services and managers.
 */
export class ServiceLocator {
  private services = new Map<any, any>()

  /**
   * Register a service instance
   */
  register<T>(key: ServiceKey<T>, instance: T): void {
    if (this.services.has(key)) {
      const name = typeof key === 'string' ? key : key.name
      console.warn(`[ServiceLocator] Service ${name} is already registered, overwriting`)
    }
    this.services.set(key, instance)
  }

  /**
   * Get a service instance (returns undefined if not found)
   */
  get<T>(key: ServiceKey<T>): T | undefined {
    return this.services.get(key)
  }

  /**
   * Require a service instance (throws if not found)
   */
  require<T>(key: ServiceKey<T>): T {
    const service = this.get(key)
    if (!service) {
      const name = typeof key === 'string' ? key : key.name
      throw new Error(`[ServiceLocator] Required service ${name} is not registered`)
    }
    return service
  }

  /**
   * Check if a service is registered
   */
  has<T>(key: ServiceKey<T>): boolean {
    return this.services.has(key)
  }

  /**
   * Unregister a service (useful for testing/cleanup)
   */
  unregister<T>(key: ServiceKey<T>): void {
    this.services.delete(key)
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear()
  }

  /**
   * Get all registered instances that inherit from a specific base class (supports abstract classes)
   */
  getAllInstances<T>(baseClass: AbstractServiceConstructor<T>): T[] {
    const results: T[] = []
    this.services.forEach((instance) => {
      if (instance instanceof baseClass) {
        results.push(instance)
      }
    })
    return results
  }

  /**
   * Get all registered service types (for debugging)
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys()).map((key) => (typeof key === 'string' ? key : key.name))
  }
}

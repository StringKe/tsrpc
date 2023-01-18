/**
 * An abstract logger interface, which can be used to customize log behaviour.
 * Usually, you can pass `console` for convinience.
 * Or you can write your own implementation, for example, to report to a log system, or hide some log output.
 */
export interface Logger {
    debug(...args: unknown[]): void

    log(...args: unknown[]): void

    warn(...args: unknown[]): void

    error(...args: unknown[]): void
}

# tsrpc-tsrpc-cli

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build tsrpc-tsrpc-cli` to build the library.

## Running unit tests

Run `nx test tsrpc-tsrpc-cli` to execute the unit tests via [Jest](https://jestjs.io).

> 应该使用 commander 进行重构，并把单个 cli 的实现导出，允许用户扩展功能
> 比如实现 nx 里的 plugin 或者 modernjs 等 cli 的功能，也可以组合进 webpack 或者 rollup

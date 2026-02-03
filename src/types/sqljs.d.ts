declare module 'sql.js' {
  const initSqlJs: (config?: { locateFile?: (file: string) => string }) => Promise<{ Database: new (data?: Uint8Array) => any }>;
  export default initSqlJs;
}

declare module 'sql.js/dist/sql-wasm';

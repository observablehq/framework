export type Logger = {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};
export type LogLevel = keyof Logger;

export type Writer = {
  write: (contents: string) => void;
};

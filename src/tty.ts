export const bold = color(1, 22);
export const faint = color(2, 22);
export const italic = color(3, 23);
export const underline = color(4, 24);
export const red = color(31, 39);
export const green = color(32, 39);
export const yellow = color(33, 39);
export const blue = color(34, 39);
export const magenta = color(35, 39);
export const cyan = color(36, 39);

function color(code: number, reset: number): (text: string) => string {
  return process.stdout.isTTY ? (text: string) => `\x1b[${code}m${text}\x1b[${reset}m` : String;
}

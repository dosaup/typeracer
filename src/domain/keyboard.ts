import type { Finger, Hand, KeyboardPlatform, KeyGuide, Keystroke } from "./types";

export const fingerNames: Record<Finger, string> = {
  pinky: "Ngón út",
  ring: "Ngón áp út",
  middle: "Ngón giữa",
  index: "Ngón trỏ",
  thumb: "Ngón cái",
};
export const handNames: Record<Hand, string> = { left: "Tay trái", right: "Tay phải" };

const shifted: Record<string, string> = {
  "~": "`", "!": "1", "@": "2", "#": "3", $: "4", "%": "5",
  "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", _: "-",
  "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", '"': "'",
  "<": ",", ">": ".", "?": "/",
};
export const shiftedLegend = Object.fromEntries(
  Object.entries(shifted).map(([upper, lower]) => [lower, upper]),
);

const specialCodes: Record<string, string> = {
  "`": "Backquote", "-": "Minus", "=": "Equal", "[": "BracketLeft",
  "]": "BracketRight", "\\": "Backslash", ";": "Semicolon", "'": "Quote",
  ",": "Comma", ".": "Period", "/": "Slash", " ": "Space",
};

const fingerByCode: Record<string, { hand: Hand; finger: Finger }> = {};
function assign(codes: string[], hand: Hand, finger: Finger) {
  codes.forEach((code) => { fingerByCode[code] = { hand, finger }; });
}
assign(["Backquote", "Digit1", "KeyQ", "KeyA", "KeyZ", "Tab", "CapsLock", "ShiftLeft", "ControlLeft"], "left", "pinky");
assign(["Digit2", "KeyW", "KeyS", "KeyX"], "left", "ring");
assign(["Digit3", "KeyE", "KeyD", "KeyC"], "left", "middle");
assign(["Digit4", "Digit5", "KeyR", "KeyT", "KeyF", "KeyG", "KeyV", "KeyB"], "left", "index");
assign(["Digit6", "Digit7", "KeyY", "KeyU", "KeyH", "KeyJ", "KeyN", "KeyM"], "right", "index");
assign(["Digit8", "KeyI", "KeyK", "Comma"], "right", "middle");
assign(["Digit9", "KeyO", "KeyL", "Period"], "right", "ring");
assign(["Digit0", "Minus", "Equal", "KeyP", "BracketLeft", "BracketRight", "Backslash", "Semicolon", "Quote", "Slash", "Backspace", "Enter", "ShiftRight", "ControlRight"], "right", "pinky");
assign(["Fn", "AltLeft", "MetaLeft"], "left", "thumb");
assign(["Space", "AltRight", "MetaRight", "ContextMenu"], "right", "thumb");

export function keystrokeFor(character: string): Keystroke | null {
  if (!character) return null;
  const key = shifted[character] ?? character.toLowerCase();
  const code = specialCodes[key] ?? (/\d/.test(key) ? `Digit${key}` : `Key${key.toUpperCase()}`);
  if (!fingerByCode[code]) return null;
  return { key, code, shift: character !== key };
}

export function guideFor(character: string): KeyGuide | null {
  const keystroke = keystrokeFor(character);
  if (!keystroke) return null;
  const assignment = fingerByCode[keystroke.code];
  return {
    key: keystroke.key,
    code: keystroke.code,
    hand: assignment.hand,
    finger: assignment.finger,
    shift: keystroke.shift ? (assignment.hand === "left" ? "right" : "left") : null,
  };
}

export interface KeyboardKey { label: string; code: string; width?: number }
const letterKeys = (letters: string): KeyboardKey[] => [...letters].map((letter) => ({
  label: letter.toUpperCase(), code: `Key${letter.toUpperCase()}`,
}));

const bottomRowByPlatform: Record<KeyboardPlatform, KeyboardKey[]> = {
  mac: [
    { label: "fn", code: "Fn", width: 1.2 }, { label: "⌃", code: "ControlLeft", width: 1.2 },
    { label: "⌥", code: "AltLeft", width: 1.4 }, { label: "⌘", code: "MetaLeft", width: 1.5 },
    { label: "Space", code: "Space", width: 6 }, { label: "⌘", code: "MetaRight", width: 1.5 },
    { label: "⌥", code: "AltRight", width: 1.4 }, { label: "⌃", code: "ControlRight", width: 1.2 },
  ],
  windows: [
    { label: "Ctrl", code: "ControlLeft", width: 1.5 }, { label: "Win", code: "MetaLeft", width: 1.4 },
    { label: "Alt", code: "AltLeft", width: 1.4 }, { label: "Space", code: "Space", width: 6 },
    { label: "Alt", code: "AltRight", width: 1.4 }, { label: "Win", code: "MetaRight", width: 1.4 },
    { label: "Menu", code: "ContextMenu", width: 1.3 }, { label: "Ctrl", code: "ControlRight", width: 1.5 },
  ],
  linux: [
    { label: "Ctrl", code: "ControlLeft", width: 1.5 }, { label: "Super", code: "MetaLeft", width: 1.5 },
    { label: "Alt", code: "AltLeft", width: 1.4 }, { label: "Space", code: "Space", width: 6 },
    { label: "AltGr", code: "AltRight", width: 1.4 }, { label: "Super", code: "MetaRight", width: 1.5 },
    { label: "Menu", code: "ContextMenu", width: 1.3 }, { label: "Ctrl", code: "ControlRight", width: 1.5 },
  ],
};

export function keyboardRowsFor(platform: KeyboardPlatform): KeyboardKey[][] {
  return [
    [
      { label: "`", code: "Backquote" },
      ..."1234567890".split("").map((label) => ({ label, code: `Digit${label}` })),
      { label: "-", code: "Minus" }, { label: "=", code: "Equal" },
      { label: "⌫", code: "Backspace", width: 2 },
    ],
    [
      { label: "Tab", code: "Tab", width: 1.5 }, ...letterKeys("qwertyuiop"),
      { label: "[", code: "BracketLeft" }, { label: "]", code: "BracketRight" },
      { label: "\\", code: "Backslash", width: 1.5 },
    ],
    [
      { label: "Caps", code: "CapsLock", width: 1.8 }, ...letterKeys("asdfghjkl"),
      { label: ";", code: "Semicolon" }, { label: "'", code: "Quote" },
      { label: "Enter", code: "Enter", width: 2.2 },
    ],
    [
      { label: "Shift", code: "ShiftLeft", width: 2.3 }, ...letterKeys("zxcvbnm"),
      { label: ",", code: "Comma" }, { label: ".", code: "Period" },
      { label: "/", code: "Slash" }, { label: "Shift", code: "ShiftRight", width: 2.7 },
    ],
    bottomRowByPlatform[platform],
  ];
}
export const keyboardRows = keyboardRowsFor("windows");

export function ownershipForCode(code: string): { hand: Hand; finger: Finger } | null {
  return fingerByCode[code] ?? null;
}

export async function detectKeyboardPlatform(): Promise<KeyboardPlatform> {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const value = `${nav.userAgentData?.platform ?? ""} ${navigator.platform ?? ""} ${navigator.userAgent}`.toLowerCase();
  if (value.includes("mac") || value.includes("iphone") || value.includes("ipad")) return "mac";
  if (value.includes("linux") || value.includes("x11")) return "linux";
  return "windows";
}

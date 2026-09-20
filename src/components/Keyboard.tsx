import { fingerNames, guideFor, handNames, keyboardRowsFor, shiftedLegend } from "../domain/keyboard";
import type { Finger, Hand, KeyboardPlatform, KeyGuide } from "../domain/types";

const fingers: Finger[] = ["pinky", "ring", "middle", "index", "thumb"];

export function HandDiagram({ hand, guide }: { hand: Hand; guide: KeyGuide | null }) {
  const isRight = hand === "right";
  return (
    <div className="hand-diagram">
      <svg
        viewBox="0 0 140 126"
        aria-label={`Sơ đồ ${handNames[hand].toLowerCase()}`}
        role="img"
      >
        <g transform={isRight ? "translate(140 0) scale(-1 1)" : undefined}>
          <path
            className="hand-palm"
            d="M23 62 Q19 59 19 69 L22 89 Q24 104 37 110 L40 122 H87 L92 104 Q111 93 123 75 Q127 67 121 62 Q115 58 109 65 L95 78 V62 Z"
          />
          {fingers.slice(0, 4).map((finger, index) => {
            const heights = [35, 49, 55, 44];
            const x = 19 + index * 19;
            const active =
              (guide?.hand === hand && guide.finger === finger) ||
              (guide?.shift === hand && finger === "pinky");
            return (
              <rect
                key={finger}
                className={active ? "hand-finger active" : "hand-finger"}
                x={x}
                y={65 - heights[index]}
                width="18"
                height={heights[index] + 14}
                rx="9"
              />
            );
          })}
          <path
            className={
              guide?.hand === hand && guide.finger === "thumb"
                ? "hand-finger active"
                : "hand-finger"
            }
            d="M90 80 L109 64 Q115 58 121 63 Q127 68 121 77 L100 99 Q94 104 88 99 Q82 92 90 80Z"
          />
          <path
            className="palm-line"
            d="M38 88 Q58 77 79 88 M51 100 Q66 94 77 98"
          />
        </g>
      </svg>
      <span
        className={guide?.hand === hand ? "hand-label active" : "hand-label"}
      >
        {handNames[hand]}
      </span>
    </div>
  );
}

export function Keyboard({
  guide,
  wrongCode,
  unlockedKeys,
  newKeys,
  platform,
}: {
  guide: KeyGuide | null;
  wrongCode: string | null;
  unlockedKeys: string[];
  newKeys: string[];
  platform: KeyboardPlatform;
}) {
  const unlockedCodes = new Set(unlockedKeys.map((key) => guideFor(key)?.code).filter(Boolean));
  const newCodes = new Set(newKeys.map((key) => guideFor(key)?.code).filter(Boolean));
  const keyboardRows = keyboardRowsFor(platform);
  return (
    <div className="keyboard-guide">
      <div className="keyboard-scroll">
        <div
          className="keyboard"
          role="img"
          aria-label={
            guide
              ? `Bàn phím ${platform}. Phím tiếp theo: ${guide.key === " " ? "Space" : guide.key.toUpperCase()}; ${fingerNames[guide.finger]}, ${handNames[guide.hand]}.`
              : `Bàn phím ${platform}`
          }
        >
          {keyboardRows.map((row, index) => (
            <div className="keyboard-row" key={index}>
              {row.map((key) => {
                const active = guide?.code === key.code;
                const shift =
                  guide?.shift &&
                  key.code ===
                    (guide.shift === "left" ? "ShiftLeft" : "ShiftRight");
                const wrong = wrongCode === key.code;
                const unlocked = unlockedCodes.has(key.code);
                const introduced = newCodes.has(key.code);
                const upper = shiftedLegend[key.label];
                return (
                  <div
                    key={key.code}
                    style={{ flex: key.width ?? 1 }}
                    className={`keyboard-key ${unlocked ? "key-unlocked" : ""} ${introduced ? "key-new" : ""} ${active ? "key-active" : ""} ${shift ? "key-shift" : ""} ${wrong ? "key-wrong" : ""} ${key.width ? "key-wide" : ""}`}
                  >
                    {upper ? <span className="key-legends">
                      <span className={active && guide?.shift ? "legend-selected" : ""}>{upper}</span>
                      <span className={active && !guide?.shift ? "legend-selected" : ""}>{key.label}</span>
                    </span> : key.label}
                    {(key.code === "KeyF" || key.code === "KeyJ") && (
                      <i className="home-notch" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

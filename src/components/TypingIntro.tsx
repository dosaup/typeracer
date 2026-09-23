import { ArrowLeft, ArrowRight, Check, Hand, Keyboard, MoveUp, X } from "lucide-react";
import { useState } from "react";
import {
  keyboardRowsFor,
  ownershipForCode,
  shiftedLegend,
} from "../domain/keyboard";
import type { Finger, KeyboardPlatform } from "../domain/types";

type IntroView = "home" | "hands" | "fingers";

const steps: Array<{ id: IntroView; eyebrow: string; title: string; description: string }> = [
  {
    id: "home",
    eyebrow: "BƯỚC 1 · VỊ TRÍ XUẤT PHÁT",
    title: "Đặt tay lên hàng phím cơ sở",
    description:
      "Đặt tám ngón lên hàng giữa. Hai ngón trỏ chạm F và J — hai phím có gờ nhỏ để tìm lại vị trí mà không cần nhìn xuống.",
  },
  {
    id: "hands",
    eyebrow: "BƯỚC 2 · CHIA VÙNG BÀN PHÍM",
    title: "Mỗi tay phụ trách một nửa",
    description:
      "Màu trên bàn tay trùng với vùng phím mà tay đó phụ trách. Khi gõ xong, đưa ngón trở về hàng cơ sở thay vì di chuyển cả bàn tay.",
  },
  {
    id: "fingers",
    eyebrow: "BƯỚC 3 · ĐÚNG NGÓN, ĐÚNG PHÍM",
    title: "Mỗi ngón có một đường riêng",
    description:
      "Mỗi ngón tay và các phím của ngón đó dùng cùng một màu. Ngón trỏ phụ trách hai cột ở giữa; ngón cái dùng Space.",
  },
];

const fingerClass: Record<Finger, string> = {
  pinky: "zone-pinky",
  ring: "zone-ring",
  middle: "zone-middle",
  index: "zone-index",
  thumb: "zone-thumb",
};
const homeCodes = new Set(["KeyA", "KeyS", "KeyD", "KeyF", "KeyJ", "KeyK", "KeyL", "Semicolon"]);

function zoneClass(code: string, view: IntroView): string {
  if (view === "home") return homeCodes.has(code) ? "zone-home" : "";
  const owner = ownershipForCode(code);
  if (!owner) return "";
  if (view === "hands") return owner.hand === "left" ? "zone-left" : "zone-right";
  return fingerClass[owner.finger];
}

function IntroKeyboard({ view, platform }: { view: IntroView; platform: KeyboardPlatform }) {
  return (
    <div className={`intro-keyboard intro-keyboard--${view}`} aria-label={`Sơ đồ bàn phím ${platform}`}>
      {keyboardRowsFor(platform).map((row, rowIndex) => (
        <div className="intro-keyboard-row" key={rowIndex}>
          {row.map((key) => {
            const shifted = shiftedLegend[key.label];
            return (
              <span
                className={`intro-key ${zoneClass(key.code, view)} ${(key.code === "KeyF" || key.code === "KeyJ") ? "intro-home-anchor" : ""}`}
                key={key.code}
                style={{ flex: key.width ?? 1 }}
              >
                {shifted ? (
                  <span className="intro-key-legends"><span>{shifted}</span><span>{key.label}</span></span>
                ) : key.label}
                {(key.code === "KeyF" || key.code === "KeyJ") && <i />}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function HandSvg({ side, view }: { side: "left" | "right"; view: IntroView }) {
  const clipId = `intro-hand-${side}`;
  const outline = "M82 252 C82 229 78 211 68 193 C57 173 48 151 45 130 L37 82 C35 68 41 58 52 56 C63 54 71 63 73 77 L81 119 L79 51 C79 35 87 25 99 25 C112 25 119 36 118 51 L118 111 L123 31 C124 15 133 6 145 7 C158 8 164 19 162 35 L157 113 L169 50 C172 35 181 27 193 30 C205 33 210 45 206 60 L192 126 C191 132 192 137 195 139 C199 141 203 138 207 132 L222 105 C229 93 241 89 251 95 C261 101 262 114 255 126 L230 169 C220 188 206 203 190 214 L181 252 Z";
  return (
    <svg className={`intro-hand-svg intro-hand-svg--${side} intro-hand-svg--${view}`} viewBox="0 0 280 260" aria-hidden="true">
      <defs><clipPath id={clipId}><path d={outline} /></clipPath></defs>
      <path className="intro-hand-base" d={outline} />
      <g className="intro-hand-zones" clipPath={`url(#${clipId})`}>
        <path className="intro-hand-zone intro-hand-zone--pinky" d="M27 42 H78 L91 164 L53 181 Z" />
        <path className="intro-hand-zone intro-hand-zone--ring" d="M75 10 H121 L123 157 L89 166 Z" />
        <path className="intro-hand-zone intro-hand-zone--middle" d="M116 0 H164 L158 157 L122 157 Z" />
        <path className="intro-hand-zone intro-hand-zone--index" d="M157 17 H212 L194 165 L156 157 Z" />
        <path className="intro-hand-zone intro-hand-zone--thumb" d="M186 113 L270 74 L276 154 L201 205 L174 170 Z" />
      </g>
      <path className="intro-hand-outline" d={outline} />
      <g className="intro-hand-details">
        <path d="M82 166 C108 150 147 153 171 171 M101 195 C125 184 153 188 170 202" />
        <path d="M80 120 C91 128 104 129 117 124 M119 111 C130 119 144 120 157 113 M158 114 C170 124 182 128 193 125" />
      </g>
      <g className="intro-nails">
        <rect x="47" y="63" width="17" height="25" rx="8" />
        <rect x="88" y="32" width="19" height="28" rx="9" />
        <rect x="132" y="14" width="19" height="29" rx="9" />
        <rect x="177" y="38" width="18" height="27" rx="9" transform="rotate(10 186 51)" />
        <rect x="226" y="99" width="16" height="25" rx="8" transform="rotate(38 234 111)" />
      </g>
      <g className="intro-home-tips">
        <circle cx="55" cy="76" r="9" /><circle cx="98" cy="47" r="9" />
        <circle cx="142" cy="29" r="9" /><circle cx="186" cy="52" r="9" />
      </g>
    </svg>
  );
}

function IllustratedHands({ view }: { view: IntroView }) {
  return (
    <div className={`intro-hands intro-hands--${view}`} aria-hidden="true">
      <HandSvg side="left" view={view} />
      <HandSvg side="right" view={view} />
    </div>
  );
}

export function TypingIntro({
  keyboardPlatform,
  onBegin,
  onExit,
  completionLabel = "Bắt đầu bài luyện",
}: {
  keyboardPlatform: KeyboardPlatform;
  onBegin: () => void;
  onExit?: () => void;
  completionLabel?: string;
}) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const finalStep = step === steps.length - 1;
  return (
    <section className="typing-intro panel">
      <div className="typing-intro-copy">
        {onExit && (
          <button className="intro-exit icon-button" onClick={onExit} aria-label="Đóng hướng dẫn"><X size={18} /></button>
        )}
        <span className="intro-icon"><Hand size={24} /></span>
        <span className="eyebrow">{current.eyebrow}</span>
        <h1>{current.title}</h1>
        <p>{current.description}</p>
        <span className="intro-layout-name"><Keyboard size={14} /> Bàn phím {keyboardPlatform === "mac" ? "Mac" : keyboardPlatform === "windows" ? "Windows" : "Linux"}</span>
        <div className="intro-progress" aria-label={`Bước ${step + 1} trên ${steps.length}`}>
          {steps.map((item, index) => (
            <button
              key={item.id}
              className={index === step ? "active" : ""}
              aria-label={`Xem bước ${index + 1}: ${item.title}`}
              aria-current={index === step ? "step" : undefined}
              onClick={() => setStep(index)}
            />
          ))}
        </div>
      </div>
      <div className="typing-intro-visual">
        <div className="intro-screen-note"><Keyboard size={16} /> Không nhìn xuống bàn phím khi gõ</div>
        <div className="intro-board" key={current.id}>
          <IntroKeyboard view={current.id} platform={keyboardPlatform} />
          <IllustratedHands view={current.id} />
        </div>
        <div className="intro-direct-note">
          {current.id === "home" ? <><MoveUp size={14} /> F và J là hai mốc ngón trỏ</> : "Màu trên tay khớp trực tiếp với màu của phím"}
        </div>
      </div>
      <div className="typing-intro-actions">
        <button className="button button-secondary" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        {finalStep ? (
          <button className="button button-primary" onClick={onBegin}><Check size={16} /> {completionLabel}</button>
        ) : (
          <button className="button button-primary" onClick={() => setStep((value) => value + 1)}>Tiếp theo <ArrowRight size={16} /></button>
        )}
      </div>
    </section>
  );
}

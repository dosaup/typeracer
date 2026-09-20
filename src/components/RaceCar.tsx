import { useId } from "react";

/** Side-view vector sprite; `color` recolors every painted body panel. */
export function RaceCar({ color, moving, speed }: { color: string; moving: boolean; speed: number }) {
  const id = useId().replaceAll(":", "");
  return <svg className={`race-car ${moving && speed > 0 ? "race-car--moving" : ""}`} viewBox="0 0 240 122" aria-hidden="true"
    style={{ color, animationDuration: `${Math.max(.12, 2 / Math.max(1, speed / 12))}s` }}>
    <defs>
      <linearGradient id={`${id}-paint`} x2="0" y2="1"><stop stopColor="#fff" stopOpacity=".5"/><stop offset=".45" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".14"/></linearGradient>
      <linearGradient id={`${id}-glass`} x2="0" y2="1"><stop stopColor="#d4f5ff"/><stop offset="1" stopColor="#77c3df"/></linearGradient>
    </defs>
    <ellipse cx="128" cy="115" rx="105" ry="5" fill="#101a2a" opacity=".2"/>
    <g className="car-body" stroke="#262c32" strokeWidth="3.5" strokeLinejoin="round">
      <path d="M20 96Q13 94 15 80L22 61Q27 51 39 47Q70 1 113 5Q153 4 178 48Q221 50 230 78L234 92Q234 105 214 106H35Q16 105 20 96Z" fill="currentColor"/>
      <path d="M20 96Q13 94 15 80L22 61Q27 51 39 47Q70 1 113 5Q153 4 178 48Q221 50 230 78L234 92Q234 105 214 106H35Q16 105 20 96Z" fill={`url(#${id}-paint)`} stroke="none"/>
      <path d="M51 47Q74 15 110 16Q142 15 164 47Z" fill={`url(#${id}-glass)`}/>
      <path d="M104 17V47" fill="none" strokeWidth="7"/>
      <path d="M70 39L89 23M120 41L139 24" stroke="white" opacity=".6" strokeWidth="5" strokeLinecap="round"/>
      <path d="M105 51L104 91Q105 99 114 99H151Q157 58 184 61" fill="none" stroke="#000" opacity=".17" strokeWidth="2.5"/>
      <path d="M112 65H123" stroke="#000" opacity=".3" strokeLinecap="round"/>
      <path d="M157 41Q168 38 173 48Q173 54 162 53Q154 53 157 41Z" fill="currentColor"/>
      <path d="M27 55Q36 51 35 58L29 69H19" fill="#f45e55"/>
      <ellipse cx="219" cy="68" rx="7" ry="12" transform="rotate(-40 219 68)" fill="#dcf7ff"/>
      <rect x="11" y="85" width="14" height="12" rx="4" fill="#818f92"/>
      <rect x="223" y="85" width="14" height="12" rx="4" fill="#818f92"/>
      <path d="M35 105Q30 68 60 68Q91 68 91 105M160 105Q157 68 186 68Q217 68 217 104" fill="#262c32"/>
    </g>
    {[60, 187].map(x => <g key={x} className="car-wheel" style={{ transformOrigin: `${x}px 96px` }}>
      <circle cx={x} cy="96" r="23" fill="#292d32" stroke="#191d23" strokeWidth="3"/>
      <circle cx={x} cy="96" r="14" fill="#adb6bc" stroke="#e0e5e8" strokeWidth="2"/>
      <path d={`M${x} 84V108M${x - 12} 96H${x + 12}`} stroke="#78858e" strokeWidth="3"/>
      <circle cx={x} cy="96" r="6" fill="#59656e"/>
    </g>)}
  </svg>;
}

import { useState } from "react";
import type { SpeedUnit } from "../domain/types";
import { formatSpeed } from "../domain/typing";
import { RaceCar } from "./RaceCar";

const carColors = ["#ff6b6b", "#ffad32", "#43b581", "#4d96ff", "#9b6bff", "#e75da1"];

function randomPair() {
  const first = Math.floor(Math.random() * carColors.length);
  let second = Math.floor(Math.random() * (carColors.length - 1));
  if (second >= first) second += 1;
  return [carColors[first], carColors[second]];
}

export function RaceTrack({ progress, currentWpm, averageWpm, elapsed, characters, running, hasHistory, countdown, showStart, speedUnit }: {
  progress: number; currentWpm: number; averageWpm: number; elapsed: number;
  characters: number; running: boolean; hasHistory: boolean;
  countdown: number | null; showStart: boolean;
  speedUnit: SpeedUnit;
}) {
  const [colors] = useState(randomPair);
  const ghostProgress = Math.min(1, averageWpm * 5 * elapsed / 60_000 / characters);
  const averageFinishMs = characters / 5 / Math.max(1, averageWpm) * 60_000;
  const youFinished = progress >= 1;
  const avgFinished = ghostProgress >= 1;
  const youPlace = youFinished ? (elapsed <= averageFinishMs ? 1 : 2) : null;
  const avgPlace = avgFinished ? (youFinished && youPlace === 1 ? 2 : 1) : null;
  const racers = [
    { id: "you", label: "Bạn", color: colors[0], progress, wpm: youFinished && elapsed > 0 ? characters / 5 / (elapsed / 60_000) : currentWpm, place: youPlace },
    { id: "ghost", label: "Avg", color: colors[1], progress: ghostProgress, wpm: averageWpm, place: avgPlace },
  ];
  return <section className="game-race" aria-label="Đường đua luyện tập hai xe">
    <div className="game-road">
      {racers.map(racer => {
        const racePercent = Math.min(100, Math.max(0, racer.progress * 100));
        return <div className="game-lane" key={racer.id}>
          <div className="lane-course" role="progressbar" aria-label={`Tiến độ xe ${racer.label.toLowerCase()}`} aria-valuenow={Math.floor(racer.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="lane-dashes"/>
            <span className="lane-start"/>
            <div className="game-car-position" style={{ left: `${racePercent}%`, transform: `translate(${-racePercent}%, -50%)` }}>
              <span className="car-name" style={{ borderColor: racer.color }}>
                {racer.label}
              </span>
              <RaceCar color={racer.color} speed={racer.wpm} moving={running && racer.progress < 1}/>
            </div>
          </div>
          <div className={`racer-speed ${racer.place ? "racer-speed--finished" : ""}`}>
            {racer.place ? (
              <><strong>Hạng {racer.place}</strong><small>{formatSpeed(racer.wpm, speedUnit)}</small></>
            ) : (
              <strong>{formatSpeed(racer.wpm, speedUnit)}</strong>
            )}
          </div>
          <span className="lane-finish" aria-hidden="true"/>
        </div>;
      })}
      {(countdown !== null || showStart) && (
        <div className="race-countdown-overlay" role="status" aria-live="polite" aria-atomic="true">
          <span>{countdown !== null ? "ĐẶT TAY LÊN F & J" : "ĐƯỜNG ĐUA ĐÃ MỞ"}</span>
          <strong key={countdown ?? "go"}>{countdown ?? "Bắt đầu!"}</strong>
          <small>{countdown !== null ? "Sẵn sàng gõ khi đếm ngược kết thúc" : "Gõ phím đang sáng"}</small>
        </div>
      )}
    </div>
    <span className="sr-only">{hasHistory ? "Avg dùng tốc độ trung bình lịch sử." : "Avg dùng tốc độ mục tiêu của bài."}</span>
  </section>;
}

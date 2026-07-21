/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";

interface Props {
  targetDate: string;
  className?: string;
}

interface TimeUnits {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function unitsUntil(target: number): TimeUnits | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

/** Plain component, not an island, so the sections that already hydrate can
 * render a countdown without shipping a second island per event card. */
export default function Countdown({ targetDate, className = "countdown" }: Props) {
  const target = new Date(targetDate).getTime();
  // Starts null so the server-rendered markup and the first client render
  // agree; the real values land on the first tick after hydration.
  const [time, setTime] = useState<TimeUnits | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const tick = () => {
      setTime(unitsUntil(target));
      setStarted(true);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (started && !time) {
    return (
      <div class={className}>
        <span class="badge badge-live">En juego</span>
      </div>
    );
  }

  const pad = (v: number) => String(v).padStart(2, "0");
  const cells: [string, string][] = [
    [time ? pad(time.days) : "--", "Días"],
    [time ? pad(time.hours) : "--", "Hrs"],
    [time ? pad(time.minutes) : "--", "Min"],
    [time ? pad(time.seconds) : "--", "Seg"],
  ];

  return (
    <div class={className}>
      {cells.map(([value, label]) => (
        <div key={label} class="timebox">
          <b>{value}</b>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

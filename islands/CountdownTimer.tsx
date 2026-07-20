import { useEffect, useState } from "preact/hooks";

interface CountdownTimerProps {
  targetDate: string;
  className?: string;
}

interface TimeUnits {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function CountdownTimer({
  targetDate,
  className = "countdown",
}: CountdownTimerProps) {
  const [time, setTime] = useState<TimeUnits | null>(null);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(targetDate).getTime();
      const diff = target - Date.now();

      if (diff <= 0) {
        setIsActive(false);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTime({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!isActive || !time) {
    return (
      <div className={className}>
        <div class="badge">En juego</div>
      </div>
    );
  }

  const formatTime = (value: number) => String(value).padStart(2, "0");
  const labels = ["D", "H", "M", "S"];
  const values = [time.days, time.hours, time.minutes, time.seconds];

  return (
    <div className={className}>
      {values.map((value, index) => (
        <div key={index} class="timebox">
          <b>{formatTime(value)}</b>
          <small>{labels[index]}</small>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState } from "preact/hooks";

interface CalendarEvent {
  date: number;
  title: string;
}

const events: Record<number, CalendarEvent[]> = {
  12: [{ date: 12, title: "Entreno DEKA" }],
  19: [{ date: 19, title: "HYROX Team" }],
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const days: (number | null)[] = [];
  const firstDay = getFirstDayOfMonth(currentMonth);
  const daysInMonth = getDaysInMonth(currentMonth);

  // Add empty slots for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return (
    <div class="calendar">
      <div class="cal-head">
        <button class="btn dark" style="padding:8px 12px" onClick={handlePrevMonth}>
          Prev
        </button>
        <h3>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button class="btn dark" style="padding:8px 12px" onClick={handleNextMonth}>
          Next
        </button>
      </div>
      <div class="cal-grid">
        {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
          <div key={day} class="cal-label">
            {day}
          </div>
        ))}
        {days.map((day, idx) => (
          <div key={idx} class={`cal-cell ${!day ? "empty" : ""}`}>
            {day && (
              <>
                <div class="day">{day}</div>
                {events[day]?.map((event) => (
                  <button
                    key={event.title}
                    class="event-chip"
                    onclick={() => alert(`Signup for ${event.title}`)}
                  >
                    {event.title}
                  </button>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

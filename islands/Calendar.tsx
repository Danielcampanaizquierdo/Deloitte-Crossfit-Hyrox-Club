import { useState } from "preact/hooks";

interface CalEvent {
  id: string;
  title: string;
  date: string;
}

interface Props {
  events: CalEvent[];
}

export default function Calendar({ events }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventsByDay: Record<number, CalEvent[]> = {};
  for (const ev of events) {
    const d = new Date(ev.date);
    if (
      d.getFullYear() === currentMonth.getFullYear() &&
      d.getMonth() === currentMonth.getMonth()
    ) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  }

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handlePrevMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );

  const handleNextMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );

  const days: (number | null)[] = [];
  const firstDay = getFirstDayOfMonth(currentMonth);
  const daysInMonth = getDaysInMonth(currentMonth);

  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const openSignup = () => {
    const modal = document.getElementById("signupModal");
    if (modal) modal.style.display = "flex";
  };

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
                {eventsByDay[day]?.map((ev) => (
                  <button
                    key={ev.id}
                    class="event-chip"
                    onClick={openSignup}
                  >
                    {ev.title}
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

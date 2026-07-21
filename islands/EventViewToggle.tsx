/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
import { useState } from "preact/hooks";

type ViewType = "cards" | "calendar";

export default function EventViewToggle() {
  const [view, setView] = useState<ViewType>("cards");

  const handleViewChange = (newView: ViewType) => {
    setView(newView);
    const cardsEl = document.getElementById("eventCards");
    const calendarEl = document.getElementById("eventCalendar");
    
    if (cardsEl && calendarEl) {
      if (newView === "cards") {
        cardsEl.classList.remove("hidden");
        calendarEl.classList.add("hidden");
      } else {
        cardsEl.classList.add("hidden");
        calendarEl.classList.remove("hidden");
      }
    }
  };

  return (
    <div class="tools">
      <button
        class={`btn ${view === "cards" ? "green" : "dark"}`}
        style="padding:10px 13px"
        onClick={() => handleViewChange("cards")}
      >
        Cards
      </button>
      <button
        class={`btn ${view === "calendar" ? "green" : "dark"}`}
        style="padding:10px 13px"
        onClick={() => handleViewChange("calendar")}
      >
        Calendar
      </button>
    </div>
  );
}

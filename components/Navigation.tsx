/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
export default function Navigation() {
  return (
    <nav class="nav">
      <button class="tab active" data-tab="events">
        Eventos
      </button>
      <button class="tab" data-tab="leaderboard">
        Leaderboard
      </button>
      <button class="tab" data-tab="results">
        Resultados
      </button>
      <button class="tab" data-tab="members">
        Members
      </button>
      <button class="tab" data-tab="admin">
        Admin
      </button>
    </nav>
  );
}

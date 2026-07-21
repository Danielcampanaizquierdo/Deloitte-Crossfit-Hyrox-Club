/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";

const LINKS: [string, string][] = [
  ["#events", "Eventos"],
  ["#wod", "WOD"],
  ["#leaderboard", "PRs"],
  ["#results", "Resultados"],
  ["#members", "Comunidad"],
];

export default function Footer() {
  return (
    <footer class="footer">
      <div class="footer-main">
        <div>
          <div class="brandtitle">Deloitte CrossFit HYROX Club</div>
          <p class="muted">Madrid · Train hard. Progress together.</p>
        </div>
        <nav class="footer-links" aria-label="Enlaces del club">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>
      </div>
      <div class="footer-legal">
        © {new Date().getFullYear()} Deloitte CrossFit & HYROX Club
      </div>
    </footer>
  );
}

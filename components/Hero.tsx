export default function Hero() {
  return (
    <section class="hero">
      <div>
        <div class="pill">
          <strong>●</strong> Deloitte CrossFit & HYROX Club
        </div>
        <h1>
          Train hard.
          <br />
          Progress <span>together.</span>
        </h1>
        <p>
          The central point for the club: upcoming events, sign-ups, member
          profiles, PRs, past competitions and admin moderation.
        </p>
        <div class="actions">
          <button class="btn green">Apuntarme</button>
          <button class="btn dark">Crear perfil</button>
        </div>
      </div>
      <aside class="hero-card">
        <div class="wordmark">
          <img src="/images/letras.png" alt="Deloitte CrossFit HYROX Club" />
        </div>
        <div class="eyebrow" style="margin-bottom:10px">
          Próximo evento
        </div>
        <h2 style="font-family:var(--font-display);letter-spacing:.08em;text-transform:uppercase;margin:0 0 14px;font-size:32px">
          Entreno DEKA
        </h2>
        <div class="countdown" data-countdown="2026-07-12T10:00:00"></div>
      </aside>
    </section>
  );
}

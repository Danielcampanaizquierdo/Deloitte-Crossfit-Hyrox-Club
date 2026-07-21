/** @jsxImportSource preact */
export default function ResultsSection() {
  return (
    <section id="results" class="content">
      <div class="section-head">
        <h2>Nuestras batallas</h2>
        <button class="btn dark">+ Añadir resultado</button>
      </div>
      <div class="grid cards3">
        <article class="card">
          <div class="imgph">Past event photo</div>
          <div class="card-body">
            <h3>HYROX Madrid</h3>
            <div class="eyebrow">20 Jun 2026</div>
            <p class="muted">
              Great team performance, strong finishing times and amazing spirit
              throughout the competition.
            </p>
          </div>
        </article>
        <article class="card">
          <div class="imgph">Finish line</div>
          <div class="card-body">
            <h3>DEKA Event</h3>
            <div class="eyebrow">10 May 2026</div>
            <p class="muted">
              Internal challenge with strong team cohesion. Personal PRs
              achieved and future goals set.
            </p>
          </div>
        </article>
        <article class="card">
          <div class="imgph">Team photo</div>
          <div class="card-body">
            <h3>Box Throwdown</h3>
            <div class="eyebrow">28 Apr 2026</div>
            <p class="muted">
              Friendly competition focused on partnership WODs and relay
              challenges. Great day overall.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

/** @jsxImportSource preact */
export default function MembersSection() {
  return (
    <section id="members" class="content">
      <div class="section-head">
        <h2>Member profiles</h2>
        <button class="btn dark">+ Añadir miembro</button>
      </div>
      <div class="filters">
        <input
          class="input"
          placeholder="Search member, goal, location..."
        />
        <select class="input">
          <option>All levels</option>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>
        <select class="input">
          <option>All goals</option>
          <option>CrossFit</option>
          <option>HYROX</option>
          <option>General fitness</option>
        </select>
      </div>
      <div class="stats">
        <div class="stat">
          <small>Members</small>
          <b>24</b>
        </div>
        <div class="stat">
          <small>Competitors</small>
          <b>8</b>
        </div>
        <div class="stat">
          <small>HYROX focus</small>
          <b>15</b>
        </div>
        <div class="stat">
          <small>Pending approvals</small>
          <b>3</b>
        </div>
      </div>
      <div class="grid cards3">
        <article class="card">
          <div class="card-body">
            <div class="member-head">
              <div class="avatar">DA</div>
              <div>
                <h3>Demo Athlete</h3>
                <div class="meta">📍 Madrid</div>
              </div>
            </div>
            <div style="margin-top:12px">
              <div class="eyebrow">Focus</div>
              <p class="muted">CrossFit · HYROX training</p>
              <div class="eyebrow" style="margin-top:10px">
                Level
              </div>
              <p class="muted">Intermediate</p>
            </div>
          </div>
        </article>
        <article class="card">
          <div class="card-body">
            <div class="member-head">
              <div class="avatar">MB</div>
              <div>
                <h3>Member B</h3>
                <div class="meta">📍 Madrid</div>
              </div>
            </div>
            <div style="margin-top:12px">
              <div class="eyebrow">Focus</div>
              <p class="muted">Strength training</p>
              <div class="eyebrow" style="margin-top:10px">
                Level
              </div>
              <p class="muted">Advanced</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

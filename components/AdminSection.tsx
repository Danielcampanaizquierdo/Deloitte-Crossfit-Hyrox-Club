/** @jsxImportSource preact */
export default function AdminSection() {
  return (
    <section id="admin" class="content">
      <div id="adminLocked" class="admin-box">
        <h2 style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:.1em;margin-top:0">
          Admin access
        </h2>
        <p class="muted">
          Prototype moderation area. Use passcode <b>ClubAdmin2026</b>.
        </p>
        <div class="form" style="max-width:520px">
          <input
            id="pass"
            class="input"
            type="password"
            placeholder="Admin passcode"
          />
          <button class="btn green">Unlock admin tools</button>
        </div>
      </div>
      <div id="adminOpen" class="hidden">
        <div class="admin-box">
          <div class="section-head">
            <div>
              <h2 style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:.1em;margin:0">
                Moderation tools
              </h2>
              <p class="muted">
                Review and approve member submissions for events, PRs, results
                and profile updates.
              </p>
            </div>
          </div>
        </div>
        <div class="grid cards2" style="margin-top:16px">
          <div class="pending">
            <h3>
              Pending events <span class="badge">2 pending</span>
            </h3>
            <div class="pending-item">
              <b>Open training session</b>
              <br />
              <span class="muted">Submitted by club member</span>
              <div class="actions" style="margin-top:8px;gap:8px">
                <button class="btn green" style="flex:1;padding:8px"
                  >Approve</button
                >
                <button class="btn red" style="flex:1;padding:8px"
                  >Reject</button
                >
              </div>
            </div>
            <div class="pending-item">
              <b>Weekend HYROX prep</b>
              <br />
              <span class="muted">Awaiting approval</span>
              <div class="actions" style="margin-top:8px;gap:8px">
                <button class="btn green" style="flex:1;padding:8px"
                  >Approve</button
                >
                <button class="btn red" style="flex:1;padding:8px"
                  >Reject</button
                >
              </div>
            </div>
          </div>
          <div class="pending">
            <h3>
              Pending PRs <span class="badge">4 pending</span>
            </h3>
            <div class="pending-item">
              <b>Member A · Clean & Jerk · 90kg</b>
              <div class="actions" style="margin-top:8px;gap:8px">
                <button class="btn green" style="flex:1;padding:8px"
                  >Approve</button
                >
                <button class="btn red" style="flex:1;padding:8px"
                  >Reject</button
                >
              </div>
            </div>
            <div class="pending-item">
              <b>Member D · Snatch · 92kg</b>
              <div class="actions" style="margin-top:8px;gap:8px">
                <button class="btn green" style="flex:1;padding:8px"
                  >Approve</button
                >
                <button class="btn red" style="flex:1;padding:8px"
                  >Reject</button
                >
              </div>
            </div>
          </div>
          <div class="pending">
            <h3>
              Pending results <span class="badge">1 pending</span>
            </h3>
            <div class="pending-item">
              <b>HYROX Madrid</b>
              <br />
              <span class="muted">Includes uploaded photo</span>
              <div class="actions" style="margin-top:8px;gap:8px">
                <button class="btn green" style="flex:1;padding:8px"
                  >Approve</button
                >
                <button class="btn red" style="flex:1;padding:8px"
                  >Reject</button
                >
              </div>
            </div>
          </div>
          <div class="pending">
            <h3>
              Pending members <span class="badge">3 pending</span>
            </h3>
            <div class="pending-item">
              <b>New Member · Intermediate · HYROX</b>
              <div class="actions" style="margin-top:8px;gap:8px">
                <button class="btn green" style="flex:1;padding:8px"
                  >Approve</button
                >
                <button class="btn red" style="flex:1;padding:8px"
                  >Reject</button
                >
              </div>
            </div>
            <div class="pending-item">
              <b>Second applicant · Beginner · CrossFit</b>
              <div class="actions" style="margin-top:8px;gap:8px">
                <button class="btn green" style="flex:1;padding:8px"
                  >Approve</button
                >
                <button class="btn red" style="flex:1;padding:8px"
                  >Reject</button
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

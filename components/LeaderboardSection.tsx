/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from "preact";
export default function LeaderboardSection() {
  return (
    <section id="leaderboard" class="content">
      <div class="section-head">
        <h2>PRs del club</h2>
        <button class="btn dark">+ Añadir PR</button>
      </div>
      <div class="grid cards2">
        <article class="card leader-card">
          <h3>Clean & Jerk</h3>
          <div class="row">
            <div class="rank">#1</div>
            <div>
              <b>Member A</b>
              <div class="bar">
                <div class="fill" style="width:92%"></div>
              </div>
            </div>
            <div>
              <b>140kg</b>
            </div>
          </div>
          <div class="row">
            <div class="rank">#2</div>
            <div>
              <b>Member B</b>
              <div class="bar">
                <div class="fill" style="width:78%"></div>
              </div>
            </div>
            <div>
              <b>125kg</b>
            </div>
          </div>
          <div class="row">
            <div class="rank">#3</div>
            <div>
              <b>Member C</b>
              <div class="bar">
                <div class="fill" style="width:64%"></div>
              </div>
            </div>
            <div>
              <b>110kg</b>
            </div>
          </div>
        </article>
        <article class="card leader-card">
          <h3>Snatch</h3>
          <div class="row">
            <div class="rank">#1</div>
            <div>
              <b>Member A</b>
              <div class="bar">
                <div class="fill" style="width:88%"></div>
              </div>
            </div>
            <div>
              <b>100kg</b>
            </div>
          </div>
          <div class="row">
            <div class="rank">#2</div>
            <div>
              <b>Member D</b>
              <div class="bar">
                <div class="fill" style="width:72%"></div>
              </div>
            </div>
            <div>
              <b>95kg</b>
            </div>
          </div>
          <div class="row">
            <div class="rank">#3</div>
            <div>
              <b>Member B</b>
              <div class="bar">
                <div class="fill" style="width:60%"></div>
              </div>
            </div>
            <div>
              <b>85kg</b>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

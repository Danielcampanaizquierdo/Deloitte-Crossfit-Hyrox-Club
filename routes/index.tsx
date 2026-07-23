/** @jsx h */
/** @jsxFrag Fragment */
import CountdownTimer from "../islands/CountdownTimer.tsx";
import TabNavigation from "../islands/TabNavigation.tsx";
import EventViewToggle from "../islands/EventViewToggle.tsx";
import ModalManager from "../islands/ModalManager.tsx";
import AdminPanel from "../islands/AdminPanel.tsx";
import MembersFilter from "../islands/MembersFilter.tsx";
import Calendar from "../islands/Calendar.tsx";
import ModalContainer from "../islands/ModalContainer.tsx";
import Topbar from "../components/Topbar.tsx";
import Hero from "../components/Hero.tsx";
import Footer from "../components/Footer.tsx";

export default function Home() {
  return (
    <>
      <style>{`
        :root{
          --green:#86BC25;
          --green2:#a7f23a;
          --black:#050505;
          --panel:rgba(255,255,255,.035);
          --line:rgba(255,255,255,.11);
          --muted:#a3a3a3;
          --danger:#ff6b6b;
          --radius:26px;
          --font-display: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
          --font-body: Arial, Helvetica, sans-serif;
          --font-mono: 'Courier New', monospace;
        }
        *{box-sizing:border-box}
        body{
          margin:0;
          color:#fff;
          background:
            radial-gradient(circle at 18% 5%, rgba(134,188,37,.20), transparent 28%),
            radial-gradient(circle at 85% 0%, rgba(255,255,255,.08), transparent 24%),
            linear-gradient(180deg,#050505 0%,#0b0b0b 55%,#000 100%);
          font-family:var(--font-body);
          min-height:100vh;
        }
        button,input,textarea,select{font-family:inherit}
        .wrap{max-width:1180px;margin:0 auto;padding:24px 18px 54px}
        .topbar{
          display:flex;align-items:center;justify-content:space-between;gap:18px;
          border:1px solid var(--line);background:rgba(255,255,255,.035);backdrop-filter:blur(10px);
          border-radius:var(--radius);padding:12px 16px;margin-bottom:32px;
        }
        .brand{display:flex;align-items:center;gap:14px}
        .crest{
          width:68px;height:68px;border-radius:22px;border:2px solid rgba(134,188,37,.55);
          display:grid;place-items:center;background:#000;box-shadow:0 0 35px rgba(134,188,37,.2);position:relative;overflow:hidden;
        }
        .crest:before{content:"";position:absolute;inset:7px;border:2px solid var(--green);border-radius:18px;clip-path:polygon(50% 0,100% 18%,88% 88%,50% 100%,12% 88%,0 18%)}
        .crest span{font-family:var(--font-display);font-size:15px;line-height:.95;text-align:center;color:#fff;z-index:1;letter-spacing:1px}.crest b{color:var(--green);display:block;font-size:22px}
        .eyebrow{font-size:11px;color:var(--green);text-transform:uppercase;letter-spacing:.33em;font-weight:800}
        .brandtitle{font-family:var(--font-display);font-size:24px;text-transform:uppercase;letter-spacing:.08em}
        .status{display:none;align-items:center;gap:8px;border:1px solid rgba(134,188,37,.32);border-radius:999px;padding:10px 15px;color:#d9ffad;font-size:12px;font-weight:800;letter-spacing:.18em}
        @media(min-width:700px){.status{display:flex}}
        .hero{display:grid;gap:26px;align-items:center;margin-bottom:30px}
        .hero h1{font-family:var(--font-display);font-size:clamp(52px,9vw,102px);line-height:.88;margin:0;text-transform:uppercase;letter-spacing:.08em}
        .hero h1 span{color:var(--green)}
        .pill{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:rgba(0,0,0,.6);border-radius:999px;padding:10px 14px;font-size:12px;text-transform:uppercase;letter-spacing:.1em}
        .hero p{color:#d4d4d4;line-height:1.7;max-width:650px;font-size:17px}
        .actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}
        .btn{border:0;border-radius:14px;padding:13px 18px;font-family:inherit;font-size:13px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;cursor:pointer;transition:all .2s}
        .btn.green{background:var(--green);color:#000}
        .btn.green:hover{background:var(--green2);box-shadow:0 0 40px rgba(134,188,37,.4)}
        .btn.dark{background:rgba(0,0,0,.6);color:#fff;border:1px solid var(--line)}
        .btn.dark:hover{background:rgba(0,0,0,.8);border-color:var(--green)}
        .btn.red{background:var(--danger);color:#fff}
        .btn.red:hover{background:#ff5252}
        .hero-card{border:1px solid rgba(134,188,37,.28);background:rgba(0,0,0,.72);border-radius:32px;padding:18px;box-shadow:0 0 70px rgba(134,188,37,.14)}
        @media(min-width:900px){.hero{grid-template-columns:1.08fr .92fr}}
        .wordmark{height:230px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:#000;display:grid;place-items:center;margin-bottom:18px;position:relative;overflow:hidden}
        .wordmark .d{font-family:var(--font-display);font-size:32px;letter-spacing:.1em;font-weight:900}
        .wordmark .d span{color:var(--green)}
        .wordmark .h{font-family:var(--font-display);font-size:42px;letter-spacing:.08em;color:var(--green)}
        .wordmark .c{font-family:var(--font-display);font-size:28px;letter-spacing:.1em}
        .countdown{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .timebox{border:1px solid rgba(255,255,255,.11);border-radius:15px;background:rgba(0,0,0,.62);text-align:center;padding:12px 0}
        .timebox b{display:block;font-size:24px;color:var(--green)}
        .timebox small{font-size:10px;color:var(--muted)}
        .nav{position:sticky;top:10px;z-index:20;display:grid;grid-template-columns:repeat(2,1fr);overflow:hidden;border:1px solid var(--line);background:rgba(0,0,0,.88);backdrop-filter:blur(10px);border-radius:var(--radius);margin-bottom:32px}
        @media(min-width:800px){.nav{grid-template-columns:repeat(5,1fr)}}
        .tab{border:0;background:transparent;color:#fff;padding:16px;border-bottom:3px solid transparent;text-transform:uppercase;letter-spacing:.1em;font-weight:800;font-size:12px;cursor:pointer;transition:all .2s}
        .tab.active{border-bottom-color:var(--green);color:var(--green)}
        .tab:hover{color:var(--green)}
        .content{display:none}
        .content.active{display:block}
        .section-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px}
        .section-head h2{font-family:var(--font-display);font-size:34px;text-transform:uppercase;letter-spacing:.08em;margin:0}
        .card{border:1px solid var(--line);background:var(--panel);border-radius:28px;overflow:hidden}
        .card-body{padding:22px}
        .card h3{font-family:var(--font-display);font-size:25px;text-transform:uppercase;letter-spacing:.1em;margin:0 0 12px}
        .card .meta{font-size:13px;color:var(--muted);margin-bottom:10px}
        .card .muted{color:var(--muted);font-size:14px;line-height:1.6}
        .grid{display:grid;gap:16px}
        .grid.cards2{grid-template-columns:repeat(auto-fit,minmax(380px,1fr))}
        .grid.cards3{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
        .imgph{height:160px;background:linear-gradient(135deg,rgba(134,188,37,.15),rgba(134,188,37,.05));border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--muted);font-weight:800}
        .badge{display:inline-block;background:rgba(134,188,37,.2);border:1px solid rgba(134,188,37,.4);color:var(--green);padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800}
        .mini-count{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:12px 0}
        .mini-count .timebox{padding:8px 0;font-size:11px}
        .mini-count .timebox b{font-size:16px}
        .mini-count .timebox small{font-size:9px}
        .calendar{border:1px solid var(--line);background:var(--panel);border-radius:28px;padding:18px}
        .cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
        .cal-head h3{margin:0;font-family:var(--font-display)}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:12px}
        .cal-label{text-align:center;font-weight:800;color:var(--muted);padding:8px;font-size:12px}
        .cal-cell{border:1px solid var(--line);border-radius:12px;padding:8px;min-height:80px;position:relative;background:rgba(0,0,0,.3)}
        .cal-cell.empty{background:transparent;border:0}
        .cal-cell .day{font-weight:800;margin-bottom:4px;color:var(--green)}
        .event-chip{border:1px solid var(--green);background:rgba(134,188,37,.15);color:var(--green);padding:3px 6px;border-radius:6px;font-size:10px;cursor:pointer;margin-bottom:2px;width:100%;text-align:left;text-transform:uppercase;letter-spacing:.05em}
        .leader-card .row{display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:center;margin:14px 0}
        .leader-card .rank{font-family:var(--font-mono);font-weight:900;color:var(--green)}
        .leader-card .bar{height:6px;background:rgba(134,188,37,.2);border-radius:999px;overflow:hidden;margin-top:4px}
        .leader-card .fill{height:100%;background:var(--green);transition:width .3s}
        .filters{border:1px solid var(--line);background:var(--panel);border-radius:24px;padding:14px;display:grid;gap:10px;margin-bottom:18px}
        @media(min-width:800px){.filters{grid-template-columns:1fr 200px 150px}}
        .input{border:1px solid var(--line);background:rgba(0,0,0,.4);color:#fff;padding:10px 14px;border-radius:12px;font-size:13px}
        .input::placeholder{color:var(--muted)}
        .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:20px}
        .stat{border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:16px;text-align:center}
        .stat small{display:block;color:var(--muted);font-size:11px;margin-bottom:6px}
        .stat b{display:block;font-size:28px;color:var(--green)}
        .member-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
        .avatar{width:44px;height:44px;border-radius:12px;background:var(--green);color:#000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px}
        .admin-box{border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.5);border-radius:20px;padding:28px;margin-bottom:20px}
        .admin-box h2{margin:0 0 12px;font-size:24px}
        .pending{border:1px solid var(--line);background:var(--panel);border-radius:20px;padding:18px}
        .pending h3{margin:0 0 12px;font-family:var(--font-display)}
        .pending-item{border:1px solid rgba(134,188,37,.2);background:rgba(134,188,37,.05);border-radius:12px;padding:12px;margin:10px 0;font-size:13px}
        .form{display:flex;flex-direction:column;gap:12px}
        .form input,.form textarea,.form select{width:100%;border:1px solid var(--line);background:rgba(0,0,0,.4);color:#fff;padding:12px;border-radius:12px;font-size:13px}
        .form textarea{min-height:80px;resize:vertical}
        .modal-back{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(5px);justify-content:center;align-items:center;z-index:100;flex-direction:column}
        .modal-back.hidden{display:none!important}
        .modal{border:1px solid var(--line);background:rgba(0,0,0,.95);border-radius:20px;padding:28px;max-width:500px;width:90vw;max-height:90vh;overflow-y:auto}
        .modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .modal-head h3{margin:0;font-family:var(--font-display)}
        .close{border:0;background:transparent;color:#fff;font-size:28px;cursor:pointer;padding:0;width:32px;height:32px}
        .close:hover{color:var(--green)}
        .hidden{display:none!important}
        .footer{text-align:center;color:var(--muted);font-size:12px;margin-top:40px;padding-top:20px;border-top:1px solid var(--line)}
        .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse .8s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .tools{display:flex;gap:8px}

        /* ===== MOBILE OPTIMIZATION ===== */
        html,body{overflow-x:hidden;-webkit-text-size-adjust:100%}
        img,svg,video{max-width:100%;height:auto}
        button,a,.tab,.event-chip{-webkit-tap-highlight-color:rgba(134,188,37,.25)}
        .btn{min-height:44px}
        .close{width:44px;height:44px;font-size:26px}
        /* 16px inputs stop iOS zoom-on-focus */
        .input,.form input,.form textarea,.form select{font-size:16px}
        /* stop cards forcing horizontal overflow on narrow screens */
        .grid.cards2{grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))}
        .grid.cards3{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
        @media(max-width:640px){
          .wrap{padding:16px max(12px,env(safe-area-inset-right)) 48px max(12px,env(safe-area-inset-left))}
          .topbar{padding:10px 12px;margin-bottom:20px;border-radius:20px;gap:12px}
          .crest{width:52px;height:52px;border-radius:16px}
          .crest span{font-size:12px}.crest b{font-size:17px}
          .brandtitle{font-size:19px}
          .eyebrow{font-size:10px;letter-spacing:.2em}
          .hero{gap:20px;margin-bottom:22px}
          .hero p{font-size:15px;line-height:1.6}
          .wordmark{height:168px}
          .hero-card{padding:14px;border-radius:24px}
          /* nav: one scrollable row instead of the 2+2+1 grid */
          .nav{display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;top:8px}
          .nav::-webkit-scrollbar{display:none}
          .tab{flex:0 0 auto;white-space:nowrap;padding:14px 18px;scroll-snap-align:start}
          .section-head h2{font-size:26px}
          .card-body{padding:18px}
          .card h3{font-size:22px}
          /* calendar: tighter so 7 columns fit a phone */
          .calendar{padding:12px;border-radius:22px}
          .cal-grid{gap:4px}
          .cal-label{padding:4px 0;font-size:10px}
          .cal-cell{min-height:54px;padding:5px;border-radius:9px}
          .cal-cell .day{font-size:12px;margin-bottom:2px}
          .event-chip{font-size:9px;padding:2px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          /* action buttons fill the row for easy thumbs */
          .actions .btn{flex:1 1 140px}
          /* modal becomes a bottom sheet */
          .modal-back{align-items:flex-end}
          .modal{width:100%;max-width:100%;max-height:92vh;border-radius:22px 22px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom))}
          .stats{gap:10px}
          .stat{padding:14px}.stat b{font-size:22px}
        }
      `}</style>
      <div class="wrap">
        <Topbar />
        <Hero />
        <TabNavigation />

        {/* Events Section */}
        <section id="events" class="content active">
          <div class="section-head">
            <h2>Lo que se viene</h2>
            <EventViewToggle />
          </div>
          <div id="eventCards" class="grid cards2">
            <article class="card">
              <div class="imgph">Event image upload</div>
              <div class="card-body">
                <div style="display:flex;justify-content:space-between;gap:14px">
                  <h3>Entreno DEKA</h3>
                  <span class="badge">8 apuntados</span>
                </div>
                <div class="meta">
                  馃搮 12 Jul 2026 路 10:00
                  <br />
                  馃搷 GreenHorse Box, San Sebasti谩n de los Reyes
                </div>
                <CountdownTimer targetDate="2026-07-12T10:00:00" className="mini-count" />
                <p class="muted">
                  Formato DEKA para preparar competici贸n, compartir ritmos y
                  representar al club juntos.
                </p>
                <div class="actions">
                  <ModalManager
                    buttonLabel="Ap煤ntate"
                    modalId="signupModal"
                    buttonClass="btn green"
                  />
                  <button class="btn red admin-only hidden">Delete</button>
                </div>
              </div>
            </article>
            <article class="card">
              <div class="imgph">Training session</div>
              <div class="card-body">
                <div style="display:flex;justify-content:space-between;gap:14px">
                  <h3>HYROX Team Session</h3>
                  <span class="badge">12 apuntados</span>
                </div>
                <div class="meta">
                  馃搮 19 Jul 2026 路 09:30
                  <br />
                  馃搷 Madrid
                </div>
                <CountdownTimer targetDate="2026-07-19T09:30:00" className="mini-count" />
                <p class="muted">
                  Team workout focused on sleds, wall balls and running transitions.
                </p>
                <div class="actions">
                  <ModalManager
                    buttonLabel="Ap煤ntate"
                    modalId="signupModal"
                    buttonClass="btn green"
                  />
                  <button class="btn red admin-only hidden">Delete</button>
                </div>
              </div>
            </article>
          </div>
          <Calendar />
        </section>

        {/* Leaderboard Section */}
        <section id="leaderboard" class="content">
          <div class="section-head">
            <h2>PRs del club</h2>
            <ModalManager
              buttonLabel="+ A帽adir PR"
              modalId="prModal"
              buttonClass="btn dark"
            />
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

        {/* Results Section */}
        <section id="results" class="content">
          <div class="section-head">
            <h2>Nuestras batallas</h2>
            <ModalManager
              buttonLabel="+ A帽adir resultado"
              modalId="resultModal"
              buttonClass="btn dark"
            />
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

        {/* Members Section */}
        <section id="members" class="content">
          <div class="section-head">
            <h2>Member profiles</h2>
            <ModalManager
              buttonLabel="+ A帽adir miembro"
              modalId="memberModal"
              buttonClass="btn dark"
            />
          </div>
          <MembersFilter />
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
            <article
              class="card member-card"
              data-name="Demo Athlete"
              data-level="intermediate"
              data-goal="crossfit"
            >
              <div class="card-body">
                <div class="member-head">
                  <div class="avatar">DA</div>
                  <div>
                    <h3>Demo Athlete</h3>
                    <div class="meta">馃搷 Madrid</div>
                  </div>
                </div>
                <div style="margin-top:12px">
                  <div class="eyebrow">Focus</div>
                  <p class="muted">CrossFit 路 HYROX training</p>
                  <div class="eyebrow" style="margin-top:10px">
                    Level
                  </div>
                  <p class="muted">Intermediate</p>
                </div>
              </div>
            </article>
            <article
              class="card member-card"
              data-name="Member B"
              data-level="advanced"
              data-goal="crossfit"
            >
              <div class="card-body">
                <div class="member-head">
                  <div class="avatar">MB</div>
                  <div>
                    <h3>Member B</h3>
                    <div class="meta">馃搷 Madrid</div>
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
            <article
              class="card member-card"
              data-name="Member C"
              data-level="beginner"
              data-goal="hyrox"
            >
              <div class="card-body">
                <div class="member-head">
                  <div class="avatar">MC</div>
                  <div>
                    <h3>Member C</h3>
                    <div class="meta">馃搷 Barcelona</div>
                  </div>
                </div>
                <div style="margin-top:12px">
                  <div class="eyebrow">Focus</div>
                  <p class="muted">HYROX preparation</p>
                  <div class="eyebrow" style="margin-top:10px">
                    Level
                  </div>
                  <p class="muted">Beginner</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Admin Section */}
        <section id="admin" class="content">
          <AdminPanel />
          <div id="adminOpen" class="hidden">
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
                    <button class="btn green" style="flex:1;padding:8px">
                      Approve
                    </button>
                    <button class="btn red" style="flex:1;padding:8px">
                      Reject
                    </button>
                  </div>
                </div>
                <div class="pending-item">
                  <b>Weekend HYROX prep</b>
                  <br />
                  <span class="muted">Awaiting approval</span>
                  <div class="actions" style="margin-top:8px;gap:8px">
                    <button class="btn green" style="flex:1;padding:8px">
                      Approve
                    </button>
                    <button class="btn red" style="flex:1;padding:8px">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
              <div class="pending">
                <h3>
                  Pending PRs <span class="badge">4 pending</span>
                </h3>
                <div class="pending-item">
                  <b>Member A 路 Clean & Jerk 路 90kg</b>
                  <div class="actions" style="margin-top:8px;gap:8px">
                    <button class="btn green" style="flex:1;padding:8px">
                      Approve
                    </button>
                    <button class="btn red" style="flex:1;padding:8px">
                      Reject
                    </button>
                  </div>
                </div>
                <div class="pending-item">
                  <b>Member D 路 Snatch 路 92kg</b>
                  <div class="actions" style="margin-top:8px;gap:8px">
                    <button class="btn green" style="flex:1;padding:8px">
                      Approve
                    </button>
                    <button class="btn red" style="flex:1;padding:8px">
                      Reject
                    </button>
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
                    <button class="btn green" style="flex:1;padding:8px">
                      Approve
                    </button>
                    <button class="btn red" style="flex:1;padding:8px">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
              <div class="pending">
                <h3>
                  Pending members <span class="badge">3 pending</span>
                </h3>
                <div class="pending-item">
                  <b>New Member 路 Intermediate 路 HYROX</b>
                  <div class="actions" style="margin-top:8px;gap:8px">
                    <button class="btn green" style="flex:1;padding:8px">
                      Approve
                    </button>
                    <button class="btn red" style="flex:1;padding:8px">
                      Reject
                    </button>
                  </div>
                </div>
                <div class="pending-item">
                  <b>Second applicant 路 Beginner 路 CrossFit</b>
                  <div class="actions" style="margin-top:8px;gap:8px">
                    <button class="btn green" style="flex:1;padding:8px">
                      Approve
                    </button>
                    <button class="btn red" style="flex:1;padding:8px">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>

      {/* Modals */}
      <div id="signupModal" class="modal-back">
        <div class="modal">
          <div class="modal-head">
            <h3>Apuntarse a evento</h3>
            <button
              class="close"
              onclick={() => {
                const modal = document.getElementById('signupModal');
                if (modal) modal.style.display = 'none';
              }}
            >
              脳
            </button>
          </div>
          <div class="form">
            <input type="text" class="input" placeholder="Tu nombre" />
            <input type="email" class="input" placeholder="Tu email" />
            <select class="input">
              <option>Selecciona un evento</option>
              <option>Entreno DEKA - 12 Jul</option>
              <option>HYROX Team Session - 19 Jul</option>
            </select>
            <textarea
              class="input"
              placeholder="Comentarios (opcional)"
            ></textarea>
            <button class="btn green">Confirmar apuntaci贸n</button>
          </div>
        </div>
      </div>

      <div id="eventModal" class="modal-back">
        <div class="modal">
          <div class="modal-head">
            <h3>A帽adir evento</h3>
            <button
              class="close"
              onclick={() => {
                const modal = document.getElementById('eventModal');
                if (modal) modal.style.display = 'none';
              }}
            >
              脳
            </button>
          </div>
          <div class="form">
            <input type="text" class="input" placeholder="Nombre del evento" />
            <input type="datetime-local" class="input" />
            <input type="text" class="input" placeholder="Ubicaci贸n" />
            <textarea
              class="input"
              placeholder="Descripci贸n del evento"
            ></textarea>
            <button class="btn green">Crear evento</button>
          </div>
        </div>
      </div>

      <div id="prModal" class="modal-back">
        <div class="modal">
          <div class="modal-head">
            <h3>A帽adir PR</h3>
            <button
              class="close"
              onclick={() => {
                const modal = document.getElementById('prModal');
                if (modal) modal.style.display = 'none';
              }}
            >
              脳
            </button>
          </div>
          <div class="form">
            <input type="text" class="input" placeholder="Tu nombre" />
            <select class="input">
              <option>Selecciona movimiento</option>
              <option>Clean & Jerk</option>
              <option>Snatch</option>
              <option>Deadlift</option>
              <option>Squat</option>
            </select>
            <input type="number" class="input" placeholder="Peso (kg)" />
            <input type="date" class="input" />
            <button class="btn green">Registrar PR</button>
          </div>
        </div>
      </div>

      <div id="resultModal" class="modal-back">
        <div class="modal">
          <div class="modal-head">
            <h3>A帽adir resultado</h3>
            <button
              class="close"
              onclick={() => {
                const modal = document.getElementById('resultModal');
                if (modal) modal.style.display = 'none';
              }}
            >
              脳
            </button>
          </div>
          <div class="form">
            <input type="text" class="input" placeholder="Nombre de la competici贸n" />
            <input type="date" class="input" />
            <textarea
              class="input"
              placeholder="Descripci贸n y resultados"
            ></textarea>
            <input type="file" class="input" placeholder="Foto de la competici贸n" />
            <button class="btn green">Guardar resultado</button>
          </div>
        </div>
      </div>

      <div id="memberModal" class="modal-back">
        <div class="modal">
          <div class="modal-head">
            <h3>Crear perfil</h3>
            <button
              class="close"
              onclick={() => {
                const modal = document.getElementById('memberModal');
                if (modal) modal.style.display = 'none';
              }}
            >
              脳
            </button>
          </div>
          <div class="form">
            <input type="text" class="input" placeholder="Nombre completo" />
            <input type="email" class="input" placeholder="Email" />
            <select class="input">
              <option>Selecciona nivel</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
            <select class="input">
              <option>Focus principal</option>
              <option>CrossFit</option>
              <option>HYROX</option>
              <option>General fitness</option>
            </select>
            <input type="text" class="input" placeholder="Ubicaci贸n" />
            <button class="btn green">Crear perfil</button>
          </div>
        </div>
      </div>

      <div id="profileModal" class="modal-back">
        <div class="modal">
          <div class="modal-head">
            <h3>Demo Athlete</h3>
            <button
              class="close"
              onclick={() => {
                const modal = document.getElementById('profileModal');
                if (modal) modal.style.display = 'none';
              }}
            >
              脳
            </button>
          </div>
          <div class="form">
            <div style="text-align:center;margin-bottom:16px">
              <div class="avatar" style="width:80px;height:80px;margin:0 auto;font-size:32px">
                DA
              </div>
            </div>
            <div style="background:var(--panel);border-radius:12px;padding:12px;margin-bottom:12px">
              <div class="eyebrow">Email</div>
              <p class="muted">demo.athlete@example.com</p>
              <div class="eyebrow">Nivel</div>
              <p class="muted">Intermediate</p>
              <div class="eyebrow">Focus</div>
              <p class="muted">CrossFit 路 HYROX training</p>
              <div class="eyebrow">Ubicaci贸n</div>
              <p class="muted">馃搷 Madrid</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

}

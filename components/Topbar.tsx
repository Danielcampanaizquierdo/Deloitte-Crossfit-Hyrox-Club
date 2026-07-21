/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";

export default function Topbar() {
  return (
    <header class="topbar">
      <div class="brand">
        <div class="crest">
          <img
            src="/images/escudo.png"
            alt="Deloitte CrossFit & HYROX Club"
            width="66"
            height="66"
          />
        </div>
        <div>
          <div class="eyebrow">Madrid</div>
          <div class="brandtitle">The unique Club Hub</div>
        </div>
      </div>
      <div class="status">
        <span class="dot" aria-hidden="true"></span> CrossFit · HYROX
      </div>
    </header>
  );
}

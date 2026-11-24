import React, { useRef, useState } from "react";
import { Logo, Icon } from "./ui";
export default function Landing({ onAuth, onDemo }) {
  const [tab, setTab] = useState("Overview"),
    [connected, setConnected] = useState(true),
    [note, setNote] = useState({ x: 0, y: 0 }),
    drag = useRef(null);
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Logo onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        <div className="landing-links">
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("features")
                .scrollIntoView({ behavior: "smooth" });
            }}
          >
            The workspace
          </a>
          <button onClick={onDemo}>Try the canvas</button>
        </div>
        <div>
          <button className="btn subtle" onClick={() => onAuth("signin")}>
            Sign in
          </button>
          <button className="btn primary" onClick={() => onAuth("signup")}>
            Create your workspace
          </button>
        </div>
      </nav>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="tiny-line" /> THINK OUTSIDE THE DOCUMENT
            </span>
            <h1>
              Your ideas.
              <br />A little more
              <br />
              <span>connected.</span>
            </h1>
            <p>
              A canvas for the notes, the numbers, and the bigger picture. Bring
              it all together in MaiBoard.
            </p>
            <div className="hero-actions">
              <button
                className="btn primary large"
                onClick={() => onAuth("signup")}
              >
                Make room for your ideas
              </button>
              <button className="btn demo-btn" onClick={onDemo}>
                <Icon name="Play" size={17} /> Explore the canvas
              </button>
            </div>
            <p className="hero-note">
              <Icon name="Cloud" size={14} /> Saved in the cloud. Ready when
              inspiration is.
            </p>
          </div>
          <div className="hero-demo">
            <div className="demo-top">
              <span>
                <Icon name="LayoutDashboard" size={16} /> A plan, taking shape
              </span>
              <span className="demo-live">Interactive canvas</span>
            </div>
            <div className="demo-canvas">
              <svg
                className="demo-lines"
                viewBox="0 0 640 560"
                aria-hidden="true"
              >
                <path
                  d="M255 158 C330 158 260 260 335 260"
                  fill="none"
                  stroke={connected ? "#7c889f" : "transparent"}
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
                <path
                  d="M400 330 C400 390 235 370 235 425"
                  fill="none"
                  stroke={connected ? "#7c889f" : "transparent"}
                  strokeWidth="2"
                />
              </svg>
              <article
                className="demo-note"
                style={{
                  transform: `translate(${note.x}px,${note.y}px) rotate(-4deg)`,
                }}
                onPointerDown={(e) => {
                  drag.current = {
                    x: e.clientX,
                    y: e.clientY,
                    nx: note.x,
                    ny: note.y,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (drag.current)
                    setNote({
                      x: Math.max(
                        -50,
                        Math.min(
                          150,
                          drag.current.nx + e.clientX - drag.current.x,
                        ),
                      ),
                      y: Math.max(
                        -40,
                        Math.min(
                          200,
                          drag.current.ny + e.clientY - drag.current.y,
                        ),
                      ),
                    });
                }}
                onPointerUp={() => (drag.current = null)}
              >
                <div>
                  <Icon name="Type" size={14} /> The starting point{" "}
                  <Icon name="GripVertical" size={14} />
                </div>
                <h3>
                  What if we
                  <br />
                  connected the dots?
                </h3>
                <p>
                  Every good story starts
                  <br />
                  with a little curiosity.
                </p>
                <small>Go on, move me around.</small>
              </article>
              <article className="demo-table">
                <div>
                  <Icon name="Table2" size={14} /> The numbers behind the idea
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Sign-ups</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <span className="table-dot" /> Organic
                      </td>
                      <td>1,860</td>
                    </tr>
                    <tr>
                      <td>
                        <span className="table-dot second" /> Direct
                      </td>
                      <td>1,240</td>
                    </tr>
                    <tr>
                      <td>
                        <span className="table-dot third" /> Social
                      </td>
                      <td>742</td>
                    </tr>
                  </tbody>
                </table>
                <footer>
                  <Icon name="FileSpreadsheet" size={12} /> From your CSV, to
                  your story.
                </footer>
              </article>
              <article className="demo-tabs">
                <div className="demo-tab-strip">
                  {["Overview", "Next steps"].map((t) => (
                    <button
                      className={tab === t ? "active" : ""}
                      key={t}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <strong>
                  {tab === "Overview"
                    ? "A little clarity goes a long way."
                    : "And then, make it happen."}
                </strong>
                <p>
                  {tab === "Overview"
                    ? "One board. Every perspective. A story that makes sense."
                    : "Gather your thoughts. Make a plan. Share it with the world."}
                </p>
              </article>
              <div className="demo-tools">
                <Icon name="MousePointer2" size={18} />
                <span />
                <Icon name="Type" size={18} />
                <Icon name="Table2" size={18} />
                <button
                  title="Toggle connections"
                  className={connected ? "active" : ""}
                  onClick={() => setConnected((x) => !x)}
                >
                  <Icon name="MoveUpRight" size={18} />
                </button>
              </div>
              <span className="demo-caption">
                A SMALL PREVIEW OF BIG POSSIBILITIES
              </span>
            </div>
          </div>
        </section>
        <section id="features" className="feature-section">
          <div className="feature-intro">
            <span className="eyebrow">LESS SCATTERED. MORE CONNECTED.</span>
            <h2>
              A home for your
              <br />
              whole train of thought.
            </h2>
            <p>
              From a messy first idea to a clear presentation, keep every piece
              of the story in view.
            </p>
          </div>
          <div className="feature-list">
            <Feature
              icon="Type"
              title="Words with a little personality."
              text="Rich text, highlights, links, and your favorite fonts. Make every thought look the way it feels."
            />
            <Feature
              icon="BarChart3"
              title="Let your numbers tell the story."
              text="Bring a CSV into an editable table. Build live pie charts, bar charts, and histograms from the data."
            />
            <Feature
              icon="PanelsTopLeft"
              title="A new perspective, one tab away."
              text="Organize ideas in switchable tabs. Connect your blocks with arrows and make the relationships visible."
            />
            <Feature
              icon="Globe"
              title="Turn a board into a point of view."
              text="Publish a read-only snapshot with its own link. Share the story while your working canvas stays private."
            />
          </div>
        </section>
        <section className="landing-cta">
          <div>
            <span className="eyebrow">
              THERE’S ROOM FOR YOUR NEXT BIG THING
            </span>
            <h2>
              Start with a thought.
              <br />
              See where it takes you.
            </h2>
          </div>
          <button
            className="btn primary large"
            onClick={() => onAuth("signup")}
          >
            Create your workspace
          </button>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        <span>A place to connect the dots.</span>
        <button onClick={() => onAuth("signin")}>
          Sign in to your workspace
        </button>
      </footer>
    </div>
  );
}
function Feature({ icon, title, text }) {
  return (
    <article className="feature-row">
      <span className="feature-icon">
        <Icon name={icon} size={23} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

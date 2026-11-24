import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, watchProjects, createProject, removeProject } from "./firebase";
import { blankBoard, sampleBoard, readableError } from "./model";
import {
  Logo,
  Icon,
  IconButton,
  Modal,
  Field,
  ErrorMessage,
  Spinner,
} from "./ui";
import Landing from "./Landing";
import {sampleProjects,createSample} from "./templates";
const Editor = lazy(() => import("./Editor")),
  Viewer = lazy(() => import("./Viewer"));
export const navigate = (path) => {
  location.hash = path;
};
export default function App() {
  const [user, setUser] = useState(null),
    [authReady, setAuthReady] = useState(false),
    [route, setRoute] = useState(location.hash.slice(1) || "/"),
    [authMode, setAuthMode] = useState(null),
    [toast, setToast] = useState("");
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      }),
    [],
  );
  useEffect(() => {
    const onHash = () => setRoute(location.hash.slice(1) || "/");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = useCallback((text) => setToast(text), []);
  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (e) {
      notify(readableError(e));
    }
  };
  const liveId = route.startsWith('/live/') ? route.slice(6) : null,
    viewerId = route.startsWith("/view/") ? route.slice(6) : null,
    projectId = route.startsWith("/project/") ? route.slice(9) : null;
  return (
    <>
      <Suspense fallback={<Spinner />}>
        {liveId ? (!authReady ? <Spinner/> : user ? <Viewer key={`live-${user.uid}-${liveId}`} id={liveId} live user={user}/> : <div className="load-error"><Logo/><h1>Sign in to open Live mode</h1><p>Only the project owner can add table rows.</p><button className="btn primary" onClick={()=>setAuthMode('signin')}>Sign in</button></div>) : viewerId ? (
          <Viewer id={viewerId} />
        ) : (route === "/demo" || route.startsWith("/sample/")) ? (
          <Editor
            demo
            key={route}
            initialBoard={route.startsWith("/sample/")?createSample(route.slice(8)):undefined}
            user={user}
            notify={notify}
            onExit={() => navigate("/")}
            onSignIn={() => setAuthMode("signin")}
          />
        ) : !authReady ? (
          <Spinner />
        ) : projectId && user ? (
          <Editor
            key={`${user.uid}/${projectId}`}
            id={projectId}
            user={user}
            notify={notify}
            onExit={() => navigate("/")}
            onLogout={logout}
          />
        ) : user ? (
          <Dashboard user={user} notify={notify} onLogout={logout} />
        ) : (
          <Landing onAuth={setAuthMode} onDemo={() => navigate("/demo")} />
        )}
      </Suspense>
      {authMode && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onClose={() => setAuthMode(null)}
          notify={notify}
        />
      )}
      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        <Icon name="CheckCircle2" size={17} />
        {toast}
      </div>
    </>
  );
}
function AuthModal({ mode, setMode, onClose, notify }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  useEffect(() => {
    setError("");
    setSent(false);
  }, [mode]);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setSent(true);
      } else if (mode === "signup") {
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(result.user, { displayName: name.trim() });
        notify("Welcome to MaiBoard. Your ideas have a home.");
        onClose();
        navigate("/");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
        if (!/\/(project|live)\//.test(location.hash)) navigate("/");
      }
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={
        mode === "signup"
          ? "Make room for your ideas."
          : mode === "reset"
            ? "A fresh start."
            : "Welcome back."
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="muted">
        {mode === "signup"
          ? "Create your free workspace and start connecting the dots."
          : mode === "reset"
            ? "We’ll email you a link to reset your password."
            : "Your next big idea is right where you left it."}
      </p>
      {sent ? (
        <div className="reset-success">
          <Icon name="Mail" size={34} />
          <h3>Check your inbox.</h3>
          <p>
            If an account exists for {email}, a password reset link is on its
            way.
          </p>
          <button className="btn primary" onClick={() => setMode("signin")}>
            Back to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          {mode === "signup" && (
            <Field label="Your name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                maxLength={80}
                placeholder="What should we call you?"
              />
            </Field>
          )}
          <Field label="Email address">
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
          {mode !== "reset" && (
            <Field
              label="Password"
              hint={mode === "signup" ? "At least 8 characters." : undefined}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={mode === "signup" ? 8 : 1}
                required
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                placeholder="Your password"
              />
            </Field>
          )}
          {mode === "signin" && (
            <button
              type="button"
              className="text-button forgot"
              onClick={() => setMode("reset")}
            >
              Forgot password?
            </button>
          )}
          <ErrorMessage>{error}</ErrorMessage>
          <button className="btn primary full" disabled={busy}>
            {busy ? <Icon name="Loader2" className="spin" size={17} /> : null}
            {mode === "reset"
              ? "Send reset link"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
          {mode !== "reset" && (
            <p className="auth-switch">
              {mode === "signin"
                ? "New to MaiBoard?"
                : "Already have a workspace?"}{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          )}
          {mode === "reset" && (
            <button
              type="button"
              className="text-button full"
              onClick={() => setMode("signin")}
            >
              Back to sign in
            </button>
          )}
        </form>
      )}
    </Modal>
  );
}
function Dashboard({ user, notify, onLogout }) {
  const [projects, setProjects] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
[busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(null),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setLoading(true);
    setError("");
    return watchProjects(
      user.uid,
      (p) => {
        setProjects(p);
        setLoading(false);
      },
      (e) => {
        setError(readableError(e));
        setLoading(false);
      },
    );
  }, [user.uid, retry]);
  const make = async (sampleId) => {
    if(busy)return;
    setBusy(true);
    try {const board=sampleId?createSample(sampleId):blankBoard('Untitled');const id=await createProject(user.uid,board);navigate('/project/'+id);}
    catch(e){notify(readableError(e));}finally{setBusy(false);}
  };
  const filtered = projects.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    ),
    displayName = user.displayName || user.email?.split("@")[0] || "Creator";
  return (
    <div className="dashboard">
      <nav className="app-nav">
        <Logo onClick={() => navigate("/")} />
        <span className="nav-divider" />
        <span className="nav-label">Your workspace</span>
        <div className="nav-account">
          <span className="user-avatar">{displayName[0].toUpperCase()}</span>
          <span>{displayName}</span>
          <button className="btn subtle" onClick={onLogout}>
            <Icon name="LogOut" size={16} /> Log out
          </button>
        </div>
      </nav>
      <div className="dashboard-content">
        <div className="dashboard-intro">
          <div>
            <span className="eyebrow">A LITTLE SPACE FOR BIG IDEAS</span>
            <h1>Your projects.</h1>
            <p>Everything you’re thinking about, brought together.</p>
          </div>
          <button
            className="btn primary"
            disabled={busy} onClick={() => make()}
          >
            <Icon name="Plus" size={18} /> New project
          </button>
        </div>
        <section className="sample-gallery" aria-label="Sample projects">
          <div className="sample-heading"><div><h2>Start with an example</h2><p>Explore a ready-made board, then save your own copy.</p></div><span>Sample projects</span></div>
          <div className="sample-grid"><button className="sample-image-card blank-sample" disabled={busy} onClick={()=>make()}><Icon name="Plus" size={36}/><strong>Start with a blank canvas</strong></button>{sampleProjects.map(sample=><button className="sample-image-card" key={sample.id} aria-label={`Preview ${sample.name}`} onClick={()=>navigate('/sample/'+sample.id)}><img src={import.meta.env.BASE_URL+'samples/'+sample.id+'.svg'} alt={sample.name}/></button>)}</div>
        </section>
        <div className="dashboard-filter">
          <div className="project-filter">
            <Icon name="LayoutDashboard" size={17} />
            <strong>All projects</strong>
            <span>{projects.length}</span>
          </div>
          <label className="search-field">
            <Icon name="Search" size={17} />
            <input
              aria-label="Search projects"
              placeholder="Find a project…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <ErrorMessage>{error}</ErrorMessage>
        {error && (
          <button className="btn" onClick={() => setRetry((x) => x + 1)}>
            <Icon name="RefreshCw" size={16} /> Retry connection
          </button>
        )}
        {loading ? (
          <Spinner text="Gathering your projects…" />
        ) : (
          <div className="project-grid">
            {filtered.map((p) => {
              let board;
              try {
                board = JSON.parse(p.boardJson);
              } catch {
                board = blankBoard(p.name);
              }
              return (
                <article className="project-card" key={p.id}>
                  <button
                    className="project-preview"
                    onClick={() => navigate(`/project/${p.id}`)}
                    aria-label={`Open ${p.name}`}
                  >
                    <MiniBoard board={board} />
                    {p.publicationId && (
                      <span className="published-tag">
                        <Icon name="Globe" size={12} /> Published
                      </span>
                    )}
                  </button>
                  <div className="project-card-info">
                    <button onClick={() => navigate(`/project/${p.id}`)}>
                      <h3>{p.name}</h3>
                      <p>
                        {p.blockCount || 0} blocks <span>·</span>{" "}
                        {p.updatedAt?.toDate?.().toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        }) || "Just created"}
                      </p>
                    </button>
                    <IconButton
                      icon="Trash2"
                      title={`Delete ${p.name}`}
                      onClick={() => setDeleting(p)}
                    />
                  </div>
                </article>
              );
            })}

          </div>
        )}
        {!loading && search && !filtered.length && (
          <p className="empty-search">No projects match “{search}”.</p>
        )}
        <div className="workspace-note">
          <Icon name="Cloud" size={16} />
          <span>
            Your projects are saved securely to your Firebase account.
          </span>
        </div>
      </div>
      {deleting && (
        <Modal
          title="Delete this project?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p>
            “{deleting.name}”, its source CSV files, and its published
            presentation will be permanently deleted.
          </p>
          <ErrorMessage>{error}</ErrorMessage>
          <div className="modal-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Keep project
            </button>
            <button
              className="btn danger filled"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await removeProject(user.uid, deleting);
                  setDeleting(null);
                  notify("Project deleted.");
                } catch (e) {
                  setError(readableError(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete project
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function MiniBoard({ board }) {
  return (
    <div className="mini-board">
      {board.blocks.slice(0, 6).map((b, i) => (
        <div
          key={b.id}
          className={`mini-block mini-${b.type}`}
          style={{
            left: 20 + (i % 3) * 92,
            top: 28 + Math.floor(i / 3) * 75,
            background: b.style?.background || "#fff",
            transform: `rotate(${i % 2 ? 1 : -2}deg)`,
          }}
        >
          <div />
          <span />
          <span />
          <span />
        </div>
      ))}
      {!board.blocks.length && (
        <div className="mini-blank">
          <Icon name="Plus" size={26} />
        </div>
      )}
    </div>
  );
}

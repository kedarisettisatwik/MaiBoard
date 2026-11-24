import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>Let’s get you back to the board.</h1>
        <p>{this.state.error.message}</p>
        <button className="btn primary" onClick={() => location.reload()}>
          Reload MaiBoard
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const root =
  import.meta.hot?.data.root || createRoot(document.getElementById("root"));
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import DotsTest from "./dots-test";
import "./index.css";

function Root() {
  const [test, setTest] = useState(() => window.location.hash === "#dots-test");
  useEffect(() => {
    const h = () => setTest(window.location.hash === "#dots-test");
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return test ? <DotsTest /> : <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

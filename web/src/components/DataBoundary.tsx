import { Component, use, type ReactNode } from "react";
import { initializeConferences } from "../lib/conferences";

const ready = initializeConferences();

export function DataReady({ children }: { children: ReactNode }) {
  use(ready);
  return children;
}

export class DataBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? (
      <div className="container section" role="alert">
        <p>数据加载失败</p>
        <button className="btn" onClick={() => location.reload()}>重试</button>
      </div>
    ) : this.props.children;
  }
}

import { Component, ErrorInfo, ReactNode } from "react";
import { NotificationBell } from "./NotificationBell";

interface BoundaryState {
  hasError: boolean;
}

// Defensive wrapper — if anything inside NotificationBell or its panel throws
// at render time, the rest of the app keeps working and a silent log is left
// for the developer. The bell is a peripheral feature; it must never break
// the main app layout.
class NotificationBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.warn("[NotificationBell] render crash isolated:", error, info);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function NotificationBellSafe() {
  return (
    <NotificationBoundary>
      <NotificationBell />
    </NotificationBoundary>
  );
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Overlay, OverlayProvider, registerOverlay, useOverlay } from "..";

const onConfirmA = vi.fn();

registerOverlay("test-a", ({ label }: { label?: string }) => (
  <Overlay title={`Overlay A ${label ?? ""}`} onConfirm={onConfirmA}>
    <input aria-label="a-input" />
    <textarea aria-label="a-note" />
    <button>inner button</button>
  </Overlay>
));
registerOverlay("test-b", () => (
  <Overlay title="Overlay B">
    <p>b body</p>
  </Overlay>
));
registerOverlay("test-c", () => (
  <Overlay title="Overlay C">
    <p>c body</p>
  </Overlay>
));

let api: ReturnType<typeof useOverlay>;
function Probe() {
  api = useOverlay();
  return <div>page</div>;
}

const setup = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <OverlayProvider>
        <Probe />
      </OverlayProvider>
    </ThemeProvider>,
  );

const titles = () => screen.queryAllByRole("heading", { level: 2, hidden: true }).map((h) => h.textContent);

describe("overlay manager", () => {
  beforeEach(() => {
    onConfirmA.mockClear();
    window.history.replaceState(null, "");
  });

  it("opens an overlay and pushes one history entry", () => {
    const before = window.history.length;
    setup();
    act(() => api.open("test-a", { label: "x" }));
    expect(titles()).toEqual(["Overlay A x"]);
    expect(window.history.length).toBe(before + 1);
  });

  it("stacks two levels; the second has a back arrow, and the third replaces the second", () => {
    setup();
    act(() => api.open("test-a"));
    act(() => api.open("test-b"));
    expect(titles()).toEqual(["Overlay A ", "Overlay B"]);
    expect(screen.getAllByLabelText("Back").length).toBeGreaterThanOrEqual(1);
    act(() => api.open("test-c"));
    expect(titles()).toEqual(["Overlay A ", "Overlay C"]);
  });

  it("Esc closes only the top overlay", async () => {
    setup();
    act(() => api.open("test-a"));
    act(() => api.open("test-b"));
    fireEvent.keyDown(screen.getByText("b body"), { key: "Escape" });
    await waitFor(() => expect(titles()).toEqual(["Overlay A "]));
    fireEvent.keyDown(screen.getByLabelText("a-input"), { key: "Escape" });
    await waitFor(() => expect(titles()).toEqual([]));
  });

  it("the phone back button closes the top overlay, not the page", async () => {
    setup();
    act(() => api.open("test-a"));
    act(() => api.open("test-b"));
    act(() => window.history.back());
    await waitFor(() => expect(titles()).toEqual(["Overlay A "]));
    act(() => window.history.back());
    await waitFor(() => expect(titles()).toEqual([]));
  });

  it("closing from the UI pops its history entry and close() resolves afterwards", async () => {
    setup();
    act(() => api.open("test-a"));
    expect(window.history.state?.__overlay).toBe(1);
    let done = false;
    await act(async () => {
      await api.close();
      done = true;
    });
    expect(done).toBe(true);
    expect(titles()).toEqual([]);
    // the entry was traversed back over, so a second Back must not be swallowed by a stale overlay
    expect(window.history.state?.__overlay).toBeUndefined();
  });

  it("Enter confirms, except in a multi-line field or on a button", () => {
    setup();
    act(() => api.open("test-a"));
    fireEvent.keyDown(screen.getByLabelText("a-input"), { key: "Enter" });
    expect(onConfirmA).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByLabelText("a-note"), { key: "Enter" });
    fireEvent.keyDown(screen.getByText("inner button"), { key: "Enter" });
    expect(onConfirmA).toHaveBeenCalledTimes(1);
  });

  it("the back arrow on the first level is a close button on desktop", async () => {
    setup();
    act(() => api.open("test-a"));
    fireEvent.click(screen.getByLabelText("Close"));
    await waitFor(() => expect(titles()).toEqual([]));
  });

  it("ignores ids that are not registered", () => {
    setup();
    act(() => api.open("nope"));
    expect(titles()).toEqual([]);
  });

  it("is a full-screen dialog with a back arrow on phones", () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...original(q), matches: true })) as any;
    try {
      setup();
      act(() => api.open("test-a"));
      expect(document.querySelector(".MuiDialog-paperFullScreen")).not.toBeNull();
      expect(screen.getByLabelText("Back")).toBeTruthy();
    } finally {
      window.matchMedia = original;
    }
  });
});

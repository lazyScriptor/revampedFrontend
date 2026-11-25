import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fetchPrefs = vi.fn();
const putPref = vi.fn();
vi.mock("@/features/retail/api/preferences.api", () => ({
  fetchUiPreferences: (...a: any[]) => fetchPrefs(...a),
  putUiPreference: (...a: any[]) => putPref(...a),
}));

import { useUiPreference } from "../useUiPreference";
import { useDensity } from "../useDensity";
import { signIn } from "@/features/retail/__tests__/testUtils";

function Probe() {
  const p = useUiPreference<string>("color", "red");
  return (
    <div>
      <span data-testid="v">{p.value}</span>
      <span data-testid="d">{String(p.isDefault)}</span>
      <button onClick={() => p.set("blue")}>set</button>
      <button onClick={() => p.reset()}>reset</button>
    </div>
  );
}
function Dense() {
  const d = useDensity();
  return (
    <div>
      <span data-testid="density">{d.density}</span>
      <span data-testid="h">{d.rowHeight}</span>
      <button onClick={() => d.setDensity("comfortable")}>go</button>
    </div>
  );
}

const mount = (ui: any) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("useUiPreference", () => {
  beforeEach(() => {
    fetchPrefs.mockReset().mockResolvedValue({ color: "green" });
    putPref.mockReset().mockResolvedValue({});
    signIn({ retail: true });
  });

  it("loads all preferences once and serves the stored value", async () => {
    mount(<><Probe /><Probe /></>);
    await waitFor(() => expect(screen.getAllByTestId("v")[0].textContent).toBe("green"));
    expect(fetchPrefs).toHaveBeenCalledTimes(1);
  });

  it("falls back to the default when nothing is stored", async () => {
    fetchPrefs.mockResolvedValue({});
    mount(<Probe />);
    await waitFor(() => expect(fetchPrefs).toHaveBeenCalled());
    expect(screen.getByTestId("v").textContent).toBe("red");
    expect(screen.getByTestId("d").textContent).toBe("true");
  });

  it("saves optimistically with PUT", async () => {
    let release: () => void = () => {};
    putPref.mockImplementation(() => new Promise<void>((r) => (release = r)));
    mount(<Probe />);
    await waitFor(() => expect(screen.getByTestId("v").textContent).toBe("green"));
    fireEvent.click(screen.getByText("set"));
    await waitFor(() => expect(screen.getByTestId("v").textContent).toBe("blue")); // before the server answered
    expect(putPref).toHaveBeenCalledWith("color", "blue");
    release();
  });

  it("rolls back when the server refuses", async () => {
    putPref.mockRejectedValue(new Error("no"));
    mount(<Probe />);
    await waitFor(() => expect(screen.getByTestId("v").textContent).toBe("green"));
    fireEvent.click(screen.getByText("set"));
    await waitFor(() => expect(screen.getByTestId("v").textContent).toBe("green"));
  });

  it("reset stores null and shows the default again", async () => {
    mount(<Probe />);
    await waitFor(() => expect(screen.getByTestId("v").textContent).toBe("green"));
    fireEvent.click(screen.getByText("reset"));
    await waitFor(() => expect(screen.getByTestId("v").textContent).toBe("red"));
    expect(putPref).toHaveBeenCalledWith("color", null);
  });

  it("makes no API calls in a shop without retail", async () => {
    signIn({ retail: false });
    mount(<Probe />);
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchPrefs).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("set"));
    expect(putPref).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("v").textContent).toBe("blue")); // kept for this session only
  });

  it("density defaults to compact (34 px rows) and switches to comfortable", async () => {
    fetchPrefs.mockResolvedValue({});
    mount(<Dense />);
    expect(screen.getByTestId("density").textContent).toBe("compact");
    expect(screen.getByTestId("h").textContent).toBe("34");
    fireEvent.click(screen.getByText("go"));
    await waitFor(() => expect(screen.getByTestId("density").textContent).toBe("comfortable"));
    expect(putPref).toHaveBeenCalledWith("density", "comfortable");
  });
});

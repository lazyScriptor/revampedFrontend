import { describe, it, expect, afterEach } from "vitest";
import { deviceApi } from "../lib/nativeBridge";
import { getDeviceToken, setDeviceToken } from "@/features/signatures/lib/deviceId";

const sentToken = async () => {
  let header = "";
  await deviceApi.get("/device/policy", {
    adapter: async (config) => {
      header = String(config.headers.Authorization);
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    },
  });
  return header;
};

const nativeToken = (deviceId: string, deviceToken: string) => {
  (window as any).Capacitor = {
    Plugins: { PhoneAssistant: { getDeviceToken: async () => ({ deviceId, deviceToken }) } },
  };
};

afterEach(() => {
  delete (window as any).Capacitor;
  window.localStorage.clear();
});

describe("device token after the app rotates it", () => {
  it("uses the app's new token and keeps it", async () => {
    window.localStorage.setItem("geargrid.device_id", "gg-device-1");
    setDeviceToken("old");
    nativeToken("gg-device-1", "new");
    expect(await sentToken()).toBe("Bearer new");
    expect(getDeviceToken()).toBe("new");
  });

  it("ignores a token belonging to another pairing", async () => {
    window.localStorage.setItem("geargrid.device_id", "gg-device-2");
    setDeviceToken("fresh");
    nativeToken("gg-device-1", "stale");
    expect(await sentToken()).toBe("Bearer fresh");
  });
});

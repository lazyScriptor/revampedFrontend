// Regression: the shared API client defaults to JSON, and axios then turned the
// photo FormData into JSON, so the server received no file ("No photo was received").
// These tests run the real client and inspect what would be sent.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { api } from "@/lib/api";
import { submitDevicePhoto } from "../useEquipmentPhoto";

let sent: InternalAxiosRequestConfig | null = null;
const originalAdapter = api.defaults.adapter;
const capture: AxiosAdapter = async (config) => {
  sent = config;
  return { data: { status: "success", data: { ok: true } }, status: 200, statusText: "OK", headers: {}, config };
};

beforeEach(() => {
  sent = null;
  api.defaults.adapter = capture;
});
afterEach(() => {
  api.defaults.adapter = originalAdapter;
});

describe("phone photo upload request", () => {
  it("sends the photo as a multipart form with the file intact, not as JSON", async () => {
    const photo = new Blob(["webp-bytes"], { type: "image/webp" });
    await submitDevicePhoto("gg-phone-1", "tok", photo);

    expect(sent?.url).toBe("/public/devices/gg-phone-1/photo-requests/tok/photo");
    expect(sent?.data).toBeInstanceOf(FormData);
    const file = (sent!.data as FormData).get("image") as File;
    expect(file).toBeInstanceOf(Blob);
    expect(file.name).toBe("photo.webp");
    expect(String(sent!.headers["Content-Type"] || "")).not.toMatch(/application\/json/);
  });

  it("names a JPEG fallback photo .jpg", async () => {
    await submitDevicePhoto("gg-phone-1", "tok", new Blob(["jpg"], { type: "image/jpeg" }));
    expect(((sent!.data as FormData).get("image") as File).name).toBe("photo.jpg");
  });
});

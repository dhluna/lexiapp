import { describe, expect, it } from "vitest";
import { MemoryStorage } from "../persistence/storage";
import { FakeAuth, FakePush, FakeReminderRemote } from "../testing/fakes";
import { REMINDER_KEY, ReminderService } from "./reminder-service";

const ANA = { id: "ana", email: "ana@example.com", provider: "email" as const };
const LUIS = { id: "luis", email: "luis@example.com", provider: "google" as const };

function setup() {
  const push = new FakePush();
  const remote = new FakeReminderRemote();
  const auth = new FakeAuth();
  const storage = new MemoryStorage();
  auth.signIn(ANA);
  const create = () => new ReminderService(push, remote, auth, storage, "vapid-public");
  return { push, remote, auth, storage, service: create(), create };
}

describe("ReminderService", () => {
  it("is off at 20:00 by default", () => {
    expect(setup().service.getSnapshot()).toEqual({ status: "off", time: "20:00" });
  });

  it("turns on: asks for permission and saves the device with its time and time zone", async () => {
    const { service, push, remote } = setup();
    expect(await service.enable("21:30")).toEqual({ ok: true });
    expect(push.subscribe).toHaveBeenCalledWith("vapid-public");
    expect(remote.devices.get("https://push.example/device")).toEqual({ time: "21:30", timeZone: "Europe/Madrid" });
    expect(service.getSnapshot()).toEqual({ status: "on", time: "21:30" });
  });

  it("stays on after a reload while the browser keeps the subscription", async () => {
    const { service, create } = setup();
    await service.enable("21:30");
    const reloaded = create();
    await reloaded.refresh();
    expect(reloaded.getSnapshot()).toEqual({ status: "on", time: "21:30" });
  });

  it("shows it off when the browser lost the subscription", async () => {
    const { service, push, create } = setup();
    await service.enable("21:30");
    push.subscription = null;
    const reloaded = create();
    await reloaded.refresh();
    expect(reloaded.getSnapshot().status).toBe("off");
  });

  it("explains when notifications are not allowed", async () => {
    const { service, push, remote } = setup();
    push.allow = false;
    const result = await service.enable("20:00");
    expect(result).toEqual({ ok: false, message: "Para recibir el recordatorio, permite las notificaciones de Lexi." });
    expect(service.getSnapshot().status).toBe("blocked");
    expect(remote.register).not.toHaveBeenCalled();
  });

  it("reports iPhone without installing and unsupported browsers", () => {
    const iphone = setup();
    iphone.push.supportValue = "needs-install";
    expect(iphone.create().getSnapshot().status).toBe("needs-install");
    const old = setup();
    old.push.supportValue = "unsupported";
    expect(old.create().getSnapshot().status).toBe("unsupported");
  });

  it("keeps it off when the server cannot save it", async () => {
    const { service, remote } = setup();
    remote.fail = true;
    expect((await service.enable("20:00")).ok).toBe(false);
    expect(service.getSnapshot().status).toBe("off");
  });

  it("changes the time of an active reminder", async () => {
    const { service, remote } = setup();
    await service.enable("20:00");
    await service.setTime("08:30");
    expect(remote.devices.get("https://push.example/device")?.time).toBe("08:30");
    expect(service.getSnapshot()).toEqual({ status: "on", time: "08:30" });
  });

  it("turns off: removes the device from the server and the browser", async () => {
    const { service, remote, push, storage } = setup();
    await service.enable("20:00");
    expect(await service.disable()).toEqual({ ok: true });
    expect(remote.devices.size).toBe(0);
    expect(push.subscription).toBeNull();
    expect(storage.getItem(REMINDER_KEY)).toBeNull();
    expect(service.getSnapshot().status).toBe("off");
  });

  it("forgets the device on sign-out, and another account starts with it off", async () => {
    const { service, remote, auth, create } = setup();
    await service.enable("20:00");
    await service.forgetDevice();
    expect(remote.devices.size).toBe(0);
    auth.signIn(LUIS);
    const next = create();
    await next.refresh();
    expect(next.getSnapshot().status).toBe("off");
  });
});

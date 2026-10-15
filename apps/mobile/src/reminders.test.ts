import { LocalStorageProgressRepository } from "@lexi/core/persistence/progress-repository";
import { MemoryStorage } from "@lexi/core/persistence/storage";
import { ProgressStore } from "@lexi/core/services/progress-store";
import { REMINDER_KEY, ReminderService } from "./reminders";
import { fakeNotifications } from "./test/render";

function setup(now: Date, granted = true) {
  const storage = new MemoryStorage();
  let clock = now;
  const store = new ProgressStore(new LocalStorageProgressRepository(storage), () => clock);
  const notifications = fakeNotifications(granted);
  const service = new ReminderService(store, storage, notifications.port, () => clock);
  return { storage, store, service, ...notifications, setNow: (d: Date) => (clock = d) };
}

describe("ReminderService", () => {
  it("stays off and explains when notifications are denied", async () => {
    const { service, scheduled, storage } = setup(new Date(2026, 9, 12, 9, 0), false);
    expect(await service.enable(19)).toBe("denied");
    expect(service.getSettings().enabled).toBe(false);
    expect(scheduled.size).toBe(0);
    expect(JSON.parse(storage.getItem(REMINDER_KEY)!)).toEqual({ enabled: false, hour: 19 });
  });

  it("schedules the next 7 days at the chosen hour", async () => {
    const { service, scheduled } = setup(new Date(2026, 9, 12, 9, 0));
    expect(await service.enable(21)).toBe("enabled");
    const ids = [...scheduled.keys()].sort();
    expect(ids).toHaveLength(7);
    expect(ids[0]).toBe("lexi-reminder-2026-10-12");
    expect(scheduled.get(ids[0])!.at.getHours()).toBe(21);
  });

  it("does not remind on a day already practiced, and promises only a streak that will hold", async () => {
    const { service, store, scheduled, setNow } = setup(new Date(2026, 9, 11, 10, 0));
    store.recordAnswer("travel-fly", "learned"); // yesterday
    setNow(new Date(2026, 9, 12, 9, 0));
    await service.enable(19);

    // Not practiced today: today's reminder mentions the live 1-day streak.
    expect(scheduled.get("lexi-reminder-2026-10-12")!.title).toBe("Llevas 1 día de racha");
    expect(scheduled.get("lexi-reminder-2026-10-13")!.title).toBe("Hora de practicar");

    store.recordAnswer("essentials-eat", "learned"); // practice today
    await service.reschedule();
    expect(scheduled.has("lexi-reminder-2026-10-12")).toBe(false);
    expect(scheduled.get("lexi-reminder-2026-10-13")!.title).toBe("Llevas 2 días seguidos");
    expect(scheduled.get("lexi-reminder-2026-10-14")!.title).toBe("Hora de practicar");
  });

  it("cancels everything when turned off and turns itself off if permission is revoked", async () => {
    const { service, scheduled, port } = setup(new Date(2026, 9, 12, 9, 0));
    await service.enable(8);
    await service.setHour(13);
    expect(scheduled.get("lexi-reminder-2026-10-12")!.at.getHours()).toBe(13);

    port.granted = false;
    await service.reschedule();
    expect(service.getSettings().enabled).toBe(false);
    expect(scheduled.size).toBe(0);

    port.granted = true;
    await service.enable();
    await service.disable();
    expect(scheduled.size).toBe(0);
  });
});

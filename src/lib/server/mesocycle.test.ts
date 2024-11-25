import { expect, test } from "vitest";
import { calculateWorkoutCreation } from "./mesocycle";

test("example workout creation test", () => {
  // this is the bare bones of a unit test
  // it's not a useful test case as is, but is how you would start to set up useful test cases
  // run tests with:
  // npm run test
  const now = new Date("2024-09-02T00:00:00.000-07:00");
  const fiveWeeksinMilis = 1000 * 60 * 60 * 24 * 7 * 5;
  const endDate = new Date(now.getTime() + fiveWeeksinMilis);
  const dayMap = new Map();
  dayMap.set("SundayID", 0);
  const result = calculateWorkoutCreation(
    "1",
    now,
    endDate,
    "1",
    "1",
    dayMap,
    "SundayID",
    "SundayID",
  );
  console.log(result);
  expect(result).toStrictEqual([
    {
      user: "1",
      mesocycle: "1",
      meso_day: "1",
      day_name: "SundayID",
      date: new Date("2024-09-08T00:00:00.000-07:00"),
      target_rir: 3,
      deload: false,
      complete: false,
    },
    {
      user: "1",
      mesocycle: "1",
      meso_day: "1",
      day_name: "SundayID",
      date: new Date("2024-09-15T00:00:00.000-07:00"),
      target_rir: 2,
      deload: false,
      complete: false,
    },
    {
      user: "1",
      mesocycle: "1",
      meso_day: "1",
      day_name: "SundayID",
      date: new Date("2024-09-22T00:00:00.000-07:00"),
      target_rir: 1,
      deload: false,
      complete: false,
    },
    {
      user: "1",
      mesocycle: "1",
      meso_day: "1",
      day_name: "SundayID",
      date: new Date("2024-09-29T00:00:00.000-07:00"),
      target_rir: 0,
      deload: false,
      complete: false,
    },
    {
      user: "1",
      mesocycle: "1",
      meso_day: "1",
      day_name: "SundayID",
      date: new Date("2024-10-06T00:00:00.000-07:00"),
      target_rir: -1,
      deload: true,
      complete: false,
    },
  ]);
});


import { describe, it, expect } from "vitest";
import { millisecondsToSeconds } from "../src/drivers/utils";

describe("utils tests", () => {
  it("converts 2000 milliseconds to 2 seconds", () => {
    expect(millisecondsToSeconds(2000)).toBe(2);
    expect(millisecondsToSeconds(0)).toBe(0);
  });
});

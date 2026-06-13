import assert from "node:assert/strict";
import { test } from "node:test";

import {
  trainingCourseDisplayLabel,
  trainingOutcomeLabel,
} from "../../src/shared/display-labels.mjs";
import { validateTrainingSessionPayload } from "../../src/server/training-service.mjs";

test("training session validation requires exactly one pass or fail outcome", () => {
  const missingOutcome = validateTrainingSessionPayload({
    courseId: "course-1",
    completedAt: "2026-06-13",
    attendees: [{ personnelProfileId: "personnel-1" }],
  });
  assert.equal(missingOutcome.ok, false);
  assert.match(missingOutcome.message, /exactly one outcome/);

  const doubleSelected = validateTrainingSessionPayload({
    courseId: "course-1",
    completedAt: "2026-06-13",
    attendees: [{ personnelProfileId: "personnel-1", pass: true, fail: true }],
  });
  assert.equal(doubleSelected.ok, false);
  assert.match(doubleSelected.message, /exactly one outcome/);

  const valid = validateTrainingSessionPayload({
    courseId: "course-1",
    completedAt: "2026-06-13",
    attendees: [
      { personnelProfileId: "personnel-1", pass: true },
      { personnelProfileId: "personnel-2", outcome: "Fail" },
    ],
  });
  assert.equal(valid.ok, true);
  assert.deepEqual(
    valid.value.attendees.map((attendee) => attendee.outcome),
    ["Pass", "Fail"],
  );
});

test("training display helpers return human-readable labels", () => {
  assert.equal(
    trainingCourseDisplayLabel({ key: "rasp", name: "RANGER ASSESSMENT AND SELECTION" }),
    "RANGER ASSESSMENT AND SELECTION",
  );
  assert.equal(trainingCourseDisplayLabel({ key: "advanced_course" }), "Advanced Course");
  assert.equal(trainingOutcomeLabel("Pass"), "Pass");
  assert.equal(trainingOutcomeLabel("Fail"), "Fail");
});

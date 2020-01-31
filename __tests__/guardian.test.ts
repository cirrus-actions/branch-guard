import {findAffectedPRs, overallRefConclusion} from "../src/guardian";
import * as core from "@actions/core";

test('findAffectedPRs', async () => {
  let prs = await findAffectedPRs("flutter", "flutter", "refs/heads/master");
  expect(prs.length).toBeGreaterThan(0)
});

test('overallRefConclusion', async () => {
  process.env['INPUT_APPSTOIGNORE'] = 'Codecov,WIP';
  let conclusion = await overallRefConclusion("flutter", "flutter", "refs/heads/beta");
  expect(conclusion.allCompleted).toBeTruthy()
});

import * as core from '@actions/core'
import {checkReference, checkReferenceAndSetForSHA} from "./guardian";
import {getRequiredEnvironmentVariable} from "./utils";
import {context} from "@actions/github";

async function run(): Promise<void> {
  try {
    await _runImpl()
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function _runImpl(): Promise<void> {
  let GITHUB_REPOSITORY = getRequiredEnvironmentVariable('GITHUB_REPOSITORY');

  let [owner, name] = GITHUB_REPOSITORY.split('/');

  core.info(`Handling '${context.payload.action}' action for ${context.eventName} event for ${context.ref}@${context.sha}.`);

  // can't rely on GITHUB_REF because of https://github.community/t5/GitHub-Actions/check-run-check-suite-events-always-run-workflow-against-latest/m-p/41537/highlight/true#M4656
  if (context.eventName == "pull_request" && context.payload.action == "opened") {
    let pr = context.payload.pull_request?.number;
    let sha = context.payload.pull_request?.head?.sha;
    let ref = context.payload.pull_request?.base?.ref;
    core.info(`Checking reference ${ref} for PR #${pr} and SHA ${sha}.`);
    await checkReferenceAndSetForSHA(owner, name, ref, sha);
  } else if (context.eventName == "check_suite") {
    await checkReference(owner, name, `refs/heads/${context.payload.check_suite?.head_branch}`);
  } else {
    core.warning(`Don't know how to process '${context.eventName}' event!`);
  }
}

run();

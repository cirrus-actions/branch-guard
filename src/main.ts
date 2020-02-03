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
  let GITHUB_REF = getRequiredEnvironmentVariable('GITHUB_REF');

  let [owner, name] = GITHUB_REPOSITORY.split('/');

  core.info(`Handling '${context.payload.action}' action for ${context.eventName} event for ${context.ref}@${context.sha}.`);

  if (context.eventName == "pull_request" && context.payload.actio7 == "opened") {
    let pr = context.payload.pull_request?.number;
    let sha = context.payload.pull_request?.head?.sha;
    let ref = context.payload.pull_request?.base?.ref;
    core.info(`Checking reference ${ref} for PR #${pr} and SHA ${sha}.`);
    await checkReferenceAndSetForSHA(owner, name, ref, sha);
  } else {
    await checkReference(owner, name, GITHUB_REF);
  }
}

run();

import * as core from '@actions/core'
import {checkReference} from "./guardian";
import {getRequiredEnvironmentVariable} from "./utils";

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

  await checkReference(owner, name, GITHUB_REF);
}

run();

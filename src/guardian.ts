import * as core from '@actions/core'
import * as github from '@actions/github'
import {getRequiredEnvironmentVariable} from "./utils";

type GitHubStatus = { context: string, description?: string, state: "error" | "failure" | "pending" | "success", target_url?: string }

export async function checkReference(repositoryOwner: string, repositoryName: string, ref: string) {
  let conclusion = await overallRefConclusion(repositoryOwner, repositoryName, ref);
  if (!conclusion.allCompleted && !conclusion.failedCheck) {
    console.log(`Seems checks are still running... Nothing to react to at the moment!`);
    return;
  }
  let status: GitHubStatus = {
    context: "branch-guard",
    description: "Checks are running...",
    state: "pending",
  };
  if (conclusion.allCompleted) {
    if (conclusion.failedCheck) {
      status.state = "failure";
      status.description = `${conclusion.failedCheck.appName} ${conclusion.failedCheck.conclusion}`;
      status.target_url = conclusion.failedCheck.url
    } else {
      status.state = "success";
      status.description = "All checks are passing!";
    }
  } else {

  }
  let page = 0;
  while (true) {
    let prs = await findAffectedPRs(repositoryOwner, repositoryName, ref, ++page);
    core.debug(`Found ${prs.length} PRs on page ${page}: ${prs}`);
    if (prs.length === 0) break;
    for (const pr of prs) {
      core.info(`Setting status for PR #${pr.number}...`);
      await setStatus(repositoryOwner, repositoryName, pr.sha, status)
    }
  }
  core.info(`Done!`);
}

export async function findAffectedPRs(repositoryOwner: string, repositoryName: string, ref: string, page: number = 1): Promise<Array<{ number: number, sha: string }>> {
  let branch = ref.split('/', 3).pop();

  let api = process.env.GITHUB_TOKEN ? new github.GitHub(process.env.GITHUB_TOKEN) : new github.GitHub({});

  let pullsResponse = await api.pulls.list({
    owner: repositoryOwner,
    repo: repositoryName,
    state: "open",
    base: branch,
    page: page
  });
  return pullsResponse.data.map(pr => {
    return {
      number: pr.number,
      sha: pr.head.sha
    }
  });
}

export async function setStatus(repositoryOwner: string, repositoryName: string, sha: string, status: GitHubStatus): Promise<number> {
  let api = new github.GitHub(getRequiredEnvironmentVariable('GITHUB_TOKEN'));

  let params = {
    owner: repositoryOwner,
    repo: repositoryName,
    sha: sha,
  };
  let response = await api.repos.createStatus({...params, ...status});

  return response.status
}

export class CheckInfo {
  appName: String;
  url: string;
  conclusion: string;

  constructor(appName: String, url: string, conclusion: string) {
    this.appName = appName;
    this.url = url;
    this.conclusion = conclusion;
  }
}

export class CheckConclusion {
  allCompleted: boolean = false;
  failedCheck: CheckInfo | null = null;


  constructor(allCompleted: boolean, failedCheck: CheckInfo | null = null) {
    this.allCompleted = allCompleted;
    this.failedCheck = failedCheck;
  }
}

export async function overallRefConclusion(repositoryOwner: string, repositoryName: string, ref: string): Promise<CheckConclusion> {
  let appsToIgnore = core.getInput('appsToIgnore').split(',').filter(name => name.length > 0);

  let api = process.env.GITHUB_TOKEN ? new github.GitHub(process.env.GITHUB_TOKEN) : new github.GitHub({});

  let checksResponse = await api.checks.listSuitesForRef({
    owner: repositoryOwner,
    repo: repositoryName,
    ref: ref
  });
  let checkSuites = checksResponse.data.check_suites.filter(checkSuite => !appsToIgnore.includes(checkSuite.app.name));
  core.info(`Found ${checkSuites.length} check suites.`);
  for (const checkSuite of checkSuites) {
    core.debug(`Check suite ${checkSuite.id}: ${checkSuite.app.name} ${checkSuite.status} ${checkSuite.conclusion}`)
  }
  // first check if there is any suite that completed but not in a successful state to report it ASAP
  for (const checkSuite of checkSuites) {
    if (checkSuite.status === 'completed' && (checkSuite.conclusion !== 'neutral' && checkSuite.conclusion !== 'success')) {
      return new CheckConclusion(
        false,
        new CheckInfo(checkSuite.app.name, checkSuite.url, checkSuite.conclusion)
      )
    }
  }
  // there are no failing checks at the moment!
  // let's check if any of them are still running e.g. no in completed state
  for (const checkSuite of checkSuites) {
    if (checkSuite.status !== 'completed') {
      return new CheckConclusion(false);
    }
  }
  return new CheckConclusion(true)
}

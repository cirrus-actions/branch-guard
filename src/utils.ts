import * as core from "@actions/core";

export function getRequiredEnvironmentVariable(name: string): string {
  let value = process.env[name];
  if (!value) {
    let errorMessage = `Can't find ${name} environment variable!`;
    core.error(errorMessage);
    process.exit(1)
  }
  return value
}

/**
 * Mechanical branch creation — "matching a tracker's gitBranchName field to a
 * git operation is mechanical, not the specialist's judgment to make... it's
 * the app's job." Reads the epic branch's current commit sha via the GitHub
 * REST API and creates the story branch ref from it. Never rebases or
 * re-parents an existing branch — if the story branch already exists, this
 * is idempotent (a retried activity attempt isn't an error), but it never
 * moves an existing ref, since a human or a previous attempt may already be
 * building on it.
 *
 * Only `github` is supported as a repo-base host for now — GitHub Enterprise
 * or another host would need a different API base URL, not built until an
 * actual engagement needs one.
 *
 * Retry classification matters here (Temporal retries a thrown activity by
 * default, generously): a 4xx from GitHub — an unsupported host, a missing
 * epic branch, a malformed create request — won't change on an identical
 * retry, so those throw `ApplicationFailure.nonRetryable`. A 5xx or a
 * network-level failure might be transient, so those throw a plain `Error`
 * and stay retryable.
 */

import { ApplicationFailure } from "@temporalio/activity";
import type { RepoBase } from "./resolve-repo-base.js";

const GITHUB_API_URL = "https://api.github.com";

interface GitHubRefResponse {
  object: { sha: string };
}

async function githubRequest<T>(
  githubToken: string,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; json: T }> {
  const res = await fetch(`${GITHUB_API_URL}${path}`, {
    method: method,
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as T;
  return { status: res.status, json: json };
}

export interface CreateStoryBranchInput {
  readonly repoBase: RepoBase;
  readonly epicBranch: string;
  readonly storyBranch: string;
}

function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

export async function createStoryBranch(githubToken: string, input: CreateStoryBranchInput): Promise<void> {
  if (input.repoBase.host !== "github") {
    throw ApplicationFailure.nonRetryable(
      `Unsupported repo-base host "${input.repoBase.host}" — only "github" is supported today`,
      "UnsupportedRepoHost",
    );
  }

  const owner = input.repoBase.org;
  const repo = input.repoBase.repo;

  const epicRef = await githubRequest<GitHubRefResponse>(
    githubToken,
    "GET",
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(input.epicBranch)}`,
  );
  if (epicRef.status !== 200) {
    const message = `Could not read epic branch "${input.epicBranch}" in ${owner}/${repo}: GitHub returned ${epicRef.status}`;
    if (isClientError(epicRef.status)) throw ApplicationFailure.nonRetryable(message, "EpicBranchUnreadable");
    throw new Error(message);
  }

  const createResult = await githubRequest<{ message?: string }>(githubToken, "POST", `/repos/${owner}/${repo}/git/refs`, {
    ref: `refs/heads/${input.storyBranch}`,
    sha: epicRef.json.object.sha,
  });

  const alreadyExists = createResult.status === 422 && /already exists/i.test(createResult.json.message ?? "");
  if (createResult.status !== 201 && !alreadyExists) {
    const message =
      `Could not create story branch "${input.storyBranch}" in ${owner}/${repo}: ` +
      `GitHub returned ${createResult.status} (${createResult.json.message ?? "no message"})`;
    if (isClientError(createResult.status)) throw ApplicationFailure.nonRetryable(message, "StoryBranchCreateFailed");
    throw new Error(message);
  }
}

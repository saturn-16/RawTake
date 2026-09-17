const GITHUB_API = "https://api.github.com";

function parseRepoUrl(repoUrl) {
  const match = repoUrl
    .trim()
    .replace(/\.git$/, "")
    .match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error("Could not parse a GitHub owner/repo from that URL.");
  }
  return { owner: match[1], repo: match[2] };
}

function authHeaders() {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function githubGet(path) {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    if (res.status === 404) return null;
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status} for ${path}: ${body}`);
  }
  return res.json();
}

async function fetchReadme(owner, repo) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
    headers: { ...authHeaders(), Accept: "application/vnd.github.raw+json" },
  });
  if (!res.ok) return null;
  return res.text();
}

async function fetchTree(owner, repo, defaultBranch) {
  const data = await githubGet(
    `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
  );
  if (!data || !data.tree) return [];
  return data.tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path)
    .slice(0, 500);
}

async function fetchCommits(owner, repo) {
  const data = await githubGet(`/repos/${owner}/${repo}/commits?per_page=30`);
  if (!data) return [];
  return data.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0],
    author: c.commit.author?.name,
    date: c.commit.author?.date,
  }));
}

async function fetchLanguages(owner, repo) {
  const data = await githubGet(`/repos/${owner}/${repo}/languages`);
  return data || {};
}

export async function analyzeRepoData(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  const repoInfo = await githubGet(`/repos/${owner}/${repo}`);
  if (!repoInfo) {
    throw new Error(`Repo ${owner}/${repo} not found (or private/rate-limited).`);
  }

  const [readme, tree, commits, languages] = await Promise.all([
    fetchReadme(owner, repo),
    fetchTree(owner, repo, repoInfo.default_branch),
    fetchCommits(owner, repo),
    fetchLanguages(owner, repo),
  ]);

  return {
    owner,
    repo,
    description: repoInfo.description,
    defaultBranch: repoInfo.default_branch,
    readme: readme || null,
    filePaths: tree,
    commits,
    languages,
  };
}

# Contributing and Git Workflow

## Team rules

- `main` should stay working. Do not push directly to `main`.
- Work on separate branches named `feature/<member>-<task>`, for example `feature/a-exchange-function`.
- Commit small, complete changes with clear messages, such as `feat(db): add exchange_points function`.
- Pull the latest `main` before starting a task and before opening a pull request.
- Open a pull request into `main`; the other member reviews it before merge.
- Both members use their own Git identity and contribute authored commits to project history.
- Keep `.env` private and out of Git. Commit `.env.example` without real credentials.

## First-time setup (Member A creates the remote)

Create an empty GitHub repository, then from the project folder:

```bash
git init -b main
git add README.md .gitignore .env.example docs
git commit -m "chore: add project setup and team workflow"
git remote add origin <repository-url>
git push -u origin main
```

Member B clones the repository:

```bash
git clone <repository-url>
cd dbms_proj
```

If this folder already has Git history, do not run `git init`; add the GitHub remote if needed and push the existing `main` branch instead.

## Start a task on a feature branch

Both members run:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/<member>-<task>
```

Example:

```bash
git switch -c feature/a-exchange-function
```

## Commit and push

```bash
git status
git add <files-you-changed>
git commit -m "feat(db): add exchange_points function"
git push -u origin feature/<member>-<task>
```

Use your actual branch and commit message. Make sure `git status` does not show `.env` before committing.

## Pull a teammate's changes

After the teammate's pull request is merged:

```bash
git switch main
git pull --ff-only origin main
```

To bring updated `main` into your in-progress feature branch:

```bash
git switch feature/<member>-<task>
git fetch origin
git merge origin/main
```

## Open a pull request

Push your feature branch, then on GitHub choose **Compare & pull request**. Set the base to `main`, summarize what changed, and request the other member as reviewer. After approval, merge the PR, then update your local `main` with the commands above. The GitHub CLI alternative is:

```bash
gh pr create --base main --head feature/<member>-<task> --title "Add exchange function" --body "Adds the PostgreSQL point exchange function."
```

## Resolve a simple merge conflict

When a merge stops on a conflict:

```bash
git status
```

Open each listed file and edit the `<<<<<<<`, `=======`, and `>>>>>>>` conflict markers into the intended final content. Coordinate with the teammate if both edits matter, then:

```bash
git add <resolved-files>
git commit -m "merge: resolve conflict with main"
```

Review the result with `git status` and `git diff HEAD^`. Do not resolve a conflict by blindly choosing one side if it would discard the other person's work.

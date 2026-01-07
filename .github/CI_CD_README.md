# CI/CD Pipeline Setup

## How It Works

### Railway vs GitHub Actions

**Railway** = Where your app runs (hosting platform)
- Already configured to auto-deploy from Git
- When you push to `main/master`, Railway automatically:
  1. Detects the push
  2. Builds your Docker image (from `backend/Dockerfile`)
  3. Deploys it
  4. Updates your app at `https://dispacio-production.up.railway.app`

**GitHub Actions** = Quality checks before deployment
- Runs tests on every PR
- Runs tests before Railway deploys
- Blocks bad code from reaching production

### The Flow

```
1. You create a PR
   ↓
2. GitHub Actions runs tests (pr-tests.yml)
   - Linting
   - Type checking
   - Syntax validation
   ↓
3. If tests pass → PR can be merged
   ↓
4. You merge to main/master
   ↓
5. GitHub Actions runs tests again (deploy.yml)
   ↓
6. If tests pass → Railway auto-deploys
   ↓
7. Your app is live! 🚀
```

## Setup Instructions

### 1. Railway Setup (Already Done)

Your Railway project is already connected to this repo. It will:
- Auto-deploy when you push to `main/master`
- Use the `backend/Dockerfile` to build
- Set environment variables from Railway dashboard

### 2. GitHub Actions (Just Created)

The workflows are ready to use:

- **`.github/workflows/pr-tests.yml`** - Runs on PRs
- **`.github/workflows/deploy.yml`** - Runs on merge to main

### 3. Testing the Pipeline

To test it right now:

1. **Create a test PR:**
   ```bash
   git checkout -b test-ci-cd
   git add .github/
   git commit -m "Add CI/CD pipeline"
   git push origin test-ci-cd
   ```

2. **Open a PR on GitHub**
   - Go to your repo
   - You'll see "PR Tests" workflow running
   - Check the Actions tab to see progress

3. **Merge the PR:**
   - Once tests pass, merge to main
   - The "Deploy" workflow will run
   - Railway will automatically deploy

## What Gets Tested

### Frontend:
- ✅ ESLint (code quality)
- ✅ TypeScript type checking
- ✅ Build validation

### Backend:
- ✅ Syntax checking
- ✅ Dependency installation
- ✅ Dockerfile validation

## Adding Real Tests Later

When you're ready to add actual unit/integration tests:

1. **Frontend:** Add Jest/Vitest
   ```bash
   npm install --save-dev jest @testing-library/react-native
   ```

2. **Backend:** Add test framework
   ```bash
   cd backend
   npm install --save-dev vitest
   ```

3. **Update workflows** to run:
   ```yaml
   - run: npm test
   ```

## Railway Auto-Deploy

Railway watches your `main/master` branch. When you push:
- It detects the change
- Builds from `backend/Dockerfile`
- Deploys automatically
- No GitHub Actions needed for deployment!

The GitHub Actions workflow just ensures tests pass first.

## Manual Deployment

If you need to deploy manually:

```bash
# Via Railway CLI
railway up

# Or trigger from GitHub Actions
# Go to Actions → Deploy → Run workflow
```

## Environment Variables

Set these in Railway dashboard:
- `DATABASE_URL` - PostgreSQL connection
- `PORT` - Server port (Railway sets this)
- `LOG_LEVEL` - Logging level
- Any other env vars your app needs

## Troubleshooting

**Tests failing?**
- Check the Actions tab for error details
- Run `npm run lint` locally to catch issues early

**Railway not deploying?**
- Check Railway dashboard → Deployments
- Verify Railway is connected to your GitHub repo
- Check build logs in Railway

**Want to skip tests?**
- Use `[skip ci]` in commit message (not recommended)


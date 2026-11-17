# GitHub Deployment Guide — GoalInsight Landing Page

This guide explains how to deploy your GoalInsight project to **GitHub** and host your landing page (**`index.html`**) live on the web via **GitHub Pages** in under 3 minutes.

---

## 🚀 3-Minute Quick Start to Deploy to GitHub

### Step 1: Open PowerShell in your Desktop Project Folder
Open PowerShell and navigate to the project directory:
```powershell
cd C:\Users\DELA\Desktop\GoalInsight
```

### Step 2: Initialize Git & Commit Your Files
Run the following commands:
```powershell
git init
git add .
git commit -m "feat: complete GoalInsight football intelligence platform with 90%+ banker algorithms and index.html landing page"
```

### Step 3: Link to Your GitHub Repository & Push
1. Go to [github.com/new](https://github.com/new) and create a new repository (e.g., `goalinsight` or `GoalInsight`).
2. Copy your repository's URL and run:
```powershell
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
git push -u origin main
```
*(Replace `<YOUR_GITHUB_USERNAME>` and `<YOUR_REPOSITORY_NAME>` with your GitHub details).*

---

## 🌐 How to Enable GitHub Pages (To View Your `index.html` Live)

Once your code is pushed to GitHub:

1. Open your repository on **GitHub.com**.
2. Click on **Settings** (top right tab of your repository).
3. On the left sidebar menu, click **Pages**.
4. Under **Build and deployment**:
   * **Source**: Choose **Deploy from a branch**.
   * **Branch**: Select **`main`** and folder **`/(root)`** (or **`/docs`**).
   * Click **Save**.
5. Within 30 to 60 seconds, GitHub Pages will deploy your site!
6. Your live website URL will be displayed at the top:
   ```
   https://<YOUR_GITHUB_USERNAME>.github.io/<YOUR_REPOSITORY_NAME>/
   ```
   Opening this URL will automatically display your **`index.html`** landing page!

---

## 📂 Landing Page Architecture (`index.html`)

Your project has been specifically configured to satisfy the `index.html` landing requirement:

1. **Root Landing Page**: [`index.html`](file:///C:/Users/DELA/Desktop/GoalInsight/index.html)
   * Placed right at the root of the repository so GitHub Pages loads it as the default homepage.
   * Full client-side Dixon-Coles Poisson prediction engine, 4-model ensemble, and 90%+ Banker scanner.
   * Works on GitHub Pages, on any static web host, and even when opened directly from disk (`file:///`).
2. **Docs Landing Page**: [`docs/index.html`](file:///C:/Users/DELA/Desktop/GoalInsight/docs/index.html)
   * Provided for users who prefer GitHub Pages' `/docs` folder option.
3. **Data Snapshot**: [`fixtures_data.js`](file:///C:/Users/DELA/Desktop/GoalInsight/fixtures_data.js)
   * Contains all 95 fixtures, 4-model ensemble consensus, and daily banker slips so your landing page functions 100% out of the box with zero setup needed.
4. **Bypass Jekyll Processing**: [`.nojekyll`](file:///C:/Users/DELA/Desktop/GoalInsight/.nojekyll)
   * Tells GitHub Pages to directly serve all assets without Jekyll interfering.
5. **Automated CI/CD Deployment**: [`.github/workflows/deploy.yml`](file:///C:/Users/DELA/Desktop/GoalInsight/.github/workflows/deploy.yml)
   * If you prefer GitHub Actions, a deployment workflow is preconfigured to publish to GitHub Pages on every `git push`.

---

## 💻 Local Testing of `index.html`

You can test your landing page right now on your machine:
* **Option A**: Double-click [`index.html`](file:///C:/Users/DELA/Desktop/GoalInsight/index.html) in your Windows File Explorer — it will open directly in Chrome, Edge, or Firefox!
* **Option B**: Run the full dual-stack with [`RUN_GOALINSIGHT.bat`](file:///C:/Users/DELA/Desktop/GoalInsight/RUN_GOALINSIGHT.bat).

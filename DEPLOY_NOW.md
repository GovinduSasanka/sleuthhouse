# Deploy Sleuthhouse to Vercel Now

Your project is ready to deploy. Follow these steps:

## Step 1: Create a GitHub Account & Repository (5 minutes)

1. Go to https://github.com and click **Sign up**
2. Create your free account (username, email, password)
3. After signing up, go to https://github.com/new
4. Create a new repository:
   - **Repository name:** `sleuthhouse`
   - **Description:** "Printable detective mysteries for kids"
   - Select **Public**
   - Do NOT initialize with README (you already have one)
   - Click **Create repository**

5. You'll see instructions. Run these commands in PowerShell in the sleuthhouse folder:

```powershell
cd C:\Users\govin\Music\sleuthhouse
git remote add origin https://github.com/<YOUR_USERNAME>/sleuthhouse.git
git branch -M master
git push -u origin master
```

(Replace `<YOUR_USERNAME>` with your actual GitHub username)

## Step 2: Create a Vercel Account & Deploy (3 minutes)

1. Go to https://vercel.com and click **Sign Up**
2. Click **Continue with GitHub** (use your GitHub account you just created)
3. Click **Authorize Vercel** to connect your GitHub
4. After signing in, go to https://vercel.com/new
5. You should see your `sleuthhouse` repository in the list
6. Click **Import** on the sleuthhouse project
7. **No build settings needed** — click **Deploy**
8. Wait 1-2 minutes for the build to complete
9. You'll get a live URL like `https://sleuthhouse.vercel.app`

**That's it!** Your site is now live.

## Step 3: Optional — Add a Custom Domain

After deployment, if you want a custom domain (like sleuthhouse.com):
1. In Vercel dashboard, go to your project → **Settings → Domains**
2. Add your domain (you can buy one from GoDaddy, Namecheap, etc. for ~$10/year)
3. Follow Vercel's DNS instructions

## Step 4: Set Up License Sales (when ready)

See **docs/LAUNCH.md** for payment setup options (Gumroad, Lemon Squeezy, or self-issued codes).

---

**Status:** ✅ Code ready | ❌ GitHub account needed | ❌ Vercel account needed

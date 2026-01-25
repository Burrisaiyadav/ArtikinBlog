# Artikin Blog - Deployment Guide

This guide explains how to deploy your frontend to **Netlify** and your backend to **Render.com**, using **Supabase** for persistent storage.

## Part 1: Supabase Setup (Persistent Database)

1.  Create a free account at [Supabase.com](https://supabase.com).
2.  Create a new project named `ArtikinBlog`.
3.  **Database Table**:
    - Go to **SQL Editor** in the left sidebar.
    - Click **New Query**.
    - Copy and paste the content of `supabase_setup.sql` (found in your project root) and click **Run**.
4.  **Image Storage**:
    - Go to **Storage** in the left sidebar.
    - Click **New Bucket**.
    - Name it `blog-images`.
    - **IMPORTANT**: Make sure to toggle on **Public** bucket.
5.  **API Keys**:
    - Go to **Project Settings > API**.
    - Copy the **Project URL** and the **anon (public) key**.

## Part 2: Backend Deployment (Render.com)

1.  Log in to [Render.com](https://render.com).
2.  Click **New +** and select **Blueprint**.
3.  Connect your GitHub repository: `Burrisaiyadav/ArtikinBlog`.
4.  Render will automatically see the `render.yaml` file. Click **Apply**.
5.  **Add Environment Variables**:
    - Go to your service settings on Render.
    - Go to **Environment**.
    - Add the following:
      - `SUPABASE_URL`: (The Project URL from Supabase)
      - `SUPABASE_KEY`: (The anon public key from Supabase)
6.  Wait for the deployment to finish. Copy your service URL.

---

## Part 3: Frontend Deployment (Netlify)

1.  Connect your repo to Netlify.
2.  Go to **Site Settings > Build & Deploy > Environment Variables**.
3.  Add the following variable:
    - **Key**: `VITE_API_BASE_URL`
    - **Value**: `https://your-artikin-api-url.onrender.com/api` (Use the URL from Part 2).
4.  Go to **Deploys** and click **Trigger deploy > Clear cache and deploy site**.

---

## How it works
- **Frontend** (Netlify) calls the **Backend** (Render).
- **Backend** (Render) stores all data in **Supabase** (PostgreSQL + Cloud Storage).
- Even when Render's free tier sleeps, your data remains safe and persistent in Supabase.

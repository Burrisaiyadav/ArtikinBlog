# Artikin Blog - Deployment Guide

This guide explains how to deploy your frontend to **Netlify** and your backend to **Render.com**.

## Part 1: Backend Deployment (Render.com) - The Quick Way

1. Log in to [Render.com](https://render.com).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository: `Burrisaiyadav/ArtikinBlog`.
4. Render will automatically see the `render.yaml` file. Click **Apply**.
5. **Wait** for the deployment to finish.
6. Once done, copy your service URL (e.g., `https://artikin-api.onrender.com`).

---

## Part 2: Frontend Deployment (Netlify)

1.  Connect your repo to Netlify as you have already started doing.
2.  Go to **Site Settings > Build & Deploy > Environment Variables**.
3.  Add the following variable:
    *   **Key**: `VITE_API_BASE_URL`
    *   **Value**: `https://your-artikin-api-url.onrender.com/api` (Use the URL from Part 1).
4.  Go to **Deploys** and click **Trigger deploy > Clear cache and deploy site**.

---

## How it works
- The **Frontend** (Netlify) uses the environment variable to know where to find the **Backend**.
- The **Backend** (Render) runs the Node.js server and manages the SQLite database.
- The `netlify.toml` and `_redirects` files ensure your website doesn't show a 404 when you refresh the page.

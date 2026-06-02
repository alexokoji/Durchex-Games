# App downloads

Drop the built Android APK here so the website's **"Download Now"** button works.

## Required file

| File | Served at |
|---|---|
| `durchexigames.apk` | `https://durchexigames.xyz/downloads/durchexigames.apk` |

The homepage **Download the App for Android** button links to `/downloads/durchexigames.apk`
(see `ANDROID_APK_URL` in `src/pages/HomePage.tsx`).

## How to update the APK

1. Build it: in the `mobile/` project run `npm run build:android-apk`.
2. When EAS finishes, open the build page and **download the `.apk`**.
3. Rename it to exactly `durchexigames.apk`.
4. Place it in this folder (`project/public/downloads/durchexigames.apk`).
5. Redeploy the website. The download button is now live.

> Anything in `public/` is copied as-is into the deployed site, so the APK is
> served directly with no extra config. To publish a new version, just replace
> this file and redeploy.

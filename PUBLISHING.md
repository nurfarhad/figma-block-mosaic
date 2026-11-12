# Publishing guide

## 1. Test the plugin

1. In the Figma desktop app, open a Figma Design file.
2. Choose **Plugins → Development → Import plugin from manifest…** and select `manifest.json`.
3. Run Block Mosaic with nothing selected. Confirm the status says **Ready** and no canvas content changes automatically.
4. Click **Generate** and confirm a new 600 × 600 mosaic appears.
5. Change each slider, numeric value, color, and opacity. Confirm the selected mosaic updates live on the canvas.
6. Click the wand randomizer and confirm the seed and canvas pattern both change.
7. Resize the generated mosaic and change a setting. Confirm its dimensions stay unchanged.
8. Select an ordinary frame containing content and click **Generate**. Confirm the ordinary frame is untouched and a separate mosaic is created.
9. Close and reopen the plugin from the **Edit mosaic** relaunch button on a generated frame.

## 2. Register the permanent plugin ID

The `id` in this repository is a local placeholder. Figma assigns the permanent numeric ID to your account.

- If Figma assigns an ID when you first publish, replace `block-mosaic` in `manifest.json` with that ID and keep it for all updates.
- If local import rejects the placeholder, choose **Plugins → Development → New plugin**, create a Figma Design plugin with **Custom UI**, and copy the generated numeric `id` into this project's `manifest.json`. Re-import this manifest afterward.

Do not publish using someone else's plugin ID.

## 3. Complete your details

Open `community/LISTING.md` and replace every `TODO` value, especially:

- Support email or support URL
- GitHub repository URL
- Publisher name, team, or organization

The plugin does not process data outside the current Figma document, so `PRIVACY.md` accurately describes the code as supplied. Revisit it if you later add analytics, accounts, APIs, fonts, or other network features.

## 4. Publish to Figma Community

1. Enable two-factor authentication on the Figma account that will publish the plugin.
2. In Figma desktop, go to **Plugins → Manage plugins**.
3. Open the actions menu beside Block Mosaic and choose **Publish**.
4. Paste the name, tagline, description, and tags from `community/LISTING.md`.
5. Upload:
   - `assets/plugin-icon-128.png` as the icon.
   - `assets/community-cover-1920x1080.png` as the thumbnail.
   - `assets/gallery-02` to `gallery-05` as carousel images, after the cover.
6. Choose **Design tools** (or the closest available pattern/generative-art category).
7. Add your support contact and complete the security disclosure accurately.
8. Confirm network access is shown as **No access to network**.
9. Submit for review.

Figma's current review guidelines require a complete, tested plugin, accurate listing material, and a support contact. Your publisher account and submission form—not files in this repository—supply those identity-specific details.

## 5. Publish to GitHub

Create an empty repository on GitHub without adding a README or license, then run:

```sh
git add .
git commit -m "Initial release of Block Mosaic"
git remote add origin https://github.com/nurfarhad/figma-block-mosaic.git
git push -u origin main
```

Then, on GitHub:

1. Add the repository description: `Generate deterministic geometric mosaics in Figma.`
2. Add topics such as `figma-plugin`, `figma`, `generative-art`, `mosaic`, and `design-tools`.
3. Upload `assets/github-social-preview-1280x640.png` under **Settings → General → Social preview**.
4. Replace the TODO URLs in the docs and push that update.
5. Create a `v1.0.0` release after the Community submission is ready.

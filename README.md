# A Little Sky for You

GitHub Pages publishes `dist/` automatically on pushes to `main`. In repository Settings → Pages, the publishing source is GitHub Actions. The site is at https://nickx404.github.io/for-you/ once deployment completes.

Run `npm start` and open http://127.0.0.1:4173. Compare the three themes at `/preview.html`. Run `npm test` for the progression and destination checks.

Edit `dist/content.js` before sharing: name, international WhatsApp number (digits only), message, personal memories and video path. Copy your video into `dist/assets/` and set `video: 'assets/your-video.mp4'`. Optional photos use `photo` and `photoAlt` fields. The initial writing is sample copy, not factual memories.

Add or remove objects in the `stars` array. All stars remain freely discoverable; the heart layout, check marks and counter adjust automatically. The final question unlocks only when every star has been opened. Reopening a star does not increase the count. Reloading resets progress. An empty list cannot unlock the question.

The complete dotted heart outline stays visible regardless of count; content stars sit on that outline. With large counts, verify spacing visually before sharing. Video playback is optional and failed media does not stop the journey. The WhatsApp button reports a missing number rather than opening an incorrect chat.

This is a static website: upload the contents of `dist/` to static hosting. There is no response collection, backend, music or tracking. The included GIFs and PNG fallbacks are original tiny pixel stickers. The pixel font is licensed under the included OFL.

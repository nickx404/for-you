# For You

This folder is the working copy of the complete website, published from `main` to https://nickx404.github.io/for-you/ by GitHub Actions.

- Edit `index.html`, `css/`, `js/`, and `assets/` for the opening journey.
- Edit `sky/` for the attached sky ending. Its messages, photos, video path, and WhatsApp settings are in `sky/content.js`; layout and behavior are in `sky/index.html`, `sky/style.css`, `sky/daylight.css`, and `sky/app.js`.
- The original `Desktop/SIte` folder is an independent older working copy. Changes there do not sync here. Make future changes in this folder to keep the complete website together.

Run `npm start` and open http://127.0.0.1:4173, or set `PORT` to use another port. Run `npm test` for the sky progression and destination checks. Browser checks in `test/*.cjs` use the local Codex Playwright runtime.

Publishing uploads only `index.html`, `assets/`, `css/`, `js/`, and `sky/`. Local drafts, tests, and server code are not part of the deployed website.

The sky ending includes a video and personal photos. Update its content and WhatsApp destination in `sky/content.js` as needed. The pixel font license is in `sky/assets/OFL.txt`.

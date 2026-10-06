// Long-running server (local dev, Docker, any VPS). On Vercel, api/index.js
// exports the same app as a serverless function instead.
const app = require('./app');

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => console.log(`cocolove api listening on :${port}`));

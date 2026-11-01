// Optional runtime override keeps checks usable without bundling Playwright with the site.
process.env.PLAYWRIGHT_MODULE ||= 'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
process.env.QA_ORIGIN ||= 'http://127.0.0.1:4320';
const check=process.argv[2];
if(!/^check-[a-z-]+\.cjs$/.test(check||''))throw new Error('Pass a verification check filename.');
require('./'+check);

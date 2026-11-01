// Regenerate after adding/removing the teacher's original recordings.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ids=fs.readdirSync(path.join(root,'audio_cache')).filter(name=>name.endsWith('.mp3')&&fs.statSync(path.join(root,'audio_cache',name)).size>100).map(name=>name.slice(0,-4)).sort();
fs.writeFileSync(path.join(root,'js/audio-catalog.js'),'// Generated from audio_cache by verification/build-audio-catalog.cjs.\nwindow.MENA_AUDIO_IDS = new Set('+JSON.stringify(ids,null,2)+');\n');
console.log('Catalogued '+ids.length+' original recordings.');

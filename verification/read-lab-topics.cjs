const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/curriculum_data.js'),'utf8'),sandbox);
console.log(JSON.stringify(sandbox.window.CURRICULUM_GRADE_1.units.flatMap(u=>u.lessons).filter(l=>['u2_l1_electric','u2_l3_gravity','u3_l3_microbes'].includes(l.lessonId)).map(l=>({id:l.lessonId,sessions:l.sessions.map(s=>({num:s.sessionNum,title:s.title,summary:s.summary,rules:s.rules}))})),null,2));

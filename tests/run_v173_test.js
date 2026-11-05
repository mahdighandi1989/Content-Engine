/* ══ آزمونِ ۱۷.۳ — runOneِ پل هیچ پارامترِ خودش را نمی‌پوشاند (۵ نوامبر: `mp` ⇒ TypeError پس از ۳۵ دقیقه تبدیل) ══ */
require('./lib/root.js');
const { execFileSync } = require('child_process');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS | ' + n); } else { fail++; console.log('  FAIL | ' + n + (d ? ' — ' + d : '')); } };
const py = [
  'import ast,sys',
  't=ast.parse(open("tools/voicebridge.py").read())',
  'bad=[]',
  'for f in ast.walk(t):',
  '  if isinstance(f,(ast.FunctionDef,)):',
  '    ps={a.arg for a in f.args.args}',
  '    for n in ast.walk(f):',
  '      if isinstance(n,ast.Assign):',
  '        for tg in n.targets:',
  '          if isinstance(tg,ast.Name) and tg.id in ps and f.name=="runOne": bad.append(tg.id+"@"+str(n.lineno))',
  'print(",".join(bad))'].join('\n');
const out = execFileSync('python3', ['-c', py]).toString().trim();
ok('۱.۱ در runOne هیچ پارامتری دوباره مقدار نمی‌گیرد', out === '', out);
const src = require('fs').readFileSync('tools/voicebridge.py', 'utf8');
ok('۱.۲ MP3 با نامِ جدا ساخته و در نقشه نوشته می‌شود', /tgMp3 = os\.path\.join/.test(src) && /rec\["mp3"\] = mp3/.test(src) && /mp\["items"\]\[key\] = rec/.test(src));
console.log('\n=== ۱۷.۳ : ' + pass + ' pass / ' + fail + ' fail ===');
if (fail) { console.log('FAILED:'); process.exit(1); }

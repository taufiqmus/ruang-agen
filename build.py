# Membangun index.html (satu berkas, siap di GitHub Pages) dan prompt.ts untuk proxy.
import os
def baca(f): return open(f,encoding='utf-8').read()
src=baca('index.src.html')
for tag,f in [('/*MANUAL*/','manual.js'),('/*BRAIN*/','brain.js'),('/*PROMPT*/','prompt.js'),('/*LLM*/','brain-llm.js'),('/*GAME*/','game.js')]:
    src=src.replace(tag,baca(f))
open('index.html','w',encoding='utf-8').write(src)
ts='// @ts-nocheck\n// DIHASILKAN OTOMATIS dari prompt.js oleh build.py. Jangan diedit langsung.\n'+baca('prompt.js')+'\nexport { bangunPrompt };\n'
open('supabase/functions/agent-brain/prompt.ts','w',encoding='utf-8').write(ts)
for f in ['index.html','supabase/functions/agent-brain/prompt.ts','supabase/functions/agent-brain/index.ts','manual.js','brain.js','brain-llm.js','prompt.js','game.js']:
    assert '\u2014' not in baca(f), 'em dash ditemukan di '+f
print('build ok:', os.path.getsize('index.html'), 'bytes')

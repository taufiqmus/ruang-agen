# Membangun index.html (satu berkas, siap di GitHub Pages).
import os
def baca(f): return open(f,encoding='utf-8').read()
src=baca('index.src.html')
for tag,f in [('/*MANUAL*/','manual.js'),('/*BRAIN*/','brain.js'),('/*PROMPT*/','prompt.js'),('/*LLM*/','brain-llm.js'),('/*KELAS*/','kelas.js'),('/*GAME*/','game.js')]:
    src=src.replace(tag,baca(f))
open('index.html','w',encoding='utf-8').write(src)
for f in ['index.html','manual.js','kelas.js','brain.js','brain-llm.js','prompt.js','game.js']:
    assert '\u2014' not in baca(f), 'em dash ditemukan di '+f
print('build ok:', os.path.getsize('index.html'), 'bytes')

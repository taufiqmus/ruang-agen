# Membangun index.html (satu berkas, siap di GitHub Pages).
import os
def baca(f): return open(f,encoding='utf-8').read()
src=baca('src/index.src.html')
for tag,f in [('/*MANUAL*/','src/manual.js'),('/*DUNIA*/','src/dunia.js'),('/*SEMESTA*/','src/semesta.js'),('/*BRAIN*/','src/brain.js'),('/*PROMPT*/','src/prompt.js'),('/*LLM*/','src/brain-llm.js'),('/*ADEGAN*/','src/adegan.js'),('/*GAME*/','src/game.js')]:
    src=src.replace(tag,baca(f))
open('index.html','w',encoding='utf-8').write(src)
for f in ['index.html']+['src/'+n for n in os.listdir('src')]+['server/'+n for n in os.listdir('server') if n.endswith('.py')]:
    assert '\u2014' not in baca(f), 'em dash ditemukan di '+f
print('build ok:', os.path.getsize('index.html'), 'bytes')

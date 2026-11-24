# Membangun index.html (satu berkas, siap di GitHub Pages).
import os
def baca(f): return open(f,encoding='utf-8').read()
src=baca('src/index.src.html')
for tag,f in [('/*MANUAL*/','src/manual.js'),('/*DUNIA*/','src/dunia.js'),('/*SEMESTA*/','src/semesta.js'),('/*BRAIN*/','src/brain.js'),('/*PROMPT*/','src/prompt.js'),('/*ROUTER*/','src/router.js'),('/*LLM*/','src/brain-llm.js'),('/*OLLAMAKELOLA*/','src/ollama-kelola.js'),('/*ADEGAN*/','src/adegan.js'),('/*GAME*/','src/game.js')]:
    src=src.replace(tag,baca(f))
kur='window.KURIKULUM = '+baca('materi/kurikulum.json').strip()+';'
src=src.replace('/*KURIKULUM*/',kur).replace('/*TUTORIAL*/',baca('src/tutorial.js'))
open('index.html','w',encoding='utf-8').write(src)
# Easy Agent Visualizer (v2): entri terpisah, memakai ulang modul v1
st=baca('src/studio/studio.src.html')
for tag,f in [('/*MANUAL*/','src/manual.js'),('/*DUNIA*/','src/dunia.js'),('/*SEMESTA*/','src/semesta.js'),('/*BRAIN*/','src/brain.js'),('/*ROUTER*/','src/router.js'),('/*LLM*/','src/brain-llm.js'),('/*OLLAMAKELOLA*/','src/ollama-kelola.js'),
              ('/*IOT*/','src/studio/iot.js'),('/*ALAT*/','src/studio/alat.js'),('/*GRAF*/','src/studio/graf.js'),('/*TELEGRAM*/','src/studio/telegram.js'),('/*EKSPOR*/','src/studio/ekspor.js'),('/*MISI*/','src/studio/misi.js'),('/*DUNIA3D*/','src/studio/dunia3d.js'),('/*KANVAS*/','src/studio/kanvas.js'),('/*TUTORIAL*/','src/tutorial.js'),('/*TUTORIALSTUDIO*/','src/studio/tutorial-studio.js'),('/*STUDIO*/','src/studio/studio.js')]:
    st=st.replace(tag,baca(f))
st=st.replace('/*KURIKULUM*/',kur)
open('studio.html','w',encoding='utf-8').write(st)
for f in ['index.html','studio.html','materi/kurikulum.json']+['src/'+n for n in os.listdir('src') if n.endswith(('.js','.html'))]+['src/studio/'+n for n in os.listdir('src/studio')]+['server/'+n for n in os.listdir('server') if n.endswith('.py')]:
    assert '\u2014' not in baca(f), 'em dash ditemukan di '+f
print('build ok:', os.path.getsize('index.html'), 'bytes; studio:', os.path.getsize('studio.html'), 'bytes')

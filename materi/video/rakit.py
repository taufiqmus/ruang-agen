"""Menggabungkan rekaman layar dan narasi menjadi MP4. Pemakaian: python rakit.py p1 Pertemuan-1-Apa-itu-agen-AI.mp4"""
import json, subprocess, sys, os
d = sys.argv[1]; out = sys.argv[2]
A = json.load(open(os.path.join(d, 'adegan.json'), encoding='utf-8'))
t0 = A['adegan'][0]['mulai']; durasi = A['akhir'] - t0
cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', f'{t0:.3f}', '-t', f'{durasi:.3f}', '-i', A['video']]
for s in A['adegan']: cmd += ['-i', s['wav']]
f = []
for i, s in enumerate(A['adegan'], 1):
    ms = int((s['mulai'] - t0 + A['mulaiSuara']) * 1000)
    f.append(f'[{i}:a]aresample=48000,adelay={ms}|{ms}[a{i}]')
n = len(A['adegan'])
f.append(''.join(f'[a{i}]' for i in range(1, n + 1)) + f'amix=inputs={n}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]')
f.append(f'[0:v]fps=30,fade=t=in:st=0:d=0.5,fade=t=out:st={durasi - 0.8:.2f}:d=0.8,format=yuv420p[v]')
cmd += ['-filter_complex', ';'.join(f), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', f'{durasi:.3f}', out]
subprocess.run(cmd, check=True)
print('tulis', out, f'{durasi:.1f} detik')

/* Studio Rumah Agen: kerangka Python untuk agen (tool, guard, loop tool calling ke Ollama) yang setara dengan
   papan otak. Rumah dan ESP di studio murni simulasi; alat di kerangka ini adalah tempat mahasiswa menyambungkan
   sumber datanya sendiri. Titik awal belajar, belum diuji otomatis. */
(function (root) {
  'use strict';
  const pyIdent = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '_');

  function python(H, W) {
    const J = root.Graf.JENIS;
    const agen = H.blok.filter(b => b.jenis === 'agen');
    const L = [];
    L.push('"""Kerangka agen dari Studio Rumah Agen (papan otak: ' + H.nama.replace(/"/g, '') + ').', 'Titik awal belajar: pola yang sama dengan papan blok, ditulis dalam Python.', 'Butuh: pip install requests. Model lewat Ollama (http://localhost:11434). Belum diuji otomatis."""');
    L.push('import json, re, requests', '', 'OLLAMA = "http://localhost:11434/api/chat"', 'MODEL = "qwen2.5:7b"', '');
    L.push('# ---------- guard masukan (sama seperti blok Guard Masukan) ----------', 'POLA_INJEKSI = re.compile(r"(abaikan|lupakan|ignore|jailbreak|mode (admin|developer)|tanpa (batas|aturan))", re.I)', 'def guard_masukan(teks):', '    return not POLA_INJEKSI.search(teks)', '');
    const area = W.area.map(x => x.id);
    L.push('# ---------- tool (sama seperti blok Alat) ----------', '# Di studio, sensor dan perangkat disimulasikan. Di sini sambungkan ke sumber datamu sendiri.', 'AREA = ' + JSON.stringify(area), 'def baca_sensor(area=None):', '    # TODO: kembalikan bacaan sensor, misalnya {"kandang": {"suhu": 29.5}}', '    return {a: {} for a in AREA if area in (None, "semua", a)}', '');
    L.push('BATAS = {"pemanas_suhu_maks": 33}   # guard aksi selalu di kode, bukan di prompt', 'def atur_perangkat(perangkat, aksi, level=None):', '    # TODO: petakan perangkat ke ESP dan relay yang mengendalikannya', '    return {"ok": True, "perangkat": perangkat, "aksi": aksi}', '');
    L.push('TOOLS = [', '  {"type": "function", "function": {"name": "baca_sensor", "description": "Membaca sensor", "parameters": {"type": "object", "properties": {"area": {"type": "string"}}}}},', '  {"type": "function", "function": {"name": "atur_perangkat", "description": "Menyalakan atau mematikan perangkat", "parameters": {"type": "object", "properties": {"perangkat": {"type": "string"}, "aksi": {"type": "string", "enum": ["nyala", "mati"]}}, "required": ["perangkat", "aksi"]}}},', ']', 'PELAKSANA = {"baca_sensor": baca_sensor, "atur_perangkat": atur_perangkat}', '');
    for (const a of agen.length ? agen : [{ cfg: { nama: 'Agen Rumah', persona: '' } }]) {
      const f = pyIdent(a.cfg.nama || 'agen');
      L.push(`def ${f}(pesan):`, `    """${(a.cfg.nama || 'Agen').replace(/"/g, '')}: ${(a.cfg.persona || '').replace(/"/g, '')}"""`, `    msgs = [{"role": "system", "content": "Kamu ${(a.cfg.nama || 'agen').replace(/"/g, '')}. Panggil tool, jangan mengarang angka."}, {"role": "user", "content": pesan}]`,
        `    for _ in range(${a.cfg.maksLangkah || 4}):   # loop agen dengan batas langkah`, '        r = requests.post(OLLAMA, json={"model": MODEL, "messages": msgs, "tools": TOOLS, "stream": False}, timeout=120).json()["message"]', '        if not r.get("tool_calls"): return r["content"]', '        msgs.append(r)', '        for tc in r["tool_calls"]:', '            hasil = PELAKSANA[tc["function"]["name"]](**tc["function"]["arguments"])', '            msgs.append({"role": "tool", "content": json.dumps(hasil)})', '    return "Batas langkah tercapai."', '');
    }
    const pertama = pyIdent((agen[0] && agen[0].cfg.nama) || 'agen rumah');
    L.push('if __name__ == "__main__":', '    while True:', '        teks = input("Kamu: ")', '        if not guard_masukan(teks): print("Agen: Maaf, pesan itu tidak bisa kuproses."); continue', `        print("Agen:", ${pertama}(teks))`);
    L.push('', '# Blok di papan: ' + H.blok.map(b => J[b.jenis].judul).join(', '));
    return L.join('\n');
  }

  const api = { python };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.EksporStudio = api;
})(typeof window !== 'undefined' ? window : globalThis);

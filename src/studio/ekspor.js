/* Studio Rumah Agen: dari simulasi ke dunia nyata.
   - Sketsa Arduino per ESP (Wi-Fi, sensor, relay, server HTTP kecil untuk perintah).
   - Kerangka Python untuk agen (tool, guard, loop tool calling ke Ollama) yang setara dengan papan otak.
   - Daftar belanja komponen dengan perkiraan harga.
   Kode hasil ekspor adalah TITIK AWAL belajar. Belum tentu terkompilasi tanpa penyesuaian pustaka dan pin. */
(function (root) {
  'use strict';
  const I = () => root.IoT;
  const cIdent = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const pyIdent = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const angkaPin = (papan, pin) => (papan === 'esp8266' ? pin : String(pin).replace('GPIO', ''));

  function arduino(W, espId) {
    const e = W.perangkat.find(p => p.id === espId); if (!e) return '';
    const rk = I().periksaRangkaian(W), K = I().KATALOG;
    const anak = W.perangkat.filter(p => rk[p.id].esp === espId && p.id !== espId);
    const langsung = anak.filter(p => p.sambung && p.sambung.esp === espId);
    const lewatRelay = anak.filter(p => p.sambung && p.sambung.relay);
    const is8266 = e.jenis === 'esp8266';
    const L = [];
    L.push(`// Sketsa untuk ${e.nama} (${K[e.jenis].nama}), dibuat oleh Studio Rumah Agen.`);
    L.push('// Titik awal belajar: periksa pin dan pustaka sebelum diunggah. Belum dikompilasi otomatis.');
    L.push(is8266 ? '#include <ESP8266WiFi.h>\n#include <ESP8266WebServer.h>' : '#include <WiFi.h>\n#include <WebServer.h>');
    if (langsung.some(p => p.jenis === 'dht22')) L.push('#include <DHT.h>          // pustaka "DHT sensor library" (Adafruit)');
    if (langsung.some(p => p.jenis === 'loadcell')) L.push('#include <HX711.h>        // pustaka "HX711" (bogde)');
    if (langsung.some(p => p.jenis === 'servo_pakan')) L.push(is8266 ? '#include <Servo.h>' : '#include <ESP32Servo.h>   // pustaka "ESP32Servo"');
    L.push('', 'const char* WIFI_SSID = "NAMA_WIFI";      // ganti, jangan diunggah ke repositori publik', 'const char* WIFI_PASS = "SANDI_WIFI";', '');
    for (const p of langsung) L.push(`#define PIN_${cIdent(p.id)} ${angkaPin(e.jenis, p.sambung.pin)}   // ${p.nama} (${K[p.jenis].nama})`);
    for (const p of lewatRelay) { const r = W.perangkat.find(q => q.id === p.sambung.relay); L.push(`// ${p.nama} lewat ${r.nama} kanal ${p.sambung.kanal}`); }
    L.push('');
    for (const p of langsung.filter(p => p.jenis === 'dht22')) L.push(`DHT dht_${pyIdent(p.id)}(PIN_${cIdent(p.id)}, DHT22);`);
    for (const p of langsung.filter(p => p.jenis === 'loadcell')) L.push(`HX711 skala_${pyIdent(p.id)};`);
    for (const p of langsung.filter(p => p.jenis === 'servo_pakan')) L.push(`Servo servo_${pyIdent(p.id)};`);
    L.push(is8266 ? 'ESP8266WebServer server(80);' : 'WebServer server(80);', '');
    L.push('String bacaSemua() {', '  String j = "{";');
    for (const p of langsung.filter(p => K[p.jenis].kategori === 'sensor')) {
      const id = pyIdent(p.id), pin = `PIN_${cIdent(p.id)}`;
      if (p.jenis === 'dht22') L.push(`  j += "\\"${id}_suhu\\":" + String(dht_${id}.readTemperature()) + ",";`, `  j += "\\"${id}_lembap\\":" + String(dht_${id}.readHumidity()) + ",";`);
      else if (K[p.jenis].sinyal === 'analog') L.push(`  j += "\\"${id}\\":" + String(analogRead(${pin})) + ",";   // nilai mentah ADC, kalibrasi dulu`);
      else if (p.jenis === 'loadcell') L.push(`  j += "\\"${id}\\":" + String(skala_${id}.get_units(5)) + ",";`);
      else if (p.jenis === 'ultrasonik') L.push(`  // ${p.nama}: kirim pulsa TRIG lalu ukur ECHO dengan pulseIn() untuk mendapat jarak air`);
      else L.push(`  j += "\\"${id}\\":" + String(digitalRead(${pin})) + ",";`);
    }
    L.push('  if (j.endsWith(",")) j.remove(j.length() - 1);', '  return j + "}";', '}', '');
    L.push('void aksi() {   // contoh: /aksi?perangkat=relay_rumah&nyala=1', '  String id = server.arg("perangkat"); int nyala = server.arg("nyala").toInt();');
    for (const p of langsung.filter(p => K[p.jenis].kanal || K[p.jenis].kategori === 'aktuator')) {
      if (p.jenis === 'servo_pakan') L.push(`  if (id == "${p.id}" && nyala) { servo_${pyIdent(p.id)}.write(90); delay(800); servo_${pyIdent(p.id)}.write(0); }`);
      else L.push(`  if (id == "${p.id}") digitalWrite(PIN_${cIdent(p.id)}, nyala ? HIGH : LOW);${K[p.jenis].kanal ? '   // banyak modul relay aktif LOW: tukar HIGH dan LOW bila terbalik' : ''}`);
    }
    L.push('  server.send(200, "application/json", "{\\"ok\\":true}");', '}', '');
    L.push('void setup() {', '  Serial.begin(115200);');
    for (const p of langsung) {
      const K2 = K[p.jenis], pin = `PIN_${cIdent(p.id)}`;
      if (p.jenis === 'dht22') L.push(`  dht_${pyIdent(p.id)}.begin();`);
      else if (p.jenis === 'loadcell') L.push(`  skala_${pyIdent(p.id)}.begin(${pin}, ${pin} + 1);   // DOUT dan SCK: sesuaikan pin SCK`);
      else if (p.jenis === 'servo_pakan') L.push(`  servo_${pyIdent(p.id)}.attach(${pin});`);
      else if (K2.kanal || K2.kategori === 'aktuator') L.push(`  pinMode(${pin}, OUTPUT); digitalWrite(${pin}, LOW);`);
      else L.push(`  pinMode(${pin}, INPUT);`);
    }
    L.push('  WiFi.begin(WIFI_SSID, WIFI_PASS);', '  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }', '  Serial.println(WiFi.localIP());');
    L.push('  server.on("/baca", []() { server.send(200, "application/json", bacaSemua()); });', '  server.on("/aksi", aksi);', '  server.begin();', '}', '');
    L.push('void loop() {', '  server.handleClient();', '}');
    return L.join('\n');
  }

  function python(H, W) {
    const J = root.Graf.JENIS;
    const agen = H.blok.filter(b => b.jenis === 'agen');
    const L = [];
    L.push('"""Kerangka agen dari Studio Rumah Agen (papan otak: ' + H.nama.replace(/"/g, '') + ').', 'Titik awal belajar: pola yang sama dengan papan blok, ditulis dalam Python.', 'Butuh: pip install requests. Model lewat Ollama (http://localhost:11434). Belum diuji otomatis."""');
    L.push('import json, re, requests', '', 'OLLAMA = "http://localhost:11434/api/chat"', 'MODEL = "qwen2.5:7b"', '');
    L.push('# ---------- guard masukan (sama seperti blok Guard Masukan) ----------', 'POLA_INJEKSI = re.compile(r"(abaikan|lupakan|ignore|jailbreak|mode (admin|developer)|tanpa (batas|aturan))", re.I)', 'def guard_masukan(teks):', '    return not POLA_INJEKSI.search(teks)', '');
    L.push('# ---------- tool (sama seperti blok Alat) ----------', 'ESP = {   # alamat IP tiap ESP setelah tersambung Wi-Fi');
    for (const e of W.perangkat.filter(p => I().KATALOG[p.jenis].kategori === 'papan')) L.push(`    "${e.id}": "http://192.168.1.${10 + W.perangkat.indexOf(e)}",   # ${e.nama}`);
    L.push('}', 'def baca_sensor(area=None):', '    hasil = {}', '    for nama, url in ESP.items():', '        try: hasil[nama] = requests.get(url + "/baca", timeout=3).json()', '        except Exception as e: hasil[nama] = {"galat": str(e)}', '    return hasil', '');
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

  function belanja(W) {
    const K = I().KATALOG, hit = {};
    for (const p of W.perangkat) hit[p.jenis] = (hit[p.jenis] || 0) + 1;
    const kabel = W.perangkat.filter(p => p.sambung).length;
    const baris = Object.keys(hit).map(j => ({ nama: K[j].nama, jumlah: hit[j], harga: K[j].harga, subtotal: K[j].harga * hit[j] }));
    if (kabel) baris.push({ nama: 'Kabel jumper (paket 40)', jumlah: Math.ceil(kabel * 3 / 40), harga: 15000, subtotal: Math.ceil(kabel * 3 / 40) * 15000 });
    return { baris, total: baris.reduce((t, b) => t + b.subtotal, 0) };
  }
  const rupiah = n => 'Rp' + Math.round(n).toLocaleString('id-ID');

  const api = { arduino, python, belanja, rupiah };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.EksporStudio = api;
})(typeof window !== 'undefined' ? window : globalThis);

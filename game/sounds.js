// game/sounds.js: oyun sesleri (efekt + müzik). CodeStudio "Oyun stüdyosu > Sesler"den yönetilir. Kullanım: g.sfx("ad"), g.music("ad", {vol: 0.4}), g.stopMusic()
CSGame.addSounds({
"muzik_arcade": {"k":"music","bpm":150,"tracks":[{"wave":"square","vol":0.3,"seq":["E5","G5","B5","G5","E5","G5","B5","G5","D5","F#5","A5","F#5","D5","F#5","A5","F#5","C5","E5","G5","E5","C5","E5","G5","E5","B4","D5","F#5","D5","B4","D5","F#5","B5"]},{"wave":"triangle","vol":0.6,"seq":["E3","-","E3","-","E3","-","E3","-","D3","-","D3","-","D3","-","D3","-","C3","-","C3","-","C3","-","C3","-","B2","-","B2","-","B2","-","B2","-"]},{"wave":"noise","vol":0.3,"seq":["x","-","x","x","x","-","x","x","x","-","x","x","x","-","x","x","x","-","x","x","x","-","x","x","x","-","x","x","x","x","x","x"]}],"cat":"Müzik","label":"Arcade"},
"patlama": {"k":"sfx","notes":[[220,0.22,"noise"],[120,0.3,"sawtooth",30]],"cat":"Efekt","label":"Patlama"}
});

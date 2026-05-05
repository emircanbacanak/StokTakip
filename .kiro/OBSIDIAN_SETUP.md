# 📖 Obsidian Kurulum ve Kullanım Rehberi

> Projenizi Obsidian ile görselleştirmek için adım adım rehber

---

## 📥 Adım 1: Obsidian'ı İndirin ve Kurun

### Windows İçin:

1. **Tarayıcınızı açın** ve şu adrese gidin:
   ```
   https://obsidian.md
   ```

2. **"Download" butonuna tıklayın**

3. **Windows için indirin**
   - "Download for Windows" butonuna tıklayın
   - `Obsidian-X.X.X.exe` dosyası indirilecek

4. **Kurulumu yapın**
   - İndirilen `.exe` dosyasına çift tıklayın
   - Kurulum sihirbazını takip edin
   - "Install" butonuna tıklayın
   - Kurulum tamamlanınca "Finish" butonuna tıklayın

5. **Obsidian'ı açın**
   - Masaüstünde veya Başlat menüsünde Obsidian ikonuna tıklayın

---

## 📂 Adım 2: Projenizi Vault Olarak Açın

### İlk Açılış:

1. **Obsidian açıldığında** şu ekranı göreceksiniz:
   ```
   "Create new vault" veya "Open folder as vault"
   ```

2. **"Open folder as vault" seçeneğine tıklayın**

3. **Proje klasörünüzü seçin**
   - Dosya gezgininde projenizin bulunduğu klasöre gidin
   - Örnek: `C:\Users\KullaniciAdi\Documents\stok-siparis-takip`
   - "Select Folder" butonuna tıklayın

4. **Vault açıldı!** 🎉
   - Sol tarafta dosya ağacını göreceksiniz
   - `.kiro/` klasörünü bulun ve açın

---

## 🎨 Adım 3: Görsel Haritaları Açın

### VISUAL_MAP.md Dosyasını Açın:

1. **Sol taraftaki dosya ağacında:**
   ```
   .kiro/ klasörünü genişletin
   └── VISUAL_MAP.md dosyasına tıklayın
   ```

2. **Mermaid diyagramları otomatik olarak görselleşecek!**
   - Eğer görünmüyorsa, "Reading view" moduna geçin
   - Sağ üstteki kitap ikonuna tıklayın

### KNOWLEDGE_MAP.md Dosyasını Açın:

1. **Sol taraftaki dosya ağacında:**
   ```
   .kiro/ klasörünü genişletin
   └── KNOWLEDGE_MAP.md dosyasına tıklayın
   ```

2. **Metin tabanlı haritayı okuyun**

---

## 🔧 Adım 4: Obsidian'ı Optimize Edin (Opsiyonel)

### Mermaid Diyagramlarını Daha İyi Görmek İçin:

1. **Settings'i açın** (Sol alttaki dişli ikonu)

2. **Appearance → Themes**
   - "Manage" butonuna tıklayın
   - Bir tema seçin (örn: "Minimal" veya "Things")
   - "Use" butonuna tıklayın

3. **Editor → Readable line length**
   - Bu seçeneği kapatın (daha geniş görünüm için)

### Graph View'i Açın:

1. **Sol taraftaki "Open graph view" ikonuna tıklayın**
   - Veya `Ctrl + G` tuşlarına basın

2. **Dosyalar arası ilişkileri görün**
   - Noktalar = Dosyalar
   - Çizgiler = Bağlantılar

---

## 🎯 Adım 5: Kullanışlı Özellikler

### Hızlı Arama:

```
Ctrl + O  →  Dosya ara
Ctrl + P  →  Komut paleti
Ctrl + F  →  Sayfa içinde ara
```

### Dosyalar Arası Gezinme:

- **Geri git:** `Ctrl + Alt + ←`
- **İleri git:** `Ctrl + Alt + →`

### Split View (Yan Yana Görünüm):

1. Bir dosyayı sağ tıklayın
2. "Open in new pane" seçin
3. İki dosyayı yan yana görün

---

## 📊 Adım 6: Proje Dosyalarını Keşfedin

### Önerilen Okuma Sırası:

```
1. .kiro/README.md
   └─ Sistem açıklaması

2. .kiro/QUICK_REFERENCE.md
   └─ Hızlı başlangıç

3. .kiro/PROJECT_CONTEXT.md
   └─ Proje detayları

4. .kiro/VISUAL_MAP.md
   └─ Görsel diyagramlar

5. .kiro/KNOWLEDGE_MAP.md
   └─ Detaylı haritalar
```

---

## 🎨 Bonus: 3D Graph Görünümü (İleri Seviye)

### 3D Graph Plugin Kurulumu:

1. **Settings → Community plugins**

2. **"Turn on community plugins" butonuna tıklayın**

3. **"Browse" butonuna tıklayın**

4. **"3D Graph" araması yapın**
   - "3D Graph" plugin'ini bulun
   - "Install" butonuna tıklayın
   - "Enable" butonuna tıklayın

5. **3D Graph'ı açın**
   - Command palette açın (`Ctrl + P`)
   - "3D Graph" yazın
   - "Open 3D Graph View" seçin

6. **3D görünümde projenizi keşfedin!** 🚀

---

## 🔍 Sorun Giderme

### Problem: Mermaid diyagramları görünmüyor

**Çözüm:**
1. "Reading view" moduna geçin (sağ üstteki kitap ikonu)
2. Veya Settings → Editor → "Strict line breaks" kapatın

### Problem: Dosyalar görünmüyor

**Çözüm:**
1. Sol taraftaki "Files" ikonuna tıklayın
2. Veya `Ctrl + E` tuşlarına basın

### Problem: Graph view boş

**Çözüm:**
1. Dosyalar arasında bağlantı oluşturun
2. Örnek: `[[VISUAL_MAP]]` şeklinde link ekleyin

---

## 💡 Kullanım İpuçları

### 1. Hızlı Notlar
- `Ctrl + N` ile yeni not oluşturun
- Proje hakkında notlar alın

### 2. Etiketler
- `#önemli` gibi etiketler ekleyin
- Etiketlere tıklayarak ilgili notları bulun

### 3. Backlinks
- Bir dosyayı başka dosyada `[[dosya-adi]]` şeklinde referans edin
- Sağ tarafta "Backlinks" panelinde ilişkileri görün

### 4. Favoriler
- Sık kullandığınız dosyaları yıldızlayın
- Sol tarafta "Starred" bölümünde görün

---

## 📱 Mobil Kullanım (Bonus)

### Obsidian Mobile:

1. **App Store veya Google Play'den indirin**
   - "Obsidian" uygulamasını arayın
   - İndirin ve kurun

2. **Vault'u senkronize edin**
   - Obsidian Sync (ücretli) veya
   - iCloud / Google Drive ile manuel senkronizasyon

3. **Mobilde projenizi görüntüleyin**

---

## 🎓 Daha Fazla Öğrenme

### Resmi Kaynaklar:

- **Obsidian Help:** https://help.obsidian.md
- **Forum:** https://forum.obsidian.md
- **Discord:** https://discord.gg/obsidianmd

### Video Eğitimler:

- YouTube'da "Obsidian tutorial" arayın
- Türkçe içerikler de mevcut

---

## ✅ Kurulum Tamamlandı!

Artık Obsidian ile projenizi görselleştirebilirsiniz:

- ✅ Mermaid diyagramlarını görün
- ✅ Dosyalar arası ilişkileri keşfedin
- ✅ Graph view ile proje yapısını anlayın
- ✅ Notlar alın ve organize edin

---

## 🚀 Sonraki Adımlar

1. **VISUAL_MAP.md dosyasını açın**
   - Tüm diyagramları inceleyin

2. **Graph view'i açın**
   - Dosya ilişkilerini görün

3. **Kendi notlarınızı ekleyin**
   - Proje hakkında notlar alın

4. **3D Graph'ı deneyin** (opsiyonel)
   - Projeyi 3D olarak görselleştirin

---

**İyi Kullanımlar! 🎉**

**Son Güncelleme:** 5 Mayıs 2026

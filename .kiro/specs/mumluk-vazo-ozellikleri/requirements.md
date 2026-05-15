# Requirements Document

## Introduction

Bu doküman, stok takip sistemine eklenecek iki yeni özelliği tanımlar:
1. **Mumluk Özelliği**: Ürünlere mumluk etiketi ekleme ve muhasebe entegrasyonu
2. **Vazo Boyut Özelliği**: Vazo ürünleri için otomatik boyut tanımlama sistemi

Bu özellikler, ürün yönetimi, sipariş oluşturma, muhasebe ve fatura süreçlerine entegre edilecektir.

## Glossary

- **Sistem**: Stok takip ve sipariş yönetim uygulaması
- **Ürün_Kataloğu**: Ürün ekleme ve düzenleme bileşeni (product-catalog-client.tsx)
- **Sipariş_Dialogu**: Yeni sipariş oluşturma bileşeni (new-order-dialog.tsx)
- **Muhasebe_Paneli**: Maliyet hesaplama ve ayarlar bileşeni (accounting-client.tsx, cost-settings-dialog.tsx)
- **Fatura_Sistemi**: Sipariş fatura görüntüleme bileşeni (invoice-dialog.tsx)
- **Üretim_Paneli**: Üretim takip bileşeni (production-client.tsx)
- **Mumluk**: Mum kullanımı gerektiren ürün özelliği
- **Mumluk_Ücreti**: Mumluk özelliği olan ürünler için eklenen sabit maliyet
- **Vazo**: Farklı boyutlarda üretilebilen vazo ürünleri
- **Otomatik_Boyut**: Vazo ürünleri için varsayılan olarak tanımlanan 13cm, 15cm, 17cm boyutları
- **Boyut_Sistemi**: Mevcut product_sizes tablosu ve has_sizes özelliği

## Requirements

### Gereksinim 1: Mumluk Özelliği - Ürün Tanımlama

**Kullanıcı Hikayesi:** Bir ürün yöneticisi olarak, ürün eklerken veya düzenlerken mumluk özelliğini işaretleyebilmek istiyorum, böylece mum kullanan ürünleri takip edebilirim.

#### Kabul Kriterleri

1. WHEN Ürün_Kataloğu açıldığında, THE Sistem SHALL "Mum kullanılıyor mu?" checkbox'ını gösterecek
2. WHEN kullanıcı "Mum kullanılıyor mu?" checkbox'ını işaretlediğinde, THE Sistem SHALL ürünü mumluk olarak etiketleyecek
3. WHEN ürün kaydedildiğinde, THE Sistem SHALL mumluk bilgisini veritabanına kaydedecek
4. WHEN mumluk özelliği olan bir ürün görüntülendiğinde, THE Sistem SHALL ürün kartında "Mumluk" etiketi gösterecek
5. THE Sistem SHALL mumluk bilgisini products tablosunda is_candleholder boolean alanında saklayacak

### Gereksinim 2: Mumluk Özelliği - Otomatik Algılama

**Kullanıcı Hikayesi:** Bir ürün yöneticisi olarak, ürün adına "mumluk" yazdığımda otomatik olarak checkbox'ın işaretlenmesini istiyorum, böylece manuel işlem yapmama gerek kalmaz.

#### Kabul Kriterleri

1. WHEN kullanıcı ürün adı alanına "mumluk" kelimesini yazdığında, THE Sistem SHALL "Mum kullanılıyor mu?" checkbox'ını otomatik işaretleyecek
2. WHEN kullanıcı ürün adı alanına "Mumluk" kelimesini yazdığında (büyük harfle), THE Sistem SHALL "Mum kullanılıyor mu?" checkbox'ını otomatik işaretleyecek
3. WHEN kullanıcı ürün adı alanına "MUMLUK" kelimesini yazdığında (tümü büyük harfle), THE Sistem SHALL "Mum kullanılıyor mu?" checkbox'ını otomatik işaretleyecek
4. WHEN kullanıcı ürün adı alanına "candleholder" kelimesini yazdığında, THE Sistem SHALL "Mum kullanılıyor mu?" checkbox'ını otomatik işaretleyecek
5. WHEN kullanıcı ürün adı alanından "mumluk" kelimesini sildiğinde, THE Sistem SHALL checkbox'ı otomatik olarak kaldırmayacak (kullanıcı manuel kapatabilir)

### Gereksinim 3: Mumluk Ücreti - Muhasebe Ayarları

**Kullanıcı Hikayesi:** Bir muhasebe yöneticisi olarak, mumluk ücreti belirleyebilmek istiyorum, böylece mumluk özelliği olan ürünlerin maliyetini doğru hesaplayabilirim.

#### Kabul Kriterleri

1. WHEN Muhasebe_Paneli ayarlar dialogu açıldığında, THE Sistem SHALL "Mumluk Ücreti" girdi alanını gösterecek
2. THE Sistem SHALL mumluk ücreti girdi alanını TL cinsinden kabul edecek
3. WHEN kullanıcı mumluk ücreti girdiğinde, THE Sistem SHALL değeri cost_settings tablosuna kaydedecek
4. THE Sistem SHALL mumluk ücreti için aktif/pasif checkbox'ı sağlayacak
5. WHEN mumluk ücreti pasif yapıldığında, THE Sistem SHALL maliyet hesaplamalarında mumluk ücretini dahil etmeyecek
6. THE Sistem SHALL mumluk ücretini cost_settings tablosunda candleholder_cost_per_unit (NUMERIC) ve candleholder_enabled (BOOLEAN) alanlarında saklayacak

### Gereksinim 4: Mumluk Ücreti - Maliyet Hesaplama

**Kullanıcı Hikayesi:** Bir ürün yöneticisi olarak, mumluk özelliği olan ürünlerin maliyetinde mumluk ücretinin otomatik eklenmesini istiyorum, böylece doğru fiyatlandırma yapabilirim.

#### Kabul Kriterleri

1. WHEN mumluk özelliği olan bir ürün için maliyet hesaplanırken, THE Sistem SHALL mumluk ücretini toplam maliyete ekleyecek
2. WHEN Ürün_Kataloğu'nda maliyet önizlemesi gösterilirken ve ürün mumluk ise, THE Sistem SHALL mumluk ücretini ayrı bir satır olarak gösterecek
3. WHEN mumluk ücreti pasif ise, THE Sistem SHALL mumluk ücretini maliyet hesaplamasına dahil etmeyecek
4. WHEN mumluk özelliği olan boyutlu bir ürün için maliyet hesaplanırken, THE Sistem SHALL her boyut için mumluk ücretini ekleyecek
5. THE Sistem SHALL mumluk ücretini filament, elektrik ve diğer maliyetlerden sonra ekleyecek

### Gereksinim 5: Mumluk Özelliği - Sistem Entegrasyonu

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, mumluk bilgisinin tüm sistem sayfalarında görünmesini istiyorum, böylece tutarlı bilgi alabileyim.

#### Kabul Kriterleri

1. WHEN Sipariş_Dialogu'nda ürün seçildiğinde ve ürün mumluk ise, THE Sistem SHALL ürün adının yanında mumluk ikonu gösterecek
2. WHEN Üretim_Paneli'nde ürünler listelenirken, THE Sistem SHALL mumluk ürünleri için mumluk etiketi gösterecek
3. WHEN Fatura_Sistemi'nde sipariş detayları gösterilirken, THE Sistem SHALL mumluk ürünleri için mumluk bilgisini gösterecek
4. WHEN Muhasebe_Paneli'nde maliyet analizi yapılırken, THE Sistem SHALL mumluk ücretini maliyet dağılımında gösterecek
5. THE Sistem SHALL mumluk bilgisini order_items tablosuna kaydetmeyecek (products tablosundan dinamik olarak çekilecek)

### Gereksinim 6: Vazo Boyut Özelliği - Otomatik Algılama

**Kullanıcı Hikayesi:** Bir ürün yöneticisi olarak, ürün adına "vazo" yazdığımda otomatik olarak boyut özelliğinin açılmasını ve varsayılan boyutların eklenmesini istiyorum, böylece hızlı ürün girişi yapabilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı ürün adı alanına "vazo" kelimesini yazdığında, THE Sistem SHALL "Bu ürünün farklı boyutları var" checkbox'ını otomatik işaretleyecek
2. WHEN kullanıcı ürün adı alanına "Vazo" kelimesini yazdığında (büyük harfle), THE Sistem SHALL "Bu ürünün farklı boyutları var" checkbox'ını otomatik işaretleyecek
3. WHEN kullanıcı ürün adı alanına "VAZO" kelimesini yazdığında (tümü büyük harfle), THE Sistem SHALL "Bu ürünün farklı boyutları var" checkbox'ını otomatik işaretleyecek
4. WHEN kullanıcı ürün adı alanına "vase" kelimesini yazdığında, THE Sistem SHALL "Bu ürünün farklı boyutları var" checkbox'ını otomatik işaretleyecek
5. WHEN "Bu ürünün farklı boyutları var" checkbox'ı otomatik işaretlendiğinde, THE Sistem SHALL 3 adet boyut alanı oluşturacak

### Gereksinim 7: Vazo Boyut Özelliği - Varsayılan Boyutlar

**Kullanıcı Hikayesi:** Bir ürün yöneticisi olarak, vazo ürünleri için varsayılan boyutların otomatik doldurulmasını istiyorum, böylece her seferinde aynı boyutları yazmama gerek kalmaz.

#### Kabul Kriterleri

1. WHEN vazo algılandığında ve boyut alanları oluşturulduğunda, THE Sistem SHALL birinci boyut alanına "13cm" yazacak
2. WHEN vazo algılandığında ve boyut alanları oluşturulduğunda, THE Sistem SHALL ikinci boyut alanına "15cm" yazacak
3. WHEN vazo algılandığında ve boyut alanları oluşturulduğunda, THE Sistem SHALL üçüncü boyut alanına "17cm" yazacak
4. WHEN boyut alanları oluşturulduğunda, THE Sistem SHALL gramaj alanlarını boş bırakacak
5. WHEN kullanıcı varsayılan boyut isimlerini değiştirdiğinde, THE Sistem SHALL değişiklikleri kabul edecek

### Gereksinim 8: Vazo Boyut Özelliği - Manuel Boyut Ekleme

**Kullanıcı Hikayesi:** Bir ürün yöneticisi olarak, vazo olmayan ürünler için de boyut özelliğini manuel açtığımda varsayılan boyutların gelmesini istiyorum, böylece tutarlı bir deneyim yaşarım.

#### Kabul Kriterleri

1. WHEN kullanıcı "Bu ürünün farklı boyutları var" checkbox'ını manuel işaretlediğinde, THE Sistem SHALL 3 adet boyut alanı oluşturacak
2. WHEN kullanıcı "Bu ürünün farklı boyutları var" checkbox'ını manuel işaretlediğinde, THE Sistem SHALL birinci boyut alanına "13cm" yazacak
3. WHEN kullanıcı "Bu ürünün farklı boyutları var" checkbox'ını manuel işaretlediğinde, THE Sistem SHALL ikinci boyut alanına "15cm" yazacak
4. WHEN kullanıcı "Bu ürünün farklı boyutları var" checkbox'ını manuel işaretlediğinde, THE Sistem SHALL üçüncü boyut alanına "17cm" yazacak
5. WHEN kullanıcı "Boyut Ekle" butonuna tıkladığında, THE Sistem SHALL yeni boyut alanını boş olarak ekleyecek

### Gereksinim 9: Vazo Boyut Özelliği - Boyut Düzenleme

**Kullanıcı Hikayesi:** Bir ürün yöneticisi olarak, varsayılan boyutları değiştirebilmek veya yeni boyutlar ekleyebilmek istiyorum, böylece farklı ürün varyasyonlarını yönetebilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı varsayılan boyut isimlerini değiştirdiğinde, THE Sistem SHALL değişiklikleri kabul edecek
2. WHEN kullanıcı "Boyut Ekle" butonuna tıkladığında, THE Sistem SHALL yeni boş boyut alanı ekleyecek
3. WHEN kullanıcı bir boyutu sildiğinde, THE Sistem SHALL boyutu listeden kaldıracak
4. WHEN kullanıcı boyut gramajlarını girdiğinde, THE Sistem SHALL her boyut için ayrı maliyet önizlemesi gösterecek
5. THE Sistem SHALL en az 1 boyut olmasını zorunlu kılacak (tüm boyutlar silinemez)

### Gereksinim 10: Vazo Boyut Özelliği - Mevcut Sistem Uyumluluğu

**Kullanıcı Hikayesi:** Bir geliştirici olarak, yeni vazo boyut özelliğinin mevcut boyut sistemiyle uyumlu çalışmasını istiyorum, böylece kod tutarlılığı sağlanır.

#### Kabul Kriterleri

1. THE Sistem SHALL mevcut product_sizes tablosunu kullanacak
2. THE Sistem SHALL mevcut has_sizes boolean alanını kullanacak
3. WHEN vazo için boyutlar kaydedildiğinde, THE Sistem SHALL product_sizes tablosuna standart formatta kayıt yapacak
4. WHEN sipariş oluşturulurken vazo seçildiğinde, THE Sistem SHALL mevcut boyut seçim mekanizmasını kullanacak
5. THE Sistem SHALL vazo boyutları için maliyet hesaplamasını mevcut calculateProductCost fonksiyonuyla yapacak

### Gereksinim 11: Veritabanı Şeması Güncellemeleri

**Kullanıcı Hikayesi:** Bir geliştirici olarak, yeni özelliklerin veritabanı şemasının güncel ve tutarlı olmasını istiyorum, böylece veri bütünlüğü sağlanır.

#### Kabul Kriterleri

1. THE Sistem SHALL products tablosuna is_candleholder (BOOLEAN, DEFAULT false) alanı ekleyecek
2. THE Sistem SHALL cost_settings tablosuna candleholder_cost_per_unit (NUMERIC, DEFAULT 0) alanı ekleyecek
3. THE Sistem SHALL cost_settings tablosuna candleholder_enabled (BOOLEAN, DEFAULT false) alanı ekleyecek
4. WHEN migration çalıştırıldığında, THE Sistem SHALL mevcut ürünlerin is_candleholder değerini false olarak ayarlayacak
5. WHEN migration çalıştırıldığında, THE Sistem SHALL mevcut cost_settings kaydını güncelleyecek

### Gereksinim 12: Tip Tanımları Güncellemeleri

**Kullanıcı Hikayesi:** Bir geliştirici olarak, TypeScript tip tanımlarının güncel olmasını istiyorum, böylece tip güvenliği sağlanır.

#### Kabul Kriterleri

1. THE Sistem SHALL Product tipine is_candleholder (boolean) alanı ekleyecek
2. THE Sistem SHALL CostSettings tipine candleholder_cost_per_unit (number) alanı ekleyecek
3. THE Sistem SHALL CostSettings tipine candleholder_enabled (boolean) alanı ekleyecek
4. THE Sistem SHALL DEFAULT_COST_SETTINGS sabitine mumluk varsayılan değerlerini ekleyecek
5. THE Sistem SHALL calculateProductCost fonksiyonunu mumluk maliyetini destekleyecek şekilde güncelleyecek


# Requirements Document

## Introduction

Bu özellik, mevcut GİB e-Arşiv fatura kesme akışı (create-invoices) tamamlandıktan sonra, oluşturulan fatura taslakların GİB e-Arşiv portalında Playwright tabanlı tarayıcı otomasyonu ile otomatik olarak imzalanmasını sağlar. Kullanıcı, fatura kesme sürecinin ardından "Otomatik İmzala" seçeneğini tetikleyerek sistemin portal üzerinde "Belge İşlemleri → Düzenlenen Belgeler e-Arşiv Fatura (İnteraktif)" akışını izlemesini, günlük faturaları sorgulamasını, tamamını seçmesini ve GİB İmza adımını başlatmasını sağlar. İmzalama adımında SMS onayı gerektiğinden, sistem SMS gönderme adımını tamamlayıp kullanıcıdan kodu bekler, ardından imzalama sürecini sonlandırır.

## Glossary

- **AutoSigner**: GİB e-Arşiv portal üzerindeki otomatik imzalama akışını yürüten Playwright otomasyon bileşeni.
- **GibEArsivModal**: Mevcut fatura kesme UI modalı (components/invoicing/gib-earsiv-modal.tsx).
- **AutoSignModal**: Otomatik imzalama akışını yöneten yeni UI bileşeni.
- **SigningSession**: Bir imzalama oturumunu temsil eden sunucu tarafı durum nesnesi; tarayıcı referansı, oturum token'ı ve anlık adım bilgisini içerir.
- **SignStep**: İmzalama akışındaki adımları temsil eden enum (idle, navigating, querying, selecting, signing, sms_waiting, verifying, completed, failed).
- **SmsBroadcast**: Sunucudan istemciye anlık durum iletmek için kullanılan SSE (Server-Sent Events) kanalı.
- **GIB_Portal**: `https://earsivportal.efatura.gov.tr` adresindeki GİB e-Arşiv web portalı.
- **InvoiceTable**: Portal üzerindeki fatura listesi tablosu; çok sayfalı olabilir (ör. Sayfa 1/2, Toplam 20 kayıt).
- **SelectAllCheckbox**: Fatura tablosunun başlık satırındaki tümünü seçme checkbox'ı; `id` formatı dinamiktir (ör. `gen__4138-sall`).
- **SmsPopup**: "GİB İmza" butonuna tıklandıktan sonra açılan SMS onay popup'ı; "Uyarıyı Okudum" checkbox'ı ve "Şifre Gönder" butonu içerir.

---

## Requirements

### Requirement 1: Fatura Kesme Sonrası Otomatik İmzalama Tetikleyicisi

**User Story:** Bir muhasebe yöneticisi olarak, faturaları GİB e-Arşiv'e gönderdikten sonra imzalamak için ekstra manuel adımlar atmak istemiyorum; böylece zaman kaybetmeden imzalama sürecine otomatik geçiş yapabileyim.

#### Acceptance Criteria

1. WHEN fatura kesme akışı (GibEArsivModal) `success` adımına ulaşır, THE GibEArsivModal SHALL "Otomatik İmzala" ve "Sadece Tamamla" olmak üzere iki seçenek sunmalıdır.
2. WHEN kullanıcı "Otomatik İmzala" seçeneğini seçer, THE GibEArsivModal SHALL kapanmalıdır.
3. WHEN GibEArsivModal kapandıktan sonra "Otomatik İmzala" seçilmişse, THE System SHALL AutoSignModal'ı açmalıdır.
4. WHEN kullanıcı "Sadece Tamamla" seçeneğini seçer, THE GibEArsivModal SHALL kapanmalı ve listeyi güncel verilerle yenilemelidir.
5. WHEN AutoSignModal açılır, THE AutoSignModal SHALL kullanıcıya kayıtlı GİB kullanıcı kodunu maskeli biçimde (ilk 2 karakter görünür, geri kalanı `*` ile gizli) göstermeli ve kullanıcıdan onay almalıdır.
6. WHEN kullanıcı AutoSignModal'daki onay butonuna tıklar, THE System SHALL imzalama akışını başlatmalıdır.
7. IF AutoSignModal açıldığında kayıtlı GİB kimlik bilgileri bulunamazsa, THEN THE AutoSignModal SHALL "GİB kimlik bilgileri bulunamadı, lütfen ayarları kontrol edin" hata mesajını göstermeli ve onay butonunu devre dışı bırakmalıdır.

---

### Requirement 2: Tarayıcı Oturumu ve Portal Navigasyonu

**User Story:** Bir muhasebe yöneticisi olarak, sistemin GİB portalında doğru menülere otomatik gitmesini istiyorum; böylece manuel navigasyon hataları olmadan doğru fatura listesine ulaşabileyim.

#### Acceptance Criteria

1. WHEN AutoSigner başlatılır, THE AutoSigner SHALL mevcut `gib-browser-automation` altyapısını yeniden kullanarak GIB_Portal'a giriş yapmalı ve aktif, kimliği doğrulanmış bir oturum elde etmelidir.
2. IF GIB_Portal girişi başarısız olursa, THEN THE AutoSigner SHALL giriş hatasını belirten bir hata mesajı göstermeli ve sonraki navigasyon adımlarını çalıştırmadan akışı durdurmalıdır.
3. WHEN GIB_Portal girişi başarılı olur, THE AutoSigner SHALL "Belge İşlemleri" ana menüsüne tıklamalıdır.
4. WHEN "Belge İşlemleri" menüsü açılır, THE AutoSigner SHALL alt menüden "Düzenlenen Belgeler e-Arşiv Fatura (İnteraktif)" seçeneğine tıklamalıdır.
5. WHEN panel açılır, THE AutoSigner SHALL tarih alanlarını değiştirmeden "Sorgula" butonuna tıklamalı ve sorgu sonuçları yüklenene kadar en fazla 15 saniye beklemelidir.
6. IF 'Sorgula' butonuna tıklandıktan sonra fatura listesi 15 saniye içinde yüklenmezse, THEN THE AutoSigner SHALL zaman aşımına uğrayan adımı belirten bir hata mesajı göstermeli ve akışı durdurmalıdır.
7. IF herhangi bir navigasyon adımında beklenen element 10 saniye içinde bulunamazsa, THEN THE AutoSigner SHALL ilgili adım adını ve CSS selector'ünü içeren bir hata mesajı göstermeli ve akışı durdurmalıdır.

---

### Requirement 3: Çok Sayfalı Fatura Tablosu Seçimi

**User Story:** Bir muhasebe yöneticisi olarak, o günkü tüm faturaların imzalanmasını istiyorum; tablonun birden fazla sayfada olması durumunda bile tüm kayıtlar seçilmeli.

#### Acceptance Criteria

1. WHEN InvoiceTable yüklenir, THE AutoSigner SHALL tablo başlık satırındaki SelectAllCheckbox'ı dinamik CSS selector (`[id$="-sall"]`) ile bulmalıdır.
2. WHEN SelectAllCheckbox bulunur, THE AutoSigner SHALL bu checkbox'a tıklamalıdır.
3. WHEN InvoiceTable birden fazla sayfa içeriyorsa (sayfalama göstergesi mevcutsa) VE mevcut sayfa son sayfa değilse, THE AutoSigner SHALL sonraki sayfaya geçmeli, o sayfadaki SelectAllCheckbox'ı seçmeli ve bu işlemi en fazla 50 sayfa için tekrarlamalıdır.
4. WHEN tüm sayfalar işlenir (veya InvoiceTable sayfalama içermiyorsa SelectAllCheckbox tıklandıktan hemen sonra), THE AutoSigner SHALL seçili kayıt sayısını SmsBroadcast üzerinden istemciye bildirmelidir.
5. IF InvoiceTable'da hiç kayıt bulunamazsa, THEN THE AutoSigner SHALL "Bugün imzalanacak fatura bulunamadı" mesajıyla akışı durdurmalıdır.
6. IF herhangi bir sayfada SelectAllCheckbox bulunamazsa, THEN THE AutoSigner SHALL o sayfanın numarasını ve hatayı içeren bir mesajla akışı durdurmalı ve o ana kadar seçilen fatura sayısını SmsBroadcast üzerinden bildirmelidir.

---

### Requirement 4: GİB İmza Başlatma

**User Story:** Bir muhasebe yöneticisi olarak, faturalar seçildikten sonra sistemin GİB imza sürecini otomatik başlatmasını istiyorum; böylece imza için ayrıca butona tıklamam gerekmesин.

#### Acceptance Criteria

1. WHEN son fatura sayfası seçilir VE en az bir fatura seçili durumdaysa, THE AutoSigner SHALL "GİB İmza" butonuna tıklamalıdır.
2. WHEN SmsPopup açılır, THE AutoSigner SHALL "Uyarıyı Okudum" checkbox'ını işaretlemelidir.
3. WHEN "Uyarıyı Okudum" işaretlenir, THE AutoSigner SHALL "Şifre Gönder" butonuna tıklamalıdır.
4. WHEN "Şifre Gönder" tıklanır, THE AutoSigner SHALL `sms_waiting` adımına geçmelidir.
5. WHEN AutoSigner `sms_waiting` adımına geçer, THE AutoSigner SHALL SmsBroadcast üzerinden istemciye SMS bekleme durumunu bildirmelidir.
6. IF SmsPopup 10 saniye içinde açılmazsa, THEN THE AutoSigner SHALL "GİB İmza popup'ı açılamadı" hata mesajıyla seçili fatura listesini ve adım durumunu sıfırlayarak akışı durdurmalıdır.

---

### Requirement 5: SMS Kodu Doğrulama ve İmzalama Tamamlama

**User Story:** Bir muhasebe yöneticisi olarak, telefona gelen SMS kodunu girerek imzalamayı tamamlamak istiyorum; sisteme kodu girdiğimde otomatik olarak portal üzerinde girişi yapmalı.

#### Acceptance Criteria

1. WHILE AutoSigner `sms_waiting` durumundayken, THE AutoSignModal SHALL kullanıcıya 6 haneli, yalnızca rakamlardan oluşan SMS kodu giriş alanı göstermeli ve "Onayla" butonu sunmalıdır.
2. WHEN kullanıcı 6 haneli, yalnızca rakamlardan oluşan geçerli bir SMS kodu girer ve onaylar, THE AutoSigner SHALL SmsPopup içindeki SMS kodu giriş alanını doldurmalıdır; IF alan doldurma başarılı olursa, THEN THE AutoSigner SHALL "Onayla" butonuna tıklamalıdır; IF alan doldurma başarısız olursa, THEN THE AutoSigner SHALL hata mesajıyla akışı durdurmalıdır.
3. WHEN imzalama işlemi portal tarafından tamamlanır, THE AutoSigner SHALL SigningSession'ı `completed` olarak işaretlemeli ve SmsBroadcast üzerinden istemciye başarı mesajı göndermelidir.
4. WHEN imzalama tamamlanır, THE AutoSignModal SHALL imzalanan fatura sayısını kullanıcıya göstermeli ve listeyi yenileme butonu sunmalıdır.
5. IF SMS kodu portal tarafından reddedilirse, THEN THE AutoSigner SHALL hata mesajını SmsBroadcast üzerinden istemciye iletmeli ve kullanıcının kodu en fazla 3 kez yeniden girmesine izin vermelidir.
6. IF kullanıcı 3 kez yanlış SMS kodu girerse, THEN THE AutoSigner SHALL imzalama oturumunu iptal etmeli, SmsBroadcast üzerinden oturumun iptal edildiğini bildirmeli ve SigningSession'ı `failed` olarak işaretlemelidir.
7. IF imzalama işlemi portal tarafından tamamlanırsa, THEN THE System SHALL imzalamayı başarılı kabul etmelidir; SigningSession durumu veya SmsBroadcast bildirimi güncellenemese bile süreç başarılı olarak sonuçlanmalıdır.

---

### Requirement 6: Gerçek Zamanlı Durum Bildirimi (SSE)

**User Story:** Bir muhasebe yöneticisi olarak, imzalama sürecinin hangi aşamada olduğunu anlık görmek istiyorum; böylece işlemin takıldığını veya devam ettiğini bilebilirim.

#### Acceptance Criteria

1. THE System SHALL `/api/gib-earsiv/auto-sign/status` endpoint'ini SSE (Server-Sent Events) akışı olarak sunmalı; bağlantı kurulduğunda `Content-Type: text/event-stream` başlığı ile yanıt vermelidir.
2. WHEN AutoSigner her SignStep'e geçtiğinde, THE AutoSigner SHALL SmsBroadcast üzerinden `{ step, message, progress }` formatında bir event yayınlamalıdır; burada `step` geçerli adım tanımlayıcısı, `message` en fazla 255 karakter uzunluğunda açıklama metni, `progress` ise 0 ile 100 arasında tam sayı değeridir.
3. WHILE AutoSigner çalışırken, THE AutoSignModal SHALL SSE bağlantısını açık tutarak gelen her event'te adım tanımlayıcısını, mesajını ve ilerleme yüzdesini kullanıcıya gösterecek şekilde UI'ı güncellemeli; event alındıktan sonra UI güncellemesi 500 milisaniye içinde tamamlanmalıdır; SSE bağlantısı kapalı olsa bile alınan son event verisiyle UI güncellemesi yapılmalıdır.
4. WHEN SigningSession `completed` veya `failed` durumuna geçer, THE System SHALL son durum event'ini gönderdikten sonra 1 saniye içinde SSE akışını kapatmalıdır.
5. IF SSE bağlantısı beklenmedik şekilde kesilirse, THEN THE AutoSignModal SHALL 3 saniye sonra yeniden bağlanmayı denemeli; yeniden bağlanma girişimi sırasında kullanıcıya bağlantının kesildiğini ve yeniden bağlanılmaya çalışıldığını belirten bir durum mesajı göstermelidir.
6. IF SSE bağlantısı arka arkaya 3 yeniden bağlanma denemesinden sonra hâlâ kurulamazsa, THEN THE AutoSignModal SHALL yeniden bağlanma girişimlerini durdurmalı ve kullanıcıya bağlantının başarısız olduğunu belirten kalıcı bir hata mesajı göstermelidir.

---

### Requirement 7: Hata Yönetimi ve Kurtarma

**User Story:** Bir muhasebe yöneticisi olarak, otomasyon beklenmedik bir hatayla karşılaştığında ne olduğunu anlamak ve gerekirse yeniden denemek istiyorum.

#### Acceptance Criteria

1. IF otomasyon herhangi bir adımda başarısız olursa, THEN THE AutoSigner SHALL tarayıcı oturumunu 10 saniye içinde kapatmalı, başarısız olan adım tanımlayıcısını ve hata açıklamasını (en fazla 500 karakter) içeren bir log kaydı oluşturmalı ve SmsBroadcast üzerinden hata adımını ve mesajını istemciye iletmelidir.
2. WHEN bir hata oluşur, THE AutoSignModal SHALL kullanıcıya başarısız olan adım tanımlayıcısını ve hata mesajını göstermeli; "Yeniden Dene" ve "İptal" seçeneklerini en fazla 2 saniye içinde kullanıcıya sunmalıdır.
3. WHEN kullanıcı "Yeniden Dene" seçeneğini seçer, THE AutoSignModal SHALL mevcut hata durumunu temizleyerek AutoSigner'ı ilk adımdan yeni bir oturum olarak başlatmalıdır.
4. WHEN kullanıcı "İptal" seçeneğini seçer, THE AutoSignModal SHALL aktif SigningSession'ı sonlandırmalı ve modal'ı kapatmalıdır.
5. THE AutoSigner SHALL bir otomasyon oturumu süresince en fazla 180 saniye çalışmalı; bu süreyi aşarsa tarayıcı oturumunu kapatmalı ve akışı zaman aşımı hatası ile sonlandırarak SmsBroadcast üzerinden zaman aşımı event'i yayınlamalıdır.
6. IF GIB_Portal sunucusundan 5xx HTTP yanıtı alınırsa, THEN THE AutoSigner SHALL 5 saniye bekleyip aynı adımı en fazla 2 kez yeniden denemelidir; 2 deneme sonunda hata devam ederse otomasyon oturumunu başarısız olarak sonlandırmalıdır.

---

### Requirement 8: API Endpoint'leri

**User Story:** Bir geliştirici olarak, otomasyon akışını kontrol eden ve durumunu sorgulayan RESTful endpoint'lere ihtiyacım var; böylece frontend bileşenleri doğrudan API üzerinden otomasyon yaşam döngüsünü yönetebilsin.

#### Acceptance Criteria

1. THE System SHALL `POST /api/gib-earsiv/auto-sign/start` endpoint'ini sağlamalı; bu endpoint `{ username, password }` alarak yeni bir SigningSession başlatmalı ve `{ sessionId }` döndürmelidir; burada `sessionId` benzersiz bir tanımlayıcıdır ve `username` ile `password` alanları boş olamaz.
2. THE System SHALL `POST /api/gib-earsiv/auto-sign/submit-sms` endpoint'ini sağlamalı; bu endpoint `{ sessionId, smsCode }` alarak SMS kodunu AutoSigner'a iletmeli; `smsCode` 4 ile 8 karakter arasında rakamlardan oluşmalıdır; bu koşulu karşılamayan istekler geçersiz girdi belirten bir hata yanıtıyla reddedilmeli ve AutoSigner'a iletilmemelidir.
3. THE System SHALL `DELETE /api/gib-earsiv/auto-sign/cancel` endpoint'ini sağlamalı; bu endpoint `{ sessionId }` alarak aktif SigningSession'ı sonlandırmalı, tarayıcı oturumunu 10 saniye içinde kapatmalı ve tüm sonlandırma işlemleri başarıyla tamamlandığında başarı yanıtı döndürmelidir.
4. WHEN `POST /api/gib-earsiv/auto-sign/start` çağrılır ve mevcut bir aktif SigningSession varsa, THEN THE System SHALL mevcut `sessionId`'yi içeren bir çakışma hatası yanıtı döndürmelidir.
5. IF geçersiz veya süresi dolmuş bir `sessionId` ile `submit-sms` çağrılırsa, THEN THE System SHALL oturumun bulunamadığını belirten bir hata yanıtı döndürmelidir.
6. IF `POST /api/gib-earsiv/auto-sign/start` isteğinde `username` veya `password` alanı eksik ya da boş ise, THEN THE System SHALL geçersiz girdi belirten bir hata yanıtı döndürmeli ve SigningSession başlatmamalıdır.

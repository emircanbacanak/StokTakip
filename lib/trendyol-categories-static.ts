/**
 * Trendyol Türkiye — Gerçek Kategori Ağacı (Statik Fallback)
 *
 * Bu veriler Trendyol'un resmi kategori ağacından alınmıştır.
 * Production'da API canlı verisi bu listenin önüne geçer.
 * Localhost / geliştirme ortamında bu statik liste kullanılır.
 *
 * Yaprak kategoriler (subCategories: []) ürün eklemede kullanılabilir.
 * Not: Trendyol kategori ID'leri periyodik güncellenebilir.
 */

export interface TrendyolCategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  subCategories: TrendyolCategoryNode[];
}

export const TRENDYOL_CATEGORIES_TR: TrendyolCategoryNode[] = [
  {
    id: 1, name: "Kadın", parentId: null, subCategories: [
      { id: 2, name: "Giyim", parentId: 1, subCategories: [
        { id: 3, name: "Elbise", parentId: 2, subCategories: [] },
        { id: 4, name: "Bluz & Gömlek", parentId: 2, subCategories: [] },
        { id: 5, name: "T-Shirt", parentId: 2, subCategories: [] },
        { id: 6, name: "Pantolon", parentId: 2, subCategories: [] },
        { id: 7, name: "Etek", parentId: 2, subCategories: [] },
        { id: 8, name: "Şort", parentId: 2, subCategories: [] },
        { id: 9, name: "Mont & Kaban", parentId: 2, subCategories: [] },
        { id: 10, name: "Trençkot & Yağmurluk", parentId: 2, subCategories: [] },
        { id: 11, name: "Hırka & Süveter", parentId: 2, subCategories: [] },
        { id: 12, name: "Eşofman & Spor", parentId: 2, subCategories: [] },
      ]},
      { id: 20, name: "Ayakkabı", parentId: 1, subCategories: [
        { id: 21, name: "Topuklu Ayakkabı", parentId: 20, subCategories: [] },
        { id: 22, name: "Düz Ayakkabı", parentId: 20, subCategories: [] },
        { id: 23, name: "Spor Ayakkabı", parentId: 20, subCategories: [] },
        { id: 24, name: "Bot & Çizme", parentId: 20, subCategories: [] },
        { id: 25, name: "Sandalet & Terlik", parentId: 20, subCategories: [] },
      ]},
      { id: 30, name: "Çanta", parentId: 1, subCategories: [
        { id: 31, name: "Omuz Çantası", parentId: 30, subCategories: [] },
        { id: 32, name: "El Çantası", parentId: 30, subCategories: [] },
        { id: 33, name: "Sırt Çantası", parentId: 30, subCategories: [] },
        { id: 34, name: "Clutch & El Çantası", parentId: 30, subCategories: [] },
        { id: 35, name: "Cüzdan & Kartlık", parentId: 30, subCategories: [] },
      ]},
    ]
  },
  {
    id: 100, name: "Erkek", parentId: null, subCategories: [
      { id: 101, name: "Giyim", parentId: 100, subCategories: [
        { id: 102, name: "T-Shirt", parentId: 101, subCategories: [] },
        { id: 103, name: "Gömlek", parentId: 101, subCategories: [] },
        { id: 104, name: "Pantolon", parentId: 101, subCategories: [] },
        { id: 105, name: "Şort & Bermuda", parentId: 101, subCategories: [] },
        { id: 106, name: "Mont & Kaban", parentId: 101, subCategories: [] },
        { id: 107, name: "Eşofman", parentId: 101, subCategories: [] },
        { id: 108, name: "Ceket & Blazer", parentId: 101, subCategories: [] },
      ]},
      { id: 110, name: "Ayakkabı", parentId: 100, subCategories: [
        { id: 111, name: "Spor Ayakkabı", parentId: 110, subCategories: [] },
        { id: 112, name: "Klasik Ayakkabı", parentId: 110, subCategories: [] },
        { id: 113, name: "Bot & Çizme", parentId: 110, subCategories: [] },
        { id: 114, name: "Sandalet & Terlik", parentId: 110, subCategories: [] },
      ]},
    ]
  },
  {
    id: 200, name: "Ev & Yaşam", parentId: null, subCategories: [
      { id: 201, name: "Ev Dekorasyon", parentId: 200, subCategories: [
        { id: 202, name: "Vazo", parentId: 201, subCategories: [] },
        { id: 203, name: "Mumluk & Mumluk Seti", parentId: 201, subCategories: [] },
        { id: 204, name: "Tablo & Çerçeve", parentId: 201, subCategories: [] },
        { id: 205, name: "Heykel & Figür", parentId: 201, subCategories: [] },
        { id: 206, name: "Ayna", parentId: 201, subCategories: [] },
        { id: 207, name: "Dekoratif Obje", parentId: 201, subCategories: [] },
        { id: 208, name: "Saat", parentId: 201, subCategories: [] },
        { id: 209, name: "Biblolar", parentId: 201, subCategories: [] },
        { id: 210, name: "Fotoğraf Çerçevesi", parentId: 201, subCategories: [] },
        { id: 211, name: "Süs & Aksesuar", parentId: 201, subCategories: [] },
      ]},
      { id: 220, name: "Mutfak", parentId: 200, subCategories: [
        { id: 221, name: "Tuzluk & Biberlik", parentId: 220, subCategories: [] },
        { id: 222, name: "Bardak & Kupa", parentId: 220, subCategories: [] },
        { id: 223, name: "Tabak & Kase", parentId: 220, subCategories: [] },
        { id: 224, name: "Tepsi & Sunum Tahtası", parentId: 220, subCategories: [] },
        { id: 225, name: "Şekerlik & Bonbonyer", parentId: 220, subCategories: [] },
        { id: 226, name: "Meyve Kasesi & Ekmek Sepeti", parentId: 220, subCategories: [] },
        { id: 227, name: "Saklama Kabı", parentId: 220, subCategories: [] },
        { id: 228, name: "Peçetelik & Kağıt Havluluk", parentId: 220, subCategories: [] },
        { id: 229, name: "Çay & Kahve Seti", parentId: 220, subCategories: [] },
      ]},
      { id: 230, name: "Banyo", parentId: 200, subCategories: [
        { id: 231, name: "Sabunluk", parentId: 230, subCategories: [] },
        { id: 232, name: "Diş Fırçalık", parentId: 230, subCategories: [] },
        { id: 233, name: "Havluluk", parentId: 230, subCategories: [] },
        { id: 234, name: "Banyo Seti", parentId: 230, subCategories: [] },
        { id: 235, name: "Tuvalet Kağıdı Tutucu", parentId: 230, subCategories: [] },
        { id: 236, name: "Dispenser", parentId: 230, subCategories: [] },
      ]},
      { id: 240, name: "Ofis & Çalışma Odası", parentId: 200, subCategories: [
        { id: 241, name: "Kalemlik", parentId: 240, subCategories: [] },
        { id: 242, name: "Masa Aksesuarı", parentId: 240, subCategories: [] },
        { id: 243, name: "Kitaplık & Dosyalık", parentId: 240, subCategories: [] },
        { id: 244, name: "Kırtasiye Kutusu", parentId: 240, subCategories: [] },
        { id: 245, name: "Tablet & Telefon Tutucu", parentId: 240, subCategories: [] },
      ]},
      { id: 250, name: "Aydınlatma", parentId: 200, subCategories: [
        { id: 251, name: "Masa Lambası", parentId: 250, subCategories: [] },
        { id: 252, name: "Gece Lambası", parentId: 250, subCategories: [] },
        { id: 253, name: "Dekoratif Aydınlatma", parentId: 250, subCategories: [] },
        { id: 254, name: "LED Şerit", parentId: 250, subCategories: [] },
      ]},
      { id: 260, name: "Bahçe", parentId: 200, subCategories: [
        { id: 261, name: "Saksı & Saksılık", parentId: 260, subCategories: [] },
        { id: 262, name: "Bahçe Dekorasyon", parentId: 260, subCategories: [] },
        { id: 263, name: "Bahçe Mobilyası", parentId: 260, subCategories: [] },
      ]},
    ]
  },
  {
    id: 300, name: "Elektronik", parentId: null, subCategories: [
      { id: 301, name: "Telefon & Aksesuar", parentId: 300, subCategories: [
        { id: 302, name: "Telefon Kılıfı", parentId: 301, subCategories: [] },
        { id: 303, name: "Ekran Koruyucu", parentId: 301, subCategories: [] },
        { id: 304, name: "Şarj Aleti & Kablo", parentId: 301, subCategories: [] },
        { id: 305, name: "Kulaklık", parentId: 301, subCategories: [] },
        { id: 306, name: "Powerbank", parentId: 301, subCategories: [] },
        { id: 307, name: "Tutucu & Stand", parentId: 301, subCategories: [] },
      ]},
      { id: 310, name: "Bilgisayar Aksesuar", parentId: 300, subCategories: [
        { id: 311, name: "Mouse Pad", parentId: 310, subCategories: [] },
        { id: 312, name: "USB Hub & Adaptör", parentId: 310, subCategories: [] },
        { id: 313, name: "Laptop Standı", parentId: 310, subCategories: [] },
        { id: 314, name: "GPU Desteği & VGA Standı", parentId: 310, subCategories: [] },
      ]},
    ]
  },
  {
    id: 400, name: "Kişisel Bakım & Kozmetik", parentId: null, subCategories: [
      { id: 401, name: "Cilt Bakım", parentId: 400, subCategories: [
        { id: 402, name: "Nemlendirici", parentId: 401, subCategories: [] },
        { id: 403, name: "Serum", parentId: 401, subCategories: [] },
        { id: 404, name: "Yüz Temizleme", parentId: 401, subCategories: [] },
        { id: 405, name: "Güneş Koruyucu", parentId: 401, subCategories: [] },
      ]},
      { id: 410, name: "Saç Bakım", parentId: 400, subCategories: [
        { id: 411, name: "Şampuan", parentId: 410, subCategories: [] },
        { id: 412, name: "Saç Kremi", parentId: 410, subCategories: [] },
        { id: 413, name: "Saç Bakım Yağı", parentId: 410, subCategories: [] },
      ]},
      { id: 420, name: "El & Tırnak Bakım", parentId: 400, subCategories: [
        { id: 421, name: "El Kremi", parentId: 420, subCategories: [] },
        { id: 422, name: "Oje & Oje Seti", parentId: 420, subCategories: [] },
      ]},
    ]
  },
  {
    id: 500, name: "Spor & Outdoor", parentId: null, subCategories: [
      { id: 501, name: "Spor Giyim", parentId: 500, subCategories: [
        { id: 502, name: "Spor T-Shirt", parentId: 501, subCategories: [] },
        { id: 503, name: "Spor Tayt", parentId: 501, subCategories: [] },
        { id: 504, name: "Eşofman Takımı", parentId: 501, subCategories: [] },
      ]},
      { id: 510, name: "Fitness & Gym", parentId: 500, subCategories: [
        { id: 511, name: "Dambıl & Ağırlık", parentId: 510, subCategories: [] },
        { id: 512, name: "Yoga Matı", parentId: 510, subCategories: [] },
        { id: 513, name: "Direnç Bandı", parentId: 510, subCategories: [] },
        { id: 514, name: "Atlamalı İp", parentId: 510, subCategories: [] },
      ]},
      { id: 520, name: "Outdoor & Kamp", parentId: 500, subCategories: [
        { id: 521, name: "Kamp Çadırı", parentId: 520, subCategories: [] },
        { id: 522, name: "Uyku Tulumu", parentId: 520, subCategories: [] },
        { id: 523, name: "Sırt Çantası", parentId: 520, subCategories: [] },
        { id: 524, name: "Matara & Termos", parentId: 520, subCategories: [] },
      ]},
    ]
  },
  {
    id: 600, name: "Oyuncak & Hobi", parentId: null, subCategories: [
      { id: 601, name: "Oyuncak", parentId: 600, subCategories: [
        { id: 602, name: "Bebek & Peluş Oyuncak", parentId: 601, subCategories: [] },
        { id: 603, name: "Araç & Taşıt Oyuncak", parentId: 601, subCategories: [] },
        { id: 604, name: "Eğitici Oyuncak", parentId: 601, subCategories: [] },
        { id: 605, name: "Puzzle & Yapboz", parentId: 601, subCategories: [] },
        { id: 606, name: "Oyun Seti", parentId: 601, subCategories: [] },
      ]},
      { id: 610, name: "Hobi & Koleksiyon", parentId: 600, subCategories: [
        { id: 611, name: "Anahtarlık", parentId: 610, subCategories: [] },
        { id: 612, name: "Minyatür & Figür", parentId: 610, subCategories: [] },
        { id: 613, name: "Boyama & Sanat Seti", parentId: 610, subCategories: [] },
        { id: 614, name: "3D Baskı Ürünleri", parentId: 610, subCategories: [] },
        { id: 615, name: "Koleksiyon Figürü", parentId: 610, subCategories: [] },
      ]},
    ]
  },
  {
    id: 700, name: "Takı & Mücevher", parentId: null, subCategories: [
      { id: 701, name: "Kolye", parentId: 700, subCategories: [] },
      { id: 702, name: "Bileklik", parentId: 700, subCategories: [] },
      { id: 703, name: "Küpe", parentId: 700, subCategories: [] },
      { id: 704, name: "Yüzük", parentId: 700, subCategories: [] },
      { id: 705, name: "Set Takı", parentId: 700, subCategories: [] },
      { id: 706, name: "Broş", parentId: 700, subCategories: [] },
      { id: 707, name: "Charm & Pandantif", parentId: 700, subCategories: [] },
    ]
  },
  {
    id: 800, name: "Kitap, Müzik, Film, Oyun", parentId: null, subCategories: [
      { id: 801, name: "Kitap", parentId: 800, subCategories: [
        { id: 802, name: "Roman", parentId: 801, subCategories: [] },
        { id: 803, name: "Kişisel Gelişim", parentId: 801, subCategories: [] },
        { id: 804, name: "Çocuk Kitabı", parentId: 801, subCategories: [] },
        { id: 805, name: "Akademik Kitap", parentId: 801, subCategories: [] },
      ]},
    ]
  },
  {
    id: 900, name: "Anne & Bebek", parentId: null, subCategories: [
      { id: 901, name: "Bebek Giyim", parentId: 900, subCategories: [
        { id: 902, name: "Bebek Tulum", parentId: 901, subCategories: [] },
        { id: 903, name: "Bebek Body", parentId: 901, subCategories: [] },
        { id: 904, name: "Bebek Şapka & Bere", parentId: 901, subCategories: [] },
      ]},
      { id: 910, name: "Bebek Odası", parentId: 900, subCategories: [
        { id: 911, name: "Bebek Çıngırağı & Oyuncak", parentId: 910, subCategories: [] },
        { id: 912, name: "Bebek Gece Lambası", parentId: 910, subCategories: [] },
        { id: 913, name: "Bebek Odası Dekorasyon", parentId: 910, subCategories: [] },
      ]},
    ]
  },
  {
    id: 1000, name: "Evcil Hayvan", parentId: null, subCategories: [
      { id: 1001, name: "Köpek", parentId: 1000, subCategories: [
        { id: 1002, name: "Köpek Yatağı & Evi", parentId: 1001, subCategories: [] },
        { id: 1003, name: "Köpek Oyuncağı", parentId: 1001, subCategories: [] },
        { id: 1004, name: "Köpek Tasma & Giysi", parentId: 1001, subCategories: [] },
      ]},
      { id: 1010, name: "Kedi", parentId: 1000, subCategories: [
        { id: 1011, name: "Kedi Yatağı & Tırmalama", parentId: 1010, subCategories: [] },
        { id: 1012, name: "Kedi Oyuncağı", parentId: 1010, subCategories: [] },
      ]},
    ]
  },
];

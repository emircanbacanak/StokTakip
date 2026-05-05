# 🎨 Görsel Proje Haritası

> Mermaid diyagramları ile interaktif proje görselleştirmesi

---

## 🏗️ Genel Mimari

```mermaid
graph TB
    subgraph "Kullanıcı Katmanı"
        A[Web Tarayıcı / PWA]
    end
    
    subgraph "Frontend Katmanı"
        B[Next.js 16 App Router]
        C[React 19 Components]
        D[Tailwind CSS]
    end
    
    subgraph "Backend Katmanı"
        E[Supabase PostgreSQL]
        F[Supabase Auth]
        G[Supabase Storage]
    end
    
    A --> B
    B --> C
    C --> D
    B --> E
    B --> F
    B --> G
    
    style A fill:#3B82F6
    style B fill:#10B981
    style C fill:#F59E0B
    style E fill:#EC4899
```

---

## 📊 Veritabanı İlişki Diyagramı

```mermaid
erDiagram
    BUYERS ||--o{ ORDERS : "has"
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDERS ||--o{ DELIVERIES : "has"
    ORDERS ||--o{ PAYMENTS : "receives"
    DELIVERIES ||--o{ DELIVERY_ITEMS : "contains"
    ORDER_ITEMS ||--o{ DELIVERY_ITEMS : "references"
    
    BUYERS {
        uuid id PK
        text name
        text phone
        text address
        timestamp created_at
    }
    
    ORDERS {
        uuid id PK
        uuid buyer_id FK
        numeric total_amount
        numeric paid_amount
        enum status
        text notes
        timestamp created_at
        timestamp updated_at
    }
    
    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        text product_name
        text color
        integer quantity
        integer produced_quantity
        integer delivered_quantity
        numeric unit_price
        timestamp created_at
    }
    
    DELIVERIES {
        uuid id PK
        uuid order_id FK
        date delivery_date
        text notes
        timestamp created_at
    }
    
    DELIVERY_ITEMS {
        uuid id PK
        uuid delivery_id FK
        uuid order_item_id FK
        integer quantity
        timestamp created_at
    }
    
    PAYMENTS {
        uuid id PK
        uuid order_id FK
        uuid delivery_id FK
        numeric amount
        date payment_date
        text payment_method
        text notes
        timestamp created_at
    }
    
    COLORS {
        uuid id PK
        text name
        integer usage_count
        timestamp created_at
    }
    
    PRODUCTS {
        uuid id PK
        text name
        text description
        text image_url
        timestamp created_at
    }
```

---

## 🔄 Sipariş Yaşam Döngüsü

```mermaid
stateDiagram-v2
    [*] --> Pending: Yeni Sipariş
    Pending --> InProduction: Üretim Başladı
    InProduction --> Completed: Üretim Tamamlandı
    Completed --> Delivered: Teslimat Yapıldı
    Delivered --> [*]
    
    Pending --> [*]: İptal
    InProduction --> [*]: İptal
    
    note right of Pending
        Sipariş oluşturuldu
        Henüz üretim başlamadı
    end note
    
    note right of InProduction
        Üretim devam ediyor
        produced_quantity > 0
    end note
    
    note right of Completed
        Tüm üretim tamamlandı
        produced_quantity = quantity
    end note
    
    note right of Delivered
        Teslimat yapıldı
        delivered_quantity = quantity
    end note
```

---

## 📁 Klasör Yapısı Ağacı

```mermaid
graph TD
    ROOT[Proje Kökü]
    
    ROOT --> APP[app/]
    ROOT --> COMP[components/]
    ROOT --> LIB[lib/]
    ROOT --> SUPA[supabase/]
    ROOT --> KIRO[.kiro/]
    
    APP --> DASH[dashboard/]
    APP --> INV[invoice/]
    APP --> SETUP[setup/]
    
    DASH --> ORDERS[orders/]
    DASH --> PROD[production/]
    DASH --> BUYERS[buyers/]
    DASH --> PRODUCTS[products/]
    DASH --> ACC[accounting/]
    DASH --> COLORS[colors/]
    
    COMP --> COMP_DASH[dashboard/]
    COMP --> COMP_ORD[orders/]
    COMP --> COMP_PROD[production/]
    COMP --> COMP_BUY[buyers/]
    COMP --> COMP_PROD2[products/]
    COMP --> COMP_ACC[accounting/]
    COMP --> UI[ui/]
    
    LIB --> SUPABASE[supabase/]
    LIB --> TYPES[types/]
    
    KIRO --> SPECS[specs/]
    KIRO --> STEERING[steering/]
    KIRO --> DOCS[docs/]
    
    style ROOT fill:#3B82F6
    style APP fill:#10B981
    style COMP fill:#F59E0B
    style LIB fill:#EC4899
    style KIRO fill:#8B5CF6
```

---

## 🔄 Sipariş Oluşturma Akışı

```mermaid
sequenceDiagram
    participant U as Kullanıcı
    participant D as new-order-dialog
    participant S as Supabase Client
    participant DB as PostgreSQL
    participant T as Toast
    participant L as Liste
    
    U->>D: "Yeni Sipariş" butonuna tıkla
    D->>U: Dialog aç
    U->>D: Form doldur (alıcı, ürün, renk, adet)
    U->>D: "Kaydet" butonuna tıkla
    
    D->>S: Insert order
    S->>DB: INSERT INTO orders
    DB-->>S: order_id döndür
    
    D->>S: Insert order_items
    S->>DB: INSERT INTO order_items
    DB-->>S: Başarılı
    
    D->>S: Update colors.usage_count
    S->>DB: UPDATE colors
    DB-->>S: Başarılı
    
    S-->>D: Başarılı
    D->>T: Toast göster ("Sipariş oluşturuldu")
    D->>D: Dialog kapat
    D->>L: Liste yenile
    L->>S: Siparişleri yeniden çek
    S->>DB: SELECT orders
    DB-->>S: Güncel liste
    S-->>L: Veri döndür
    L->>U: Güncel liste göster
```

---

## 🏭 Üretim Güncelleme Akışı

```mermaid
sequenceDiagram
    participant U as Kullanıcı
    participant P as production-client
    participant S as Supabase Client
    participant DB as PostgreSQL
    participant TR as Trigger
    participant UI as UI Component
    
    U->>P: "+1" butonuna tıkla
    P->>S: Update produced_quantity
    S->>DB: UPDATE order_items SET produced_quantity = produced_quantity + 1
    DB-->>S: Başarılı
    
    DB->>TR: Trigger tetiklendi
    TR->>DB: Check if all items produced
    
    alt Tüm kalemler üretildi
        TR->>DB: UPDATE orders SET status = 'completed'
    else Bazı kalemler üretilmedi
        TR->>DB: UPDATE orders SET status = 'in_production'
    end
    
    S-->>P: Başarılı
    P->>UI: İlerleme çubuğunu güncelle
    UI->>U: Yeni ilerleme göster
```

---

## 📦 Teslimat Akışı

```mermaid
flowchart TD
    A[Kullanıcı: Teslimat Ekle] --> B[new-delivery-dialog açılır]
    B --> C{Teslimat tarihi seç}
    C --> D[Teslimat kalemlerini seç]
    D --> E[Miktar gir]
    E --> F[Kaydet butonuna tıkla]
    
    F --> G[deliveries tablosuna INSERT]
    G --> H[delivery_items tablosuna INSERT]
    H --> I[order_items.delivered_quantity güncelle]
    
    I --> J{Ödeme eklenecek mi?}
    J -->|Evet| K[new-payment-dialog aç]
    J -->|Hayır| L[Dialog kapat]
    
    K --> M[payments tablosuna INSERT]
    M --> N[orders.paid_amount güncelle]
    N --> L
    
    L --> O[Toast bildirimi göster]
    O --> P[Liste yenile]
    
    style A fill:#3B82F6
    style G fill:#10B981
    style H fill:#10B981
    style I fill:#10B981
    style M fill:#F59E0B
    style O fill:#EC4899
```

---

## 🎯 Component İlişki Haritası

```mermaid
graph LR
    subgraph "Sipariş Yönetimi"
        OC[orders-client.tsx]
        NOD[new-order-dialog.tsx]
        ODD[order-detail-dialog-v2.tsx]
        EOD[edit-order-dialog.tsx]
        ACD[add-colors-dialog.tsx]
        NDD[new-delivery-dialog.tsx]
        NPD[new-payment-dialog.tsx]
        ID[invoice-dialog.tsx]
    end
    
    OC -->|Yeni Sipariş| NOD
    OC -->|Detay Göster| ODD
    ODD -->|Düzenle| EOD
    ODD -->|Renk Ekle| ACD
    ODD -->|Teslimat| NDD
    ODD -->|Ödeme| NPD
    ODD -->|Fatura| ID
    
    style OC fill:#3B82F6
    style NOD fill:#10B981
    style ODD fill:#F59E0B
```

---

## 📊 Dashboard Bileşenleri

```mermaid
graph TD
    DP[dashboard/page.tsx]
    
    DP --> DS[dashboard-stats.tsx]
    DP --> CC[color-chart.tsx]
    DP --> RO[recent-orders.tsx]
    
    DS --> DS1[Toplam Sipariş]
    DS --> DS2[Aktif Sipariş]
    DS --> DS3[Toplam Alıcı]
    DS --> DS4[Toplam Ciro]
    
    CC --> CC1[Recharts PieChart]
    CC --> CC2[Renk Dağılımı]
    
    RO --> RO1[Son 5 Sipariş]
    RO --> RO2[Alıcı Bilgisi]
    RO --> RO3[Durum Badge]
    
    style DP fill:#3B82F6
    style DS fill:#10B981
    style CC fill:#F59E0B
    style RO fill:#EC4899
```

---

## 🔐 Supabase Client Kullanımı

```mermaid
flowchart LR
    subgraph "Client-Side"
        CC[Client Component]
        CSC[createClient from client.ts]
        CC --> CSC
    end
    
    subgraph "Server-Side"
        SC[Server Component]
        SSC[createClient from server.ts]
        SC --> SSC
    end
    
    subgraph "Supabase"
        DB[(PostgreSQL)]
        AUTH[Auth]
        STORAGE[Storage]
    end
    
    CSC --> DB
    CSC --> AUTH
    CSC --> STORAGE
    
    SSC --> DB
    SSC --> AUTH
    SSC --> STORAGE
    
    style CC fill:#3B82F6
    style SC fill:#10B981
    style DB fill:#EC4899
```

---

## 🎨 UI Component Hiyerarşisi

```mermaid
graph TD
    ROOT[Layout]
    
    ROOT --> TP[ThemeProvider]
    ROOT --> TOASTER[Toaster]
    
    TP --> DL[Dashboard Layout]
    
    DL --> NAV[Navigation/Sidebar]
    DL --> MAIN[Main Content]
    
    MAIN --> PAGE[Page Component]
    
    PAGE --> CARD[Card]
    PAGE --> TABLE[Table]
    PAGE --> DIALOG[Dialog]
    PAGE --> BUTTON[Button]
    
    DIALOG --> DH[DialogHeader]
    DIALOG --> DC[DialogContent]
    DIALOG --> DF[DialogFooter]
    
    DC --> INPUT[Input]
    DC --> SELECT[Select]
    DC --> TEXTAREA[Textarea]
    
    style ROOT fill:#3B82F6
    style TP fill:#10B981
    style DL fill:#F59E0B
    style DIALOG fill:#EC4899
```

---

## 🔄 State Yönetimi Akışı

```mermaid
stateDiagram-v2
    [*] --> ComponentMount
    ComponentMount --> InitialState: useState
    InitialState --> DataFetch: useEffect
    DataFetch --> SupabaseQuery
    SupabaseQuery --> UpdateState: setState
    UpdateState --> UIRender
    UIRender --> UserInteraction
    UserInteraction --> EventHandler
    EventHandler --> SupabaseMutation
    SupabaseMutation --> ToastNotification
    ToastNotification --> RefreshState: setState
    RefreshState --> UIRerender
    UIRerender --> UserInteraction
    
    note right of InitialState
        Boş array veya null
    end note
    
    note right of SupabaseQuery
        SELECT query
    end note
    
    note right of SupabaseMutation
        INSERT/UPDATE/DELETE
    end note
```

---

## 📈 Token Optimizasyonu Akışı

```mermaid
flowchart TD
    START[Yeni Oturum Başladı]
    
    START --> AUTO[Otomatik: steering/project-context.md yüklendi]
    AUTO --> TASK{Görev Türü?}
    
    TASK -->|Proje Anlama| PC[PROJECT_CONTEXT.md oku]
    TASK -->|Component İşlemi| CC[COMPONENT_CATALOG.md oku]
    TASK -->|Veritabanı İşlemi| DG[DATABASE_GUIDE.md oku]
    TASK -->|Hızlı Başlangıç| QR[QUICK_REFERENCE.md oku]
    
    PC --> PC1[Proje yapısını anla]
    CC --> CC1[Component bul]
    DG --> DG1[Query örneği bul]
    QR --> QR1[Senaryo bul]
    
    PC1 --> SPECIFIC[Sadece gerekli dosyayı oku]
    CC1 --> SPECIFIC
    DG1 --> SPECIFIC
    QR1 --> SPECIFIC
    
    SPECIFIC --> WORK[İşlemi yap]
    WORK --> END[Bitti]
    
    style START fill:#3B82F6
    style AUTO fill:#10B981
    style SPECIFIC fill:#F59E0B
    style END fill:#EC4899
```

---

## 🚀 Geliştirme Workflow

```mermaid
flowchart TD
    START[Yeni Özellik İsteği]
    
    START --> SPEC[Spec Oluştur]
    SPEC --> REQ[requirements.md]
    SPEC --> DES[design.md]
    SPEC --> TASK[tasks.md]
    
    TASK --> DB{Veritabanı değişikliği?}
    
    DB -->|Evet| MIG[Migration oluştur]
    DB -->|Hayır| COMP
    
    MIG --> TYPES[database.ts güncelle]
    TYPES --> COMP[Component oluştur]
    
    COMP --> SIMILAR[Benzer component'ten örnek al]
    SIMILAR --> QUERY[Supabase query'leri ekle]
    QUERY --> UI[UI bileşenlerini kullan]
    
    UI --> PAGE[Sayfa oluştur]
    PAGE --> ROUTE[Route ekle]
    ROUTE --> LAYOUT[Layout'a ekle]
    
    LAYOUT --> TEST[Test et]
    TEST --> ERROR{Hata var mı?}
    
    ERROR -->|Evet| FIX[Düzelt]
    FIX --> TEST
    
    ERROR -->|Hayır| DOC[Dokümantasyonu güncelle]
    DOC --> END[Bitti]
    
    style START fill:#3B82F6
    style SPEC fill:#10B981
    style COMP fill:#F59E0B
    style TEST fill:#EC4899
    style END fill:#8B5CF6
```

---

## 🎯 Özellik Modülleri

```mermaid
mindmap
  root((Stok & Sipariş Takip))
    Sipariş Yönetimi
      Oluşturma
      Görüntüleme
      Güncelleme
      Teslimat
      Ödeme
      Fatura
    Üretim Takibi
      Miktar Güncelleme
      İlerleme Görüntüleme
      Filtreleme
      Raporlama
    Alıcı Yönetimi
      Ekleme
      Düzenleme
      Silme
      Listeleme
    Stok Kontrolü
      Ürün Yönetimi
      Renk Yönetimi
      Stok Durumu
      Katalog
    Muhasebe
      Ödeme Takibi
      Borç/Alacak
      Raporlama
    Dashboard
      İstatistikler
      Grafikler
      Son Siparişler
```

---

## 🔗 Veri İlişkileri (Detaylı)

```mermaid
graph LR
    subgraph "Alıcı Modülü"
        B[buyers]
    end
    
    subgraph "Sipariş Modülü"
        O[orders]
        OI[order_items]
    end
    
    subgraph "Teslimat Modülü"
        D[deliveries]
        DI[delivery_items]
    end
    
    subgraph "Ödeme Modülü"
        P[payments]
    end
    
    subgraph "Ürün Modülü"
        PR[products]
        C[colors]
    end
    
    B -->|1:N| O
    O -->|1:N| OI
    O -->|1:N| D
    O -->|1:N| P
    D -->|1:N| DI
    OI -->|1:N| DI
    P -.->|optional| D
    
    style B fill:#3B82F6
    style O fill:#10B981
    style D fill:#F59E0B
    style P fill:#EC4899
    style PR fill:#8B5CF6
```

---

## 📱 PWA Yapısı

```mermaid
graph TD
    subgraph "PWA Özellikleri"
        M[manifest.json]
        I[icon-192.png]
        SW[Service Worker - Gelecek]
    end
    
    subgraph "Mobil Özellikler"
        R[Responsive Design]
        T[Touch Optimized]
        O[Offline Support - Gelecek]
    end
    
    M --> APP[Web App]
    I --> APP
    SW -.-> APP
    
    R --> APP
    T --> APP
    O -.-> APP
    
    APP --> ANDROID[Android Cihaz]
    APP --> IOS[iOS Cihaz]
    APP --> DESKTOP[Desktop]
    
    style M fill:#3B82F6
    style APP fill:#10B981
    style ANDROID fill:#F59E0B
    style IOS fill:#EC4899
```

---

**Not:** Bu diyagramlar Mermaid formatında hazırlanmıştır. GitHub, GitLab, Obsidian ve birçok Markdown görüntüleyici bu diyagramları otomatik olarak render eder.

**Son Güncelleme:** 5 Mayıs 2026  
**Versiyon:** 1.0.0

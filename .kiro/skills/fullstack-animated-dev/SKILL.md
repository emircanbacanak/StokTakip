---
name: fullstack-animated-dev
description: "Full-stack geliştirici için animasyonlu, modern ve kullanıcı dostu web uygulamaları oluşturma. React/Next.js, TypeScript, Tailwind CSS, Framer Motion ve modern animasyon teknikleri kullanarak production-ready kod üretir. Dark mode, responsive tasarım ve performans optimizasyonu dahil."
metadata:
  version: "1.0.0"
  author: "Kiro AI"
  tags: ["react", "nextjs", "typescript", "tailwind", "framer-motion", "animations", "dark-mode"]
---

# Full-Stack Animasyonlu Geliştirici

Modern, animasyonlu ve kullanıcı dostu web uygulamaları geliştirmek için kapsamlı skill. React/Next.js, TypeScript, Tailwind CSS ve Framer Motion kullanarak production-ready kod üretir.

## Ne Zaman Kullanılır

Bu skill'i şu durumlarda kullan:

- Modern, animasyonlu web uygulamaları geliştirirken
- React/Next.js projelerinde component oluştururken
- Dark mode ve light mode destekli arayüzler tasarlarken
- Responsive ve mobile-first tasarımlar yaparken
- Performanslı ve optimize edilmiş animasyonlar eklerken
- TypeScript ile tip güvenli kod yazarken
- Tailwind CSS ile hızlı styling yaparken

## Temel Prensipler

### 1. **Teknoloji Stack**
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion, CSS transitions
- **State Management**: React hooks, Zustand (gerekirse)
- **Forms**: React Hook Form + Zod validation
- **API**: Next.js API routes, tRPC (gerekirse)

### 2. **Dark Mode Desteği**

**Temel Prensipler:**
- Her zaman Tailwind CSS variables kullan (bg-background, text-foreground, etc.)
- Hardcoded renkler ASLA kullanma (bg-white, text-black, bg-gray-100, etc.)
- Tüm renkler otomatik olarak dark mode'a uyum sağlamalı

**CSS Variable Kullanımı:**
```typescript
// Arka planlar
bg-background      // Ana sayfa arka planı
bg-card            // Kart/panel arka planı
bg-muted           // Hafif vurgulu alanlar
bg-popover         // Popup/dropdown arka planı

// Yazılar
text-foreground         // Ana yazı rengi
text-card-foreground    // Kart içi yazılar
text-muted-foreground   // İkincil/açıklama yazıları

// Kenarlıklar
border-border      // Tüm kenarlıklar
border-input       // Input kenarlıkları

// Örnekler
❌ className="bg-white text-black"
✅ className="bg-card text-foreground"

❌ className="bg-gray-100 text-gray-600"
✅ className="bg-muted text-muted-foreground"

❌ className="border-gray-300"
✅ className="border-border"
```

**globals.css Dark Theme Ayarları:**
Dark tema için şu değer aralıklarını kullan:
- `--background`: 222 47% 6-10% (ana arka plan - çok koyu)
- `--card`: 222 47% 10-14% (kartlar - koyu)
- `--muted`: 217 33% 16-20% (vurgulu alanlar - orta koyu)
- `--muted-foreground`: 215 20% 70-80% (ikincil yazılar - açık gri)
- `--border`: 217 33% 20-25% (kenarlıklar - orta)

**Renk Kontrast Kuralları:**
- Arka plan ile yazı arasında en az %70 kontrast olmalı
- Koyu arka planda açık yazı (text-foreground: 98%)
- Açık arka planda koyu yazı (text-foreground: 4%)
- İkincil yazılar (muted-foreground) %70-80 aralığında

### 3. **Animasyon Prensipleri**
```typescript
// Framer Motion kullan
import { motion, AnimatePresence } from "framer-motion";

// Smooth transitions
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>

// Stagger animations
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

// Hover effects
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

### 4. **Responsive Design**
```typescript
// Mobile-first approach
className="text-sm md:text-base lg:text-lg"
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
className="p-4 md:p-6 lg:p-8"

// Breakpoints
sm: 640px   // Mobile landscape
md: 768px   // Tablet
lg: 1024px  // Desktop
xl: 1280px  // Large desktop
```

### 5. **Component Yapısı**
```typescript
// Her component şu yapıda olmalı:
"use client"; // Client component ise

import { useState } from "react";
import { motion } from "framer-motion";

interface ComponentProps {
  // Props tanımları
}

export function Component({ ...props }: ComponentProps) {
  // State ve hooks
  // Event handlers
  // Render
  return (
    <motion.div>
      {/* Content */}
    </motion.div>
  );
}
```

## Talimatlar

### Adım 1: Projeyi Analiz Et
1. Mevcut teknoloji stack'ini kontrol et
2. Tailwind config'i ve globals.css'i incele
3. Dark mode implementasyonunu kontrol et
4. Mevcut component pattern'lerini gözlemle

### Adım 2: Component Tasarımı
1. **Semantic HTML kullan**: `<button>`, `<nav>`, `<main>`, `<article>`
2. **Accessibility ekle**: `aria-label`, `role`, keyboard navigation
3. **Loading states**: Skeleton loaders, spinners
4. **Error states**: Error boundaries, fallback UI
5. **Empty states**: Placeholder content

### Adım 3: Styling
1. **Tailwind utility classes kullan**
2. **Dark mode için CSS variables kullan**
3. **Consistent spacing**: 4px grid system (p-4, m-4, gap-4)
4. **Rounded corners**: rounded-lg, rounded-xl, rounded-2xl
5. **Shadows**: shadow-sm, shadow-md, shadow-lg

### Adım 4: Animasyonlar
1. **Entrance animations**: fade in, slide in
2. **Exit animations**: fade out, slide out
3. **Hover effects**: scale, color change
4. **Loading animations**: pulse, spin
5. **Gesture animations**: drag, swipe

### Adım 5: Performance
1. **Lazy loading**: `next/dynamic`, `React.lazy`
2. **Image optimization**: `next/image`
3. **Code splitting**: Dynamic imports
4. **Memoization**: `useMemo`, `useCallback`, `React.memo`
5. **Debounce/Throttle**: Input handlers

### Adım 6: Testing & Validation
1. **TypeScript errors**: Tüm type errors'ı düzelt
2. **Build test**: `npm run build` çalıştır
3. **Dark mode test**: Her iki temada test et
4. **Responsive test**: Farklı ekran boyutlarında test et
5. **Accessibility test**: Keyboard navigation, screen readers

## Örnekler

### Örnek 1: Animasyonlu Card Component
```typescript
"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface CardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function AnimatedCard({ title, description, icon }: CardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="bg-card border border-border rounded-2xl p-6 cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex items-center gap-3 mb-3"
        animate={{ x: isHovered ? 4 : 0 }}
      >
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        )}
        <h3 className="font-bold text-foreground">{title}</h3>
      </motion.div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}
```

### Örnek 2: Dark Mode Toggle
```typescript
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <motion.button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative w-14 h-8 rounded-full bg-muted border border-border"
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute top-1 left-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
        animate={{ x: theme === "dark" ? 24 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {theme === "dark" ? (
          <Moon className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Sun className="w-4 h-4 text-primary-foreground" />
        )}
      </motion.div>
    </motion.button>
  );
}
```

### Örnek 3: Staggered List Animation
```typescript
"use client";

import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

export function StaggeredList({ items }: { items: string[] }) {
  return (
    <motion.ul
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-2"
    >
      {items.map((text, i) => (
        <motion.li
          key={i}
          variants={item}
          className="bg-card border border-border rounded-lg p-4"
        >
          {text}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

## Yaygın Hatalar ve Çözümleri

### Hata 1: Dark Mode'da Görünmeyen Yazılar
**Sorun**: Hardcoded renkler veya yetersiz kontrast
```typescript
❌ className="text-gray-600"
✅ className="text-muted-foreground"

❌ className="bg-gray-100 text-gray-700"
✅ className="bg-muted text-foreground"
```

**Çözüm**: CSS variables'ı kontrol et ve yeterli kontrast sağla
```css
/* globals.css - Dark mode için yeterli kontrast */
.dark {
  --muted-foreground: 215 20% 80-90%; /* Daha açık yazılar için 80-90% aralığı */
  --foreground: 210 40% 95-98%;       /* Ana yazılar için 95-98% */
  --card: 222 47% 14-18%;             /* Kartlar için 14-18% */
  --border: 217 33% 25-30%;           /* Border'lar için 25-30% */
}
```

**Renk Badge'leri için özel çözüm**:
- Koyu renklerde (Siyah, Lacivert) yazıyı açıklaştır (lighten)
- Açık renklerde (Sarı, Beyaz) yazıyı koyulaştır (darken)
- useEffect ile dark mode değişikliklerini dinle
- MutationObserver ile tema geçişlerini yakala

### Hata 2: Performans Sorunları
**Sorun**: Çok fazla re-render
```typescript
❌ <motion.div animate={{ x: value }}>
✅ const x = useMotionValue(value);
   <motion.div style={{ x }}>
```

### Hata 3: Layout Shift
**Sorun**: Animasyonlar layout'u bozuyor
```typescript
❌ animate={{ height: "auto" }}
✅ animate={{ height: isOpen ? "auto" : 0 }}
   transition={{ duration: 0.3 }}
```

### Hata 4: Accessibility Eksikliği
**Sorun**: Keyboard navigation yok
```typescript
✅ <button
     onClick={handleClick}
     onKeyDown={(e) => e.key === "Enter" && handleClick()}
     aria-label="Close dialog"
   >
```

## Kontrol Listesi

Her component için:
- [ ] TypeScript types tanımlı
- [ ] Dark mode desteği var
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Animasyonlar smooth ve performanslı
- [ ] Loading states var
- [ ] Error handling var
- [ ] Accessibility (aria labels, keyboard nav)
- [ ] Build başarılı (`npm run build`)
- [ ] Hardcoded renkler yok
- [ ] Console errors yok

## Kaynaklar

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

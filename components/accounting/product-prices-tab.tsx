"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductSize, CostSettings } from "@/lib/types/database";
import { Loader2, Save, DollarSign, Package, Info, Check, BookOpen, Download, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calculateProductCost } from "@/lib/cost-calculator";
import jsPDF from "jspdf";

interface ProductRow {
  productId: string;
  productName: string;
  sizeId?: string;
  sizeName?: string;
  weightGrams: number;
  currentPrice: number | null;
  suggestedPrice: number;
  isSized: boolean;
  costBreakdown: {
    filament: number;
    electricity: number;
    depreciation: number;
    candleholder: number;
    keychain: number;
    soapdish: number;
    total: number;
  };
}

export function ProductPricesTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productSizes, setProductSizes] = useState<ProductSize[]>([]);
  const [costSettings, setCostSettings] = useState<CostSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [initializing, setInitializing] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sb = createClient();
      
      const { data: productsData, error: productsError } = await sb
        .from("products")
        .select("*")
        .order("name");

      if (productsError) throw productsError;

      const { data: sizesData, error: sizesError } = await sb
        .from("product_sizes")
        .select("*")
        .order("sort_order");

      if (sizesError) throw sizesError;

      const { data: settingsData, error: settingsError } = await sb
        .from("cost_settings")
        .select("*")
        .limit(1)
        .single();

      if (settingsError) throw settingsError;

      setProducts(productsData || []);
      setProductSizes(sizesData || []);
      setCostSettings(settingsData);
    } catch (error) {
      console.error("Veri yüklenirken hata:", error);
      toast({
        title: "Hata",
        description: "Veriler yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getProductRows = (): ProductRow[] => {
    if (!costSettings) return [];

    const rows: ProductRow[] = [];

    products.forEach(product => {
      if (product.has_sizes) {
        const sizes = productSizes.filter(s => s.product_id === product.id);
        sizes.forEach(size => {
          const calc = calculateProductCost(
            size.weight_grams,
            costSettings,
            product.is_candleholder,
            product.is_keychain,
            product.is_soapdish
          );

          const suggestedPrice = calc.totalCost * 1.4;

          rows.push({
            productId: product.id,
            productName: product.name,
            sizeId: size.id,
            sizeName: size.size_name,
            weightGrams: size.weight_grams,
            currentPrice: size.price, // Boyutlu ürünlerde size.price kullan
            suggestedPrice,
            isSized: true,
            costBreakdown: {
              filament: calc.rawFilamentCost,
              electricity: calc.electricityCost,
              depreciation: calc.depreciationCost,
              candleholder: product.is_candleholder && costSettings.candleholder_enabled ? costSettings.candleholder_cost_per_unit : 0,
              keychain: product.is_keychain && costSettings.keychain_enabled ? costSettings.keychain_cost_per_unit : 0,
              soapdish: product.is_soapdish && costSettings.soapdish_enabled ? costSettings.soapdish_cost_per_unit : 0,
              total: calc.totalCost,
            },
          });
        });
      } else {
        const calc = calculateProductCost(
          product.weight_grams,
          costSettings,
          product.is_candleholder,
          product.is_keychain,
          product.is_soapdish
        );

        const suggestedPrice = calc.totalCost * 1.4;

        rows.push({
          productId: product.id,
          productName: product.name,
          weightGrams: product.weight_grams,
          currentPrice: product.price, // Boyutsuz ürünlerde product.price kullan
          suggestedPrice,
          isSized: false,
          costBreakdown: {
            filament: calc.rawFilamentCost,
            electricity: calc.electricityCost,
            depreciation: calc.depreciationCost,
            candleholder: product.is_candleholder && costSettings.candleholder_enabled ? costSettings.candleholder_cost_per_unit : 0,
            keychain: product.is_keychain && costSettings.keychain_enabled ? costSettings.keychain_cost_per_unit : 0,
            soapdish: product.is_soapdish && costSettings.soapdish_enabled ? costSettings.soapdish_cost_per_unit : 0,
            total: calc.totalCost,
          },
        });
      }
    });

    return rows;
  };

  const rows = getProductRows();

  const handlePriceChange = (key: string, value: string) => {
    if (value === '' || value === null || value === undefined) {
      // Boş ise state'den kaldır
      setPrices(prev => {
        const newPrices = { ...prev };
        delete newPrices[key];
        return newPrices;
      });
    } else {
      // Değer varsa ekle/güncelle
      setPrices(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const savePrice = async (row: ProductRow) => {
    const key = row.sizeId || row.productId;
    const priceStr = prices[key];
    
    if (!priceStr || priceStr.trim() === "") {
      toast({
        title: "Hata",
        description: "Lütfen geçerli bir fiyat girin",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      toast({
        title: "Hata",
        description: "Lütfen geçerli bir fiyat girin",
        variant: "destructive",
      });
      return;
    }

    setSaving(key);
    try {
      const sb = createClient();
      
      if (row.isSized && row.sizeId) {
        // Boyutlu ürün - product_sizes tablosuna kaydet
        const { error } = await sb
          .from("product_sizes")
          .update({ price })
          .eq("id", row.sizeId);

        if (error) throw error;

        // State'i güncelle
        setProductSizes(prev =>
          prev.map(s => (s.id === row.sizeId ? { ...s, price } : s))
        );
      } else {
        // Boyutsuz ürün - products tablosuna kaydet
        const { error } = await sb
          .from("products")
          .update({ price })
          .eq("id", row.productId);

        if (error) throw error;

        // State'i güncelle
        setProducts(prev =>
          prev.map(p => (p.id === row.productId ? { ...p, price } : p))
        );
      }

      toast({
        title: "Başarılı",
        description: "Fiyat kaydedildi",
      });
    } catch (error) {
      console.error("Fiyat kaydedilirken hata:", error);
      toast({
        title: "Hata",
        description: "Fiyat kaydedilemedi",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const initializeAllPrices = async () => {
    setInitializing(true);
    try {
      const sb = createClient();
      
      // Boyutsuz ürünler için
      const productUpdates = rows
        .filter(r => !r.isSized)
        .map(row => ({
          id: row.productId,
          price: row.suggestedPrice,
        }));

      const uniqueProductUpdates = Array.from(
        new Map(productUpdates.map(u => [u.id, u])).values()
      );

      for (const update of uniqueProductUpdates) {
        const { error } = await sb
          .from("products")
          .update({ price: update.price })
          .eq("id", update.id);

        if (error) throw error;
      }

      // Boyutlu ürünler için
      const sizeUpdates = rows
        .filter(r => r.isSized && r.sizeId)
        .map(row => ({
          id: row.sizeId!,
          price: row.suggestedPrice,
        }));

      for (const update of sizeUpdates) {
        const { error } = await sb
          .from("product_sizes")
          .update({ price: update.price })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Başarılı",
        description: `${uniqueProductUpdates.length} ürün ve ${sizeUpdates.length} boyut fiyatı önerilen fiyat olarak kaydedildi`,
      });

      await loadData();
    } catch (error) {
      console.error("Fiyatlar başlatılırken hata:", error);
      toast({
        title: "Hata",
        description: "Fiyatlar başlatılamadı",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  const getCategoryName = (product: Product): string => {
    if (product.is_candleholder) return "Mumluklar";
    if (product.is_keychain) return "Anahtarlıklar";
    if (product.is_soapdish) return "Sıvı Sabunluklar";
    if (product.is_solid_soap_dish) return "Katı Sabunluklar";
    if (product.is_sugar_bowl) return "Şekerlikler";
    if (product.is_snack_bowl) return "Çerezlikler";
    if (product.is_fruit_bowl) return "Meyvelikler";
    if (product.is_container) return "Kaplar";
    if (product.is_strainer) return "Süzgeçler";
    if (product.is_spice_holder) return "Baharatlıklar";
    if (product.is_towel_holder) return "Havluluklar";
    if (product.is_brush_holder) return "Fırçalıklar";
    
    // Kategorize edilmemiş ürünler
    const name = product.name.toLowerCase();
    if (name.includes("vazo")) return "Vazolar";
    if (name.includes("saksı")) return "Saksılar";
    if (name.includes("tutacak")) return "Tutacaklar";
    
    return "Diğer Ürünler";
  };

  const getCategoryEmoji = (categoryName: string): string => {
    const emojiMap: Record<string, string> = {
      "Mumluklar": "🕯️",
      "Anahtarlıklar": "🔑",
      "Sıvı Sabunluklar": "🧴",
      "Katı Sabunluklar": "🧼",
      "Şekerlikler": "🍬",
      "Çerezlikler": "🥜",
      "Meyvelikler": "🍎",
      "Kaplar": "🥣",
      "Süzgeçler": "🔍",
      "Baharatlıklar": "🌶️",
      "Havluluklar": "🧺",
      "Fırçalıklar": "🪥",
      "Vazolar": "🏺",
      "Saksılar": "🪴",
      "Tutacaklar": "🤏",
      "Diğer Ürünler": "📦",
    };
    return emojiMap[categoryName] || "📦";
  };

  const groupProductsByCategory = () => {
    const grouped: Record<string, ProductRow[]> = {};
    
    rows.forEach(row => {
      const product = products.find(p => p.id === row.productId);
      if (!product) return;
      
      const category = getCategoryName(product);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(row);
    });

    // Kategorileri alfabetik sırala
    return Object.keys(grouped)
      .sort()
      .reduce((acc, key) => {
        acc[key] = grouped[key];
        return acc;
      }, {} as Record<string, ProductRow[]>);
  };

  // Aynı ürünün farklı boyutlarını grupla
  const groupProductSizes = (categoryRows: ProductRow[]) => {
    const productGroups: Record<string, ProductRow[]> = {};
    
    categoryRows.forEach(row => {
      const baseProductId = row.productId;
      if (!productGroups[baseProductId]) {
        productGroups[baseProductId] = [];
      }
      productGroups[baseProductId].push(row);
    });

    return Object.values(productGroups);
  };

  const getCategoryNameClean = (categoryName: string): string => {
    // Emoji'leri ve özel karakterleri temizle
    return categoryName
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C');
  };

  const downloadCatalog = async () => {
    setGeneratingPdf(true);
    
    try {
      toast({
        title: "PDF Oluşturuluyor",
        description: "Lütfen bekleyin, katalog PDF'e dönüştürülüyor...",
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      let yPosition = margin;

      // Başlık sayfası - TAM SAYFA
      pdf.setFillColor(102, 126, 234);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F'); // Tam sayfa gradient
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      const titleText = 'URUN KATALOGU';
      const titleWidth = pdf.getTextWidth(titleText);
      pdf.text(titleText, (pageWidth - titleWidth) / 2, pageHeight / 2 - 30);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      let dateStr = new Date().toLocaleDateString('tr-TR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      // Türkçe karakterleri temizle
      dateStr = dateStr
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C');
      const dateWidth = pdf.getTextWidth(dateStr);
      pdf.text(dateStr, (pageWidth - dateWidth) / 2, pageHeight / 2 - 10);
      
      // KDV uyarısı ekle
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'italic');
      const kdvText = 'KDV Dahil Degildir';
      const kdvWidth = pdf.getTextWidth(kdvText);
      pdf.text(kdvText, (pageWidth - kdvWidth) / 2, pageHeight / 2 + 10);

      // Yeni sayfa - ürünler için
      pdf.addPage();
      yPosition = margin;

      // Kategorilere göre ürünleri işle
      const groupedProducts = groupProductsByCategory();
      
      for (const [category, categoryRows] of Object.entries(groupedProducts)) {
        // Aynı ürünün farklı boyutlarını grupla
        const productGroups = groupProductSizes(categoryRows);
        
        // Kategori ve ürünler için gereken toplam yükseklik
        const categoryHeaderHeight = 22;
        const cardHeight = 75;
        const gap = 5;
        const productsPerRow = 3;
        const rowCount = Math.ceil(productGroups.length / productsPerRow);
        const totalProductsHeight = (rowCount * cardHeight) + ((rowCount - 1) * gap);
        const totalNeededHeight = categoryHeaderHeight + totalProductsHeight + 20;
        
        // Yeni kategori için yeterli yer yoksa yeni sayfa (ama ilk kategoride kontrol etme)
        if (yPosition > margin && yPosition + totalNeededHeight > pageHeight - 20) {
          pdf.addPage();
          yPosition = margin;
        }

        // Kategori başlığı
        pdf.setFillColor(243, 244, 246);
        pdf.roundedRect(margin, yPosition, contentWidth, 15, 3, 3, 'F');
        
        pdf.setDrawColor(102, 126, 234);
        pdf.setLineWidth(1);
        pdf.line(margin, yPosition, margin, yPosition + 15);
        
        pdf.setTextColor(31, 41, 55);
        pdf.setFont('helvetica', 'bold');
        
        // Kategori ismini temizle (ürün sayısı olmadan)
        const cleanCategory = getCategoryNameClean(category);
        pdf.setFontSize(16);
        pdf.text(cleanCategory, margin + 5, yPosition + 10);
        
        yPosition += 22;

        // Ürünleri 3 sütunda göster
        const cardWidth = (contentWidth - 10) / productsPerRow;

        for (let i = 0; i < productGroups.length; i++) {
          const productGroup = productGroups[i];
          const firstRow = productGroup[0];
          const product = products.find(p => p.id === firstRow.productId);
          const hasMultipleSizes = productGroup.length > 1;
          
          // Ürün adını temizle
          let displayName = hasMultipleSizes 
            ? firstRow.productName // Çoklu boyut: sadece ürün adı
            : (firstRow.sizeName ? `${firstRow.productName} (${firstRow.sizeName})` : firstRow.productName); // Tek boyut: boyut bilgisi ile
          
          displayName = displayName
            .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
            .replace(/ü/g, 'u').replace(/Ü/g, 'U')
            .replace(/ş/g, 's').replace(/Ş/g, 'S')
            .replace(/ı/g, 'i').replace(/İ/g, 'I')
            .replace(/ö/g, 'o').replace(/Ö/g, 'O')
            .replace(/ç/g, 'c').replace(/Ç/g, 'C');

          const col = i % productsPerRow;
          const xPosition = margin + (col * (cardWidth + gap));

          // Yeni satır için yeterli yer yoksa yeni sayfa
          if (col === 0 && yPosition > pageHeight - cardHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }

          // Ürün kartı arka planı
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(xPosition, yPosition, cardWidth, cardHeight, 2, 2, 'FD');

          // Ürün resmi alanı
          const imageSize = 48;
          const imageX = xPosition + (cardWidth - imageSize) / 2;
          const imageY = yPosition + 5;
          
          if (product?.image_url) {
            try {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  try {
                    // Aspect ratio koruyarak boyutlandır
                    const imgAspect = img.width / img.height;
                    let drawWidth = imageSize;
                    let drawHeight = imageSize;
                    let drawX = imageX;
                    let drawY = imageY;
                    
                    if (imgAspect > 1) {
                      // Yatay resim - genişliğe göre ayarla
                      drawHeight = imageSize / imgAspect;
                      drawY = imageY + (imageSize - drawHeight) / 2;
                    } else {
                      // Dikey resim - yüksekliğe göre ayarla
                      drawWidth = imageSize * imgAspect;
                      drawX = imageX + (imageSize - drawWidth) / 2;
                    }
                    
                    pdf.addImage(img, 'PNG', drawX, drawY, drawWidth, drawHeight);
                    resolve(true);
                  } catch (e) {
                    reject(e);
                  }
                };
                img.onerror = reject;
                img.src = product.image_url || '';
              }).catch(() => {
                pdf.setFillColor(249, 250, 251);
                pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
              });
            } catch (error) {
              pdf.setFillColor(249, 250, 251);
              pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
            }
          } else {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(imageX, imageY, imageSize, imageSize, 'F');
          }

          // Ürün adı
          pdf.setTextColor(31, 41, 55);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          const nameLines = pdf.splitTextToSize(displayName, cardWidth - 6);
          const displayLines = nameLines.slice(0, 2);
          
          let textY = imageY + imageSize + 4;
          displayLines.forEach((line: string) => {
            const lineWidth = pdf.getTextWidth(line);
            const lineX = xPosition + (cardWidth - lineWidth) / 2;
            pdf.text(line, lineX, textY);
            textY += 4;
          });

          // Fiyat gösterimi - tek veya çoklu boyut
          if (hasMultipleSizes) {
            // Çoklu boyut: küçük yazı ile liste (bold)
            pdf.setFontSize(7.5);
            pdf.setFont('helvetica', 'bold'); // Normal'den bold'a değiştirildi
            pdf.setTextColor(102, 126, 234);
            
            textY += 2;
            productGroup.forEach((sizeRow) => {
              if (sizeRow.currentPrice !== null) {
                const priceValue = sizeRow.currentPrice.toFixed(2).replace('.', ',');
                const sizeText = sizeRow.sizeName 
                  ? `${sizeRow.sizeName}: ${priceValue} TL`
                  : `${priceValue} TL`;
                
                const sizeTextWidth = pdf.getTextWidth(sizeText);
                const sizeX = xPosition + (cardWidth - sizeTextWidth) / 2;
                pdf.text(sizeText, sizeX, textY);
                textY += 3.5;
              }
            });
          } else {
            // Tek boyut: büyük fiyat gösterimi (eski tasarım)
            const row = productGroup[0];
            if (row.currentPrice !== null) {
              pdf.setTextColor(102, 126, 234);
              pdf.setFontSize(14);
              pdf.setFont('helvetica', 'bold');
              const priceValue = row.currentPrice.toFixed(2).replace('.', ',');
              const priceText = `${priceValue} TL`;
              const priceWidth = pdf.getTextWidth(priceText);
              const priceX = xPosition + (cardWidth - priceWidth) / 2;
              pdf.text(priceText, priceX, yPosition + cardHeight - 5);
            } else {
              pdf.setTextColor(156, 163, 175);
              pdf.setFontSize(8);
              pdf.setFont('helvetica', 'italic');
              const nopriceText = 'Fiyat belirlenmemis';
              const nopriceWidth = pdf.getTextWidth(nopriceText);
              const nopriceX = xPosition + (cardWidth - nopriceWidth) / 2;
              pdf.text(nopriceText, nopriceX, yPosition + cardHeight - 5);
            }
          }

          // Satır sonu kontrolü
          if (col === productsPerRow - 1 || i === productGroups.length - 1) {
            yPosition += cardHeight + gap;
          }
        }

        yPosition += 5; // Kategoriler arası boşluk
      }

      // Sayfa numaraları ekle
      const pageCount = pdf.internal.pages.length - 1;
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        const pageText = `Sayfa ${i} / ${pageCount}`;
        const pageTextWidth = pdf.getTextWidth(pageText);
        pdf.text(pageText, (pageWidth - pageTextWidth) / 2, pageHeight - 10);
      }

      // PDF'i indir
      const fileName = `urun-katalogu-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Basarili",
        description: "Katalog PDF olarak indirildi",
      });
    } catch (error) {
      console.error('PDF olusturma hatasi:', error);
      toast({
        title: "Hata",
        description: "PDF olusturulurken bir hata olustu",
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const saveAllPrices = async () => {
    const pricesToSave = Object.entries(prices).filter(([_, value]) => value && parseFloat(value) > 0);
    
    if (pricesToSave.length === 0) {
      toast({
        title: "Uyarı",
        description: "Kaydedilecek fiyat bulunamadı",
        variant: "destructive",
      });
      return;
    }

    setInitializing(true);
    try {
      const sb = createClient();
      let savedCount = 0;
      let errorCount = 0;

      for (const [key, priceStr] of pricesToSave) {
        const price = parseFloat(priceStr);
        if (isNaN(price) || price < 0) continue;

        // Key'den row'u bul
        const row = rows.find(r => (r.sizeId || r.productId) === key);
        if (!row) continue;

        try {
          if (row.isSized && row.sizeId) {
            // Boyutlu ürün - product_sizes tablosuna kaydet
            const { error } = await sb
              .from("product_sizes")
              .update({ price })
              .eq("id", row.sizeId);

            if (error) throw error;

            // State'i güncelle
            setProductSizes(prev =>
              prev.map(s => (s.id === row.sizeId ? { ...s, price } : s))
            );
          } else {
            // Boyutsuz ürün - products tablosuna kaydet
            const { error } = await sb
              .from("products")
              .update({ price })
              .eq("id", row.productId);

            if (error) throw error;

            // State'i güncelle
            setProducts(prev =>
              prev.map(p => (p.id === row.productId ? { ...p, price } : p))
            );
          }
          savedCount++;
        } catch (error) {
          console.error(`Fiyat kaydedilirken hata (${key}):`, error);
          errorCount++;
        }
      }

      // Fiyatları temizle
      setPrices({});

      toast({
        title: "Başarılı",
        description: `${savedCount} fiyat kaydedildi${errorCount > 0 ? `, ${errorCount} hata oluştu` : ''}`,
      });
    } catch (error) {
      console.error("Toplu fiyat kaydetme hatası:", error);
      toast({
        title: "Hata",
        description: "Fiyatlar kaydedilirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const hasUnpricedProducts = rows.some(r => r.currentPrice === null);
  const groupedProducts = groupProductsByCategory();

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-500 to-violet-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Ürün Fiyatları</h2>
              <p className="text-sm text-white/80">Önerilen fiyatlar %40 kar marjı ile hesaplanmıştır</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCatalog(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Katalog Oluştur
            </button>

            <button
              onClick={saveAllPrices}
              disabled={initializing || Object.keys(prices).length === 0}
              className="flex items-center gap-2 bg-green-500/90 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initializing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Tümünü Kaydet {Object.keys(prices).length > 0 && `(${Object.keys(prices).length})`}
            </button>
            
            {hasUnpricedProducts && (
              <button
                onClick={initializeAllPrices}
                disabled={initializing}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {initializing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Tüm Ürünlere Önerilen Fiyatı Uygula
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Katalog Önizleme Modal */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Ürün Kataloğu Önizleme</h2>
                  <p className="text-sm text-muted-foreground">Katalogunu inceleyin ve indirin</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadCatalog}
                  disabled={generatingPdf}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      PDF Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      PDF İndir
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCatalog(false)}
                  disabled={generatingPdf}
                  className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div id="catalog-preview" className="space-y-8">
                {/* Katalog Başlığı */}
                <div className="text-center mb-12 p-8 bg-gradient-to-r from-blue-500 to-violet-600 rounded-2xl text-white">
                  <h1 className="text-4xl font-bold mb-3">Ürün Kataloğu</h1>
                  <p className="text-lg opacity-90">
                    {new Date().toLocaleDateString('tr-TR', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm opacity-80 mt-2">Toplam {products.length} Ürün</p>
                </div>

                {/* Kategoriler */}
                {Object.entries(groupedProducts).map(([category, categoryRows]) => (
                  <div key={category} className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-xl border-l-4 border-blue-500">
                      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <span>{getCategoryEmoji(category)}</span>
                        <span>{category}</span>
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({categoryRows.length} ürün)
                        </span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categoryRows.map((row) => {
                        const key = row.sizeId || row.productId;
                        const product = products.find(p => p.id === row.productId);
                        const displayName = row.sizeName 
                          ? `${row.productName} (${row.sizeName})`
                          : row.productName;

                        return (
                          <div
                            key={key}
                            className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-shadow"
                          >
                            {/* Ürün Resmi */}
                            {product?.image_url ? (
                              <img
                                src={product.image_url}
                                alt={displayName}
                                className="w-full h-48 object-contain rounded-lg bg-muted/30 mb-3"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="16"%3EResim Yok%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="w-full h-48 bg-muted/30 rounded-lg flex items-center justify-center mb-3">
                                <Package className="w-12 h-12 text-muted-foreground/30" />
                              </div>
                            )}

                            {/* Ürün Bilgileri */}
                            <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                              {displayName}
                            </h3>
                            
                            <div className="space-y-1 text-sm text-muted-foreground mb-3">
                              <p>Gramaj: {row.weightGrams} gr</p>
                              {row.currentPrice && (
                                <p className="text-xs">
                                  Maliyet: {formatCurrency(row.costBreakdown.total)}
                                </p>
                              )}
                            </div>

                            {/* Fiyat */}
                            {row.currentPrice !== null ? (
                              <div className="pt-3 border-t border-border">
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {formatCurrency(row.currentPrice)}
                                </p>
                              </div>
                            ) : (
                              <div className="pt-3 border-t border-border">
                                <p className="text-sm text-muted-foreground italic">
                                  Fiyat belirlenmemiş
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ürün
                </th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Gramaj
                </th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    Önerilen Fiyat
                    <Info className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                </th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mevcut Fiyat
                </th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Yeni Fiyat
                </th>
                <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const key = row.sizeId || row.productId;
                const displayName = row.sizeName 
                  ? `${row.productName} (${row.sizeName})`
                  : row.productName;

                return (
                  <tr key={key} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="group relative">
                        <p className="font-medium text-sm text-foreground cursor-pointer">{displayName}</p>
                        
                        {/* Ürün Resmi Tooltip */}
                        {products.find(p => p.id === row.productId)?.image_url && (
                          <div className="absolute left-0 top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <img
                              src={products.find(p => p.id === row.productId)?.image_url || ''}
                              alt={displayName}
                              className="w-full h-auto rounded-lg object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <p className="text-xs text-center text-muted-foreground mt-2">{displayName}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">{row.weightGrams} gr</span>
                    </td>
                    <td className="p-4">
                      <div className="group relative">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 cursor-help">
                          {formatCurrency(row.suggestedPrice)}
                        </span>
                        
                        <div className="absolute left-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <p className="text-xs font-semibold text-foreground mb-2">Maliyet Dökümü ({row.weightGrams} gr):</p>
                          <div className="space-y-2 text-xs">
                            {costSettings && row.costBreakdown.filament > 0 && (
                              <div className="space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Filament:</span>
                                  <span className="text-foreground font-medium">{formatCurrency(row.costBreakdown.filament)}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground pl-2">
                                  {row.weightGrams} gr × (1 + %{costSettings.waste_percentage}) × {formatCurrency(costSettings.filament_price_per_kg)}/kg
                                </div>
                              </div>
                            )}
                            {costSettings && row.costBreakdown.electricity > 0 && (
                              <div className="space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Elektrik:</span>
                                  <span className="text-foreground font-medium">{formatCurrency(row.costBreakdown.electricity)}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground pl-2">
                                  {(row.weightGrams * (1 + costSettings.waste_percentage / 100)).toFixed(1)} gr × {formatCurrency(costSettings.electricity_cost_per_gram)}/gr
                                </div>
                              </div>
                            )}
                            {costSettings && row.costBreakdown.depreciation > 0 && (
                              <div className="space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Yıpranma:</span>
                                  <span className="text-foreground font-medium">{formatCurrency(row.costBreakdown.depreciation)}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground pl-2">
                                  {(row.weightGrams * (1 + costSettings.waste_percentage / 100)).toFixed(1)} gr × {formatCurrency(costSettings.depreciation_cost_per_gram)}/gr
                                </div>
                              </div>
                            )}
                            {costSettings && row.costBreakdown.candleholder > 0 && (
                              <div className="space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Mumluk Ücreti:</span>
                                  <span className="text-foreground font-medium">{formatCurrency(row.costBreakdown.candleholder)}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground pl-2">
                                  1 adet × {formatCurrency(costSettings.candleholder_cost_per_unit)}/adet
                                </div>
                              </div>
                            )}
                            {costSettings && row.costBreakdown.keychain > 0 && (
                              <div className="space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Zincir Ücreti:</span>
                                  <span className="text-foreground font-medium">{formatCurrency(row.costBreakdown.keychain)}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground pl-2">
                                  1 adet × {formatCurrency(costSettings.keychain_cost_per_unit)}/adet
                                </div>
                              </div>
                            )}
                            {costSettings && row.costBreakdown.soapdish > 0 && (
                              <div className="space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Pompa Ücreti:</span>
                                  <span className="text-foreground font-medium">{formatCurrency(row.costBreakdown.soapdish)}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground pl-2">
                                  1 adet × {formatCurrency(costSettings.soapdish_cost_per_unit)}/adet
                                </div>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-border">
                              <span className="text-foreground font-semibold">Toplam Maliyet:</span>
                              <span className="text-foreground font-semibold">{formatCurrency(row.costBreakdown.total)}</span>
                            </div>
                            <div className="flex justify-between text-green-600 dark:text-green-400 pt-1">
                              <span className="font-semibold">+%40 Kar Marjı:</span>
                              <span className="font-semibold">{formatCurrency(row.suggestedPrice - row.costBreakdown.total)}</span>
                            </div>
                            <div className="flex justify-between text-blue-600 dark:text-blue-400 font-bold pt-1 border-t border-border">
                              <span>Önerilen Satış Fiyatı:</span>
                              <span>{formatCurrency(row.suggestedPrice)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {row.currentPrice !== null ? (
                          <>
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(row.currentPrice)}
                            </span>
                            {(() => {
                              const profit = row.currentPrice - row.costBreakdown.total;
                              const profitMargin = (profit / row.costBreakdown.total) * 100;
                              const isLoss = profit < 0;
                              
                              return (
                                <div className={`text-[10px] font-semibold ${isLoss ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {isLoss ? '⚠️ Zarar: ' : '✓ Kar: '}
                                  {formatCurrency(Math.abs(profit))} ({profitMargin > 0 ? '+' : ''}{profitMargin.toFixed(1)}%)
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Fiyat yok</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={prices[key] || ""}
                          onChange={(e) => handlePriceChange(key, e.target.value)}
                          placeholder={formatCurrency(row.suggestedPrice)}
                          className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        />
                        {prices[key] && parseFloat(prices[key]) > 0 && (() => {
                          const newPrice = parseFloat(prices[key]);
                          const profit = newPrice - row.costBreakdown.total;
                          const profitMargin = (profit / row.costBreakdown.total) * 100;
                          const isLoss = profit < 0;
                          
                          return (
                            <div className={`text-[10px] font-semibold ${isLoss ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {isLoss ? '⚠️ Zarar: ' : '✓ Kar: '}
                              {formatCurrency(Math.abs(profit))} ({profitMargin > 0 ? '+' : ''}{profitMargin.toFixed(1)}%)
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => savePrice(row)}
                          disabled={saving === key || !prices[key]}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving === key ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Kaydet
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Henüz ürün eklenmemiş</p>
        </div>
      )}
    </div>
  );
}

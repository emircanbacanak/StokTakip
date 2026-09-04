/**
 * GİB (Gelir İdaresi Başkanlığı) e-Arşiv Portal API Client
 * 
 * https://earsivportal.efatura.gov.tr servisini kullanarak
 * resmi ücretsiz portal üzerinden taslak e-Arşiv faturası oluşturur.
 */

const GIB_DISPATCH_URL = "https://earsivportal.efatura.gov.tr/earsiv-services/dispatch";
const GIB_REFERRER = "https://earsivportal.efatura.gov.tr/intragiris.html";

export interface GibCredentials {
  kullaniciKodu: string;
  parola: string;
}

export interface GibInvoiceItem {
  name: string;
  quantity: number;
  unitPriceWithoutVat: number;
  vatRate: number; // ör: 20
}

export interface GibInvoiceData {
  orderId: string;
  orderNumber: string;
  date: Date;
  customerName: string;
  customerSurname?: string;
  tcknVkn: string;
  taxOffice?: string;
  address: string;
  district?: string;
  city?: string;
  items: GibInvoiceItem[];
  notes?: string;
}

export class GibEArsivClient {
  private token: string | null = null;

  constructor(token?: string) {
    if (token) this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  private async postDispatch(body: Record<string, any>): Promise<any> {
    const params = new URLSearchParams();
    for (const key in body) {
      if (typeof body[key] === "object") {
        params.append(key, JSON.stringify(body[key]));
      } else {
        params.append(key, String(body[key]));
      }
    }

    const res = await fetch(GIB_DISPATCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Referer": GIB_REFERRER,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`GİB Servisi Hatası: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  }

  /**
   * 1. Adım: GİB Kullanıcı Kodu ve Şifre ile Giriş
   */
  public async login(kullaniciKodu: string, parola: string): Promise<{ token: string; requiresSms: boolean }> {
    const params = new URLSearchParams();
    params.append("assoscmd", "anologin");
    params.append("rtype", "json");
    params.append("userid", kullaniciKodu.trim());
    params.append("sifre", parola.trim());
    params.append("sifre2", parola.trim());
    params.append("parola", "1");

    const res = await fetch("https://earsivportal.efatura.gov.tr/earsiv-services/assos-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Referer": GIB_REFERRER,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`GİB Giriş Hatası: ${res.status}`);
    }

    const data = await res.json();
    if (data.error && data.error !== "0") {
      throw new Error(data.messages?.[0]?.text || "GİB Giriş bilgileri hatalı");
    }

    const token = data.token || data.data?.token;
    if (!token) {
      throw new Error(data.messages?.[0]?.text || "GİB Giriş Başarısız. Token alınamadı.");
    }

    this.token = token;
    return { token, requiresSms: false };
  }

  /**
   * 2. Adım: SMS Doğrulama Kodu İsteme (Gerekirse)
   */
  public async sendSmsCode(phone?: string): Promise<boolean> {
    if (!this.token) throw new Error("Giriş token'ı bulunamadı");

    const response = await this.postDispatch({
      callid: Math.random().toString(36).substring(2),
      token: this.token,
      cmd: "EARSIV_PORTAL_SMSSIFRE_GONDER",
      assoscmd: "kullaniciOner",
      telefon: phone || "",
    });

    return !response.error;
  }

  /**
   * 3. Adım: SMS Kodunu Doğrulama
   */
  public async verifySmsCode(smsCode: string): Promise<boolean> {
    if (!this.token) throw new Error("Giriş token'ı bulunamadı");

    const response = await this.postDispatch({
      callid: Math.random().toString(36).substring(2),
      token: this.token,
      cmd: "EARSIV_PORTAL_SMSSIFRE_DOGRULA",
      assoscmd: "smssifredogrula",
      sifre: smsCode.trim(),
    });

    if (response.error || response.data?.sonuc === "0") {
      throw new Error(response.messages?.[0]?.text || "SMS Kodu geçersiz veya süresi dolmuş");
    }

    return true;
  }

  /**
   * 4. Adım: GİB e-Arşiv Fatura Taslağı Oluşturma
   */
  public async createInvoiceDraft(invoice: GibInvoiceData): Promise<{ success: boolean; uuid: string }> {
    if (!this.token) throw new Error("GİB oturumu bulunamadı. Lütfen önce giriş yapın.");

    const now = invoice.date || new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear());
    const faturaTarihi = `${day}/${month}/${year}`;
    
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const saat = `${hours}:${minutes}:${seconds}`;

    let matrah = 0;
    let hesaplananKdv = 0;

    const malHizmetTable = invoice.items.map((item) => {
      const vatRate = item.vatRate || 20;
      const birimFiyat = Number(item.unitPriceWithoutVat.toFixed(2));
      const fiyat = Number((birimFiyat * item.quantity).toFixed(2));
      const kdvTutari = Number((fiyat * (vatRate / 100)).toFixed(2));
      const malHizmetTutari = Number((fiyat + kdvTutari).toFixed(2));

      matrah += fiyat;
      hesaplananKdv += kdvTutari;

      return {
        malHizmet: item.name,
        miktar: item.quantity,
        birim: "C62", // Adet
        birimFiyat: birimFiyat.toFixed(2),
        fiyat: fiyat.toFixed(2),
        iskontoOrani: 0,
        iskontoTutari: "0.00",
        iskontoNedeni: "",
        kdvOrani: String(vatRate),
        kdvTutari: kdvTutari.toFixed(2),
        vergilendirmeCesidi: "",
        malHizmetTutari: malHizmetTutari.toFixed(2),
      };
    });

    matrah = Number(matrah.toFixed(2));
    hesaplananKdv = Number(hesaplananKdv.toFixed(2));
    const vergilerDahilToplam = Number((matrah + hesaplananKdv).toFixed(2));

    const rawTckn = (invoice.tcknVkn || "").replace(/\D/g, "");
    const isCorporate = rawTckn.length === 10;
    const finalTcknVkn = rawTckn.length === 11 || rawTckn.length === 10 ? rawTckn : "11111111111";

    const nameParts = (invoice.customerName || "").trim().split(" ");
    const firstName = invoice.customerSurname 
      ? invoice.customerName 
      : nameParts.slice(0, -1).join(" ") || nameParts[0] || "Trendyol Müşterisi";
    const lastName = invoice.customerSurname || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "");

    const faturaData = {
      faturaUuid: "",
      belgeNumarasi: "",
      faturaTarihi,
      saat,
      paraBirimi: "TRY",
      dovizKuru: "0",
      faturaTipi: "SATIS",
      hangiTip: "5000/30000",
      vknTckn: finalTcknVkn,
      aliciUnvan: isCorporate ? invoice.customerName : "",
      aliciAdi: isCorporate ? "" : firstName,
      aliciSoyadi: isCorporate ? "" : lastName,
      binaAdi: "",
      binaNo: "",
      kapiNo: "",
      kasabaKoy: "",
      mahalleSemtIlce: invoice.district || "Merkez",
      sehir: invoice.city || "İstanbul",
      ulke: "Türkiye",
      vergiDairesi: isCorporate ? invoice.taxOffice || "Vergi Dairesi" : "",
      iadeTable: [],
      ozelMatrahTutari: "0",
      ozelMatrahOrani: 0,
      ozelMatrahVergiTutari: "0",
      vergiCesidi: " ",
      malHizmetTable,
      matrah: matrah.toFixed(2),
      hesaplanankdv: hesaplananKdv.toFixed(2),
      vergilerDahilToplamTutar: vergilerDahilToplam.toFixed(2),
      toplamMasraflar: "0.00",
      toplamIskonto: "0.00",
      odenecekTutar: vergilerDahilToplam.toFixed(2),
      not: invoice.notes || `Trendyol Sipariş No: ${invoice.orderNumber}`,
    };

    const response = await this.postDispatch({
      callid: Math.random().toString(36).substring(2),
      token: this.token,
      cmd: "EARSIV_PORTAL_FATURA_OLUSTUR",
      pageName: "RG_BASITTASLAKLAR",
      jp: JSON.stringify(faturaData),
    });

    if (response.error && response.error !== "0") {
      throw new Error(response.messages?.[0]?.text || response.error.message || "Fatura taslağı oluşturulamadı");
    }

    const uuid = response.data?.faturaUuid || response.data?.uuid || "CREATED";
    return { success: true, uuid };
  }
}

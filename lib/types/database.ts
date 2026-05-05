export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          weight_grams: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          weight_grams?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          weight_grams?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      cost_settings: {
        Row: {
          id: string;
          filament_price_per_kg: number;
          filament_enabled: boolean;
          electricity_cost_per_gram: number;
          electricity_enabled: boolean;
          waste_percentage: number;
          waste_enabled: boolean;
          depreciation_cost_per_gram: number;
          depreciation_enabled: boolean;
          profit_margin_1: number;
          profit_margin_2: number;
          profit_margin_3: number;
          profit_margin_4: number;
          profit_margin_5: number;
          price_rounding_enabled: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          filament_price_per_kg?: number;
          filament_enabled?: boolean;
          electricity_cost_per_gram?: number;
          electricity_enabled?: boolean;
          waste_percentage?: number;
          waste_enabled?: boolean;
          depreciation_cost_per_gram?: number;
          depreciation_enabled?: boolean;
          profit_margin_1?: number;
          profit_margin_2?: number;
          profit_margin_3?: number;
          profit_margin_4?: number;
          profit_margin_5?: number;
          price_rounding_enabled?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          filament_price_per_kg?: number;
          filament_enabled?: boolean;
          electricity_cost_per_gram?: number;
          electricity_enabled?: boolean;
          waste_percentage?: number;
          waste_enabled?: boolean;
          depreciation_cost_per_gram?: number;
          depreciation_enabled?: boolean;
          profit_margin_1?: number;
          profit_margin_2?: number;
          profit_margin_3?: number;
          profit_margin_4?: number;
          profit_margin_5?: number;
          price_rounding_enabled?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      product_costs: {
        Row: {
          id: string;
          product_id: string;
          product_name: string;
          weight_grams: number;
          filament_price_per_kg: number;
          electricity_cost_per_gram: number;
          waste_percentage: number;
          depreciation_cost_per_gram: number;
          raw_filament_cost: number;
          electricity_cost: number;
          waste_cost: number;
          depreciation_cost: number;
          total_cost: number;
          weight_with_waste_grams: number;
          suggested_price_10: number;
          suggested_price_20: number;
          suggested_price_30: number;
          suggested_price_40: number;
          suggested_price_50: number;
          calculated_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          product_id: string;
          product_name: string;
          weight_grams: number;
          filament_price_per_kg: number;
          electricity_cost_per_gram: number;
          waste_percentage: number;
          depreciation_cost_per_gram: number;
          raw_filament_cost: number;
          electricity_cost: number;
          waste_cost: number;
          depreciation_cost: number;
          total_cost: number;
          weight_with_waste_grams: number;
          suggested_price_10: number;
          suggested_price_20: number;
          suggested_price_30: number;
          suggested_price_40: number;
          suggested_price_50: number;
          calculated_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          product_id?: string;
          product_name?: string;
          weight_grams?: number;
          filament_price_per_kg?: number;
          electricity_cost_per_gram?: number;
          waste_percentage?: number;
          depreciation_cost_per_gram?: number;
          raw_filament_cost?: number;
          electricity_cost?: number;
          waste_cost?: number;
          depreciation_cost?: number;
          total_cost?: number;
          weight_with_waste_grams?: number;
          suggested_price_10?: number;
          suggested_price_20?: number;
          suggested_price_30?: number;
          suggested_price_40?: number;
          suggested_price_50?: number;
          calculated_at?: string;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      order_cost_analysis: {
        Row: {
          id: string;
          order_id: string;
          buyer_name: string;
          order_date: string;
          total_items_count: number;
          total_quantity: number;
          total_weight_grams: number;
          total_weight_with_waste_grams: number;
          filament_price_per_kg: number;
          electricity_cost_per_gram: number;
          waste_percentage: number;
          depreciation_cost_per_gram: number;
          total_filament_cost: number;
          total_electricity_cost: number;
          total_waste_cost: number;
          total_depreciation_cost: number;
          total_production_cost: number;
          total_revenue: number;
          total_profit: number;
          profit_margin_percentage: number;
          calculated_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          buyer_name: string;
          order_date: string;
          total_items_count: number;
          total_quantity: number;
          total_weight_grams: number;
          total_weight_with_waste_grams: number;
          filament_price_per_kg: number;
          electricity_cost_per_gram: number;
          waste_percentage: number;
          depreciation_cost_per_gram: number;
          total_filament_cost: number;
          total_electricity_cost: number;
          total_waste_cost: number;
          total_depreciation_cost: number;
          total_production_cost: number;
          total_revenue: number;
          total_profit: number;
          profit_margin_percentage: number;
          calculated_at?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          buyer_name?: string;
          order_date?: string;
          total_items_count?: number;
          total_quantity?: number;
          total_weight_grams?: number;
          total_weight_with_waste_grams?: number;
          filament_price_per_kg?: number;
          electricity_cost_per_gram?: number;
          waste_percentage?: number;
          depreciation_cost_per_gram?: number;
          total_filament_cost?: number;
          total_electricity_cost?: number;
          total_waste_cost?: number;
          total_depreciation_cost?: number;
          total_production_cost?: number;
          total_revenue?: number;
          total_profit?: number;
          profit_margin_percentage?: number;
          calculated_at?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_cost_analysis_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      buyers: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          total_amount: number;
          paid_amount: number;
          status: "pending" | "in_production" | "completed" | "delivered";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          total_amount?: number;
          paid_amount?: number;
          status?: "pending" | "in_production" | "completed" | "delivered";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          total_amount?: number;
          paid_amount?: number;
          status?: "pending" | "in_production" | "completed" | "delivered";
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "buyers";
            referencedColumns: ["id"];
          }
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_name: string;
          color: string;
          quantity: number;
          produced_quantity: number;
          delivered_quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_name: string;
          color: string;
          quantity: number;
          produced_quantity?: number;
          delivered_quantity?: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_name?: string;
          color?: string;
          quantity?: number;
          produced_quantity?: number;
          delivered_quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      deliveries: {
        Row: {
          id: string;
          order_id: string;
          delivery_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          delivery_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          delivery_date?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      delivery_items: {
        Row: {
          id: string;
          delivery_id: string;
          order_item_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          order_item_id: string;
          quantity: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          delivery_id?: string;
          order_item_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_items_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "deliveries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_items_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          delivery_id: string | null;
          amount: number;
          payment_date: string;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          delivery_id?: string | null;
          amount: number;
          payment_date?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          delivery_id?: string | null;
          amount?: number;
          payment_date?: string;
          payment_method?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      colors: {
        Row: {
          id: string;
          name: string;
          usage_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          usage_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          usage_count?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_order_summary: {
        Args: { order_uuid: string };
        Returns: {
          total_amount: number;
          paid_amount: number;
          remaining_amount: number;
          total_items: number;
          delivered_items: number;
          remaining_items: number;
          delivery_count: number;
          payment_count: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Kolay kullanım için tip kısayolları
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

export type CostSettings = Database["public"]["Tables"]["cost_settings"]["Row"];
export type CostSettingsInsert = Database["public"]["Tables"]["cost_settings"]["Insert"];
export type CostSettingsUpdate = Database["public"]["Tables"]["cost_settings"]["Update"];

export type ProductCost = Database["public"]["Tables"]["product_costs"]["Row"];
export type ProductCostInsert = Database["public"]["Tables"]["product_costs"]["Insert"];

export type OrderCostAnalysis = Database["public"]["Tables"]["order_cost_analysis"]["Row"];
export type OrderCostAnalysisInsert = Database["public"]["Tables"]["order_cost_analysis"]["Insert"];

export type Buyer = Database["public"]["Tables"]["buyers"]["Row"];
export type BuyerInsert = Database["public"]["Tables"]["buyers"]["Insert"];

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderItemInsert = Database["public"]["Tables"]["order_items"]["Insert"];
export type OrderItemUpdate = Database["public"]["Tables"]["order_items"]["Update"];

export type Delivery = Database["public"]["Tables"]["deliveries"]["Row"];
export type DeliveryInsert = Database["public"]["Tables"]["deliveries"]["Insert"];

export type DeliveryItem = Database["public"]["Tables"]["delivery_items"]["Row"];
export type DeliveryItemInsert = Database["public"]["Tables"]["delivery_items"]["Insert"];

export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];

export type Color = Database["public"]["Tables"]["colors"]["Row"];

// Genişletilmiş tipler
export type OrderWithDetails = Order & {
  buyer: Buyer;
  items: OrderItem[];
  deliveries?: DeliveryWithItems[];
  payments?: Payment[];
};

export type DeliveryWithItems = Delivery & {
  items: (DeliveryItem & { order_item: OrderItem })[];
  payment?: Payment;
};

export type OrderSummary = {
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  total_items: number;
  delivered_items: number;
  remaining_items: number;
  delivery_count: number;
  payment_count: number;
};

export type OrderStatus = Order["status"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Bekliyor",
  in_production: "Üretimde",
  completed: "Tamamlandı",
  delivered: "Teslim Edildi",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_production: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
};

export const PAYMENT_METHODS = [
  { value: "cash", label: "Nakit" },
  { value: "bank_transfer", label: "Banka Transferi" },
  { value: "credit_card", label: "Kredi Kartı" },
  { value: "check", label: "Çek" },
  { value: "other", label: "Diğer" },
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number]["value"];

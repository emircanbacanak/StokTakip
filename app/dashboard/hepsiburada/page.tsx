"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { HepsiburadaTabs } from "@/components/hepsiburada/hepsiburada-tabs";

export default function HepsiburadaPage() {
  return (
    <DashboardLayout
      title="Hepsiburada Yönetimi"
      subtitle="Komisyon hesaplayıcı ve anlaşmalı kargo fiyatları"
      maxWidth="max-w-7xl"
    >
      <HepsiburadaTabs />
    </DashboardLayout>
  );
}


"use client";

import { useState } from "react";
import { BarChart2, Calculator } from "lucide-react";
import { AccountingOverviewTab } from "./accounting-overview-tab";
import { CostAnalysisTab } from "./cost-analysis-tab";

const tabs = [
  { id: "overview", label: "Genel Bakış", icon: BarChart2 },
  { id: "cost-analysis", label: "Maliyet Analizi", icon: Calculator },
];

export function AccountingClient() {
  const [activeTab, setActiveTab] = useState<"overview" | "cost-analysis">("overview");

  return (
    <div className="min-h-screen bg-muted/30 p-4 lg:p-8 pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 border border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-md shadow-blue-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <AccountingOverviewTab />}
        {activeTab === "cost-analysis" && <CostAnalysisTab />}
      </div>
    </div>
  );
}

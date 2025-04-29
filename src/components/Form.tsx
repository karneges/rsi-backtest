import React, { useState } from "react";
import { CustomLogicInput } from "./CustomLogicInput";

interface FormData {
  leverage: number;
  longEntryRsi: number;
  longExitRsi: number;
  shortEntryRsi: number;
  shortExitRsi: number;
  fixedPositionSize: number;
  addPositionSize: number;
  minProfitPercent: number;
  closeStrategy: "rsi" | "profit";
  breakEvenThreshold: number;
  maxLossEntries: number;
  positionAddDelay: number;
  symbol: string;
  atrTradeMultiplier: number;
  timeframe: string;
  limit: number;
  cacheTTL: number;
  rsiPeriod: number;
  atrPeriod: number;
  avgAtrPeriod: number;
  customLongPositionLogic: string;
  customShortPositionLogic: string;
}

interface FormProps {
  onSubmit: (data: FormData) => void;
}

export const Form: React.FC<FormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<FormData>({
    leverage: 1,
    longEntryRsi: 30,
    longExitRsi: 70,
    shortEntryRsi: 70,
    shortExitRsi: 30,
    fixedPositionSize: 100,
    addPositionSize: 50,
    minProfitPercent: 1,
    closeStrategy: "rsi",
    breakEvenThreshold: 2,
    maxLossEntries: 3,
    positionAddDelay: 3600,
    symbol: "BTC-USDT",
    atrTradeMultiplier: 1.5,
    timeframe: "1h",
    limit: 1000,
    cacheTTL: 3600,
    rsiPeriod: 14,
    atrPeriod: 14,
    avgAtrPeriod: 14,
    customLongPositionLogic: "",
    customShortPositionLogic: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ... existing form fields ... */}

      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Position Logic</h3>

        <CustomLogicInput
          title="Custom Long Position Logic"
          value={formData.customLongPositionLogic}
          onChange={(value) => setFormData({ ...formData, customLongPositionLogic: value })}
        />

        <CustomLogicInput
          title="Custom Short Position Logic"
          value={formData.customShortPositionLogic}
          onChange={(value) => setFormData({ ...formData, customShortPositionLogic: value })}
        />
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Run Backtest
      </button>
    </form>
  );
};

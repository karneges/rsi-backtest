import { RsiTradeBasedModel } from "../models/rsiTradeBasedModel";
import { generateData } from "../services/okx.service";
import { CandlestickWithSubCandlesticksAndRsi, OkxCandlesticksData } from "../types/okx.types";
import { TradeConfig } from "../types";

interface WorkerMessageGenerateData {
  type: "GENERATE_DATA";
  payload: {
    data: OkxCandlesticksData[];
    config: {
      atrPeriod: number;
      rsiPeriod: number;
      avgAtrPeriod: number;
    };
  };
}

interface WorkerMessageBackTest {
  type: "BACK_TEST";
  payload: {
    data: CandlestickWithSubCandlesticksAndRsi[];
    config: TradeConfig;
  };
}

self.addEventListener("message", (event: MessageEvent<WorkerMessageGenerateData | WorkerMessageBackTest>) => {
  if (event.data.type === "GENERATE_DATA") {
    const { data, config } = event.data.payload;

    try {
      const result = generateData(data, config, {
        onTradesGenerationStart: (amountOfFetched: number) => {
          self.postMessage({
            type: "TRADERS_GENERATED_START",
            payload: { amountOfFetched },
          });
        },

        onTradesGenerationProgress: (amountOfTrades: number, totalAmount: number) => {
          self.postMessage({
            type: "TRADERS_GENERATED",
            payload: { amountOfTrades, totalAmount },
          });
        },
      });
      self.postMessage({ type: "SUCCESS_GENERATE_DATA", payload: result });
    } catch (error) {
      self.postMessage({
        type: "ERROR",
        payload: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else if (event.data.type === "BACK_TEST") {
    try {
      const { data, config } = event.data.payload;
      const model = new RsiTradeBasedModel(config, data);
      const result = model.runTradeBasedBacktest();
      self.postMessage({ type: "SUCCESS_BACK_TEST", payload: result });
    } catch (error) {
      self.postMessage({
        type: "ERROR",
        payload: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
});

import { useCallback, useEffect, useRef } from "react";
import { CandlestickWithSubCandlesticksAndRsi, OkxCandlesticksData } from "../types/okx.types";
import { BacktestResult, TradeConfig } from "../types";

interface UseDataWorkerConfig {
  atrPeriod: number;
  rsiPeriod: number;
  avgAtrPeriod: number;
}

interface UseDataWorkerResult {
  generateDataAsync: (
    data: OkxCandlesticksData[],
    config: UseDataWorkerConfig,
    callBacks: {
      onTradesGenerationStart: (amountOfTrades: number) => void;
      onTradesGenerationProgress: (amountOfTrades: number, totalAmount: number) => void;
    },
  ) => Promise<CandlestickWithSubCandlesticksAndRsi[]>;
  backTestAsync: (data: CandlestickWithSubCandlesticksAndRsi[], config: TradeConfig) => Promise<BacktestResult>;
  terminate: () => void;
}

export function useDataWorker(): UseDataWorkerResult {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(new URL("../workers/dataWorker.ts", import.meta.url), {
      type: "module",
    });

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const generateDataAsync = useCallback(
    (
      data: OkxCandlesticksData[],
      config: UseDataWorkerConfig,
      callBacks: {
        onTradesGenerationProgress: (amountOfTrades: number, totalAmount: number) => void;
        onTradesGenerationStart: (amountOfTrades: number) => void;
      },
    ) => {
      return new Promise<CandlestickWithSubCandlesticksAndRsi[]>((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error("Worker not initialized"));
          return;
        }

        const handleMessage = (event: MessageEvent) => {
          switch (event.data.type) {
            case "SUCCESS_GENERATE_DATA":
              resolve(event.data.payload);
              workerRef.current?.removeEventListener("message", handleMessage);
              break;
            case "TRADERS_GENERATED":
              callBacks.onTradesGenerationProgress(event.data.payload.amountOfTrades, event.data.payload.totalAmount);
              break;
            case "TRADERS_GENERATED_START":
              callBacks.onTradesGenerationStart(event.data.payload.amountOfFetched);
              break;
            case "ERROR":
              reject(new Error(event.data.payload));
              workerRef.current?.removeEventListener("message", handleMessage);
              break;
            default:
              break;
          }
        };

        workerRef.current.addEventListener("message", handleMessage);
        workerRef.current.postMessage({
          type: "GENERATE_DATA",
          payload: { data, config },
        });
      });
    },
    [],
  );

  const backTestAsync = useCallback((data: CandlestickWithSubCandlesticksAndRsi[], config: TradeConfig) => {
    return new Promise<BacktestResult>((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error("Worker not initialized"));
        return;
      }
      const handleMessage = (event: MessageEvent) => {
        switch (event.data.type) {
          case "SUCCESS_BACK_TEST":
            resolve(event.data.payload);
            workerRef.current?.removeEventListener("message", handleMessage);
            break;

          case "ERROR":
            reject(new Error(event.data.payload));
            workerRef.current?.removeEventListener("message", handleMessage);
            break;
          default:
            break;
        }
      };

      workerRef.current.addEventListener("message", handleMessage);
      workerRef.current.postMessage({
        type: "BACK_TEST",
        payload: { data, config },
      });
    });
  }, []);

  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return { generateDataAsync, terminate, backTestAsync };
}

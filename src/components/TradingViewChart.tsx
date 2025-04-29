import React, { useEffect, useRef } from "react";
import { BacktestResult } from "../types";
import { CandlestickWithSubCandlesticksAndRsi } from "../types/okx.types";
import {
  IChartingLibraryWidget,
  ChartingLibraryWidgetOptions,
  ResolutionString,
} from "../charting-library/charting_library";
import { widget } from "../charting-library/charting_library.esm.js";

interface TradingViewChartProps {
  result: BacktestResult;
  historicalData: CandlestickWithSubCandlesticksAndRsi[];
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ result, historicalData }) => {
  const { config } = result;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<IChartingLibraryWidget | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const datafeed = {
      onReady: (callback: any) => {
        setTimeout(
          () =>
            callback({
              supported_resolutions: ["1", "5", "15", "30", "60", "240", "1D"],
              supports_marks: true,
              supports_timescale_marks: true,
              supports_time: true,
            }),
          0,
        );
      },
      searchSymbols: () => {},
      resolveSymbol: (symbolName: string, onSymbolResolvedCallback: any) => {
        setTimeout(
          () =>
            onSymbolResolvedCallback({
              name: config.symbol,
              full_name: config.symbol,
              description: config.symbol,
              type: "crypto",
              session: "24x7",
              timezone: "exchange",
              ticker: config.symbol,

              minmov: 1,
              pricescale: 100000,
              has_intraday: true,
              intraday_multipliers: ["1", "5", "15", "30", "60", "240"],
              supported_resolutions: ["1", "5", "15", "30", "60", "240", "1D"],
              volume_precision: 8,
              data_status: "streaming",
            }),
          0,
        );
      },
      getBars: (
        symbolInfo: any,
        resolution: string,
        periodParams: any,
        onHistoryCallback: any,
        onErrorCallback: any,
      ) => {
        try {
          const { from, to, firstDataRequest } = periodParams;

          // Filter bars based on the requested time range
          const bars = historicalData
            .filter((candle) => {
              const candleTime = candle.timestamp;
              return candleTime >= from * 1000 && candleTime <= to * 1000;
            })
            .map((candle) => ({
              time: candle.timestamp,
              open: candle.openPrice,
              high: candle.highPrice,
              low: candle.lowPrice,
              close: candle.closePrice,
              volume: candle.volume,
            }));

          const noData = bars.length === 0;

          // For the first request, if we have no data, it means we're done
          if (firstDataRequest && noData) {
            onHistoryCallback([], { noData: true });
            return;
          }

          onHistoryCallback(bars, {
            noData: noData,
            nextTime: noData ? undefined : bars[0].time / 1000,
          });
        } catch (error) {
          console.error("Error in getBars:", error);
          onErrorCallback(error);
        }
      },
      subscribeBars: () => {},
      unsubscribeBars: () => {},
    };

    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol: config.symbol,
      interval: config.timeframe.replace("m", "") as ResolutionString,
      container: "tv_chart_container",
      library_path: "/rsi-backtest/charting-library/",
      locale: "en",
      timezone: "Europe/Moscow",
      disabled_features: [
        "use_localstorage_for_settings",
        "header_symbol_search",
        "header_screenshot",
        "header_compare",
        "header_undo_redo",
        "show_logo_on_all_charts",
        "header_settings",
        "header_chart_type",
        "header_indicators",
        "header_compare",
        "header_screenshot",
        "timeframes_toolbar",
        "volume_force_overlay",
      ],
      enabled_features: [
        "hide_left_toolbar_by_default",
        "create_volume_indicator_by_default",
        "use_localstorage_for_settings",
        "support_multicharts",
        "drawing_templates",
        "multiple_watchlists",
        "study_templates",
        "show_chart_property_page",
        "show_object_tree",
        "property_pages",
        "legend_widget",
        "trading_account_manager",
        "high_density_bars",
        "study_dialog_search_control",
        "scales_date_format",
        "caption_buttons_text_if_possible",
        "control_bar",
        "edit_buttons_in_legend",
        "context_menus",
        "border_around_the_chart",
        "chart_property_page_background",
        "chart_property_page_style",
        "chart_property_page_scales",
        "chart_property_page_trading",
        "chart_property_page_right_margin_editor",
        "countdown",
        "display_market_status",
        "remove_library_container_border",
        "chart_zoom",
        "side_toolbar_in_fullscreen_mode",
        "header_in_fullscreen_mode",
        "header_widget",
        "header_widget_dom_node",
        "header_saveload",
        "header_resolutions",
        "header_interval_dialog_button",
        "show_interval_dialog_on_key_press",
        "header_symbol_search",
        "header_chart_type",
        "header_settings",
        "header_indicators",
        "header_compare",
        "header_undo_redo",
        "header_screenshot",
        "header_fullscreen_button",
        "symbol_info",
        "timeframes_toolbar",
        "go_to_date",
        "adaptive_logo",
        "show_dom_first_time",
        "left_toolbar",
        "right_toolbar",
        "hide_resolution_in_legend",
        "hide_legend_by_default",
        "volume_force_overlay",
      ],
      charts_storage_url: "",
      client_id: "rsi_model",
      user_id: "user",
      fullscreen: false,
      autosize: true,
      studies_overrides: {
        "Relative Strength Index.length": 14,
        "Relative Strength Index.overbought": config.shortEntryRsi,
        "Relative Strength Index.oversold": config.longEntryRsi,
      },
      theme: "Light",
      loading_screen: { backgroundColor: "#ffffff" },
      // debug: true,
      drawings_access: {
        type: "black",
        tools: [
          { name: "Regression Trend" },
          { name: "Trend Line" },
          { name: "Trend Angle" },
          { name: "Horizontal Line" },
          { name: "Horizontal Ray" },
          { name: "Vertical Line" },
          { name: "Arrow" },
          { name: "Ray" },
          { name: "Extended" },
          { name: "Parallel Channel" },
          { name: "Pitchfork" },
          { name: "Fibonacci Retracement" },
          { name: "Fibonacci Fan" },
          { name: "Fibonacci Arc" },
          { name: "Fibonacci Circle" },
          { name: "Fibonacci Spiral" },
          { name: "Fibonacci Speed Resistance Fan" },
          { name: "Fibonacci Time Zone Extension" },
          { name: "Fibonacci Time Zones" },
          { name: "Rectangle" },
          { name: "Rotated Rectangle" },
          { name: "Ellipse" },
          { name: "Triangle" },
          { name: "Callout" },
          { name: "Anchored Text" },
          { name: "Price Label" },
          { name: "Arrow Mark Up" },
          { name: "Arrow Mark Down" },
          { name: "Flag Mark Up" },
          { name: "Flag Mark Down" },
          { name: "Price Note" },
          { name: "Text" },
        ],
      },
      overrides: {
        "mainSeriesProperties.style": 1,
        "mainSeriesProperties.showCountdown": true,
        "scalesProperties.showStudyLastValue": true,
        "paneProperties.legendProperties.showStudyValues": true,
        "paneProperties.legendProperties.showStudyTitles": true,
        "paneProperties.legendProperties.showStudyArguments": true,
        "paneProperties.legendProperties.showSeriesTitle": true,
        "paneProperties.legendProperties.showSeriesOHLC": true,
        "paneProperties.legendProperties.showBarChange": true,
        "paneProperties.legendProperties.showOnlyPriceSource": true,
      },
      datafeed,
    };

    try {
      const tvWidget = new widget(widgetOptions);
      tvWidgetRef.current = tvWidget;

      tvWidget.onChartReady(() => {
        console.log("Chart is ready");
        // Add RSI indicator with correct study name
        tvWidget.chart().createStudy("Relative Strength Index", false, false, {
          length: config.rsiPeriod,
          overbought: config.shortEntryRsi,
          oversold: config.longEntryRsi,
        });

        // Add ATR indicator
        tvWidget.chart().createStudy("Average True Range", false, false, {
          length: config.atrPeriod,
          color: "#2196F3",
        });

        // Add Average ATR indicator
        tvWidget.chart().createStudy("Moving Average", false, false, {
          length: config.avgAtrPeriod,
          source: "Average True Range",
          color: "#FF9800",
        });

        // Add trade markers if available
        if (result.trades && result.trades.length > 0) {
          const chart = tvWidget.chart();
          const marketCandles: Record<string, boolean> = {};
          result.trades.forEach((trade) => {
            const color = trade.type === "LONG" ? "#26a69a" : "#ef5350";

            // Add entry markers
            trade.entries.forEach((entry, index) => {
              const isInitialEntry = index === 0;

              const candleKey = `${entry.entryCandleTimestamp} + ${isInitialEntry.toString()}`;
              if (marketCandles[candleKey]) {
                debugger;
                return;
              }
              marketCandles[candleKey] = true;
              console.log(entry.entryCandleTimestamp);
              chart.createShape(
                {
                  time: entry.timestamp / 1000,
                  price: entry.price,
                  channel: "trade_markers",
                },
                {
                  shape: trade.type === "LONG" ? "arrow_up" : "arrow_down",
                  text: isInitialEntry ? trade.type : "+",
                  overrides: {
                    color: color,
                    backgroundColor: color,
                    textColor: "#ffffff",
                    fontsize: isInitialEntry ? 14 : 12,
                    bold: isInitialEntry,
                    size: isInitialEntry ? 3 : 2,
                    scale: 1.5,
                    drawBorder: true,
                    borderColor: trade.type === "LONG" ? "#1b7269" : "#a93a35",
                    borderWidth: 1,
                    showLabel: true,
                    showTooltip: true,
                    tooltipColor: "#ffffff",
                    tooltipFontSize: 12,
                    tooltip: `${trade.type} ${isInitialEntry ? "Entry" : "Add"}\nPrice: ${entry.price.toFixed(
                      5,
                    )}\nSize: ${entry.size}`,
                  },
                  zOrder: "top",
                  lock: true,
                  disableSelection: true,
                },
              );
            });

            // Add exit marker if trade is closed
            if (trade.closeTimestamp && trade.closePrice) {
              chart.createShape(
                {
                  time: trade.closeTimestamp / 1000,
                  price: trade.closePrice,
                  channel: "trade_markers",
                },
                {
                  shape: "cross",
                  text: "EXIT",
                  overrides: {
                    color: color,
                    backgroundColor: color,
                    textColor: "#ffffff",
                    fontsize: 14,
                    bold: true,
                    size: 3,
                    scale: 1.5,
                    drawBorder: true,
                    borderColor: trade.type === "LONG" ? "#1b7269" : "#a93a35",
                    borderWidth: 1,
                    showLabel: true,
                    showTooltip: true,
                    tooltipColor: "#ffffff",
                    tooltipFontSize: 12,
                    tooltip: `Exit\nPrice: ${trade.closePrice.toFixed(5)}\nProfit: ${
                      trade.profit?.toFixed(2) ?? "N/A"
                    } (${trade.profitPercent?.toFixed(2) ?? "N/A"}%)`,
                  },
                  zOrder: "top",
                  lock: true,
                  disableSelection: true,
                },
              );
            }
          });
        }
      });
    } catch (error) {
      console.error("Error initializing TradingView widget:", error);
    }

    return () => {
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
        tvWidgetRef.current = null;
      }
    };
  }, [config, historicalData, result.trades]);

  return (
    <div className="tradingview-chart">
      <div id="tv_chart_container" ref={chartContainerRef} style={{ width: "100%", height: "600px" }} />
    </div>
  );
};

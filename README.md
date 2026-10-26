# Multichart Mobile

A thinkorswim-style multi-chart workspace that runs in a phone or desktop browser.

## What it does today

- **Edit layout** mode: tap the + on any side of a panel to add a chart, Level II or Time & Sales there, or remove and change panels
- Resize panels by dragging the bars between them
- Panel types: **Chart**, **Level II** and **Time & Sales**
- Link groups (1–5) keep panels on the same symbol, like thinkorswim's colored link numbers
- **Full** / **Charts only** switch hides the Level II and Time & Sales panels
- Charts: timeframes 1m, 2m, 5m, 15m, 30m, 1h, daily and weekly, with candles, volume and a session VWAP
- Your layout is saved in the browser on each device

All prices are **simulated demo data** for now.

## Running it

Open `index.html` in any browser. There is no build step. Charts use
[Lightweight Charts](https://github.com/tradingview/lightweight-charts) 4.2.0, loaded from jsDelivr.

## Roadmap

1. Register a Schwab developer app (Market Data Production) and wait for approval
2. Add a small private server that signs in to Schwab and streams live quotes, candles, Level II and Time & Sales to the app
3. Save layouts across devices, install to the home screen, then package for the App Store and Google Play

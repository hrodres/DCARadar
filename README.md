# DCA Radar

Herramienta de auditoría táctica mensual para inversores DCA. Analiza señales de mercado (VIX, VSTOXX, Drawdown, SMA200) y determina el nivel de inversión óptimo para el mes.

## Despliegue en Vercel

1. Sube este repositorio a GitHub
2. Conecta el repositorio en [vercel.com](https://vercel.com)
3. Vercel detecta Vite automáticamente — haz clic en Deploy

## Fuentes de datos

| Dato | Fuente | Método |
|---|---|---|
| URTH, SMA200, Drawdown, VIX | Yahoo Finance | Auto-fetch |
| VSTOXX | [live.deutsche-boerse.com](https://live.deutsche-boerse.com/indices/euro-stoxx-50-volatility-vstoxx) | Manual |
| NAV del fondo | Tu proveedor | Manual |

## Stack

- React + Vite
- Vercel (frontend + serverless function)
- Yahoo Finance API (via serverless proxy)

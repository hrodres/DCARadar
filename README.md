# DCA Radar

Herramienta de auditoría táctica mensual para inversores DCA en renta variable global (URTH). Analiza señales de mercado y calcula exactamente cuánto invertir cada mes y cuánto destinar a reserva táctica.

## Qué hace

Cada mes introduces tus datos y la app determina el **nivel de inversión** basándose en cuatro señales simultáneas:

| Señal | Descripción |
|---|---|
| VIX | Índice de volatilidad del S&P 500 |
| VSTOXX | Índice de volatilidad europeo (opcional, manual) |
| Drawdown | Caída desde máximos históricos de URTH |
| Tendencia | URTH por encima o por debajo de su SMA200 |

### Niveles del protocolo

| Nivel | Nombre | Condición | Inversión |
|---|---|---|---|
| **3+** | Crash | VIX pánico + DD severo + bajista | DCA base × 4 |
| **3** | Pleno | VIX pánico + DD moderado + bajista | DCA base × 3 |
| **2** | Refuerzo | VIX/DD elevado + tendencia bajista | DCA base × 2 |
| **0-1** | Base | Mercado normal | DCA base |
| **-1** | Euforia | VIX/VSTOXX bajo + URTH cerca de máximos | DCA base × fracción configurada; resto a reserva si incompleta |

El exceso por encima del DCA base sale de la **reserva táctica** — un colchón de liquidez equivalente a varios meses de DCA base, idealmente en fondo monetario.

### Racionamiento

Si la reserva es baja, el sistema la protege automáticamente:
- **Tier 2**: la operación dejaría la reserva por debajo del 25% del objetivo → exceso reducido a la mitad
- **Tier 3**: la operación agotaría la reserva → se invierte solo el DCA base

## Cómo se usa

### Pestaña Auditoría

1. Pulsa **⟳ Fetch** para cargar URTH, SMA200, Drawdown y VIX automáticamente
2. Introduce el **VSTOXX** manualmente si lo consultas (opcional)
3. Introduce el **saldo actual de tu reserva táctica**
4. Opcionalmente introduce los datos de tu cartera (NAV, capital invertido, participaciones)
5. La app calcula el nivel activo, el importe a invertir y el estado de la reserva tras la operación

### Pestaña Config

Configura tu DCA base mensual, el perfil de multiplicadores (conservador / moderado / agresivo) y los umbrales de las señales.

## Fuentes de datos

| Dato | Fuente | Método |
|---|---|---|
| URTH, SMA200, Drawdown, VIX | Yahoo Finance | Auto-fetch via serverless |
| VSTOXX | [live.deutsche-boerse.com](https://live.deutsche-boerse.com/indices/euro-stoxx-50-volatility-vstoxx) | Manual |
| NAV del fondo | Tu bróker | Manual |

## Despliegue

1. Sube el repositorio a GitHub
2. Conecta en [vercel.com](https://vercel.com)
3. Vercel detecta Vite automáticamente — Deploy

La función serverless `api/market.js` actúa de proxy para evitar restricciones CORS de Yahoo Finance.

## Stack

- React 18 + Vite
- Vitest (tests unitarios de `calc()`)
- Vercel (frontend + serverless function)

## Aviso

Uso personal exclusivamente. No constituye asesoramiento financiero. La inversión en fondos conlleva riesgo de pérdida de capital.

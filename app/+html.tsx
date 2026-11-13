import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * HTML root per export web statico / PWA (solo web).
 * baseUrl `/team` → asset e manifest sotto manager.scaramuzzo.green/team/
 * headNodes/bodyNodes sono obbligatori: contengono i bundle JS dell’export.
 */
const BASE = '/team';

export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html lang="it" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <title>Scaramuzzo Team</title>
        <meta name="application-name" content="Scaramuzzo Team" />
        <meta name="theme-color" content="#140905" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Scaramuzzo Team" />
        <meta
          name="description"
          content="App collaboratori Scaramuzzo: presenze, agenda e statistiche."
        />
        <link rel="manifest" href={`${BASE}/manifest.json`} />
        <link rel="apple-touch-icon" sizes="180x180" href={`${BASE}/apple-touch-icon.png`} />
        <link rel="icon" type="image/png" sizes="192x192" href={`${BASE}/icon-192.png`} />
        <link rel="icon" type="image/png" sizes="512x512" href={`${BASE}/icon-512.png`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`${BASE}/favicon.png`} />
        <link rel="icon" href={`${BASE}/favicon.ico`} />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

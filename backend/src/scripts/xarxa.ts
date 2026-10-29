// fetch amb reintents per als importadors. Els portals de dades obertes de vegades
// tallen una connexió (p. ex. un ConnectTimeoutError puntual) o responen 5xx per
// sobrecàrrega: es reintenta fins a `intents` vegades, amb espera creixent (2 s,
// 4 s…). Els 4xx no es reintenten (l'error és de la petició, no de la xarxa).
export async function fetchAmbReintents(url: string, intents = 3): Promise<Response> {
  for (let intent = 1; ; intent++) {
    try {
      const res = await fetch(url)
      if (res.status < 500 || intent >= intents) return res
      console.warn(`  · ${res.status} de ${new URL(url).host}; reintent ${intent}/${intents - 1}…`)
    } catch (err) {
      if (intent >= intents) throw err
      console.warn(
        `  · error de xarxa (${(err as Error).message}); reintent ${intent}/${intents - 1}…`
      )
    }
    await new Promise((resol) => setTimeout(resol, 2000 * intent))
  }
}

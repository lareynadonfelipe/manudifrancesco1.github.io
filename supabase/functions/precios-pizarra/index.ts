import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

serve(async (req) => {
  // 1) Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    })
  }

  // 2) Fetch de la página
  const res = await fetch('https://www.cac.bcr.com.ar/es/precios-de-pizarra')
  const html = await res.text()
  const $ = cheerio.load(html)

  // 3) Scrapeo de precios ($/ton)
  const data: Record<string, number> = {}
  $('h3').each((_i, el) => {
    const cultivo = $(el).text().trim()
    // descartamos el título general
    if (/Precios|pizarra|día/i.test(cultivo)) return

    // buscamos el siguiente elemento que contenga un "$"
    let sib = $(el).next()
    while (sib.length && !/\$\s*\d/.test(sib.text())) sib = sib.next()
    if (!sib.length) return

    // extraemos sólo el número principal y lo parseamos
    const raw = sib.text().trim().split(/\s+/)[0]
    const num = parseFloat(
      raw
        .replace(/[\$\.]/g, '') // quitamos símbolos y puntos
        .replace(',', '.')      // decimal con coma
    )
    if (!isNaN(num)) data[cultivo] = num
  })

  // 4) Scrapeo de la línea de fecha/hora (exacta)
  // busca el primer nodo que contenga "Rosario,"
  const timestampEl = $('body')
    .find('*')
    .filter((_, el) => $(el).text().includes('Rosario,'))
    .first()

  const timestamp = timestampEl.length
    ? timestampEl.text().trim()
    : ''

  // 5) Devolvemos JSON con CORS
  const payload = {
    timestamp,  // p.ej. "Rosario, 03 de Julio del 2025 - Hora: 10:14 hs."
    prices: data
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})

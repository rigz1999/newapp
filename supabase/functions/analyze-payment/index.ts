import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function parseEuropeanDate(dateStr: string): Date {
  const parts = dateStr.split(/[-\/\.]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileUrls, expectedAmount, dueDate, trancheName, investorName } = await req.json()

    console.log('Analyse du justificatif:', { fileUrls, expectedAmount, dueDate })

    // Construire le contenu avec toutes les images
    const content: any[] = [
      {
        type: 'text',
        text: `Analyse ce justificatif de paiement français (peut contenir plusieurs pages).

Retourne UNIQUEMENT du JSON valide (pas de markdown, pas de code blocks):

{
  "emetteur": "société émettrice",
  "paiements": [
    {
      "beneficiaire": "nom du bénéficiaire",
      "montant": nombre_sans_symbole,
      "date": "JJ-MM-AAAA",
      "reference": "référence du paiement"
    }
  ]
}

CRITIQUE:
- Format date: JJ-MM-AAAA (ex: 05-09-2025 pour 5 septembre 2025)
- Montant: nombre pur sans symbole (ex: 1000.50)
- Extrais TOUS les paiements visibles sur toutes les pages
- Retourne uniquement du JSON valide, aucune explication`
      }
    ];

    // Ajouter toutes les images
    const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
    urls.forEach((url: string) => {
      content.push({
        type: 'image_url',
        image_url: { url, detail: 'high' }
      });
    });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: content
        }],
        max_tokens: 2000,
        temperature: 0.1
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`Erreur OpenAI: ${openaiResponse.statusText} - ${errorText}`)
    }

    const result = await openaiResponse.json()
    let extractedStr = result.choices[0].message.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    const extractedData = JSON.parse(extractedStr)

    const matches = extractedData.paiements.map((paiement: any) => {
      const ecartMontant = Math.abs(paiement.montant - expectedAmount)
      const ecartMontantPourcent = (ecartMontant / expectedAmount) * 100

      const datePaiement = parseEuropeanDate(paiement.date)
      const dateAttendue = parseEuropeanDate(dueDate)
      const ecartJours = Math.abs((datePaiement.getTime() - dateAttendue.getTime()) / (1000 * 60 * 60 * 24))

      let statut = 'pas-de-correspondance'
      let confiance = 0

      if (ecartMontantPourcent < 2 && ecartJours <= 7) {
        statut = 'correspondance'
        confiance = 95
      } 
      else if (ecartMontantPourcent < 5 && ecartJours <= 15) {
        statut = 'correspondance'
        confiance = 85
      }
      else if (ecartMontantPourcent < 10 || ecartJours <= 30) {
        statut = 'partielle'
        confiance = 60
      }
      else {
        statut = 'pas-de-correspondance'
        confiance = 30
      }

      return {
        paiement,
        attendu: {
          montant: expectedAmount,
          dateEcheance: dueDate,
          tranche: trancheName,
          investisseur: investorName
        },
        statut,
        confiance,
        details: {
          ecartMontant: ecartMontant.toFixed(2),
          ecartMontantPourcent: ecartMontantPourcent.toFixed(2),
          ecartJours: Math.round(ecartJours)
        }
      }
    })

    return new Response(
      JSON.stringify({ 
        succes: true, 
        donneesExtraites: extractedData, 
        correspondances: matches 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )

  } catch (error: any) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ 
        succes: false, 
        erreur: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }
})
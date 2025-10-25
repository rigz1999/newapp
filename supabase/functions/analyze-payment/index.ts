import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fonction pour convertir date européenne (DD-MM-YYYY ou DD/MM/YYYY) en objet Date
function parseEuropeanDate(dateStr: string): Date {
  // Accepte DD-MM-YYYY, DD/MM/YYYY, ou DD.MM.YYYY
  const parts = dateStr.split(/[-\/\.]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Mois commence à 0
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr); // Fallback
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileUrl, expectedAmount, dueDate, trancheName, investorName } = await req.json()

    console.log('Analyse du justificatif de paiement:', { fileUrl, expectedAmount, dueDate })

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse ce justificatif de paiement français (virement SEPA ou relevé bancaire).

Extrait TOUS les paiements et retourne UNIQUEMENT du JSON valide (pas de markdown, pas de blocs de code):

{
  "emetteur": "société qui a envoyé le paiement",
  "paiements": [
    {
      "beneficiaire": "personne qui a REÇU l'argent (Nom du bénéficiaire)",
      "montant": montant_numerique_sans_symbole_euro,
      "date": "JJ-MM-AAAA",
      "reference": "référence du paiement",
      "iban": "IBAN du bénéficiaire si visible"
    }
  ]
}

CRITIQUE - FORMAT DES DATES:
- Date au format européen: JJ-MM-AAAA (jour-mois-année)
- Exemple: 05-09-2025 pour le 5 septembre 2025
- JAMAIS au format américain
- Extrais TOUS les bénéficiaires si plusieurs paiements
- Le montant doit être un nombre pur (pas de symbole €)
- Fais attention aux formats français: 1 000,00 € = 1000.00
- Retourne uniquement du JSON valide, aucune explication`
            },
            {
              type: 'image_url',
              image_url: { url: fileUrl, detail: 'high' }
            }
          ]
        }],
        max_tokens: 1000,
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

    // Correspondance de chaque paiement extrait avec les données attendues
    const matches = extractedData.paiements.map((paiement: any) => {
      const ecartMontant = Math.abs(paiement.montant - expectedAmount)
      const ecartMontantPourcent = (ecartMontant / expectedAmount) * 100

      // Parser les dates au format européen
      const datePaiement = parseEuropeanDate(paiement.date)
      const dateAttendue = parseEuropeanDate(dueDate)
      const ecartJours = Math.abs((datePaiement.getTime() - dateAttendue.getTime()) / (1000 * 60 * 60 * 24))

      let statut = 'pas-de-correspondance'
      let confiance = 0

      // Correspondance parfaite: montant à ±2% et date à ±7 jours
      if (ecartMontantPourcent < 2 && ecartJours <= 7) {
        statut = 'correspondance'
        confiance = 95
      } 
      // Bonne correspondance: montant à ±5% et date à ±15 jours
      else if (ecartMontantPourcent < 5 && ecartJours <= 15) {
        statut = 'correspondance'
        confiance = 85
      }
      // Correspondance partielle: montant à ±10% OU date à ±30 jours
      else if (ecartMontantPourcent < 10 || ecartJours <= 30) {
        statut = 'partielle'
        confiance = 60
      }
      // Pas de correspondance
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
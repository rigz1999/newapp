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

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeNameForMatching(str: string): string {
  // Convert to lowercase and remove accents
  let normalized = removeAccents(str.toLowerCase().trim());

  // Remove common honorifics and titles (French)
  const honorifics = /\b(mme|mlle|mlle\.|m\.|m|mr|mr\.|mrs|mrs\.|ms|ms\.|dr|dr\.|prof|prof\.)\b/gi;
  normalized = normalized.replace(honorifics, '');

  // Remove common business suffixes
  const businessSuffixes = /\b(sarl|sas|sa|eurl|sci|sci\.|scop|gie|snc|sca|sem)\b/gi;
  normalized = normalized.replace(businessSuffixes, '');

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

function fuzzyMatch(str1: string, str2: string): number {
  const s1 = normalizeNameForMatching(str1);
  const s2 = normalizeNameForMatching(str2);

  // Exact match after normalization
  if (s1 === s2) return 1.0;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.95;

  const words1 = s1.split(/\s+/).filter(w => w.length > 0);
  const words2 = s2.split(/\s+/).filter(w => w.length > 0);

  // If either has no words after normalization, return 0
  if (words1.length === 0 || words2.length === 0) return 0;

  // Count how many words from the shorter list are found in the longer list
  const shorterWords = words1.length <= words2.length ? words1 : words2;
  const longerWords = words1.length > words2.length ? words1 : words2;

  let exactMatches = 0;
  let partialMatches = 0;

  for (const shortWord of shorterWords) {
    let matched = false;
    for (const longWord of longerWords) {
      if (shortWord === longWord) {
        exactMatches++;
        matched = true;
        break;
      } else if (shortWord.length >= 3 && longWord.length >= 3) {
        // Check for partial matches (one contains the other)
        if (shortWord.includes(longWord) || longWord.includes(shortWord)) {
          partialMatches++;
          matched = true;
          break;
        }
      }
    }
  }

  // Calculate score based on matches
  // Give more weight to exact matches
  const totalMatches = exactMatches + (partialMatches * 0.8);
  const score = totalMatches / shorterWords.length;

  // Boost score if all significant words from shorter name are matched
  if (exactMatches === shorterWords.length) {
    return Math.min(1.0, score + 0.1);
  }

  return Math.min(1.0, score);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base64Images, expectedPayments } = await req.json()

    console.log('Analyse batch:', { imageCount: base64Images?.length, expectedPayments })

    if (!base64Images || (Array.isArray(base64Images) && base64Images.length === 0)) {
      throw new Error('Aucune image fournie')
    }

    const images = Array.isArray(base64Images) ? base64Images : [base64Images]

    console.log('Images à analyser:', images.length)

    // Construire le contenu avec toutes les images
    const content: any[] = [
      {
        type: 'text',
        text: `Analyse ce ou ces justificatifs de paiement français (peuvent contenir plusieurs pages avec plusieurs paiements).

Retourne UNIQUEMENT du JSON valide (pas de markdown, pas de code blocks):

{
  "emetteur": "société émettrice",
  "date_virement": "JJ-MM-AAAA",
  "paiements": [
    {
      "beneficiaire": "nom exact du bénéficiaire",
      "montant": nombre_sans_symbole,
      "date": "JJ-MM-AAAA",
      "reference": "référence du paiement si visible"
    }
  ]
}

CRITIQUE - EXTRAIS TOUS LES PAIEMENTS:
- date_virement: LA DATE DU VIREMENT/ORDRE DE PAIEMENT (cherche "Date", "Date de virement", "Date d'exécution", en haut du document)
- Format date: JJ-MM-AAAA (ex: 05-09-2025 pour 5 septembre 2025)
- Montant: nombre pur sans symbole (ex: 1000.50)
- Extrais TOUS les paiements visibles (peut être 1, 3, 5 ou plus)
- Chaque paiement = une ligne différente dans le tableau
- Retourne uniquement du JSON valide, aucune explication`
      }
    ]

    // Ajouter toutes les images (base64)
    for (const base64 of images) {
      if (base64 && typeof base64 === 'string' && base64.trim() !== '') {
        content.push({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64}` }
        })
      }
    }

    console.log('Appel OpenAI avec', content.length - 1, 'image(s)')

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
        max_tokens: 3000,
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
    
    console.log('Réponse OpenAI:', extractedStr)
    
    const extractedData = JSON.parse(extractedStr)

    console.log(`${extractedData.paiements.length} paiement(s) extrait(s)`)

    // Matcher chaque paiement extrait avec les paiements attendus
    const matches = extractedData.paiements.map((paiement: any) => {
      let bestMatch: any = null;
      let bestScore = 0;

      // Chercher le meilleur match parmi les paiements attendus
      for (const expected of expectedPayments) {
        const nameScore = fuzzyMatch(paiement.beneficiaire, expected.investorName);
        const ecartMontant = Math.abs(paiement.montant - expected.expectedAmount);
        const ecartMontantPourcent = (ecartMontant / expected.expectedAmount) * 100;

        // Score combiné: nom + montant
        let totalScore = nameScore * 70; // 70% sur le nom
        if (ecartMontantPourcent < 5) {
          totalScore += 30; // 30% sur le montant
        } else if (ecartMontantPourcent < 10) {
          totalScore += 15;
        }

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMatch = {
            expected,
            nameScore,
            ecartMontant,
            ecartMontantPourcent
          };
        }
      }

      // Déterminer le statut
      let statut = 'pas-de-correspondance';
      let confiance = 0;

      if (bestMatch) {
        if (bestMatch.nameScore > 0.8 && bestMatch.ecartMontantPourcent < 5) {
          statut = 'correspondance';
          confiance = Math.round(bestScore);
        } else if (bestMatch.nameScore > 0.6 || bestMatch.ecartMontantPourcent < 10) {
          statut = 'partielle';
          confiance = Math.round(bestScore);
        } else {
          confiance = Math.round(bestScore);
        }
      }

      return {
        paiement,
        attendu: bestMatch ? bestMatch.expected : null,
        statut,
        confiance,
        details: bestMatch ? {
          ecartMontant: bestMatch.ecartMontant.toFixed(2),
          ecartMontantPourcent: bestMatch.ecartMontantPourcent.toFixed(2),
          nameScore: (bestMatch.nameScore * 100).toFixed(0)
        } : {}
      };
    });

    console.log('Matches générés:', matches.length)

    return new Response(
      JSON.stringify({ 
        succes: true, 
        donneesExtraites: extractedData, 
        correspondances: matches 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )

  } catch (error: any) {
    console.error('Erreur complète:', error)
    return new Response(
      JSON.stringify({ 
        succes: false, 
        erreur: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }
})
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileUrl, expectedAmount, dueDate, trancheName, investorName } = await req.json()

    console.log('Analyzing payment proof:', { fileUrl, expectedAmount, dueDate })

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
              text: `Analyze this French payment proof (SEPA transfer receipt).

Extract ALL payments and return ONLY valid JSON (no markdown, no code blocks):

{
  "payer": "company who sent payment",
  "payments": [
    {
      "beneficiary": "person who RECEIVED money (Nom du bénéficiaire)",
      "amount": numeric_amount_without_euro_symbol,
      "date": "YYYY-MM-DD",
      "reference": "payment reference text"
    }
  ]
}

CRITICAL:
- Extract ALL beneficiaries if multiple payments
- Amount must be pure number (no € symbol)
- Return valid JSON only, no explanation`
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
      throw new Error(`OpenAI error: ${openaiResponse.statusText} - ${errorText}`)
    }

    const result = await openaiResponse.json()
    let extractedStr = result.choices[0].message.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    const extractedData = JSON.parse(extractedStr)

    const matches = extractedData.payments.map((payment: any) => {
      const amountDiff = Math.abs(payment.amount - expectedAmount)
      const amountDiffPercent = (amountDiff / expectedAmount) * 100

      const paymentDate = new Date(payment.date)
      const expectedDate = new Date(dueDate)
      const daysDiff = Math.abs((paymentDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24))

      let status = 'no-match'
      let confidence = 0

      if (amountDiffPercent < 2 && daysDiff <= 7) {
        status = 'match'
        confidence = 95
      } else if (amountDiffPercent < 5 && daysDiff <= 15) {
        status = 'match'
        confidence = 85
      } else if (amountDiffPercent < 10 || daysDiff <= 30) {
        status = 'partial'
        confidence = 60
      } else {
        status = 'no-match'
        confidence = 30
      }

      return {
        payment,
        expected: {
          amount: expectedAmount,
          dueDate,
          trancheName,
          investorName
        },
        status,
        confidence,
        details: {
          amountDiff: amountDiff.toFixed(2),
          amountDiffPercent: amountDiffPercent.toFixed(2),
          daysDiff: Math.round(daysDiff)
        }
      }
    })

    return new Response(
      JSON.stringify({ success: true, extractedData, matches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }
})
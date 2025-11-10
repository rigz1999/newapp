# 🔧 Fix Rapide: Rappels d'Email qui ne Fonctionnent Pas

## Problème
L'envoi d'email test échoue avec l'erreur CORS:
```
Failed to fetch
Access-Control-Allow-Origin header is missing
```

## Solution en 3 Étapes

### ✅ Étape 1: Déployer la Fonction Edge (5 min)

1. Allez sur: https://supabase.com/dashboard/project/wmgukeonxszbfdrrmkhy/functions

2. Cliquez sur `send-coupon-reminders`

3. Cliquez sur **"Edit"** ou **"Deploy new version"**

4. Remplacez TOUT le code par celui du fichier:
   `/home/user/newapp/supabase/functions/send-coupon-reminders/index.ts`

5. Cliquez **"Deploy"**

### ✅ Étape 2: Vérifier les Variables d'Environnement

Dans Supabase Dashboard → **Settings** → **Edge Functions**

Vérifiez que ces variables existent:

| Variable | Valeur |
|----------|--------|
| `RESEND_API_KEY` | Votre clé API Resend |
| `SUPABASE_URL` | `https://wmgukeonxszbfdrrmkhy.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Votre service role key |

**Si `RESEND_API_KEY` manque:**
1. Allez sur https://resend.com/api-keys
2. Créez une nouvelle API key
3. Ajoutez-la dans Supabase Edge Functions settings

### ✅ Étape 3: Tester

1. Dans votre application, allez sur **Coupons**
2. Cliquez **"Rappels de paiements"**
3. Activez les rappels
4. Sélectionnez au moins une période (7, 14 ou 30 jours)
5. Cliquez **"Email test"**

✅ **Vous devriez recevoir un email de test dans les 2 minutes**

## 🔍 Débogage

### Si l'email ne part toujours pas:

1. **Vérifiez les logs de la fonction:**
   - Dashboard → Edge Functions → `send-coupon-reminders` → Logs
   - Cherchez les erreurs

2. **Vérifiez Resend:**
   - Allez sur https://resend.com/logs
   - Regardez si la requête arrive

3. **Testez la fonction directement:**
   ```bash
   curl -X POST \
     'https://wmgukeonxszbfdrrmkhy.supabase.co/functions/v1/send-coupon-reminders' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"testMode": true, "userId": "YOUR_USER_ID"}'
   ```

## ✅ Changements Effectués

### Code Frontend
- Changé `.single()` → `.maybeSingle()` (fixe erreur 406)

### Fonction Edge
- Ajout headers CORS:
  ```typescript
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  ```
- Gestion requête OPTIONS (CORS preflight)
- Headers CORS sur toutes les réponses

## 📋 Checklist Post-Déploiement

- [ ] Fonction Edge déployée
- [ ] Variable `RESEND_API_KEY` configurée
- [ ] Email test envoyé avec succès
- [ ] Email test reçu dans la boîte mail
- [ ] Rappels automatiques activés (optionnel)

## 🎯 Résultat Attendu

Après le déploiement:
1. ✅ Plus d'erreur CORS
2. ✅ Email test s'envoie
3. ✅ Vous recevez l'email avec le bon format
4. ✅ Les rappels automatiques fonctionnent (7h chaque jour)

## Support

Si le problème persiste après ces étapes:
1. Vérifiez que la fonction Edge est bien déployée (version récente)
2. Regardez les logs Edge Functions pour voir les erreurs
3. Testez avec curl pour isoler le problème

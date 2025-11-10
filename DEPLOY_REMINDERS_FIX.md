# Correction des Rappels de Paiement - Guide de Déploiement

## Problèmes Résolus

1. **Erreur CORS** - `Failed to fetch` lors de l'envoi d'email test
2. **Erreur 406** - Problème lors de la récupération des paramètres de rappel

## Changements Effectués

### 1. Fonction Edge `send-coupon-reminders`
- Ajout des headers CORS appropriés
- Gestion des requêtes OPTIONS (preflight)
- Tous les endpoints retournent maintenant les headers CORS nécessaires

### 2. Frontend `PaymentRemindersModal`
- Changement de `.single()` à `.maybeSingle()` pour éviter l'erreur 406
- Cela permet de gérer correctement le cas où l'utilisateur n'a pas encore de paramètres

## Déploiement Requis

### Option 1: Via la Console Supabase (Recommandé)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Naviguez vers **Edge Functions** dans la barre latérale
4. Cliquez sur la fonction `send-coupon-reminders`
5. Cliquez sur **Deploy from GitHub** ou **Upload Function**
6. Si vous uploadez, sélectionnez le fichier: `supabase/functions/send-coupon-reminders/index.ts`

### Option 2: Via Supabase CLI

Si vous avez le CLI Supabase installé et configuré:

```bash
# Assurez-vous d'être dans le répertoire du projet
cd /path/to/newapp

# Déployez la fonction
supabase functions deploy send-coupon-reminders

# Si vous n'êtes pas authentifié
supabase login
supabase link --project-ref <votre-project-ref>
```

### Option 3: Via GitHub Actions (Si configuré)

Si vous avez configuré GitHub Actions pour le déploiement automatique, les changements seront déployés automatiquement après le merge de la PR.

## Vérification du Déploiement

Après le déploiement, testez la fonctionnalité:

1. Allez dans l'application
2. Naviguez vers la page **Coupons**
3. Cliquez sur **Rappels de paiements**
4. Activez les rappels et sélectionnez au moins une période
5. Cliquez sur **Email test**
6. Vous devriez recevoir un email de test sans erreur CORS

## Variables d'Environnement Requises

Assurez-vous que les variables suivantes sont configurées dans Supabase:

- `RESEND_API_KEY` - Votre clé API Resend pour l'envoi d'emails
- `SUPABASE_URL` - URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clé de rôle service pour accéder aux données

## Logs et Débogage

Pour vérifier les logs de la fonction:

1. Dans la console Supabase, allez dans **Edge Functions**
2. Cliquez sur `send-coupon-reminders`
3. Consultez l'onglet **Logs** pour voir les exécutions récentes

## Support

Si vous rencontrez des problèmes:

1. Vérifiez les logs de la fonction Edge
2. Vérifiez que les variables d'environnement sont correctement configurées
3. Testez l'endpoint directement depuis la console Supabase
4. Consultez la documentation Supabase: https://supabase.com/docs/guides/functions

## Notes Importantes

- Les rappels automatiques sont envoyés chaque jour à 7h00 via pg_cron
- Les utilisateurs doivent activer les rappels dans leurs paramètres
- Au moins une période de rappel (7, 14 ou 30 jours) doit être sélectionnée
- Les emails de test peuvent être envoyés à tout moment depuis l'interface

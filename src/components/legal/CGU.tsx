import { ArrowLeft } from 'lucide-react';

export function CGU() {
  return (
    <div className="min-h-screen bg-finixar-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </a>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Conditions Générales d'Utilisation
          </h1>
          <p className="text-sm text-slate-500">Dernière mise à jour : février 2026</p>
        </div>

        <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">1. Le service</h2>
            <p>
              Finixar est une plateforme SaaS de gestion d'actifs obligataires destinée aux
              professionnels. Elle est éditée par Ayman Zrig, personne physique, joignable à
              support@finixar.com. L'hébergement est assuré par Supabase (AWS Paris, eu-west-3).
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">2. Accès et compte</h2>
            <p>
              L'accès se fait sur invitation par un administrateur d'organisation. L'utilisateur est
              responsable de la sécurité de son compte, de son mot de passe et de son dispositif de
              double authentification (2FA), dont l'activation est obligatoire.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              3. Abonnement et paiement
            </h2>
            <p className="mb-3">
              Finixar propose un essai gratuit d'un mois. Au-delà, un abonnement payant est requis.
            </p>
            <p>
              Les paiements sont traités par <strong>Paddle</strong> (Merchant of Record), qui gère
              la facturation, la TVA et les remboursements. Finixar n'a jamais accès à vos données
              de carte bancaire.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">4. Vos données</h2>
            <p className="mb-3">
              Les données que vous saisissez dans Finixar restent votre propriété. Nous ne les
              utilisons, ne les vendons et ne les partageons pas en dehors de la fourniture du
              service. Vous pouvez les exporter à tout moment depuis vos paramètres.
            </p>
            <p>
              Le traitement des données personnelles est détaillé dans notre{' '}
              <a
                href="/politique-de-confidentialite"
                className="text-slate-900 underline hover:no-underline"
              >
                politique de confidentialité
              </a>
              .
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              5. Limitation de responsabilité
            </h2>
            <p className="mb-3">
              Finixar est un outil de gestion. Les données financières affichées reposent sur les
              informations saisies par l'utilisateur — il lui appartient de les vérifier.
            </p>
            <p>
              Le service est fourni « en l'état ». Notre responsabilité totale est plafonnée au
              montant versé par le client au cours des 12 derniers mois. Nous ne sommes pas
              responsables des dommages indirects (perte de revenus, de données, etc.).
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">6. Résiliation</h2>
            <p className="mb-3">
              Vous pouvez supprimer votre compte à tout moment depuis les paramètres. L'annulation
              de l'abonnement s'effectue via Paddle — l'accès reste actif jusqu'à la fin de la
              période facturée.
            </p>
            <p>
              Nous pouvons suspendre un compte en cas de violation de ces conditions, après
              notification par e-mail.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              7. Dispositions générales
            </h2>
            <p>
              Nous pouvons modifier ces conditions avec un préavis de 30 jours. Tout litige est
              soumis au droit français et relève de la compétence des tribunaux de Paris.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-400">Contact : support@finixar.com</p>
        </div>
      </div>
    </div>
  );
}

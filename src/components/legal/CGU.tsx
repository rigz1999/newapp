import { ArrowLeft, Scale } from 'lucide-react';

export function CGU() {
  return (
    <div className="min-h-screen bg-finixar-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </a>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-slate-900 rounded-xl">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Conditions Générales d'Utilisation
            </h1>
          </div>
          <p className="text-slate-600">
            Les présentes CGU régissent l'utilisation de la plateforme Finixar. En accédant au
            service, vous acceptez l'intégralité de ces conditions.
          </p>
        </div>

        <div className="space-y-8">
          {/* 1. Éditeur et objet */}
          <Section title="1. Éditeur du service">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                Le service Finixar est édité par <strong>Ayman Zrig</strong>, personne physique,
                domicilié à Paris, France.
              </p>
              <p>
                <strong>Contact :</strong> support@finixar.com
              </p>
              <p>
                <strong>Hébergement :</strong> Supabase, Inc. — Infrastructure Amazon Web Services
                (AWS), région Paris (eu-west-3), France.
              </p>
            </div>
          </Section>

          {/* 2. Objet du service */}
          <Section title="2. Objet du service">
            <p className="text-sm text-slate-700 leading-relaxed">
              Finixar est une plateforme SaaS de gestion d'actifs financiers destinée aux
              professionnels. Elle permet la gestion de projets obligataires, le suivi des
              souscriptions, des paiements, des coupons d'intérêts et des investisseurs. Le service
              est accessible sur invitation uniquement.
            </p>
          </Section>

          {/* 3. Accès et inscription */}
          <Section title="3. Accès et inscription">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                L'accès à Finixar se fait exclusivement sur invitation par un administrateur
                d'organisation. L'utilisateur crée son compte en acceptant une invitation par e-mail
                et en définissant un mot de passe conforme à la politique de sécurité (12 caractères
                minimum, incluant majuscules, minuscules, chiffres et caractères spéciaux).
              </p>
              <p>
                L'activation de la double authentification (2FA) est obligatoire pour tous les
                utilisateurs dès la première connexion.
              </p>
              <p>
                L'utilisateur est responsable de la confidentialité de ses identifiants de connexion
                et de son dispositif d'authentification à deux facteurs.
              </p>
            </div>
          </Section>

          {/* 4. Essai gratuit et abonnement */}
          <Section title="4. Essai gratuit et abonnement">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                Finixar propose un essai gratuit d'une durée d'un (1) mois à compter de l'activation
                du compte de l'organisation. À l'issue de cette période, l'accès au service est
                conditionné à la souscription d'un abonnement payant.
              </p>
              <p>
                <strong>Prestataire de paiement :</strong> Les paiements sont traités par{' '}
                <strong>Paddle.com Market Limited</strong> (« Paddle »), qui agit en qualité de
                Merchant of Record (revendeur officiel). À ce titre, Paddle est responsable de la
                facturation, de la collecte des paiements, de la TVA applicable et de l'émission des
                factures.
              </p>
              <p>
                L'éditeur de Finixar n'a pas accès aux données de carte bancaire des utilisateurs,
                qui sont traitées exclusivement par Paddle conformément aux normes PCI-DSS.
              </p>
              <p>
                Les prix, les modalités de paiement et les plans disponibles sont détaillés sur la
                page de tarification du service.
              </p>
            </div>
          </Section>

          {/* 5. Rôles utilisateurs */}
          <Section title="5. Rôles et permissions">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>Finixar distingue trois rôles au sein de chaque organisation :</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>
                  <strong>Administrateur :</strong> gestion complète de l'organisation, des membres,
                  des projets et des paramètres.
                </li>
                <li>
                  <strong>Membre :</strong> accès opérationnel standard aux données de
                  l'organisation.
                </li>
                <li>
                  <strong>Émetteur :</strong> accès limité aux projets qui lui sont assignés.
                </li>
              </ul>
              <p>
                Chaque utilisateur n'accède qu'aux données de sa propre organisation. L'isolation
                des données est assurée au niveau de la base de données (Row Level Security).
              </p>
            </div>
          </Section>

          {/* 6. Propriété des données */}
          <Section title="6. Propriété des données">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                Les données saisies par l'utilisateur dans Finixar (projets, tranches,
                souscriptions, paiements, investisseurs, etc.) restent la{' '}
                <strong>propriété exclusive</strong> de l'organisation cliente.
              </p>
              <p>
                L'éditeur ne revendique aucun droit de propriété sur les données des clients. Il
                s'engage à ne pas utiliser, vendre ou partager ces données à des fins autres que la
                fourniture du service.
              </p>
              <p>
                Conformément au RGPD (Article 20), l'utilisateur peut à tout moment exporter
                l'intégralité de ses données personnelles au format JSON depuis les paramètres de
                son compte.
              </p>
            </div>
          </Section>

          {/* 7. Propriété intellectuelle */}
          <Section title="7. Propriété intellectuelle">
            <p className="text-sm text-slate-700 leading-relaxed">
              L'ensemble des éléments composant la plateforme Finixar (code source, interface,
              design, textes, logos, marques) est protégé par le droit de la propriété
              intellectuelle et appartient à l'éditeur. Toute reproduction, représentation ou
              exploitation non autorisée est interdite.
            </p>
          </Section>

          {/* 8. Disponibilité du service */}
          <Section title="8. Disponibilité du service">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                L'éditeur s'efforce d'assurer la disponibilité du service 24h/24 et 7j/7. Toutefois,
                l'accès peut être temporairement suspendu pour des raisons de maintenance, de mise à
                jour ou en cas de force majeure, sans que cela ouvre droit à indemnisation.
              </p>
              <p>
                Le service est fourni « en l'état » (as is). L'éditeur ne garantit pas l'absence
                d'interruptions, d'erreurs ou de défauts.
              </p>
            </div>
          </Section>

          {/* 9. Limitation de responsabilité */}
          <Section title="9. Limitation de responsabilité">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                <strong>Données financières :</strong> Finixar est un outil de gestion. Les données
                financières affichées (montants, calculs de coupons, échéanciers) sont fournies à
                titre informatif et sur la base des informations saisies par l'utilisateur.
                L'éditeur ne saurait être tenu responsable de l'exactitude des calculs ou des
                décisions prises sur la base de ces données. L'utilisateur reste seul responsable de
                la vérification de ses données.
              </p>
              <p>
                <strong>Plafond de responsabilité :</strong> En tout état de cause, la
                responsabilité totale de l'éditeur au titre du service est limitée au montant des
                sommes effectivement versées par le client au cours des douze (12) derniers mois
                précédant l'événement donnant lieu à responsabilité.
              </p>
              <p>
                <strong>Dommages indirects :</strong> L'éditeur ne pourra en aucun cas être tenu
                responsable des dommages indirects, y compris mais sans s'y limiter : perte de
                bénéfices, perte de données, perte de chiffre d'affaires, préjudice commercial ou
                atteinte à la réputation.
              </p>
            </div>
          </Section>

          {/* 10. Résiliation */}
          <Section title="10. Résiliation">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                <strong>Par l'utilisateur :</strong> L'utilisateur peut supprimer son compte à tout
                moment depuis les paramètres de l'application. La suppression entraîne l'effacement
                de ses données personnelles, sous réserve des obligations légales de conservation
                (données financières conservées 10 ans conformément au Code de commerce, Art.
                L123-22).
              </p>
              <p>
                <strong>Abonnement :</strong> L'annulation de l'abonnement s'effectue via le portail
                de gestion Paddle. L'accès au service reste actif jusqu'à la fin de la période de
                facturation en cours. Aucun remboursement au prorata n'est effectué pour la période
                restante, sauf disposition contraire de Paddle.
              </p>
              <p>
                <strong>Par l'éditeur :</strong> L'éditeur se réserve le droit de suspendre ou
                résilier l'accès d'un utilisateur en cas de violation des présentes CGU,
                d'utilisation frauduleuse ou d'atteinte à la sécurité du service, après notification
                par e-mail dans un délai raisonnable sauf urgence.
              </p>
            </div>
          </Section>

          {/* 11. Protection des données */}
          <Section title="11. Protection des données personnelles">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                Le traitement des données personnelles est détaillé dans notre{' '}
                <a
                  href="/politique-de-confidentialite"
                  className="text-finixar-brand-blue underline hover:no-underline"
                >
                  politique de confidentialité
                </a>
                .
              </p>
              <p>
                En cas de réclamation relative à vos données personnelles, vous pouvez contacter la
                CNIL : 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 —{' '}
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-finixar-brand-blue underline hover:no-underline"
                >
                  www.cnil.fr
                </a>
              </p>
            </div>
          </Section>

          {/* 12. Modifications */}
          <Section title="12. Modifications des CGU">
            <p className="text-sm text-slate-700 leading-relaxed">
              L'éditeur se réserve le droit de modifier les présentes CGU à tout moment. En cas de
              modification substantielle, les utilisateurs seront informés par e-mail ou par
              notification dans l'application au moins trente (30) jours avant l'entrée en vigueur
              des nouvelles conditions. La poursuite de l'utilisation du service après cette date
              vaut acceptation des CGU modifiées.
            </p>
          </Section>

          {/* 13. Droit applicable */}
          <Section title="13. Droit applicable et juridiction">
            <p className="text-sm text-slate-700 leading-relaxed">
              Les présentes CGU sont régies par le droit français. En cas de litige relatif à
              l'interprétation ou à l'exécution des présentes, les parties s'engagent à rechercher
              une solution amiable. À défaut, les tribunaux compétents de Paris seront seuls
              compétents.
            </p>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">Dernière mise à jour : Février 2026</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

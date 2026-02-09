import { ArrowLeft, Scale } from 'lucide-react';

export function MentionsLegales() {
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
            <h1 className="text-3xl font-bold text-slate-900">Mentions légales</h1>
          </div>
          <p className="text-slate-600">
            Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance
            dans l'économie numérique (LCEN).
          </p>
        </div>

        <div className="space-y-8">
          {/* Éditeur du site */}
          <Section title="1. Éditeur du site">
            <dl className="space-y-3">
              <InfoRow label="Raison sociale" value="Finixar SAS" />
              <InfoRow label="Forme juridique" value="Société par Actions Simplifiée (SAS)" />
              <InfoRow label="Siège social" value="Paris, France" />
              <InfoRow label="SIREN / SIRET" value="En cours d'immatriculation" />
              <InfoRow label="RCS" value="En cours d'immatriculation" />
              <InfoRow label="Numéro de TVA intracommunautaire" value="En cours d'attribution" />
              <InfoRow label="Capital social" value="À définir" />
              <InfoRow label="Directeur de la publication" value="Le Président de Finixar SAS" />
              <InfoRow label="Contact" value="contact@finixar.com" />
            </dl>
          </Section>

          {/* Hébergement */}
          <Section title="2. Hébergement">
            <dl className="space-y-3">
              <InfoRow label="Hébergeur" value="Supabase, Inc." />
              <InfoRow label="Adresse" value="970 Toa Payoh North, #07-04, Singapore 318992" />
              <InfoRow
                label="Infrastructure"
                value="Amazon Web Services (AWS) — Région EU (Irlande / Francfort)"
              />
              <InfoRow label="Site web" value="https://supabase.com" />
            </dl>
          </Section>

          {/* Propriété intellectuelle */}
          <Section title="3. Propriété intellectuelle">
            <p className="text-sm text-slate-700 leading-relaxed">
              L'ensemble du contenu du site Finixar (textes, graphismes, logiciels, images, vidéos,
              sons, plans, logos, marques, base de données, etc.) est protégé par le droit d'auteur
              et le droit de la propriété intellectuelle. Toute reproduction, représentation,
              modification, publication ou adaptation de tout ou partie des éléments du site, quel
              que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation écrite
              préalable de Finixar SAS.
            </p>
          </Section>

          {/* Protection des données */}
          <Section title="4. Protection des données personnelles (RGPD)">
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>
                <strong>Responsable du traitement :</strong> Finixar SAS
              </p>
              <p>
                <strong>Contact DPO :</strong> dpo@finixar.com
              </p>
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi
                Informatique et Libertés du 6 janvier 1978, vous disposez de droits sur vos données
                personnelles.
              </p>
              <p>
                Pour plus de détails, consultez notre{' '}
                <a
                  href="/politique-de-confidentialite"
                  className="text-finixar-brand-blue underline hover:no-underline"
                >
                  politique de confidentialité
                </a>
                .
              </p>
              <p>
                <strong>Réclamation CNIL :</strong> Vous avez le droit d'introduire une réclamation
                auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) — 3 Place
                de Fontenoy, TSA 80715, 75334 Paris Cedex 07 —{' '}
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

          {/* Cookies */}
          <Section title="5. Cookies">
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>
                Le site Finixar utilise des cookies strictement nécessaires à son fonctionnement
                (authentification, sécurité de session). Des cookies optionnels (suivi d'erreurs) ne
                sont activés qu'après votre consentement explicite.
              </p>
              <p>
                Conformément aux recommandations de la CNIL, votre consentement est valable 13 mois.
                Vous pouvez à tout moment modifier vos préférences via le lien « Gérer les cookies »
                en pied de page.
              </p>
            </div>
          </Section>

          {/* Limitation de responsabilité */}
          <Section title="6. Limitation de responsabilité">
            <p className="text-sm text-slate-700 leading-relaxed">
              Finixar SAS s'efforce de fournir des informations aussi précises que possible sur le
              site. Toutefois, elle ne pourra être tenue responsable des omissions, des
              inexactitudes et des carences dans la mise à jour, qu'elles soient de son fait ou du
              fait des tiers partenaires qui lui fournissent ces informations.
            </p>
          </Section>

          {/* Droit applicable */}
          <Section title="7. Droit applicable">
            <p className="text-sm text-slate-700 leading-relaxed">
              Les présentes mentions légales sont régies par le droit français. En cas de litige,
              les tribunaux français seront seuls compétents.
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <dt className="text-sm font-medium text-slate-600 sm:w-72 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}

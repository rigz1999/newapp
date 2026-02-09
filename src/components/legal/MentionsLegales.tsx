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
            <h1 className="text-3xl font-bold text-slate-900">Mentions l&eacute;gales</h1>
          </div>
          <p className="text-slate-600">
            Conform&eacute;ment aux dispositions de la loi n&deg; 2004-575 du 21 juin 2004 pour la
            confiance dans l'&eacute;conomie num&eacute;rique (LCEN).
          </p>
        </div>

        <div className="space-y-8">
          {/* Éditeur du site */}
          <Section title="1. &Eacute;diteur du site">
            <dl className="space-y-3">
              <InfoRow label="Raison sociale" value="Finixar SAS" />
              <InfoRow
                label="Forme juridique"
                value="Soci&eacute;t&eacute; par Actions Simplifi&eacute;e (SAS)"
              />
              <InfoRow label="Si&egrave;ge social" value="Paris, France" />
              <InfoRow label="SIREN / SIRET" value="En cours d'immatriculation" />
              <InfoRow label="RCS" value="En cours d'immatriculation" />
              <InfoRow
                label="Num&eacute;ro de TVA intracommunautaire"
                value="En cours d'attribution"
              />
              <InfoRow label="Capital social" value="&Agrave; d&eacute;finir" />
              <InfoRow
                label="Directeur de la publication"
                value="Le Pr&eacute;sident de Finixar SAS"
              />
              <InfoRow label="Contact" value="contact@finixar.com" />
            </dl>
          </Section>

          {/* Hébergement */}
          <Section title="2. H&eacute;bergement">
            <dl className="space-y-3">
              <InfoRow label="H&eacute;bergeur" value="Supabase, Inc." />
              <InfoRow label="Adresse" value="970 Toa Payoh North, #07-04, Singapore 318992" />
              <InfoRow
                label="Infrastructure"
                value="Amazon Web Services (AWS) &mdash; R&eacute;gion EU (Irlande / Francfort)"
              />
              <InfoRow label="Site web" value="https://supabase.com" />
            </dl>
          </Section>

          {/* Propriété intellectuelle */}
          <Section title="3. Propri&eacute;t&eacute; intellectuelle">
            <p className="text-sm text-slate-700 leading-relaxed">
              L'ensemble du contenu du site Finixar (textes, graphismes, logiciels, images,
              vid&eacute;os, sons, plans, logos, marques, base de donn&eacute;es, etc.) est
              prot&eacute;g&eacute; par le droit d'auteur et le droit de la propri&eacute;t&eacute;
              intellectuelle. Toute reproduction, repr&eacute;sentation, modification, publication
              ou adaptation de tout ou partie des &eacute;l&eacute;ments du site, quel que soit le
              moyen ou le proc&eacute;d&eacute; utilis&eacute;, est interdite sans l'autorisation
              &eacute;crite pr&eacute;alable de Finixar SAS.
            </p>
          </Section>

          {/* Protection des données */}
          <Section title="4. Protection des donn&eacute;es personnelles (RGPD)">
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>
                <strong>Responsable du traitement :</strong> Finixar SAS
              </p>
              <p>
                <strong>Contact DPO :</strong> dpo@finixar.com
              </p>
              <p>
                Conform&eacute;ment au R&egrave;glement G&eacute;n&eacute;ral sur la Protection des
                Donn&eacute;es (RGPD) et &agrave; la loi Informatique et Libert&eacute;s du 6
                janvier 1978, vous disposez de droits sur vos donn&eacute;es personnelles.
              </p>
              <p>
                Pour plus de d&eacute;tails, consultez notre{' '}
                <a
                  href="/politique-de-confidentialite"
                  className="text-finixar-brand-blue underline hover:no-underline"
                >
                  politique de confidentialit&eacute;
                </a>
                .
              </p>
              <p>
                <strong>R&eacute;clamation CNIL :</strong> Vous avez le droit d'introduire une
                r&eacute;clamation aupr&egrave;s de la Commission Nationale de l'Informatique et des
                Libert&eacute;s (CNIL) &mdash; 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07
                &mdash;{' '}
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
                Le site Finixar utilise des cookies strictement n&eacute;cessaires &agrave; son
                fonctionnement (authentification, s&eacute;curit&eacute; de session). Des cookies
                optionnels (suivi d'erreurs) ne sont activ&eacute;s qu'apr&egrave;s votre
                consentement explicite.
              </p>
              <p>
                Conform&eacute;ment aux recommandations de la CNIL, votre consentement est valable
                13 mois. Vous pouvez &agrave; tout moment modifier vos pr&eacute;f&eacute;rences via
                le lien &laquo; G&eacute;rer les cookies &raquo; en pied de page.
              </p>
            </div>
          </Section>

          {/* Limitation de responsabilité */}
          <Section title="6. Limitation de responsabilit&eacute;">
            <p className="text-sm text-slate-700 leading-relaxed">
              Finixar SAS s'efforce de fournir des informations aussi pr&eacute;cises que possible
              sur le site. Toutefois, elle ne pourra &ecirc;tre tenue responsable des omissions, des
              inexactitudes et des carences dans la mise &agrave; jour, qu'elles soient de son fait
              ou du fait des tiers partenaires qui lui fournissent ces informations.
            </p>
          </Section>

          {/* Droit applicable */}
          <Section title="7. Droit applicable">
            <p className="text-sm text-slate-700 leading-relaxed">
              Les pr&eacute;sentes mentions l&eacute;gales sont r&eacute;gies par le droit
              fran&ccedil;ais. En cas de litige, les tribunaux fran&ccedil;ais seront seuls
              comp&eacute;tents.
            </p>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            Derni&egrave;re mise &agrave; jour : F&eacute;vrier 2026
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2
        className="text-lg font-bold text-slate-900 mb-4"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <dt
        className="text-sm font-medium text-slate-600 sm:w-72 flex-shrink-0"
        dangerouslySetInnerHTML={{ __html: label }}
      />
      <dd className="text-sm text-slate-900" dangerouslySetInnerHTML={{ __html: value }} />
    </div>
  );
}

import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function PolitiqueConfidentialite() {
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
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Politique de confidentialit&eacute;
            </h1>
          </div>
          <p className="text-slate-600">
            Conform&eacute;ment au R&egrave;glement G&eacute;n&eacute;ral sur la Protection des
            Donn&eacute;es (RGPD &mdash; UE 2016/679) et &agrave; la loi Informatique et
            Libert&eacute;s du 6 janvier 1978.
          </p>
        </div>

        <div className="space-y-8">
          {/* 1. Responsable du traitement */}
          <Section title="1. Responsable du traitement">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                <strong>Finixar SAS</strong>
                <br />
                Si&egrave;ge social : Paris, France
                <br />
                Contact : contact@finixar.com
              </p>
              <p>
                <strong>
                  D&eacute;l&eacute;gu&eacute; &agrave; la protection des donn&eacute;es (DPO) :
                </strong>{' '}
                dpo@finixar.com
              </p>
            </div>
          </Section>

          {/* 2. Données collectées */}
          <Section title="2. Donn&eacute;es personnelles collect&eacute;es">
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>Nous collectons les cat&eacute;gories de donn&eacute;es suivantes :</p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Cat&eacute;gorie
                      </th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Donn&eacute;es
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Identit&eacute;</td>
                      <td className="p-3 border border-slate-200">
                        Pr&eacute;nom, nom, adresse e-mail
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Authentification</td>
                      <td className="p-3 border border-slate-200">
                        Mot de passe (hash&eacute;), facteurs MFA (TOTP), codes de
                        r&eacute;cup&eacute;ration (hash&eacute;s)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Organisation</td>
                      <td className="p-3 border border-slate-200">
                        Appartenance &agrave; une organisation, r&ocirc;le (membre, admin,
                        &eacute;metteur)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">
                        Donn&eacute;es financi&egrave;res
                      </td>
                      <td className="p-3 border border-slate-200">
                        Projets, tranches, souscriptions, paiements (dans le cadre de la gestion
                        d'actifs)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">
                        Pr&eacute;f&eacute;rences
                      </td>
                      <td className="p-3 border border-slate-200">
                        Param&egrave;tres de rappels e-mail, connexion e-mail externe
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Journal d'audit</td>
                      <td className="p-3 border border-slate-200">
                        Actions effectu&eacute;es (cr&eacute;ation, modification, suppression),
                        horodatage
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Consentement</td>
                      <td className="p-3 border border-slate-200">
                        Choix de consentement cookies, date d'enregistrement
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          {/* 3. Finalités et base légale */}
          <Section title="3. Finalit&eacute;s et base l&eacute;gale du traitement">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-3 border border-slate-200 font-semibold">
                      Finalit&eacute;
                    </th>
                    <th className="text-left p-3 border border-slate-200 font-semibold">
                      Base l&eacute;gale (Art. 6 RGPD)
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700">
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Gestion de votre compte et authentification
                    </td>
                    <td className="p-3 border border-slate-200">
                      Ex&eacute;cution du contrat (Art. 6.1.b)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Gestion des projets, souscriptions et paiements
                    </td>
                    <td className="p-3 border border-slate-200">
                      Ex&eacute;cution du contrat (Art. 6.1.b)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Journal d'audit et tra&ccedil;abilit&eacute; des op&eacute;rations
                      financi&egrave;res
                    </td>
                    <td className="p-3 border border-slate-200">
                      Obligation l&eacute;gale (Art. 6.1.c) &mdash; Code de commerce
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Rappels de paiements par e-mail</td>
                    <td className="p-3 border border-slate-200">
                      Consentement (Art. 6.1.a) &mdash; d&eacute;sactivable dans les
                      param&egrave;tres
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Suivi d'erreurs techniques (Sentry)
                    </td>
                    <td className="p-3 border border-slate-200">
                      Consentement (Art. 6.1.a) &mdash; via la banni&egrave;re de cookies
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Demande de d&eacute;monstration</td>
                    <td className="p-3 border border-slate-200">Consentement (Art. 6.1.a)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* 4. Destinataires */}
          <Section title="4. Destinataires et sous-traitants">
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>
                Vos donn&eacute;es peuvent &ecirc;tre partag&eacute;es avec les sous-traitants
                suivants, dans le cadre strict des finalit&eacute;s d&eacute;crites ci-dessus :
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Sous-traitant
                      </th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Finalit&eacute;
                      </th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Localisation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Supabase</td>
                      <td className="p-3 border border-slate-200">
                        H&eacute;bergement, base de donn&eacute;es, authentification
                      </td>
                      <td className="p-3 border border-slate-200">AWS EU (Irlande/Francfort)</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Resend</td>
                      <td className="p-3 border border-slate-200">
                        Envoi d'e-mails transactionnels
                      </td>
                      <td className="p-3 border border-slate-200">&Eacute;tats-Unis (SCCs)</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Sentry</td>
                      <td className="p-3 border border-slate-200">
                        Suivi d'erreurs (avec consentement)
                      </td>
                      <td className="p-3 border border-slate-200">&Eacute;tats-Unis (SCCs)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                Pour les transferts hors UE, des Clauses Contractuelles Types (SCCs)
                approuv&eacute;es par la Commission europ&eacute;enne sont en place.
              </p>
            </div>
          </Section>

          {/* 5. Durées de conservation */}
          <Section title="5. Dur&eacute;es de conservation">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-3 border border-slate-200 font-semibold">
                      Donn&eacute;es
                    </th>
                    <th className="text-left p-3 border border-slate-200 font-semibold">
                      Dur&eacute;e
                    </th>
                    <th className="text-left p-3 border border-slate-200 font-semibold">
                      Fondement
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700">
                  <tr>
                    <td className="p-3 border border-slate-200">Compte utilisateur</td>
                    <td className="p-3 border border-slate-200">
                      Dur&eacute;e de la relation contractuelle
                    </td>
                    <td className="p-3 border border-slate-200">Contrat</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Donn&eacute;es financi&egrave;res (paiements, souscriptions)
                    </td>
                    <td className="p-3 border border-slate-200">
                      10 ans apr&egrave;s cl&ocirc;ture
                    </td>
                    <td className="p-3 border border-slate-200">Art. L123-22 Code de commerce</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Journal d'audit</td>
                    <td className="p-3 border border-slate-200">10 ans</td>
                    <td className="p-3 border border-slate-200">Obligation l&eacute;gale</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Donn&eacute;es prospect (demande de d&eacute;mo)
                    </td>
                    <td className="p-3 border border-slate-200">
                      3 ans apr&egrave;s dernier contact
                    </td>
                    <td className="p-3 border border-slate-200">Recommandation CNIL</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Consentement cookies</td>
                    <td className="p-3 border border-slate-200">13 mois</td>
                    <td className="p-3 border border-slate-200">Directive ePrivacy / CNIL</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Tokens de r&eacute;initialisation
                    </td>
                    <td className="p-3 border border-slate-200">1 heure</td>
                    <td className="p-3 border border-slate-200">S&eacute;curit&eacute;</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Invitations</td>
                    <td className="p-3 border border-slate-200">7 jours</td>
                    <td className="p-3 border border-slate-200">S&eacute;curit&eacute;</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* 6. Vos droits */}
          <Section title="6. Vos droits">
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>
                Conform&eacute;ment au RGPD (Articles 15 &agrave; 22), vous disposez des droits
                suivants :
              </p>

              <ul className="space-y-3 ml-4">
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit d'acc&egrave;s
                  </span>
                  <span>
                    &mdash; obtenir une copie de vos donn&eacute;es personnelles (Art. 15)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit de rectification
                  </span>
                  <span>
                    &mdash; corriger des donn&eacute;es inexactes ou incompl&egrave;tes (Art. 16)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit &agrave; l'effacement
                  </span>
                  <span>
                    &mdash; demander la suppression de vos donn&eacute;es, sous r&eacute;serve des
                    obligations l&eacute;gales de conservation (Art. 17)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit &agrave; la portabilit&eacute;
                  </span>
                  <span>
                    &mdash; recevoir vos donn&eacute;es dans un format structur&eacute; et lisible
                    par machine (Art. 20)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit d'opposition
                  </span>
                  <span>
                    &mdash; vous opposer au traitement fond&eacute; sur l'int&eacute;r&ecirc;t
                    l&eacute;gitime (Art. 21)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit &agrave; la limitation
                  </span>
                  <span>&mdash; demander la suspension du traitement (Art. 18)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Retrait du consentement
                  </span>
                  <span>
                    &mdash; retirer votre consentement &agrave; tout moment, sans affecter la
                    lic&eacute;it&eacute; du traitement ant&eacute;rieur
                  </span>
                </li>
              </ul>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="font-semibold text-blue-900 mb-2">Comment exercer vos droits ?</p>
                <ul className="space-y-2 text-blue-800 text-sm">
                  <li>
                    <strong>Par e-mail :</strong> dpo@finixar.com
                  </li>
                  <li>
                    <strong>Dans l'application :</strong> Param&egrave;tres &rarr; Mes
                    donn&eacute;es (export et suppression de compte)
                  </li>
                  <li>
                    <strong>D&eacute;lai de r&eacute;ponse :</strong> 1 mois maximum (extensible
                    &agrave; 3 mois pour les demandes complexes)
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          {/* 7. Sécurité */}
          <Section title="7. S&eacute;curit&eacute; des donn&eacute;es">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                Nous mettons en &oelig;uvre des mesures techniques et organisationnelles
                appropri&eacute;es pour prot&eacute;ger vos donn&eacute;es :
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Chiffrement en transit (TLS) et au repos (AES-256)</li>
                <li>
                  Authentification &agrave; deux facteurs (2FA) obligatoire pour tous les
                  utilisateurs
                </li>
                <li>
                  Politique de mots de passe robuste (12 caract&egrave;res minimum, majuscules,
                  minuscules, chiffres, caract&egrave;res sp&eacute;ciaux)
                </li>
                <li>
                  Row Level Security (RLS) sur toutes les tables &mdash; chaque utilisateur
                  n'acc&egrave;de qu'&agrave; ses propres donn&eacute;es
                </li>
                <li>Journal d'audit immuable</li>
                <li>Tokens de session avec expiration automatique</li>
              </ul>
            </div>
          </Section>

          {/* 8. Cookies */}
          <Section title="8. Politique de cookies">
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Cookie
                      </th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Finalit&eacute;
                      </th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Consentement
                      </th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Dur&eacute;e
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Supabase Auth</td>
                      <td className="p-3 border border-slate-200">Session utilisateur</td>
                      <td className="p-3 border border-slate-200 text-green-700 font-medium">
                        Strictement n&eacute;cessaire
                      </td>
                      <td className="p-3 border border-slate-200">Session</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">
                        finixar_cookie_consent
                      </td>
                      <td className="p-3 border border-slate-200">
                        M&eacute;morisation du consentement
                      </td>
                      <td className="p-3 border border-slate-200 text-green-700 font-medium">
                        Strictement n&eacute;cessaire
                      </td>
                      <td className="p-3 border border-slate-200">13 mois</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Sentry</td>
                      <td className="p-3 border border-slate-200">Suivi d'erreurs techniques</td>
                      <td className="p-3 border border-slate-200 text-amber-700 font-medium">
                        Consentement requis
                      </td>
                      <td className="p-3 border border-slate-200">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                Vous pouvez modifier vos pr&eacute;f&eacute;rences &agrave; tout moment via le lien
                &laquo; G&eacute;rer les cookies &raquo; en pied de page.
              </p>
            </div>
          </Section>

          {/* 9. Réclamation CNIL */}
          <Section title="9. R&eacute;clamation">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                Si vous estimez que le traitement de vos donn&eacute;es ne respecte pas la
                r&eacute;glementation, vous pouvez introduire une r&eacute;clamation aupr&egrave;s
                de la CNIL :
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="font-semibold text-slate-900">
                  Commission Nationale de l'Informatique et des Libert&eacute;s (CNIL)
                </p>
                <p>3 Place de Fontenoy, TSA 80715</p>
                <p>75334 Paris Cedex 07</p>
                <p className="mt-2">
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
            </div>
          </Section>

          {/* 10. Modifications */}
          <Section title="10. Modifications de la politique">
            <p className="text-sm text-slate-700 leading-relaxed">
              Nous pouvons mettre &agrave; jour cette politique de confidentialit&eacute; pour
              refl&eacute;ter les &eacute;volutions de nos pratiques ou des exigences
              l&eacute;gales. En cas de modification substantielle, nous vous en informerons par
              e-mail ou par notification dans l'application. La date de derni&egrave;re mise
              &agrave; jour est indiqu&eacute;e en bas de cette page.
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

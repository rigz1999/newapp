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
            <h1 className="text-3xl font-bold text-slate-900">Politique de confidentialité</h1>
          </div>
          <p className="text-slate-600">
            Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et
            à la loi Informatique et Libertés du 6 janvier 1978.
          </p>
        </div>

        <div className="space-y-8">
          {/* 1. Responsable du traitement */}
          <Section title="1. Responsable du traitement">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                <strong>Finixar SAS</strong>
                <br />
                Siège social : Paris, France
                <br />
                Contact : contact@finixar.com
              </p>
              <p>
                <strong>Délégué à la protection des données (DPO) :</strong> dpo@finixar.com
              </p>
            </div>
          </Section>

          {/* 2. Données collectées */}
          <Section title="2. Données personnelles collectées">
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>Nous collectons les catégories de données suivantes :</p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Catégorie
                      </th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Données
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Identité</td>
                      <td className="p-3 border border-slate-200">Prénom, nom, adresse e-mail</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Authentification</td>
                      <td className="p-3 border border-slate-200">
                        Mot de passe (hashé), facteurs MFA (TOTP), codes de récupération (hashés)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Organisation</td>
                      <td className="p-3 border border-slate-200">
                        Appartenance à une organisation, rôle (membre, admin, émetteur)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">
                        Données financières
                      </td>
                      <td className="p-3 border border-slate-200">
                        Projets, tranches, souscriptions, paiements (dans le cadre de la gestion
                        d'actifs)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Préférences</td>
                      <td className="p-3 border border-slate-200">
                        Paramètres de rappels e-mail, connexion e-mail externe
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Journal d'audit</td>
                      <td className="p-3 border border-slate-200">
                        Actions effectuées (création, modification, suppression), horodatage
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
          <Section title="3. Finalités et base légale du traitement">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-3 border border-slate-200 font-semibold">
                      Finalité
                    </th>
                    <th className="text-left p-3 border border-slate-200 font-semibold">
                      Base légale (Art. 6 RGPD)
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700">
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Gestion de votre compte et authentification
                    </td>
                    <td className="p-3 border border-slate-200">
                      Exécution du contrat (Art. 6.1.b)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Gestion des projets, souscriptions et paiements
                    </td>
                    <td className="p-3 border border-slate-200">
                      Exécution du contrat (Art. 6.1.b)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Journal d'audit et traçabilité des opérations financières
                    </td>
                    <td className="p-3 border border-slate-200">
                      Obligation légale (Art. 6.1.c) — Code de commerce
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Rappels de paiements par e-mail</td>
                    <td className="p-3 border border-slate-200">
                      Consentement (Art. 6.1.a) — désactivable dans les paramètres
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Suivi d'erreurs techniques (Sentry)
                    </td>
                    <td className="p-3 border border-slate-200">
                      Consentement (Art. 6.1.a) — via la bannière de cookies
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Demande de démonstration</td>
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
                Vos données peuvent être partagées avec les sous-traitants suivants, dans le cadre
                strict des finalités décrites ci-dessus :
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Sous-traitant
                      </th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Finalité
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
                        Hébergement, base de données, authentification
                      </td>
                      <td className="p-3 border border-slate-200">AWS EU (Irlande/Francfort)</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Resend</td>
                      <td className="p-3 border border-slate-200">
                        Envoi d'e-mails transactionnels
                      </td>
                      <td className="p-3 border border-slate-200">États-Unis (SCCs)</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Sentry</td>
                      <td className="p-3 border border-slate-200">
                        Suivi d'erreurs (avec consentement)
                      </td>
                      <td className="p-3 border border-slate-200">États-Unis (SCCs)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                Pour les transferts hors UE, des Clauses Contractuelles Types (SCCs) approuvées par
                la Commission européenne sont en place.
              </p>
            </div>
          </Section>

          {/* 5. Durées de conservation */}
          <Section title="5. Durées de conservation">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-3 border border-slate-200 font-semibold">Données</th>
                    <th className="text-left p-3 border border-slate-200 font-semibold">Durée</th>
                    <th className="text-left p-3 border border-slate-200 font-semibold">
                      Fondement
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700">
                  <tr>
                    <td className="p-3 border border-slate-200">Compte utilisateur</td>
                    <td className="p-3 border border-slate-200">
                      Durée de la relation contractuelle
                    </td>
                    <td className="p-3 border border-slate-200">Contrat</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Données financières (paiements, souscriptions)
                    </td>
                    <td className="p-3 border border-slate-200">10 ans après clôture</td>
                    <td className="p-3 border border-slate-200">Art. L123-22 Code de commerce</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Journal d'audit</td>
                    <td className="p-3 border border-slate-200">10 ans</td>
                    <td className="p-3 border border-slate-200">Obligation légale</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">
                      Données prospect (demande de démo)
                    </td>
                    <td className="p-3 border border-slate-200">3 ans après dernier contact</td>
                    <td className="p-3 border border-slate-200">Recommandation CNIL</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Consentement cookies</td>
                    <td className="p-3 border border-slate-200">13 mois</td>
                    <td className="p-3 border border-slate-200">Directive ePrivacy / CNIL</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Tokens de réinitialisation</td>
                    <td className="p-3 border border-slate-200">1 heure</td>
                    <td className="p-3 border border-slate-200">Sécurité</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200">Invitations</td>
                    <td className="p-3 border border-slate-200">7 jours</td>
                    <td className="p-3 border border-slate-200">Sécurité</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* 6. Vos droits */}
          <Section title="6. Vos droits">
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <p>Conformément au RGPD (Articles 15 à 22), vous disposez des droits suivants :</p>

              <ul className="space-y-3 ml-4">
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">Droit d'accès</span>
                  <span>— obtenir une copie de vos données personnelles (Art. 15)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit de rectification
                  </span>
                  <span>— corriger des données inexactes ou incomplètes (Art. 16)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit à l'effacement
                  </span>
                  <span>
                    — demander la suppression de vos données, sous réserve des obligations légales
                    de conservation (Art. 17)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit à la portabilité
                  </span>
                  <span>
                    — recevoir vos données dans un format structuré et lisible par machine (Art. 20)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit d'opposition
                  </span>
                  <span>— vous opposer au traitement fondé sur l'intérêt légitime (Art. 21)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Droit à la limitation
                  </span>
                  <span>— demander la suspension du traitement (Art. 18)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    Retrait du consentement
                  </span>
                  <span>
                    — retirer votre consentement à tout moment, sans affecter la licéité du
                    traitement antérieur
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
                    <strong>Dans l'application :</strong> Paramètres → Mes données (export et
                    suppression de compte)
                  </li>
                  <li>
                    <strong>Délai de réponse :</strong> 1 mois maximum (extensible à 3 mois pour les
                    demandes complexes)
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          {/* 7. Sécurité */}
          <Section title="7. Sécurité des données">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
                protéger vos données :
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Chiffrement en transit (TLS) et au repos (AES-256)</li>
                <li>
                  Authentification à deux facteurs (2FA) obligatoire pour tous les utilisateurs
                </li>
                <li>
                  Politique de mots de passe robuste (12 caractères minimum, majuscules, minuscules,
                  chiffres, caractères spéciaux)
                </li>
                <li>
                  Row Level Security (RLS) sur toutes les tables — chaque utilisateur n'accède qu'à
                  ses propres données
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
                        Finalité
                      </th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">
                        Consentement
                      </th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">Durée</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">Supabase Auth</td>
                      <td className="p-3 border border-slate-200">Session utilisateur</td>
                      <td className="p-3 border border-slate-200 text-green-700 font-medium">
                        Strictement nécessaire
                      </td>
                      <td className="p-3 border border-slate-200">Session</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200 font-medium">
                        finixar_cookie_consent
                      </td>
                      <td className="p-3 border border-slate-200">Mémorisation du consentement</td>
                      <td className="p-3 border border-slate-200 text-green-700 font-medium">
                        Strictement nécessaire
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
                Vous pouvez modifier vos préférences à tout moment via le lien « Gérer les cookies »
                en pied de page.
              </p>
            </div>
          </Section>

          {/* 9. Réclamation CNIL */}
          <Section title="9. Réclamation">
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                Si vous estimez que le traitement de vos données ne respecte pas la réglementation,
                vous pouvez introduire une réclamation auprès de la CNIL :
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="font-semibold text-slate-900">
                  Commission Nationale de l'Informatique et des Libertés (CNIL)
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
              Nous pouvons mettre à jour cette politique de confidentialité pour refléter les
              évolutions de nos pratiques ou des exigences légales. En cas de modification
              substantielle, nous vous en informerons par e-mail ou par notification dans
              l'application. La date de dernière mise à jour est indiquée en bas de cette page.
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

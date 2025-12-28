import { TrendingUp, ArrowRight, Shield, FileText, Users, Euro, BarChart3, Lock, CheckCircle } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-finixar-brand-blue p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-finixar-deep-blue">Finixar</span>
            </div>

            {/* CTA */}
            <a
              href="http://app.finixar.com"
              className="px-6 py-2.5 bg-finixar-brand-blue hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Se connecter
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-finixar-deep-blue mb-6 leading-tight">
              L'infrastructure moderne de gestion d'investissements
            </h1>
            <p className="text-xl sm:text-2xl text-slate-600 mb-10 leading-relaxed">
              Centralisez vos projets, automatisez les paiements de coupons et offrez un portail dédié à vos investisseurs. Tout dans une plateforme sécurisée et conforme RGPD.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:contact@finixar.com?subject=Demande de démo"
                className="px-8 py-4 bg-finixar-brand-blue hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span>Demander une démo</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="http://app.finixar.com"
                className="px-8 py-4 bg-white hover:bg-slate-50 text-finixar-deep-blue font-semibold rounded-lg transition-all border-2 border-slate-200 hover:border-finixar-brand-blue"
              >
                Accéder à la plateforme
              </a>
            </div>
          </div>

          {/* Dashboard Preview Placeholder */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none"></div>
            <div className="bg-gradient-to-br from-finixar-deep-blue to-finixar-brand-blue rounded-2xl shadow-2xl p-1">
              <div className="bg-slate-900 rounded-xl aspect-video flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-20 h-20 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">Aperçu du tableau de bord</p>
                  <p className="text-slate-600 text-sm mt-2">(Screenshot à insérer ici)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-slate-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-finixar-deep-blue mb-4">
              Pourquoi Finixar ?
            </h2>
            <p className="text-lg text-slate-600">
              Les défis de la gestion d'investissements aujourd'hui
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">
                Fichiers Excel dispersés
              </h3>
              <p className="text-slate-600">
                Données fragmentées, erreurs manuelles et risques de perte d'information.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">
                Communication inefficace
              </h3>
              <p className="text-slate-600">
                Emails perdus, demandes répétées et investisseurs insatisfaits.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Euro className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">
                Suivi manuel chronophage
              </h3>
              <p className="text-slate-600">
                Des heures perdues à traquer les paiements et générer des rapports.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-finixar-teal/10 rounded-full border-2 border-finixar-teal">
              <CheckCircle className="w-5 h-5 text-finixar-teal" />
              <span className="font-semibold text-finixar-deep-blue">
                Finixar automatise tout cela
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-finixar-deep-blue mb-4">
              Une plateforme complète pour vos investissements
            </h2>
            <p className="text-lg text-slate-600">
              Tout ce dont vous avez besoin pour gérer efficacement vos projets d'investissement
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group">
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-200 hover:border-finixar-brand-blue h-full">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-finixar-brand-blue transition-colors">
                  <FileText className="w-7 h-7 text-finixar-brand-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-finixar-deep-blue mb-3">
                  Gestion de Projets & Tranches
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Organisez vos projets d'investissement par tranches avec un suivi précis des échéances et des montants investis.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group">
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-200 hover:border-finixar-brand-blue h-full">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-finixar-brand-blue transition-colors">
                  <Users className="w-7 h-7 text-finixar-brand-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-finixar-deep-blue mb-3">
                  Portail Investisseur
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Offrez à vos investisseurs un accès dédié pour consulter leurs actifs, échéances et RIB en toute autonomie.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group">
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-200 hover:border-finixar-brand-blue h-full">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-finixar-brand-blue transition-colors">
                  <Euro className="w-7 h-7 text-finixar-brand-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-finixar-deep-blue mb-3">
                  Automatisation des Paiements
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Gérez les paiements de coupons avec import Excel et génération automatique de preuves PDF.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group">
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-200 hover:border-finixar-brand-blue h-full">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-finixar-brand-blue transition-colors">
                  <BarChart3 className="w-7 h-7 text-finixar-brand-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-finixar-deep-blue mb-3">
                  Filtrage Avancé & Analytics
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Navigation ultra-fluide grâce aux filtres en cascade et analytics intégrés pour une vision claire de vos investissements.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="group">
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-200 hover:border-finixar-brand-blue h-full">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-finixar-brand-blue transition-colors">
                  <FileText className="w-7 h-7 text-finixar-brand-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-finixar-deep-blue mb-3">
                  Gestion des Justificatifs
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Stockez et gérez vos preuves de paiement en toute sécurité avec un système de fichiers centralisé.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="group">
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-200 hover:border-finixar-brand-blue h-full">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-finixar-brand-blue transition-colors">
                  <TrendingUp className="w-7 h-7 text-finixar-brand-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-finixar-deep-blue mb-3">
                  Tableaux de Bord en Temps Réel
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Visualisez l'état de vos investissements en temps réel avec des mises à jour instantanées.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section className="py-20 bg-finixar-deep-blue px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Sécurité & Conformité
            </h2>
            <p className="text-lg text-slate-300">
              Votre confiance est notre priorité
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-finixar-teal" />
              </div>
              <h3 className="font-semibold text-white mb-2">RGPD Compliant</h3>
              <p className="text-slate-400 text-sm">
                Conforme aux réglementations européennes de protection des données
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-finixar-teal" />
              </div>
              <h3 className="font-semibold text-white mb-2">Hébergement Souverain</h3>
              <p className="text-slate-400 text-sm">
                Données hébergées en France (Région Paris)
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-finixar-teal" />
              </div>
              <h3 className="font-semibold text-white mb-2">Row-Level Security</h3>
              <p className="text-slate-400 text-sm">
                Isolation complète des données par organisation
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-finixar-teal" />
              </div>
              <h3 className="font-semibold text-white mb-2">SSO & MFA</h3>
              <p className="text-slate-400 text-sm">
                Authentification sécurisée Microsoft & Google
              </p>
            </div>
          </div>

          <div className="mt-12 bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-finixar-teal/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-finixar-teal" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Infrastructure de niveau entreprise
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Construite sur PostgreSQL et React avec Supabase, Finixar offre une infrastructure robuste, sécurisée et scalable. Sauvegardes automatiques quotidiennes, chiffrement de bout en bout et disponibilité garantie à 99.9%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-finixar-deep-blue mb-6">
            Prêt à moderniser votre gestion d'investissements ?
          </h2>
          <p className="text-xl text-slate-600 mb-10">
            Rejoignez les gestionnaires de fonds qui font confiance à Finixar pour simplifier leur gestion quotidienne.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:contact@finixar.com?subject=Demande de démo"
              className="px-10 py-5 bg-finixar-brand-blue hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>Demander une démo</span>
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="http://app.finixar.com"
              className="px-10 py-5 bg-white hover:bg-slate-50 text-finixar-deep-blue text-lg font-semibold rounded-lg transition-all border-2 border-slate-200 hover:border-finixar-brand-blue"
            >
              Accéder à la plateforme
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-finixar-deep-blue text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-finixar-brand-blue p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">Finixar</span>
              </div>
              <p className="text-slate-400 text-sm">
                La plateforme de gestion d'investissements nouvelle génération.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="http://app.finixar.com" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Entreprise</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">À propos</a></li>
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">Mentions Légales</a></li>
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">CGV</a></li>
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">Politique de Confidentialité</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Finixar. Tous droits réservés.
            </p>
            <p className="text-slate-500 text-sm">
              Hébergé en France 🇫🇷 • Conforme RGPD
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

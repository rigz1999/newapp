import { TrendingUp, ArrowRight, Shield, FileText, Users, Euro, BarChart3, Lock, CheckCircle, Clock, Headphones, Building2, Award, Check, Bell, AlertCircle, Zap } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-finixar-brand-blue p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-finixar-deep-blue">Finixar</span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#fonctionnalites" className="text-slate-700 hover:text-finixar-brand-blue transition-colors font-medium">
                Fonctionnalités
              </a>
              <a href="#securite" className="text-slate-700 hover:text-finixar-brand-blue transition-colors font-medium">
                Sécurité
              </a>
              <a href="#contact" className="text-slate-700 hover:text-finixar-brand-blue transition-colors font-medium">
                Contact
              </a>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <a
                href="http://app.finixar.com"
                className="hidden sm:block px-4 py-2 text-finixar-deep-blue hover:text-finixar-brand-blue font-medium transition-colors"
              >
                Connexion
              </a>
              <a
                href="mailto:contact@finixar.com?subject=Demande de démo"
                className="px-5 py-2.5 bg-finixar-brand-blue hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Demander une démo
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Dark */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-finixar-deep-blue via-[#1a2642] to-finixar-deep-blue px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Animated floating orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-finixar-brand-blue/30 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-10 w-80 h-80 bg-finixar-teal/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20">
                <div className="w-2 h-2 bg-finixar-teal rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">🇫🇷 Données hébergées en France • Conforme RGPD</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                La gestion d'actifs, simplifiée et sécurisée
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 mb-8 leading-relaxed">
                Pilotez vos projets, suivez vos échéances et gérez vos relations investisseurs sur une plateforme unique conçue pour les professionnels de la finance.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a
                  href="mailto:contact@finixar.com?subject=Demande de démo"
                  className="px-8 py-4 bg-finixar-brand-blue hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <span>Demander une démo</span>
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a
                  href="http://app.finixar.com"
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all border border-white/30 backdrop-blur-sm flex items-center justify-center gap-2"
                >
                  En savoir plus
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-finixar-teal/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-finixar-teal" />
                  </div>
                  <span className="text-sm text-slate-300">Hébergement sécurisé</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-finixar-teal/20 rounded-lg flex items-center justify-center">
                    <Lock className="w-4 h-4 text-finixar-teal" />
                  </div>
                  <span className="text-sm text-slate-300">Conforme RGPD</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-finixar-teal/20 rounded-lg flex items-center justify-center">
                    <Headphones className="w-4 h-4 text-finixar-teal" />
                  </div>
                  <span className="text-sm text-slate-300">Support réactif</span>
                </div>
              </div>
            </div>

            {/* Right - Dashboard Preview (real screenshot will be added later) */}
            <div className="relative lg:block hidden">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 shadow-2xl">
                <img
                  src="/images/dashboard-screenshot.png"
                  alt="Tableau de bord Finixar"
                  className="rounded-xl w-full h-auto"
                />
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-finixar-brand-blue/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-finixar-teal/20 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-finixar-deep-blue mb-4">
              Fonctionnalités clés pour Asset Managers
            </h2>
            <p className="text-lg text-slate-600">
              Une suite complète d'outils conçus pour optimiser la gestion de vos investissements et automatiser vos processus financiers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-blue-200 hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-finixar-deep-blue mb-3">
                Gestion de projets et tranches
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Suivi précis des échéances et des montants investis avec gestion sécurisée des tranches.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-green-200 hover:-translate-y-1">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-finixar-deep-blue mb-3">
                Relations investisseurs
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Centralisez les informations de vos investisseurs et gérez leurs RIB en toute sécurité.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-purple-200 hover:-translate-y-1">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-finixar-deep-blue mb-3">
                Système de filtrage avancé
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Navigation ultra-fluide grâce aux filtres en cascade et analytics intégrés en temps réel.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-orange-200 hover:-translate-y-1">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <Euro className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-finixar-deep-blue mb-3">
                Distribution de revenus et reporting
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Gestion des coupons avec import Excel et téléchargement de justificatifs de paiement.
              </p>
            </div>

            {/* Feature 5 - Auto Reminders */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-yellow-200 hover:-translate-y-1">
              <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
                <Bell className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-finixar-deep-blue mb-3">
                Rappels automatiques
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Ne manquez plus jamais une échéance. Recevez des rappels automatiques pour toutes vos dates importantes.
              </p>
            </div>

            {/* Feature 6 - Real-time Dashboard */}
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-indigo-200 hover:-translate-y-1">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-finixar-deep-blue mb-3">
                Tableaux de bord en temps réel
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Visualisez l'état de vos projets en temps réel avec des mises à jour instantanées.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-finixar-deep-blue mb-4">
              Vous en avez assez de perdre votre temps avec Excel ?
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Vous n'êtes pas seul. Des centaines d'heures perdues chaque année à cause des mêmes problèmes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pain 1 */}
            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900 mb-2">
                    Absence de traçabilité et risque d'audit
                  </h3>
                  <p className="text-red-800 text-sm leading-relaxed">
                    Fichiers multiples sans historique de modifications. Absence de piste d'audit complète sur les décisions d'investissement. Difficulté à démontrer la conformité lors des contrôles réglementaires.
                  </p>
                </div>
              </div>
            </div>

            {/* Pain 2 */}
            <div className="bg-orange-50 border-2 border-orange-100 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-orange-900 mb-2">
                    Inefficacité opérationnelle des processus manuels
                  </h3>
                  <p className="text-orange-800 text-sm leading-relaxed">
                    Saisie manuelle répétitive des RIB, calculs de coupons sujets aux erreurs, communications individuelles chronophages. Temps significatif consacré à des tâches sans valeur ajoutée au détriment de l'analyse stratégique.
                  </p>
                </div>
              </div>
            </div>

            {/* Pain 3 */}
            <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-purple-900 mb-2">
                    Risque opérationnel lié au suivi manuel des échéances
                  </h3>
                  <p className="text-purple-800 text-sm leading-relaxed">
                    Absence de système centralisé de suivi des dates critiques. Risque de non-respect des obligations contractuelles envers les investisseurs. Impact potentiel sur la relation client et la réputation du fonds.
                  </p>
                </div>
              </div>
            </div>

            {/* Pain 4 */}
            <div className="bg-yellow-50 border-2 border-yellow-100 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-yellow-900 mb-2">
                    Non-conformité RGPD et risques de sécurité des données
                  </h3>
                  <p className="text-yellow-800 text-sm leading-relaxed">
                    Stockage de données sensibles (RIB, informations personnelles) sans chiffrement approprié. Partage par e-mail sans contrôle d'accès ni traçabilité. Exposition aux sanctions réglementaires pouvant atteindre 4% du chiffre d'affaires annuel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi Finixar Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-finixar-deep-blue mb-4">
              Pourquoi Finixar
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Une plateforme pensée pour les professionnels de la gestion d'actifs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Benefit 1 - Multi-org */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <div className="w-14 h-14 bg-finixar-brand-blue/10 rounded-xl flex items-center justify-center mb-6">
                <Building2 className="w-7 h-7 text-finixar-brand-blue" />
              </div>
              <h3 className="text-xl font-bold text-finixar-deep-blue mb-3">
                Consolidation multi-fonds
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Pilotez plusieurs entités et fonds depuis une interface centralisée. Séparation stricte des données avec vue consolidée pour la direction.
              </p>
            </div>

            {/* Benefit 2 - Excel Export */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <div className="w-14 h-14 bg-finixar-teal/10 rounded-xl flex items-center justify-center mb-6">
                <FileText className="w-7 h-7 text-finixar-teal" />
              </div>
              <h3 className="text-xl font-bold text-finixar-deep-blue mb-3">
                Exports conformes pour audits
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Générez des rapports structurés pour vos commissaires aux comptes et audits réglementaires. Données filtrables exportables au format Excel.
              </p>
            </div>

            {/* Benefit 3 - Real-time */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-finixar-deep-blue mb-3">
                Collaboration temps réel
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Synchronisation instantanée entre utilisateurs. Contrôle de version automatique éliminant les conflits de données et doublons.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Zero Excel Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 bg-finixar-teal/10 rounded-full mb-4">
              <span className="text-finixar-teal font-semibold text-sm">FONCTIONNALITÉS EN ACTION</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-finixar-deep-blue mb-6">
              Dites adieu aux fichiers Excel
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Finixar automatise <span className="font-bold text-finixar-brand-blue">100% de vos tâches répétitives</span> et élimine les erreurs qui coûtent cher
            </p>
          </div>

          {/* Screenshots Grid */}
          <div className="grid lg:grid-cols-2 gap-6 mb-12">
            <div className="bg-white rounded-2xl shadow-xl p-3 border border-slate-200">
              <img
                src="/images/reminders.png"
                alt="Rappels automatiques Finixar"
                className="rounded-lg w-full h-auto"
              />
              <div className="mt-4 px-2">
                <h3 className="font-semibold text-finixar-deep-blue mb-1">Rappels automatiques par e-mail</h3>
                <p className="text-sm text-slate-600">Ne manquez plus jamais une échéance avec les notifications intelligentes</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-3 border border-slate-200">
              <img
                src="/images/coupons-screenshot.png"
                alt="Gestion des coupons Finixar"
                className="rounded-lg w-full h-auto"
              />
              <div className="mt-4 px-2">
                <h3 className="font-semibold text-finixar-deep-blue mb-1">Gestion centralisée des coupons</h3>
                <p className="text-sm text-slate-600">Suivez vos coupons, échéances et paiements en un seul endroit</p>
              </div>
            </div>
          </div>

          {/* Stats Below */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-finixar-teal/10 rounded-2xl mb-4">
                <TrendingUp className="w-8 h-8 text-finixar-teal" />
              </div>
              <p className="text-3xl font-bold text-finixar-deep-blue mb-2">98%</p>
              <p className="text-slate-600">Réduction des erreurs manuelles</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-finixar-deep-blue mb-2">15h</p>
              <p className="text-slate-600">Économisées par semaine</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-finixar-deep-blue mb-2">100%</p>
              <p className="text-slate-600">Conformité réglementaire</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section - Split Layout */}
      <section id="securite" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-finixar-deep-blue mb-6">
                Sécurité de niveau bancaire pour vos données sensibles
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Toutes vos données sont hébergées en France (Région Paris). Sécurité des données garantie par Row-Level Security (RLS) et chiffrement de bout en bout.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1">Hébergement souverain en France</h4>
                    <p className="text-slate-600 text-sm">
                      Vos données sont hébergées en France (Région Paris), garantissant une conformité avec les réglementations européennes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1">Chiffrement des données</h4>
                    <p className="text-slate-600 text-sm">
                      Toutes les communications et données stockées sont chiffrées pour garantir leur confidentialité.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1">Confidentialité totale</h4>
                    <p className="text-slate-600 text-sm">
                      Système d'isolation avancé garantissant que vos données restent strictement confidentielles et inaccessibles aux tiers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1">Authentification sécurisée</h4>
                    <p className="text-slate-600 text-sm">
                      Connexion via Microsoft pour une authentification simple et sécurisée avec vos comptes professionnels.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Compliance Card */}
            <div className="bg-gradient-to-br from-finixar-deep-blue to-[#1a2642] rounded-2xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-8">Conformité & sécurité</h3>

              <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Lock className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">RGPD</p>
                      <p className="text-slate-400 text-sm">Conforme</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Respect strict des réglementations européennes de protection des données personnelles.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Hébergement France</p>
                      <p className="text-slate-400 text-sm">Région Paris</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Infrastructure hébergée sur des serveurs situés en France pour garantir la souveraineté des données.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Lock className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Chiffrement</p>
                      <p className="text-slate-400 text-sm">SSL/TLS</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Toutes les communications sont chiffrées pour protéger vos données sensibles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-finixar-deep-blue via-[#1a2642] to-finixar-deep-blue">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Prêt à transformer votre gestion d'investissements ?
          </h2>
          <p className="text-xl text-slate-300 mb-10">
            Rejoignez les entreprises qui font confiance à Finixar pour gérer leurs investissements en toute sécurité.
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
              className="px-10 py-5 bg-white/10 hover:bg-white/20 text-white text-lg font-semibold rounded-lg transition-all border border-white/30 backdrop-blur-sm"
            >
              Voir la documentation
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-finixar-deep-blue text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
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
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#securite" className="hover:text-white transition-colors">Sécurité</a></li>
                <li><a href="mailto:contact@finixar.com?subject=Demande de tarifs" className="hover:text-white transition-colors">Demander un devis</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:contact@finixar.com?subject=Demande de démo" className="hover:text-white transition-colors">Demander une démo</a></li>
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:contact@finixar.com?subject=Mentions légales" className="hover:text-white transition-colors">Mentions légales</a></li>
                <li><a href="mailto:contact@finixar.com?subject=CGV" className="hover:text-white transition-colors">CGV</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Finixar. Tous droits réservés.
            </p>
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <span>🇫🇷</span> Hébergé en France • Conforme RGPD
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

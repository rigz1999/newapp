import { TrendingUp, ArrowRight, Shield, FileText, Users, Euro, BarChart3, Lock, CheckCircle, Clock, Headphones, Building2, Award, Check, Bell, AlertCircle, Zap } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
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
              <div className="bg-finixar-brand-blue p-2 rounded-lg flex items-center justify-center w-10 h-10">
                <TrendingUp className="w-6 h-6 text-white" strokeWidth={2.5} style={{ width: '24px', height: '24px' }} />
              </div>
              <span className="text-xl font-bold text-finixar-deep-blue leading-none">Finixar</span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#fonctionnalites" className="text-slate-700 hover:text-finixar-brand-blue transition-colors font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-finixar-brand-blue after:transition-all hover:after:w-full">
                Fonctionnalités
              </a>
              <a href="#securite" className="text-slate-700 hover:text-finixar-brand-blue transition-colors font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-finixar-brand-blue after:transition-all hover:after:w-full">
                Sécurité
              </a>
              <a href="#contact" className="text-slate-700 hover:text-finixar-brand-blue transition-colors font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-finixar-brand-blue after:transition-all hover:after:w-full">
                Contact
              </a>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <a
                href="http://app.finixar.com"
                className="hidden sm:inline-flex items-center px-4 py-2 text-finixar-deep-blue hover:text-finixar-brand-blue font-medium transition-colors"
              >
                Connexion
              </a>
              <a
                href="mailto:contact@finixar.com?subject=Demande de démo"
                className="inline-flex items-center px-6 py-[11px] bg-finixar-brand-blue hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-sm hover:shadow-md leading-none"
                style={{ paddingTop: '11px', paddingBottom: '13px' }}
              >
                Demander une démo
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Dark */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-finixar-deep-blue via-[#1a2642] to-finixar-deep-blue px-4 sm:px-6 lg:px-8 relative overflow-hidden">
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
                  className="inline-flex items-center justify-center gap-2 px-8 bg-finixar-brand-blue hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 leading-none"
                  style={{ paddingTop: '17px', paddingBottom: '19px' }}
                >
                  <span>Demander une démo</span>
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                </a>
                <a
                  href="http://app.finixar.com"
                  className="inline-flex items-center justify-center gap-2 px-8 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all border border-white/30 backdrop-blur-sm leading-none"
                  style={{ paddingTop: '17px', paddingBottom: '19px' }}
                >
                  En savoir plus
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-finixar-teal/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-finixar-teal" strokeWidth={2} />
                  </div>
                  <span className="text-sm text-slate-300">Hébergement sécurisé</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-finixar-teal/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-finixar-teal" strokeWidth={2} />
                  </div>
                  <span className="text-sm text-slate-300">Conforme RGPD</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-finixar-teal/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Headphones className="w-4 h-4 text-finixar-teal" strokeWidth={2} />
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

      {/* Interface Intuitive Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-finixar-deep-blue mb-4">
              Une interface pensée pour votre efficacité
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Accédez à toutes vos données d'investissement depuis un tableau de bord intuitif et performant
            </p>
          </div>

          {/* Dashboard Showcase - Isometric style */}
          <div className="relative">
            {/* Main dashboard mockup */}
            <div className="relative z-10 max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 sm:p-4">
                <img
                  src="/images/dashboard-preview.png"
                  alt="Interface Finixar"
                  className="rounded-lg w-full h-auto"
                />
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-10 -left-4 w-24 h-24 bg-finixar-brand-blue/10 rounded-2xl blur-2xl"></div>
            <div className="absolute bottom-10 -right-4 w-32 h-32 bg-finixar-teal/10 rounded-2xl blur-2xl"></div>
          </div>

          {/* Quick benefits below dashboard */}
          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-finixar-brand-blue/10 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-finixar-brand-blue" strokeWidth={2} />
              </div>
              <h4 className="font-semibold text-finixar-deep-blue mb-2">Vision globale</h4>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">Tous vos projets et investissements en un coup d'œil</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-finixar-teal/10 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Zap className="w-6 h-6 text-finixar-teal" strokeWidth={2} />
              </div>
              <h4 className="font-semibold text-finixar-deep-blue mb-2">Navigation rapide</h4>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">Accédez instantanément aux informations recherchées</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" strokeWidth={2} />
              </div>
              <h4 className="font-semibold text-finixar-deep-blue mb-2">Analytics temps réel</h4>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">Métriques et rapports actualisés automatiquement</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Redesigned with screenshots */}
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
            {/* Feature 1 - Projects & Tranches */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-finixar-brand-blue/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg border-2 border-finixar-brand-blue flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-finixar-brand-blue" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-finixar-deep-blue leading-tight">
                  Gestion de projets
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Suivi précis des échéances et des montants investis avec gestion sécurisée des tranches.
              </p>
              <div className="bg-white rounded-xl border border-slate-200 p-2">
                <img
                  src="/images/feature-projects.png"
                  alt="Gestion de projets Finixar"
                  className="rounded-lg w-full h-auto"
                />
              </div>
            </div>

            {/* Feature 2 - Investor Relations */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-green-400/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg border-2 border-green-600 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-finixar-deep-blue leading-tight">
                  Relations investisseurs
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Centralisez les informations de vos investisseurs et gérez leurs RIB en toute sécurité.
              </p>
              <div className="bg-white rounded-xl border border-slate-200 p-2">
                <img
                  src="/images/feature-investors.png"
                  alt="Relations investisseurs Finixar"
                  className="rounded-lg w-full h-auto"
                />
              </div>
            </div>

            {/* Feature 3 - Advanced Filtering */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-purple-400/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg border-2 border-purple-600 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-finixar-deep-blue leading-tight">
                  Filtrage avancé
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Navigation ultra-fluide grâce aux filtres en cascade et analytics intégrés en temps réel.
              </p>
              <div className="bg-white rounded-xl border border-slate-200 p-2">
                <img
                  src="/images/feature-filtering.png"
                  alt="Filtrage avancé Finixar"
                  className="rounded-lg w-full h-auto"
                />
              </div>
            </div>

            {/* Feature 4 - Coupons Management */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-orange-400/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg border-2 border-orange-600 flex items-center justify-center flex-shrink-0">
                  <Euro className="w-5 h-5 text-orange-600" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-finixar-deep-blue leading-tight">
                  Gestion des coupons
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Suivi centralisé des coupons avec import Excel et téléchargement de justificatifs de paiement.
              </p>
              <div className="bg-white rounded-xl border border-slate-200 p-2">
                <img
                  src="/images/coupons-screenshot.png"
                  alt="Gestion des coupons Finixar"
                  className="rounded-lg w-full h-auto"
                />
              </div>
            </div>

            {/* Feature 5 - Auto Reminders */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-finixar-teal/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg border-2 border-finixar-teal flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-finixar-teal" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-finixar-deep-blue leading-tight">
                  Rappels automatiques
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Notifications automatiques par e-mail pour toutes vos échéances critiques.
              </p>
              <div className="bg-white rounded-xl border border-slate-200 p-2">
                <img
                  src="/images/reminders.png"
                  alt="Rappels automatiques Finixar"
                  className="rounded-lg w-full h-auto"
                />
              </div>
            </div>

            {/* Feature 6 - Real-time Dashboard */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-indigo-400/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg border-2 border-indigo-600 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-finixar-deep-blue leading-tight">
                  Analytics temps réel
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Visualisez l'état de vos projets avec des métriques et tableaux de bord actualisés instantanément.
              </p>
              <div className="bg-white rounded-xl border border-slate-200 p-2">
                <img
                  src="/images/feature-analytics.png"
                  alt="Analytics temps réel Finixar"
                  className="rounded-lg w-full h-auto"
                />
              </div>
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

      {/* Pourquoi Finixar Section - Redesigned */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-finixar-deep-blue mb-4">
              Pourquoi choisir Finixar
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Une solution complète conçue pour répondre aux enjeux métier des gestionnaires d'actifs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Benefit 1 - Investor Data */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
              <div className="mb-8">
                <span className="text-5xl font-bold text-finixar-brand-blue/20 leading-none">01</span>
              </div>
              <h3 className="text-xl font-bold text-finixar-deep-blue mb-4 leading-tight">
                Base d'investisseurs centralisée
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Gestion structurée des données investisseurs et RIB dans un référentiel unique. Élimination de la saisie manuelle et des erreurs de ressaisie.
              </p>
            </div>

            {/* Benefit 2 - Automated Reminders */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
              <div className="mb-8">
                <span className="text-5xl font-bold text-finixar-teal/20 leading-none">02</span>
              </div>
              <h3 className="text-xl font-bold text-finixar-deep-blue mb-4 leading-tight">
                Rappels automatisés par e-mail
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Notifications automatiques pour vos échéances critiques. Réduction du risque de non-respect des obligations contractuelles envers vos investisseurs.
              </p>
            </div>

            {/* Benefit 3 - Excel Import/Export */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
              <div className="mb-8">
                <span className="text-5xl font-bold text-purple-600/20 leading-none">03</span>
              </div>
              <h3 className="text-xl font-bold text-finixar-deep-blue mb-4 leading-tight">
                Import/Export intelligent
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Importez vos données existantes dans Finixar en quelques clics. Exportez l'intégralité de vos données au format Excel pour vos analyses, reporting et besoins de conformité.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Zero Excel Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
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
                    <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1 leading-tight">Hébergement souverain en France</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Vos données sont hébergées en France (Région Paris), garantissant une conformité avec les réglementations européennes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1 leading-tight">Chiffrement des données</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Toutes les communications et données stockées sont chiffrées pour garantir leur confidentialité.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1 leading-tight">Confidentialité totale</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Système d'isolation avancé garantissant que vos données restent strictement confidentielles et inaccessibles aux tiers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1 leading-tight">Authentification sécurisée</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
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
              className="inline-flex items-center justify-center gap-2 px-10 bg-finixar-brand-blue hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 leading-none"
              style={{ paddingTop: '21px', paddingBottom: '23px' }}
            >
              <span>Demander une démo</span>
              <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
            </a>
            <a
              href="http://app.finixar.com"
              className="inline-flex items-center justify-center px-10 bg-white/10 hover:bg-white/20 text-white text-lg font-semibold rounded-lg transition-all border border-white/30 backdrop-blur-sm leading-none"
              style={{ paddingTop: '21px', paddingBottom: '23px' }}
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
              <h4 className="font-medium mb-4 tracking-wide">Produit</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors tracking-wide">Fonctionnalités</a></li>
                <li><a href="#securite" className="hover:text-white transition-colors tracking-wide">Sécurité</a></li>
                <li><a href="mailto:contact@finixar.com?subject=Demande de tarifs" className="hover:text-white transition-colors tracking-wide">Demander un devis</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-4 tracking-wide">Contact</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:contact@finixar.com?subject=Demande de démo" className="hover:text-white transition-colors tracking-wide">Demander une démo</a></li>
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors tracking-wide">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-4 tracking-wide">Légal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:contact@finixar.com?subject=Mentions légales" className="hover:text-white transition-colors tracking-wide">Mentions légales</a></li>
                <li><a href="mailto:contact@finixar.com?subject=CGV" className="hover:text-white transition-colors tracking-wide">CGV</a></li>
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

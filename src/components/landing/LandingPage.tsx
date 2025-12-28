import { TrendingUp, ArrowRight, Shield, FileText, Users, Euro, BarChart3, Lock, CheckCircle, Clock, Headphones, Building2, Award, Check } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
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
      <section className="pt-24 pb-16 bg-gradient-to-br from-finixar-deep-blue via-[#1a2642] to-finixar-deep-blue px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20">
                <div className="w-2 h-2 bg-finixar-teal rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Conforme RGPD • Hébergement Souverain</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                La plateforme de gestion d'investissements nouvelle génération
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 mb-8 leading-relaxed">
                Centralisez vos projets, gérez vos investissements et automatisez le paiement de vos coupons dans une interface sécurisée et intuitive.
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
                  <span className="text-sm text-slate-300">Sécurité niveau bancaire</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-finixar-teal/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-finixar-teal" />
                  </div>
                  <span className="text-sm text-slate-300">Configuration en 24h</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-finixar-teal/20 rounded-lg flex items-center justify-center">
                    <Headphones className="w-4 h-4 text-finixar-teal" />
                  </div>
                  <span className="text-sm text-slate-300">Support dédié</span>
                </div>
              </div>
            </div>

            {/* Right - Dashboard Preview Card */}
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold">Tableau de bord en temps réel</h3>
                  <div className="px-3 py-1 bg-finixar-teal/20 rounded-full">
                    <span className="text-finixar-teal text-xs font-medium">Live</span>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Projets actifs</p>
                        <p className="text-white text-3xl font-bold">24</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Montant investi</p>
                        <p className="text-white text-3xl font-bold">€2,4M</p>
                      </div>
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Euro className="w-6 h-6 text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm mb-1">Investisseurs</p>
                        <p className="text-white text-3xl font-bold">156</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>
                  </div>
                </div>
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100 hover:border-blue-200">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-finixar-deep-blue mb-2">
                Gestion de Projets & Tranches
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Suivi précis des échéances et des montants investis avec gestion des tranches sécurisée.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100 hover:border-green-200">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-finixar-deep-blue mb-2">
                Portail Investisseur
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Espace dédié pour la consultation des actifs et des RIB en toute autonomie personnalisée.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100 hover:border-purple-200">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-finixar-deep-blue mb-2">
                Système de Filtrage Avancé
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Navigation ultra-fluide grâce aux filtres en cascade et analytics intégrés en temps réel.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100 hover:border-orange-200">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <Euro className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-finixar-deep-blue mb-2">
                Paiements & Preuves
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Gestion des coupons avec import Excel et génération automatique de preuves optimales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Zero Excel Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-finixar-deep-blue mb-4">
              Zéro Excel, Zéro erreur
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Automatisez vos workflows et éliminez les erreurs manuelles grâce au dashboard temps réel de Finixar
            </p>
          </div>

          {/* Dashboard Screenshot Placeholder */}
          <div className="bg-white rounded-2xl shadow-2xl p-2 border border-slate-200">
            <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl aspect-video flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-20 h-20 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 text-lg font-medium">Aperçu du tableau de bord</p>
                <p className="text-slate-500 text-sm mt-2">(Screenshot à insérer ici)</p>
              </div>
            </div>
          </div>

          {/* Stats Below */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">
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
                    <h4 className="font-semibold text-finixar-deep-blue mb-1">Hébergement Souverain en France</h4>
                    <p className="text-slate-600 text-sm">
                      Vos données ne quittent jamais le territoire Français, garantissant une conformité totale avec les réglementations européennes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1">Chiffrement de bout en bout</h4>
                    <p className="text-slate-600 text-sm">
                      Toutes les communications et données stockées sont chiffrées avec les standards bancaires les plus élevés (AES-256).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1">Row-Level Security (RLS)</h4>
                    <p className="text-slate-600 text-sm">
                      Isolation complète des données entre organisations, garantissant que chaque entité accède uniquement à ses propres informations.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-finixar-deep-blue mb-1">Audit Trail Complet</h4>
                    <p className="text-slate-600 text-sm">
                      Traçabilité complète de toutes les actions effectuées sur la plateforme pour une transparence maximale.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Certifications Card */}
            <div className="bg-gradient-to-br from-finixar-deep-blue to-[#1a2642] rounded-2xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-8">Certifications & Conformité</h3>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-white font-semibold text-sm">ISO/IEC 27001</p>
                  <p className="text-slate-400 text-xs mt-1">Certifié</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-white font-semibold text-sm">RGPD</p>
                  <p className="text-slate-400 text-xs mt-1">100% Conforme</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6 text-purple-400" />
                  </div>
                  <p className="text-white font-semibold text-sm">SecNumCloud</p>
                  <p className="text-slate-400 text-xs mt-1">En cours</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-white font-semibold text-sm">SOC 2 Type II</p>
                  <p className="text-slate-400 text-xs mt-1">Certifié</p>
                </div>
              </div>

              <div className="bg-finixar-teal/20 backdrop-blur-sm rounded-xl p-4 border border-finixar-teal/30">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-finixar-teal flex-shrink-0 mt-0.5" />
                  <p className="text-white text-sm leading-relaxed">
                    <strong>Uptime garanti:</strong> 99.9% de disponibilité avec SLA contractuel et compensation automatique en cas de non-respect.
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
            Rejoignez les Asset Managers, Private Equity et Family Offices qui font confiance à Finixar pour gérer leurs investissements en toute sécurité.
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
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Entreprise</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">À propos</a></li>
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="mailto:contact@finixar.com" className="hover:text-white transition-colors">Carrières</a></li>
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
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <span>🇫🇷</span> Hébergé en France • Conforme RGPD
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

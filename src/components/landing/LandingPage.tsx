import { AlertTriangle, Clock, Shield, Lock, CheckCircle, ArrowRight, Menu, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Custom Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        html {
          scroll-behavior: smooth;
        }

        /* Professional hover transitions */
        .btn-transition {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-transition:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(46, 98, 255, 0.2);
        }

        .btn-transition:active {
          transform: scale(0.98);
        }

        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
        }

        /* Mockup aspect ratio */
        .mockup-container {
          aspect-ratio: 16 / 9;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
      `}</style>

      {/* 1. NAVIGATION BAR (Sticky Top) */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Area - 200px dedicated space */}
            <div className="w-[200px] flex items-center">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#2E62FF] rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-900">Finixar</span>
              </div>
            </div>

            {/* Center Links - Desktop */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#fonctionnalites" className="text-slate-700 hover:text-[#2E62FF] font-medium transition-colors">
                Fonctionnalités
              </a>
              <a href="#securite" className="text-slate-700 hover:text-[#2E62FF] font-medium transition-colors">
                Sécurité
              </a>
              <a href="#pour-qui" className="text-slate-700 hover:text-[#2E62FF] font-medium transition-colors">
                Pour qui ?
              </a>
              <a href="#tarifs" className="text-slate-700 hover:text-[#2E62FF] font-medium transition-colors">
                Tarifs
              </a>
            </div>

            {/* Right Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="http://app.finixar.com"
                className="px-5 py-2.5 text-slate-700 hover:text-slate-900 font-semibold transition-colors"
              >
                Connexion
              </a>
              <a
                href="mailto:contact@finixar.com?subject=Demande de démonstration"
                className="btn-transition px-6 py-2.5 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg"
              >
                Demander une démo
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <div className="flex flex-col gap-4">
                <a href="#fonctionnalites" className="text-slate-700 font-medium">Fonctionnalités</a>
                <a href="#securite" className="text-slate-700 font-medium">Sécurité</a>
                <a href="#pour-qui" className="text-slate-700 font-medium">Pour qui ?</a>
                <a href="#tarifs" className="text-slate-700 font-medium">Tarifs</a>
                <a href="http://app.finixar.com" className="text-slate-700 font-semibold">Connexion</a>
                <a
                  href="mailto:contact@finixar.com?subject=Demande de démonstration"
                  className="px-6 py-2.5 bg-[#2E62FF] text-white font-semibold rounded-lg text-center"
                >
                  Demander une démo
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* 2. HERO SECTION (The "Excel Killer") */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#F5F7FA] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                La fin des fichiers Excel pour la gestion d'actifs.
              </h1>

              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Centralisez vos projets, sécurisez vos données investisseurs et ne manquez plus aucune échéance de coupon. La plateforme SaaS dédiée aux gestionnaires d'actifs.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a
                  href="mailto:contact@finixar.com?subject=Demande de démonstration"
                  className="btn-transition inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg"
                >
                  Demander une démonstration
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a
                  href="http://app.finixar.com"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-lg border-2 border-slate-200 transition-colors"
                >
                  Accéder à la plateforme
                </a>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#2E62FF]" />
                  <span>Hébergé en France</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#2E62FF]" />
                  <span>Conforme RGPD</span>
                </div>
              </div>
            </div>

            {/* Right - Product Mockup */}
            <div>
              <div className="mockup-container shadow-2xl">
                {/* Placeholder for Dashboard Screenshot */}
                <div className="w-full h-full bg-white p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-sm text-slate-500 mb-1">Projets en cours</div>
                        <div className="text-3xl font-bold text-slate-900">12 projets actifs</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500 mb-1">Montant levé</div>
                        <div className="text-2xl font-bold text-[#2E62FF]">€24.5M</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900 text-sm">Projet {i}</div>
                            <div className="text-xs text-slate-500">Prochaine échéance: {15 + i} jours</div>
                          </div>
                          <div className="text-sm font-semibold text-slate-700">€{(Math.random() * 5 + 1).toFixed(1)}M</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE PROBLEM (Why You Exist) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Les risques de la gestion manuelle.
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Les fichiers Excel exposent votre structure à des risques opérationnels, réglementaires et financiers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 - Audit Risk */}
            <div className="card-hover bg-white rounded-xl p-8 border-2 border-slate-200">
              <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mb-6">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Risque d'audit
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Aucune traçabilité sur vos fichiers Excel. Prouver votre conformité devient un calvaire administratif.
              </p>
            </div>

            {/* Card 2 - Operational */}
            <div className="card-hover bg-white rounded-xl p-8 border-2 border-slate-200">
              <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Perte de temps
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Saisie manuelle, erreurs de calcul et dispersion des informations. Gagnez jusqu'à 15h par semaine.
              </p>
            </div>

            {/* Card 3 - Compliance */}
            <div className="card-hover bg-white rounded-xl p-8 border-2 border-slate-200">
              <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Non-conformité RGPD
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Stocker des RIB et données personnelles dans des fichiers locaux expose votre structure à des sanctions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. KEY FEATURES (Zig-Zag Layout with Mockups) */}
      <section id="fonctionnalites" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          {/* Block A: Project & Tranche Management */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            {/* Text Side */}
            <div>
              <div className="inline-block px-4 py-2 bg-blue-50 text-[#2E62FF] rounded-full text-sm font-semibold mb-6">
                Gestion de projets
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Pilotez vos levées de fonds avec précision.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Suivez chaque tranche d'investissement. Visualisez les montants engagés, les dates limites et l'état d'avancement de vos projets en un coup d'œil.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Suivi en temps réel de toutes les tranches</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Alertes automatiques sur les échéances</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Historique complet des modifications</span>
                </li>
              </ul>
            </div>

            {/* Image Side */}
            <div>
              <div className="mockup-container shadow-xl">
                <div className="w-full h-full bg-white p-6">
                  <div className="text-sm font-semibold text-slate-900 mb-4">Timeline des tranches</div>
                  <div className="space-y-3">
                    {[
                      { name: 'Tranche 1', status: 'Payée', amount: '€500K', color: 'bg-green-100 text-green-700' },
                      { name: 'Tranche 2', status: 'En cours', amount: '€750K', color: 'bg-blue-100 text-blue-700' },
                      { name: 'Tranche 3', status: 'À venir', amount: '€1.2M', color: 'bg-slate-100 text-slate-600' },
                    ].map((tranche, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 text-sm">{tranche.name}</div>
                          <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${tranche.color}`}>
                            {tranche.status}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-900">{tranche.amount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Block B: Investor CRM - Reversed */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            {/* Image Side */}
            <div className="order-2 lg:order-1">
              <div className="mockup-container shadow-xl">
                <div className="w-full h-full bg-white p-6">
                  <div className="text-sm font-semibold text-slate-900 mb-4">Profil investisseur</div>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-xs text-slate-500 mb-1">Nom complet</div>
                      <div className="font-semibold text-slate-900">Jean Dupont</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-xs text-slate-500 mb-1">Email</div>
                      <div className="font-semibold text-slate-900">jean.dupont@example.com</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">RIB</div>
                          <div className="font-mono text-sm text-slate-400">FR** **** **** **** ****</div>
                        </div>
                        <Lock className="w-4 h-4 text-[#2E62FF]" />
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Documents vérifiés</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Side */}
            <div className="order-1 lg:order-2">
              <div className="inline-block px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold mb-6">
                CRM investisseurs
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Un CRM investisseurs sécurisé.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Centralisez les données de vos investisseurs (personnes physiques et morales). Stockez les RIB et documents sensibles dans un environnement chiffré et conforme.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Base de données centralisée et sécurisée</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Chiffrement des données sensibles (RIB, documents)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Conformité RGPD garantie</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Block C: Coupon Automation */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text Side */}
            <div>
              <div className="inline-block px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-semibold mb-6">
                Automatisation
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Automatisation des coupons et échéances.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Finissez-en avec les oublis. Finixar calcule les échéances et vous envoie des rappels automatiques (J-30, J-7) pour garantir vos paiements. Importez et exportez vos données vers Excel en un clic.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Rappels automatiques par email (J-30, J-7)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Import/export Excel en un clic</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Suivi des statuts de paiement en temps réel</span>
                </li>
              </ul>
            </div>

            {/* Image Side */}
            <div>
              <div className="mockup-container shadow-xl">
                <div className="w-full h-full bg-white p-6">
                  <div className="text-sm font-semibold text-slate-900 mb-4">Échéancier des paiements</div>
                  <div className="space-y-2">
                    {[
                      { date: '15 Jan 2026', project: 'Projet Alpha', status: 'Payé', color: 'bg-green-100 text-green-700' },
                      { date: '28 Jan 2026', project: 'Projet Beta', status: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
                      { date: '05 Fév 2026', project: 'Projet Gamma', status: 'À venir', color: 'bg-blue-100 text-blue-700' },
                      { date: '12 Fév 2026', project: 'Projet Delta', status: 'À venir', color: 'bg-slate-100 text-slate-600' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{item.project}</div>
                          <div className="text-slate-500">{item.date}</div>
                        </div>
                        <div className={`px-2 py-1 rounded font-medium ${item.color}`}>
                          {item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECURITY & TECH (The Trust Factor) */}
      <section id="securite" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0B1120] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Une infrastructure de niveau bancaire.
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Vos données sont protégées par des standards de sécurité conformes aux exigences des institutions financières.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Security Feature 1 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                Hébergement souverain
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Données hébergées en France (Région Paris).
              </p>
            </div>

            {/* Security Feature 2 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                Sécurité des données
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Chiffrement SSL/TLS et isolation des bases de données (Row-Level Security).
              </p>
            </div>

            {/* Security Feature 3 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                Audit-Ready
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Historique complet des modifications pour une traçabilité totale.
              </p>
            </div>

            {/* Security Feature 4 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">
                Intégration Microsoft
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Authentification sécurisée via vos comptes professionnels existants.
              </p>
            </div>
          </div>

          {/* CTA in Security Section */}
          <div className="mt-16 text-center">
            <a
              href="mailto:contact@finixar.com?subject=Question sécurité"
              className="inline-flex items-center gap-2 text-white hover:text-blue-300 font-semibold transition-colors"
            >
              Questions sur la sécurité ?
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* For Who Section */}
      <section id="pour-qui" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Pour qui ?
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-12">
            Finixar est conçu pour les professionnels de la gestion d'actifs qui recherchent efficacité et conformité.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-6">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Gestionnaires d'actifs</h3>
              <p className="text-slate-600">Gérez vos fonds et investissements avec précision.</p>
            </div>
            <div className="p-6">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Family offices</h3>
              <p className="text-slate-600">Centralisez la gestion patrimoniale de vos clients.</p>
            </div>
            <div className="p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Fonds d'investissement</h3>
              <p className="text-slate-600">Automatisez le suivi de vos participations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="tarifs" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Tarifs sur mesure
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Nos tarifs s'adaptent à la taille de votre structure et au nombre d'utilisateurs. Contactez-nous pour obtenir un devis personnalisé.
          </p>
          <a
            href="mailto:contact@finixar.com?subject=Demande de tarifs"
            className="btn-transition inline-flex items-center gap-2 px-8 py-4 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg"
          >
            Demander un devis
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* 6. FOOTER (Corporate) */}
      <footer className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Column 1 - Logo & Description */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#2E62FF] rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-xl font-bold">Finixar</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                La plateforme de référence pour les gestionnaires d'actifs.
              </p>
            </div>

            {/* Column 2 - Produit */}
            <div>
              <h4 className="font-semibold text-white mb-4">Produit</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#fonctionnalites" className="text-slate-400 hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#securite" className="text-slate-400 hover:text-white transition-colors">Sécurité</a></li>
                <li><a href="#tarifs" className="text-slate-400 hover:text-white transition-colors">Mises à jour</a></li>
              </ul>
            </div>

            {/* Column 3 - Légal */}
            <div>
              <h4 className="font-semibold text-white mb-4">Légal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="mailto:contact@finixar.com?subject=Mentions légales" className="text-slate-400 hover:text-white transition-colors">Mentions légales</a></li>
                <li><a href="mailto:contact@finixar.com?subject=Politique de confidentialité" className="text-slate-400 hover:text-white transition-colors">Politique de confidentialité (RGPD)</a></li>
                <li><a href="mailto:contact@finixar.com?subject=CGU" className="text-slate-400 hover:text-white transition-colors">CGU</a></li>
              </ul>
            </div>

            {/* Column 4 - Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="mailto:contact@finixar.com" className="text-slate-400 hover:text-white transition-colors">Support client</a></li>
                <li><a href="mailto:contact@finixar.com?subject=Contact" className="text-slate-400 hover:text-white transition-colors">Nous contacter</a></li>
                <li className="text-slate-400">Bureau (Paris)</li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-8">
            <p className="text-center text-slate-400 text-sm">
              © 2026 Finixar. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

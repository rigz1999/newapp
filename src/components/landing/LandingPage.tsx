import { AlertTriangle, Clock, Shield, Lock, CheckCircle, ArrowRight, Menu, X, ChevronRight, Upload, TrendingUp, Users, FileText, BarChart3, UserCheck, Zap, Database } from 'lucide-react';
import { useState } from 'react';

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: 'ab974726-3370-4cf6-87d9-86fd1b48f519',
          email: email,
          subject: 'Nouvelle demande de démonstration',
          message: `Demande de démonstration depuis le site web. Email: ${email}`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus('success');
        setEmail('');
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          overflow: hidden;
        }

        .mockup-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>

      {/* NAVIGATION */}
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
              <a href="#modules" className="text-slate-700 hover:text-[#2E62FF] font-medium transition-colors">
                Modules
              </a>
              <a href="#tarifs" className="text-slate-700 hover:text-[#2E62FF] font-medium transition-colors">
                Tarifs
              </a>
            </div>

            {/* Right Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="https://app.finixar.com"
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
                <a href="#modules" className="text-slate-700 font-medium">Modules</a>
                <a href="#tarifs" className="text-slate-700 font-medium">Tarifs</a>
                <a href="https://app.finixar.com" className="text-slate-700 font-semibold">Connexion</a>
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

      {/* 1. HERO SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#F5F7FA] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                Récupérez 15 heures par semaine.
              </h1>

              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Finixar élimine les tâches manuelles de gestion d'actifs. Automatisez vos échéances, centralisez vos données investisseurs et restez conforme en permanence.
              </p>

              {/* Email CTA Form */}
              <form onSubmit={handleEmailSubmit} className="mb-8">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2E62FF] transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-transition inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        Voir une démo
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Success Message */}
                {submitStatus === 'success' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-green-800 font-semibold">Demande envoyée avec succès !</p>
                      <p className="text-green-700 text-sm mt-1">Nous vous contacterons dans les plus brefs délais.</p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {submitStatus === 'error' && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-800 font-semibold">Une erreur est survenue</p>
                      <p className="text-red-700 text-sm mt-1">Veuillez réessayer ou nous contacter à support@finixar.com</p>
                    </div>
                  </div>
                )}
              </form>

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
                <img src="/images/dashboard.png" alt="Tableau de bord Finixar" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROBLEMS SECTION - Excel uniquement vs Finixar */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Excel uniquement vs Finixar
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Les fichiers Excel exposent votre structure à des risques opérationnels, réglementaires et financiers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Left Column - Avec Excel uniquement */}
            <div className="bg-red-50 rounded-2xl p-8 border-2 border-red-100">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Avec Excel uniquement</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-sm">✕</span>
                  </div>
                  <span className="text-slate-700">Aucune traçabilité sur vos fichiers. Prouver votre conformité devient un calvaire administratif.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-sm">✕</span>
                  </div>
                  <span className="text-slate-700">Saisie manuelle répétitive et erreurs de calcul fréquentes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-sm">✕</span>
                  </div>
                  <span className="text-slate-700">Risques RGPD : sanctions pouvant atteindre 4% du chiffre d'affaires annuel.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-sm">✕</span>
                  </div>
                  <span className="text-slate-700">Dispersion des données entre plusieurs fichiers et versions.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-sm">✕</span>
                  </div>
                  <span className="text-slate-700">Rappels manuels d'échéances souvent oubliés.</span>
                </li>
              </ul>
            </div>

            {/* Right Column - Avec Finixar */}
            <div className="bg-green-50 rounded-2xl p-8 border-2 border-green-100">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Avec Finixar</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Historique complet des modifications pour une traçabilité totale.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Automatisation totale des calculs et saisies répétitives.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Conformité RGPD garantie avec chiffrement des données sensibles.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Base de données centralisée : une seule source de vérité.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Alertes automatiques par email (J-30, J-7) pour toutes vos échéances.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BENEFITS SECTION - HiBob style */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Des résultats mesurables.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Benefit 1 - Time Savings */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-[#2E62FF]" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">15h par semaine</div>
              <div className="text-sm font-semibold text-[#2E62FF] mb-3">Gain de temps</div>
              <p className="text-slate-600 leading-relaxed text-sm">
                Automatisation complète des rappels et calculs. Finissez-en avec les tâches répétitives.
              </p>
            </div>

            {/* Benefit 2 - Zero Errors */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-[#2E62FF]" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">98% moins d'erreurs</div>
              <div className="text-sm font-semibold text-[#2E62FF] mb-3">Précision maximale</div>
              <p className="text-slate-600 leading-relaxed text-sm">
                Calculs automatiques et vérifications intégrées éliminent les erreurs de saisie.
              </p>
            </div>

            {/* Benefit 3 - Compliance */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-[#2E62FF]" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">100% conforme</div>
              <div className="text-sm font-semibold text-[#2E62FF] mb-3">Audit-ready</div>
              <p className="text-slate-600 leading-relaxed text-sm">
                Traçabilité totale de toutes les opérations. Historique complet des modifications.
              </p>
            </div>

            {/* Benefit 4 - Migration */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <Upload className="w-8 h-8 text-[#2E62FF]" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-2">Migration simple</div>
              <div className="text-sm font-semibold text-[#2E62FF] mb-3">Import Excel</div>
              <p className="text-slate-600 leading-relaxed text-sm">
                Importez vos données Excel existantes sans refaire le travail. Export instantané.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURES - Zig-Zag Layout with Real Screenshots */}
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
                <img src="/images/project-detail.png" alt="Détails du projet avec timeline des tranches" />
              </div>
            </div>
          </div>

          {/* Block B: Investor CRM - Reversed */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            {/* Image Side */}
            <div className="order-2 lg:order-1">
              <div className="mockup-container shadow-xl">
                <img src="/images/investors-table.png" alt="Table des investisseurs" />
              </div>
            </div>

            {/* Text Side */}
            <div className="order-1 lg:order-2">
              <div className="inline-block px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold mb-6">
                Relations investisseurs
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
                <img src="/images/echeancier.png" alt="Échéancier des paiements" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MULTI-MODULE GRID - Origin style */}
      <section id="modules" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Une plateforme complète pour toute votre équipe.
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Finixar couvre l'ensemble de vos besoins en gestion d'actifs, de la levée de fonds au reporting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Module 1 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Gestion de projets
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Suivez vos levées de fonds de A à Z avec une vision claire sur chaque tranche.
              </p>
            </div>

            {/* Module 2 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Relations investisseurs
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Centralisez les données et RIB en toute sécurité dans un CRM dédié.
              </p>
            </div>

            {/* Module 3 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Échéancier & coupons
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Automatisez les rappels et évitez les oublis grâce aux notifications intelligentes.
              </p>
            </div>

            {/* Module 4 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Reporting & export
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Générez vos rapports Excel en un clic pour vos analyses et besoins de conformité.
              </p>
            </div>

            {/* Module 5 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Conformité & audit
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Traçabilité complète de toutes les opérations pour une conformité garantie.
              </p>
            </div>

            {/* Module 6 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Gestion d'équipe
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Droits d'accès granulaires et collaboration multi-utilisateurs en temps réel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. EMOTIONAL BENEFITS - HiBob "weekends" style */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Concentrez-vous sur ce qui compte vraiment.
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Finixar s'occupe des tâches administratives. Vous vous concentrez sur la stratégie d'investissement et la croissance de vos fonds.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {/* Benefit 1 */}
            <div className="text-left">
              <div className="text-6xl font-bold text-slate-200 mb-4">01</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Automatisation totale
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Les rappels, calculs et exports se font automatiquement. Plus de temps perdu sur des tâches répétitives sans valeur ajoutée.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="text-left">
              <div className="text-6xl font-bold text-slate-200 mb-4">02</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Collaboration fluide
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Toute l'équipe travaille sur la même base de données en temps réel. Fini les conflits de versions et les données obsolètes.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="text-left">
              <div className="text-6xl font-bold text-slate-200 mb-4">03</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Données toujours à jour
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Accédez instantanément aux dernières informations. Prenez vos décisions stratégiques sur des données fiables et actualisées.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECURITY SECTION - Flow inspired */}
      <section id="securite" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#1E40AF] to-[#2E62FF] text-white relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Une technologie de confiance.
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Vos données sont protégées par des standards de sécurité conformes aux exigences des institutions financières.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Security Feature 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                Hébergement souverain
              </h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Données hébergées en France (Région Paris).
              </p>
            </div>

            {/* Security Feature 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                Chiffrement des données
              </h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                SSL/TLS et isolation des bases de données (Row-Level Security).
              </p>
            </div>

            {/* Security Feature 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                Audit-ready
              </h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Historique complet des modifications pour une traçabilité totale.
              </p>
            </div>

            {/* Security Feature 4 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                Disponibilité système
              </h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Infrastructure haute disponibilité avec sauvegardes automatiques.
              </p>
            </div>

            {/* Security Feature 5 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">
                Authentification Microsoft
              </h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Connexion sécurisée via vos comptes professionnels existants.
              </p>
            </div>

            {/* Security Feature 6 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                Mises à jour continues
              </h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Améliorations régulières et patches de sécurité automatiques.
              </p>
            </div>
          </div>

          {/* CTA in Security Section */}
          <div className="mt-16 text-center">
            <a
              href="mailto:contact@finixar.com?subject=Question sécurité"
              className="inline-flex items-center gap-2 text-white hover:text-blue-200 font-semibold transition-colors"
            >
              Questions sur la sécurité ?
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* 8. PRICING with Dual CTAs */}
      <section id="tarifs" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Tarifs sur mesure
          </h2>
          <p className="text-xl text-slate-600 mb-12">
            Nos tarifs s'adaptent à la taille de votre structure et au nombre d'utilisateurs. Contactez-nous pour obtenir un devis personnalisé.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:contact@finixar.com?subject=Demande de tarifs"
              className="btn-transition inline-flex items-center gap-2 px-8 py-4 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg"
            >
              Demander un devis
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="mailto:contact@finixar.com?subject=Demande de démonstration"
              className="btn-transition inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-lg border-2 border-slate-200"
            >
              Voir une démo
            </a>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
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
                <li><a href="#modules" className="text-slate-400 hover:text-white transition-colors">Modules</a></li>
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

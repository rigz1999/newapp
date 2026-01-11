import {
  Clock,
  Shield,
  Lock,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Upload,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  UserCheck,
  Zap,
  Database,
  Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';

export function LandingPage(): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add SEO meta tags and structured data
  useEffect(() => {
    // Set page title
    document.title = "Finixar - Plateforme de Gestion d'Actifs | Automatisez votre Gestion";

    // Add meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Finixar automatise la gestion de vos actifs financiers. Récupérez 15h par semaine, éliminez 98% des erreurs. Gestion de projets, coupons et investisseurs en toute conformité RGPD.'
      );
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content =
        'Finixar automatise la gestion de vos actifs financiers. Récupérez 15h par semaine, éliminez 98% des erreurs. Gestion de projets, coupons et investisseurs en toute conformité RGPD.';
      document.head.appendChild(meta);
    }

    // Add OpenGraph meta tags
    const ogTags = [
      { property: 'og:title', content: "Finixar - Plateforme de Gestion d'Actifs" },
      {
        property: 'og:description',
        content:
          "Récupérez 15h par semaine et éliminez 98% des erreurs de gestion avec Finixar. Automatisation complète pour gestionnaires d'actifs.",
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://app.finixar.com' },
      { property: 'og:image', content: 'https://app.finixar.com/images/dashboard.png' },
      { property: 'og:locale', content: 'fr_FR' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: "Finixar - Plateforme de Gestion d'Actifs" },
      {
        name: 'twitter:description',
        content: 'Récupérez 15h par semaine et éliminez 98% des erreurs de gestion avec Finixar.',
      },
      { name: 'twitter:image', content: 'https://app.finixar.com/images/dashboard.png' },
    ];

    ogTags.forEach(tag => {
      const existing = document.querySelector(
        `meta[${tag.property ? 'property' : 'name'}="${tag.property || tag.name}"]`
      );
      if (existing) {
        existing.setAttribute('content', tag.content);
      } else {
        const meta = document.createElement('meta');
        if (tag.property) {
          meta.setAttribute('property', tag.property);
        } else if (tag.name) {
          meta.setAttribute('name', tag.name);
        }
        meta.content = tag.content;
        document.head.appendChild(meta);
      }
    });

    // Add structured data (Schema.org JSON-LD)
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Finixar',
      applicationCategory: 'BusinessApplication',
      description:
        "Plateforme de gestion d'actifs financiers pour automatiser vos échéances, centraliser vos données investisseurs et rester conforme RGPD.",
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
        description: 'Tarifs sur mesure selon la taille de votre structure',
      },
      operatingSystem: 'Web',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '50',
      },
      featureList: [
        'Gestion de projets et tranches',
        'Automatisation des coupons et échéances',
        'CRM investisseurs',
        'Conformité RGPD',
        'Rappels automatiques',
        'Import/Export Excel',
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Remove the script on unmount to avoid duplicates
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(s => {
        if (s.textContent?.includes('Finixar')) {
          s.remove();
        }
      });
    };
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (email) {
      setIsSubmitting(true);
      // Simulate a short delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.href = `/demo?email=${encodeURIComponent(email)}`;
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

        /* Mockup container */
        .mockup-container {
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 900px;
          margin: 0 auto;
        }

        .mockup-container img {
          width: 100%;
          height: auto;
          display: block;
        }
      `}</style>

      {/* NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Area - 200px dedicated space */}
            <div className="w-[200px] flex items-center">
              <a
                href="https://finixar.com"
                className="flex items-center"
                aria-label="Retour à la page d'accueil Finixar"
              >
                <div
                  style={{
                    width: '140px',
                    height: '40px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                  }}
                >
                  <img
                    src="/branding/logo/logo-full-blue.png"
                    alt="Logo Finixar - Plateforme de gestion d'actifs"
                    style={{
                      height: '40px',
                      width: 'auto',
                      transform: 'scale(0.95)',
                      transformOrigin: 'left center',
                    }}
                  />
                </div>
              </a>
            </div>

            {/* Center Links - Desktop */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Navigation principale">
              <a
                href="#fonctionnalites"
                className="text-slate-700 hover:text-[#2E62FF] font-medium transition-colors"
              >
                Fonctionnalités
              </a>
              <a
                href="#modules"
                className="text-slate-700 hover:text-[#2E62FF] font-medium transition-colors"
              >
                Modules
              </a>
              <a
                href="#securite"
                className="text-slate-700 hover:text-[#2E62FF] font-medium transition-colors"
              >
                Sécurité
              </a>
              <a
                href="#tarifs"
                className="text-slate-700 hover:text-[#2E62FF] font-medium transition-colors"
              >
                Tarifs
              </a>
            </nav>

            {/* Right Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="https://app.finixar.com"
                className="px-5 py-2.5 text-slate-700 hover:text-slate-900 font-semibold transition-colors"
              >
                Connexion
              </a>
              <a
                href="/demo"
                className="btn-transition px-6 py-2.5 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg"
              >
                Demander une démo
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700"
              aria-label="Menu de navigation"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden py-4 border-t border-slate-200">
              <nav className="flex flex-col gap-4" aria-label="Navigation mobile">
                <a
                  href="#fonctionnalites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-700 font-medium"
                >
                  Fonctionnalités
                </a>
                <a
                  href="#modules"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-700 font-medium"
                >
                  Modules
                </a>
                <a
                  href="#securite"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-700 font-medium"
                >
                  Sécurité
                </a>
                <a
                  href="#tarifs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-700 font-medium"
                >
                  Tarifs
                </a>
                <a href="https://app.finixar.com" className="text-slate-700 font-semibold">
                  Connexion
                </a>
                <a
                  href="/demo"
                  className="px-6 py-2.5 bg-[#2E62FF] text-white font-semibold rounded-lg text-center"
                >
                  Demander une démo
                </a>
              </nav>
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
                Finixar élimine les tâches manuelles de gestion d'actifs. Automatisez vos échéances,
                centralisez vos données investisseurs et restez conforme en permanence.
              </p>

              {/* Email CTA Form */}
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 mb-8">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2E62FF] transition-colors"
                  required
                  disabled={isSubmitting}
                  aria-label="Adresse email pour demander une démo"
                  aria-required="true"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-transition inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Soumettre le formulaire de demande de démo"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Demander une démo
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
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
                <img
                  src="/images/dashboard.png"
                  alt="Tableau de bord Finixar montrant les statistiques d'investissement en temps réel, graphiques de performance et alertes de paiement"
                  loading="eager"
                  width="900"
                  height="600"
                />
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
              Les fichiers Excel exposent votre structure à des risques opérationnels,
              réglementaires et financiers.
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
                  <span className="text-slate-700">
                    Aucune traçabilité sur vos fichiers. Prouver votre conformité devient un
                    calvaire administratif.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-sm">✕</span>
                  </div>
                  <span className="text-slate-700">
                    Saisie manuelle répétitive et erreurs de calcul fréquentes.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-sm">✕</span>
                  </div>
                  <span className="text-slate-700">
                    Risques RGPD : sanctions pouvant atteindre 4% du chiffre d'affaires annuel.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-sm">✕</span>
                  </div>
                  <span className="text-slate-700">
                    Dispersion des données entre plusieurs fichiers et versions.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 font-bold text-sm">✕</span>
                  </div>
                  <span className="text-slate-700">
                    Rappels manuels d'échéances souvent oubliés.
                  </span>
                </li>
              </ul>
            </div>

            {/* Right Column - Avec Finixar */}
            <div className="bg-green-50 rounded-2xl p-8 border-2 border-green-100">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Avec Finixar</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">
                    Historique complet des modifications pour une traçabilité totale.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">
                    Automatisation totale des calculs et saisies répétitives.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">
                    Conformité RGPD garantie avec chiffrement des données sensibles.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">
                    Base de données centralisée : une seule source de vérité.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">
                    Alertes automatiques par e-mail (J-30, J-7) pour toutes vos échéances.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BENEFITS SECTION - HiBob style */}
      <section className="pt-12 pb-20 px-4 sm:px-6 lg:px-8 bg-white">
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
                Automatisation complète des rappels et calculs. Finissez-en avec les tâches
                répétitives.
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
                Suivez chaque tranche d'investissement. Visualisez les montants engagés, les dates
                limites et l'état d'avancement de vos projets en un coup d'œil.
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
                <img
                  src="/images/project-detail.png"
                  alt="Interface de détails du projet Finixar affichant la timeline des tranches d'investissement, montants engagés et dates limites"
                  loading="lazy"
                  width="900"
                  height="600"
                />
              </div>
            </div>
          </div>

          {/* Block B: Coupon Management - Reversed */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            {/* Image Side */}
            <div className="order-2 lg:order-1">
              <div className="mockup-container shadow-xl">
                <img
                  src="/images/coupons.png"
                  alt="Tableau de gestion des coupons Finixar avec filtres par statut (En Attente, Payés, En Retard), montants détaillés et recherche avancée"
                  loading="lazy"
                  width="900"
                  height="600"
                />
              </div>
            </div>

            {/* Text Side */}
            <div className="order-1 lg:order-2">
              <div className="inline-block px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold mb-6">
                Gestion des coupons
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Centralisez vos coupons et échéances.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Visualisez tous vos coupons en un coup d'œil. Suivez les statuts (En Attente, Payés,
                En Retard), les montants et les échéances pour garantir un suivi parfait de vos
                paiements.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">
                    Vue d'ensemble complète de tous vos coupons
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">
                    Suivi des statuts en temps réel (En Attente, Payés, En Retard)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">
                    Filtres et recherche avancée par projet, tranche ou investisseur
                  </span>
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
                Échéancier automatisé et calculs précis.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Finixar calcule automatiquement toutes vos échéances de coupons. Visualisez votre
                calendrier de paiements, importez et exportez vos données vers Excel en un clic.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Calcul automatique de toutes les échéances</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Import/export Excel en un clic</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#2E62FF] mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Calendrier visuel des paiements à venir</span>
                </li>
              </ul>
            </div>

            {/* Image Side */}
            <div>
              <div className="mockup-container shadow-xl">
                <img
                  src="/images/echeancier.png"
                  alt="Calendrier d'échéancier Finixar affichant les paiements à venir avec calculs automatiques et export Excel"
                  loading="lazy"
                  width="900"
                  height="600"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4.5. PAYMENT REMINDERS AUTOMATION - Centered Card Style */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-6xl mx-auto">
          {/* Header - Centered */}
          <div className="text-center mb-10">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
              Automatisation des rappels
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Rappels de paiement automatiques.
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Configurez vos rappels en un clic. E-mails automatiques à J-7, J-14 et J-30.
            </p>
          </div>

          {/* Content - Side by Side */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Image */}
            <div className="flex justify-center md:justify-end">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-1 w-full max-w-md">
                <img
                  src="/images/reminders.png"
                  alt="Interface de configuration des rappels automatiques de paiement avec sélection des périodes J-7, J-14 et J-30"
                  className="w-full rounded-xl"
                  loading="lazy"
                  width="500"
                  height="400"
                />
              </div>
            </div>

            {/* Right - Features */}
            <div className="flex flex-col justify-center space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-[#2E62FF]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    E-mails automatiques à J-7, J-14 et J-30
                  </h3>
                  <p className="text-sm text-slate-600">
                    Vos investisseurs reçoivent des rappels avant chaque échéance
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-[#2E62FF]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Envoi quotidien à 7h00</h3>
                  <p className="text-sm text-slate-600">
                    Aucune intervention requise, tout est automatisé
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-[#2E62FF]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Configuration simple</h3>
                  <p className="text-sm text-slate-600">
                    Activez ou désactivez les périodes de rappel par cases à cocher
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-[#2E62FF]" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Zéro oubli de paiement</h3>
                  <p className="text-sm text-slate-600">
                    Garantit que tous vos coupons sont payés à temps
                  </p>
                </div>
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
              Finixar couvre l'ensemble de vos besoins en gestion d'actifs, de la levée de fonds au
              reporting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Module 1 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Gestion de projets</h3>
              <p className="text-slate-600 leading-relaxed">
                Suivez vos levées de fonds de A à Z avec une vision claire sur chaque tranche.
              </p>
            </div>

            {/* Module 2 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Relations investisseurs</h3>
              <p className="text-slate-600 leading-relaxed">
                Centralisez les données et RIB en toute sécurité dans un CRM dédié.
              </p>
            </div>

            {/* Module 3 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Échéancier & coupons</h3>
              <p className="text-slate-600 leading-relaxed">
                Automatisez les rappels et évitez les oublis grâce aux notifications intelligentes.
              </p>
            </div>

            {/* Module 4 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Reporting & export</h3>
              <p className="text-slate-600 leading-relaxed">
                Générez vos rapports Excel en un clic pour vos analyses et besoins de conformité.
              </p>
            </div>

            {/* Module 5 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Conformité & audit</h3>
              <p className="text-slate-600 leading-relaxed">
                Traçabilité complète de toutes les opérations pour une conformité garantie.
              </p>
            </div>

            {/* Module 6 */}
            <div className="bg-white rounded-xl p-8 border-2 border-slate-200 hover:border-[#2E62FF] transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6 text-[#2E62FF]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Gestion d'équipe</h3>
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
              Finixar s'occupe des tâches administratives. Vous vous concentrez sur le sourcing de
              projets et la relation avec vos investisseurs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {/* Benefit 1 */}
            <div className="text-left">
              <div className="text-6xl font-bold text-slate-200 mb-4">01</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Automatisation totale</h3>
              <p className="text-slate-600 leading-relaxed">
                Les rappels, calculs et exports se font automatiquement. Plus de temps perdu sur des
                tâches répétitives sans valeur ajoutée.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="text-left">
              <div className="text-6xl font-bold text-slate-200 mb-4">02</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Collaboration fluide</h3>
              <p className="text-slate-600 leading-relaxed">
                Toute l'équipe travaille sur la même base de données en temps réel. Fini les
                conflits de versions et les données obsolètes.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="text-left">
              <div className="text-6xl font-bold text-slate-200 mb-4">03</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Données toujours à jour</h3>
              <p className="text-slate-600 leading-relaxed">
                Accédez instantanément aux dernières informations. Prenez vos décisions stratégiques
                sur des données fiables et actualisées.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECURITY SECTION - Flow inspired */}
      <section
        id="securite"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#1E40AF] to-[#2E62FF] text-white relative overflow-hidden"
      >
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Une technologie de confiance.</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Vos données sont protégées par des standards de sécurité conformes aux exigences des
              institutions financières.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Security Feature 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Hébergement souverain</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Données hébergées en France (Région Paris).
              </p>
            </div>

            {/* Security Feature 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Chiffrement des données</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                SSL/TLS et isolation des bases de données (Row-Level Security).
              </p>
            </div>

            {/* Security Feature 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Audit-ready</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Historique complet des modifications pour une traçabilité totale.
              </p>
            </div>

            {/* Security Feature 4 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Disponibilité système</h3>
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
              <h3 className="text-lg font-bold mb-2">Authentification Microsoft</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Connexion sécurisée via vos comptes professionnels existants.
              </p>
            </div>

            {/* Security Feature 6 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Mises à jour continues</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Améliorations régulières et patches de sécurité automatiques.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRICING with Dual CTAs */}
      <section id="tarifs" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Tarifs sur mesure</h2>
          <p className="text-xl text-slate-600 mb-12">
            Nos tarifs s'adaptent à la taille de votre structure et au nombre d'utilisateurs.
            Contactez-nous pour obtenir un devis personnalisé.
          </p>
          <div className="flex items-center justify-center">
            <a
              href="/demo"
              className="btn-transition inline-flex items-center gap-2 px-8 py-4 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg"
            >
              Demander un devis
              <ArrowRight className="w-5 h-5" />
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
              <div className="mb-4">
                <img
                  src="/branding/logo/logo-full-white.png"
                  alt="Logo Finixar - Plateforme de gestion d'actifs"
                  className="h-8"
                  loading="lazy"
                  width="128"
                  height="32"
                />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                La plateforme de référence pour les gestionnaires d'actifs.
              </p>
            </div>

            {/* Column 2 - Produit */}
            <div>
              <h4 className="font-semibold text-white mb-4">Produit</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="#fonctionnalites"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#securite" className="text-slate-400 hover:text-white transition-colors">
                    Sécurité
                  </a>
                </li>
                <li>
                  <a href="#modules" className="text-slate-400 hover:text-white transition-colors">
                    Modules
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3 - Légal */}
            <div>
              <h4 className="font-semibold text-white mb-4">Légal</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="mailto:contact@finixar.com?subject=Mentions légales"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Mentions légales
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contact@finixar.com?subject=Politique de confidentialité"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Politique de confidentialité (RGPD)
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contact@finixar.com?subject=CGU"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    CGU
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4 - Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="mailto:contact@finixar.com"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Support client
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contact@finixar.com?subject=Contact"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Nous contacter
                  </a>
                </li>
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

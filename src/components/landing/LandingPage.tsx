import {
  Shield,
  Lock,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Zap,
  Database,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Custom Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        :root {
          --navy: #0A1628;
          --navy-light: #1A2942;
          --gold: #B8965F;
          --gold-light: #D4AF7A;
          --slate: #475569;
          --slate-light: #64748B;
          --border: #E2E8F0;
        }

        * {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        h1, h2, h3, h4, h5, h6, .heading-font {
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        html {
          scroll-behavior: smooth;
        }

        /* Sophisticated animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        /* Premium button transitions */
        .btn-primary {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .btn-primary:hover::before {
          left: 100%;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(10, 22, 40, 0.2);
        }

        /* Card hover effects */
        .card-hover {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 60px rgba(10, 22, 40, 0.12);
        }

        /* Gradient mesh background */
        .gradient-mesh {
          background:
            radial-gradient(at 0% 0%, rgba(184, 150, 95, 0.08) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(10, 22, 40, 0.05) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(184, 150, 95, 0.06) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(10, 22, 40, 0.03) 0px, transparent 50%);
        }

        /* Premium underline effect */
        .link-underline {
          position: relative;
        }

        .link-underline::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--gold);
          transition: width 0.3s ease;
        }

        .link-underline:hover::after {
          width: 100%;
        }

        /* Scroll indicator */
        .scroll-indicator {
          animation: float 2s ease-in-out infinite;
        }
      `}</style>

      {/* NAVIGATION */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-lg shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-[var(--navy)] to-[var(--navy-light)] rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-6 h-6 text-[var(--gold)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <span className="text-2xl font-bold heading-font text-[var(--navy)]">Finixar</span>
            </div>

            {/* Center Links - Desktop */}
            <div className="hidden lg:flex items-center gap-10">
              <a
                href="#fonctionnalites"
                className="text-[var(--slate)] hover:text-[var(--navy)] font-medium transition-colors link-underline"
              >
                Fonctionnalités
              </a>
              <a
                href="#securite"
                className="text-[var(--slate)] hover:text-[var(--navy)] font-medium transition-colors link-underline"
              >
                Sécurité
              </a>
              <a
                href="#modules"
                className="text-[var(--slate)] hover:text-[var(--navy)] font-medium transition-colors link-underline"
              >
                Modules
              </a>
              <a
                href="#tarifs"
                className="text-[var(--slate)] hover:text-[var(--navy)] font-medium transition-colors link-underline"
              >
                Tarifs
              </a>
            </div>

            {/* Right Buttons - Desktop */}
            <div className="hidden lg:flex items-center gap-4">
              <a
                href="https://app.finixar.com"
                className="px-6 py-2.5 text-[var(--navy)] hover:text-[var(--gold)] font-semibold transition-colors"
              >
                Connexion
              </a>
              <a
                href="mailto:contact@finixar.com?subject=Demande de démonstration"
                className="btn-primary px-7 py-3 bg-[var(--navy)] hover:bg-[var(--navy-light)] text-white font-semibold rounded-xl"
              >
                Demander une démo
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[var(--navy)]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-6 border-t border-[var(--border)] bg-white">
              <div className="flex flex-col gap-5">
                <a href="#fonctionnalites" className="text-[var(--slate)] font-medium">
                  Fonctionnalités
                </a>
                <a href="#securite" className="text-[var(--slate)] font-medium">
                  Sécurité
                </a>
                <a href="#modules" className="text-[var(--slate)] font-medium">
                  Modules
                </a>
                <a href="#tarifs" className="text-[var(--slate)] font-medium">
                  Tarifs
                </a>
                <a href="https://app.finixar.com" className="text-[var(--navy)] font-semibold">
                  Connexion
                </a>
                <a
                  href="mailto:contact@finixar.com?subject=Demande de démonstration"
                  className="px-7 py-3 bg-[var(--navy)] text-white font-semibold rounded-xl text-center"
                >
                  Demander une démo
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-40 pb-24 px-6 lg:px-8 gradient-mesh relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[var(--gold)]/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[var(--navy)]/5 to-transparent rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text */}
            <div className="animate-fade-in-up">
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-full mb-8 shadow-sm">
                <Shield className="w-4 h-4 text-[var(--gold)]" />
                <span className="text-sm font-medium text-[var(--slate)]">
                  Conforme RGPD • Hébergé en France
                </span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold heading-font text-[var(--navy)] mb-8 leading-[1.1]">
                Récupérez
                <br />
                <span className="text-[var(--gold)]">15 heures</span>
                <br />
                par semaine
              </h1>

              <p className="text-xl text-[var(--slate)] mb-10 leading-relaxed max-w-xl">
                Finixar élimine les tâches manuelles de gestion d'actifs. Automatisez vos échéances,
                centralisez vos données et restez conforme en permanence.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <a
                  href="mailto:contact@finixar.com?subject=Demande de démonstration"
                  className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--navy)] text-white font-semibold rounded-xl"
                >
                  Voir une démo
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a
                  href="#fonctionnalites"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-[var(--border)] text-[var(--navy)] font-semibold rounded-xl hover:border-[var(--gold)] transition-colors"
                >
                  En savoir plus
                </a>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 text-sm">
                <div>
                  <div className="text-2xl font-bold heading-font text-[var(--navy)]">98%</div>
                  <div className="text-[var(--slate)]">moins d'erreurs</div>
                </div>
                <div className="w-px h-12 bg-[var(--border)]"></div>
                <div>
                  <div className="text-2xl font-bold heading-font text-[var(--navy)]">100%</div>
                  <div className="text-[var(--slate)]">conforme</div>
                </div>
                <div className="w-px h-12 bg-[var(--border)]"></div>
                <div>
                  <div className="text-2xl font-bold heading-font text-[var(--navy)]">15h</div>
                  <div className="text-[var(--slate)]">économisées/sem.</div>
                </div>
              </div>
            </div>

            {/* Right - Product Visual */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[var(--border)] bg-white animate-float">
                <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100">
                  <img
                    src="/images/dashboard.png"
                    alt="Tableau de bord Finixar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              {/* Decorative accent */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-[var(--gold)] rounded-2xl -z-10 opacity-20"></div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center mt-20">
            <a
              href="#problemes"
              className="scroll-indicator flex flex-col items-center gap-2 text-[var(--slate)] hover:text-[var(--gold)] transition-colors"
            >
              <span className="text-sm font-medium">Découvrir</span>
              <ChevronDown className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* PROBLEMS SECTION */}
      <section id="problemes" className="py-24 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-semibold mb-6">
              Le problème Excel
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold heading-font text-[var(--navy)] mb-6">
              Excel vous expose à des risques
            </h2>
            <p className="text-xl text-[var(--slate)] max-w-3xl mx-auto">
              Les fichiers Excel créent des vulnérabilités opérationnelles, réglementaires et
              financières majeures.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
            {/* Left - Avec Excel */}
            <div className="relative rounded-2xl p-10 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-100">
              <div className="absolute top-8 right-8">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold heading-font text-[var(--navy)] mb-8">
                Avec Excel uniquement
              </h3>
              <ul className="space-y-5">
                {[
                  'Aucune traçabilité : prouver votre conformité devient impossible',
                  'Saisie manuelle répétitive avec erreurs de calcul fréquentes',
                  "Risques RGPD : sanctions jusqu'à 4% du CA annuel",
                  'Données dispersées entre fichiers et versions multiples',
                  "Rappels d'échéances manuels souvent oubliés",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <X className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[var(--slate)] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right - Avec Finixar */}
            <div className="relative rounded-2xl p-10 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100">
              <div className="absolute top-8 right-8">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold heading-font text-[var(--navy)] mb-8">
                Avec Finixar
              </h3>
              <ul className="space-y-5">
                {[
                  'Historique complet et traçabilité totale de toutes les opérations',
                  'Automatisation complète : zéro saisie manuelle, zéro erreur',
                  'Conformité RGPD garantie avec chiffrement des données',
                  'Base de données centralisée : une seule source de vérité',
                  'Alertes automatiques intelligentes (J-30, J-7) par email',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[var(--slate)] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS METRICS */}
      <section className="py-24 px-6 lg:px-8 bg-[var(--navy)] text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--gold)] rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold heading-font mb-6">
              Des résultats mesurables
            </h2>
            <p className="text-xl text-blue-100">
              Impact quantifiable sur votre productivité et votre conformité
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Clock,
                metric: '15h par semaine',
                label: 'Gain de temps',
                desc: 'Automatisation complète des tâches répétitives',
              },
              {
                icon: CheckCircle,
                metric: '98%',
                label: "Moins d'erreurs",
                desc: 'Calculs automatiques et vérifications intégrées',
              },
              {
                icon: Shield,
                metric: '100%',
                label: 'Conformité',
                desc: 'Audit-ready avec traçabilité complète',
              },
              {
                icon: TrendingUp,
                metric: 'ROI immédiat',
                label: 'Retour sur investissement',
                desc: "Rentabilisé dès le premier mois d'utilisation",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="card-hover bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
              >
                <div className="w-14 h-14 bg-[var(--gold)]/20 rounded-xl flex items-center justify-center mb-6">
                  <item.icon className="w-7 h-7 text-[var(--gold)]" />
                </div>
                <div className="text-3xl font-bold heading-font mb-2">{item.metric}</div>
                <div className="text-sm font-semibold text-[var(--gold)] mb-3">{item.label}</div>
                <p className="text-blue-100 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES - Zig-Zag */}
      <section id="fonctionnalites" className="py-24 px-6 lg:px-8 bg-[#FAFBFC]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold mb-6">
              Fonctionnalités
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold heading-font text-[var(--navy)] mb-6">
              Une plateforme complète
            </h2>
          </div>

          {/* Feature 1 - Project Management */}
          <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold mb-6">
                <TrendingUp className="w-4 h-4" />
                Gestion de projets
              </div>
              <h3 className="text-3xl lg:text-4xl font-bold heading-font text-[var(--navy)] mb-6">
                Pilotez vos levées de fonds avec précision
              </h3>
              <p className="text-lg text-[var(--slate)] leading-relaxed mb-8">
                Suivez chaque tranche d'investissement. Visualisez les montants engagés, les dates
                limites et l'état d'avancement en temps réel.
              </p>
              <ul className="space-y-4">
                {[
                  'Suivi en temps réel de toutes les tranches',
                  'Alertes automatiques sur les échéances critiques',
                  'Historique complet des modifications',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-[var(--gold)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-[var(--gold)]" />
                    </div>
                    <span className="text-[var(--slate)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-xl border border-[var(--border)] bg-white">
                <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100">
                  <img
                    src="/images/project-detail.png"
                    alt="Gestion de projets"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-blue-500 rounded-2xl -z-10 opacity-10"></div>
            </div>
          </div>

          {/* Feature 2 - Investor CRM - Reversed */}
          <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">
            <div className="order-2 lg:order-1 relative">
              <div className="rounded-2xl overflow-hidden shadow-xl border border-[var(--border)] bg-white">
                <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100">
                  <img
                    src="/images/investors-table.png"
                    alt="CRM Investisseurs"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-emerald-500 rounded-2xl -z-10 opacity-10"></div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-sm font-semibold mb-6">
                <Users className="w-4 h-4" />
                Relations investisseurs
              </div>
              <h3 className="text-3xl lg:text-4xl font-bold heading-font text-[var(--navy)] mb-6">
                Un CRM investisseurs sécurisé
              </h3>
              <p className="text-lg text-[var(--slate)] leading-relaxed mb-8">
                Centralisez les données de vos investisseurs. Stockez les RIB et documents sensibles
                dans un environnement chiffré et conforme RGPD.
              </p>
              <ul className="space-y-4">
                {[
                  'Base de données centralisée et sécurisée',
                  'Chiffrement des données sensibles (RIB, documents)',
                  'Conformité RGPD garantie par design',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-[var(--gold)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-[var(--gold)]" />
                    </div>
                    <span className="text-[var(--slate)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 3 - Automation */}
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-full text-sm font-semibold mb-6">
                <Zap className="w-4 h-4" />
                Automatisation
              </div>
              <h3 className="text-3xl lg:text-4xl font-bold heading-font text-[var(--navy)] mb-6">
                Automatisation des coupons et échéances
              </h3>
              <p className="text-lg text-[var(--slate)] leading-relaxed mb-8">
                Finissez-en avec les oublis. Finixar calcule les échéances et envoie des rappels
                automatiques pour garantir vos paiements.
              </p>
              <ul className="space-y-4">
                {[
                  'Rappels automatiques intelligents (J-30, J-7)',
                  'Import/export Excel en un clic',
                  'Suivi des statuts de paiement en temps réel',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-[var(--gold)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-[var(--gold)]" />
                    </div>
                    <span className="text-[var(--slate)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-xl border border-[var(--border)] bg-white">
                <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100">
                  <img
                    src="/images/echeancier.png"
                    alt="Automatisation"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-purple-500 rounded-2xl -z-10 opacity-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES GRID */}
      <section id="modules" className="py-24 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-2 bg-[var(--gold)]/10 text-[var(--gold)] rounded-full text-sm font-semibold mb-6">
              Modules
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold heading-font text-[var(--navy)] mb-6">
              Une solution complète pour votre équipe
            </h2>
            <p className="text-xl text-[var(--slate)] max-w-3xl mx-auto">
              Finixar couvre l'ensemble de vos besoins en gestion d'actifs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: 'Gestion de projets',
                desc: 'Suivez vos levées de fonds de A à Z',
              },
              {
                icon: Users,
                title: 'Relations investisseurs',
                desc: 'CRM dédié avec données sécurisées',
              },
              {
                icon: FileText,
                title: 'Échéancier & coupons',
                desc: 'Automatisez les rappels et paiements',
              },
              { icon: BarChart3, title: 'Reporting & export', desc: 'Rapports Excel en un clic' },
              { icon: Shield, title: 'Conformité & audit', desc: 'Traçabilité complète garantie' },
              {
                icon: Database,
                title: "Gestion d'équipe",
                desc: 'Collaboration temps réel multi-utilisateurs',
              },
            ].map((module, i) => (
              <div
                key={i}
                className="card-hover bg-white rounded-2xl p-8 border-2 border-[var(--border)]"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-[var(--navy)]/10 to-[var(--gold)]/10 rounded-xl flex items-center justify-center mb-6">
                  <module.icon className="w-7 h-7 text-[var(--navy)]" />
                </div>
                <h3 className="text-xl font-bold heading-font text-[var(--navy)] mb-3">
                  {module.title}
                </h3>
                <p className="text-[var(--slate)] leading-relaxed">{module.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY SECTION */}
      <section
        id="securite"
        className="py-24 px-6 lg:px-8 bg-gradient-to-br from-[var(--navy)] via-[var(--navy-light)] to-[var(--navy)] text-white relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[var(--gold)] rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-2 bg-white/10 text-white rounded-full text-sm font-semibold mb-6">
              Sécurité & Conformité
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold heading-font mb-6">
              Une technologie de confiance
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Standards de sécurité conformes aux exigences des institutions financières
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'Hébergement souverain',
                desc: 'Données hébergées en France (Paris)',
              },
              {
                icon: Lock,
                title: 'Chiffrement des données',
                desc: 'SSL/TLS et Row-Level Security',
              },
              {
                icon: CheckCircle,
                title: 'Audit-ready',
                desc: 'Historique complet des modifications',
              },
              {
                icon: Database,
                title: 'Haute disponibilité',
                desc: 'Infrastructure redondante avec backups',
              },
              {
                icon: Users,
                title: 'Auth. Microsoft',
                desc: 'Connexion via comptes professionnels',
              },
              {
                icon: Zap,
                title: 'Mises à jour continues',
                desc: 'Patches de sécurité automatiques',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
              >
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold heading-font mb-3">{feature.title}</h3>
                <p className="text-blue-100 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" className="py-24 px-6 lg:px-8 bg-[#FAFBFC]">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-2 bg-[var(--gold)]/10 text-[var(--gold)] rounded-full text-sm font-semibold mb-6">
            Tarifs
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold heading-font text-[var(--navy)] mb-6">
            Tarifs sur mesure
          </h2>
          <p className="text-xl text-[var(--slate)] mb-12 max-w-2xl mx-auto">
            Nos tarifs s'adaptent à la taille de votre structure et au nombre d'utilisateurs.
            Contactez-nous pour un devis personnalisé.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:contact@finixar.com?subject=Demande de démonstration"
              className="btn-primary inline-flex items-center gap-2 px-8 py-4 bg-[var(--navy)] text-white font-semibold rounded-xl"
            >
              Demander une démo
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="mailto:contact@finixar.com?subject=Demande de tarifs"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-[var(--border)] text-[var(--navy)] font-semibold rounded-xl hover:border-[var(--gold)] transition-colors"
            >
              Demander un devis
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[var(--navy)] text-white py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            {/* Column 1 */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-[var(--gold)] rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <span className="text-2xl font-bold heading-font">Finixar</span>
              </div>
              <p className="text-blue-200 leading-relaxed">
                La plateforme de référence pour les gestionnaires d'actifs
              </p>
            </div>

            {/* Column 2 */}
            <div>
              <h4 className="font-bold heading-font text-white mb-6">Produit</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#fonctionnalites"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#securite" className="text-blue-200 hover:text-white transition-colors">
                    Sécurité
                  </a>
                </li>
                <li>
                  <a href="#modules" className="text-blue-200 hover:text-white transition-colors">
                    Modules
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3 */}
            <div>
              <h4 className="font-bold heading-font text-white mb-6">Légal</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:contact@finixar.com?subject=Mentions légales"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    Mentions légales
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contact@finixar.com?subject=Politique RGPD"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    Politique RGPD
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contact@finixar.com?subject=CGU"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    CGU
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4 */}
            <div>
              <h4 className="font-bold heading-font text-white mb-6">Contact</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:contact@finixar.com"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    Support client
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contact@finixar.com?subject=Contact"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    Nous contacter
                  </a>
                </li>
                <li className="text-blue-200">Paris, France</li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-blue-200 text-sm">© 2026 Finixar. Tous droits réservés.</p>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--gold)]" />
              <span className="text-blue-200 text-sm">Conforme RGPD • Hébergé en France</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import {
  Shield,
  Lock,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Zap,
  Database,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronRight,
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
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Custom Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=General+Sans:wght@400;500;600;700&display=swap');

        :root {
          --finixar-blue: #2E62FF;
          --electric-blue: #3B82F6;
          --cyan: #06B6D4;
          --dark-navy: #0F172A;
          --slate-900: #0F172A;
          --slate-700: #334155;
          --slate-500: #64748B;
        }

        * {
          font-family: 'General Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        h1, h2, h3, h4, h5, h6, .clash {
          font-family: 'Clash Display', sans-serif;
          letter-spacing: -0.03em;
        }

        html {
          scroll-behavior: smooth;
        }

        /* Animated gradient background */
        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .gradient-animate {
          background: linear-gradient(135deg, #2E62FF 0%, #3B82F6 25%, #06B6D4 50%, #3B82F6 75%, #2E62FF 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }

        /* Morphing blob */
        @keyframes morphBlob {
          0%, 100% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
            transform: rotate(0deg) scale(1);
          }
          25% {
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
            transform: rotate(90deg) scale(1.1);
          }
          50% {
            border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%;
            transform: rotate(180deg) scale(0.9);
          }
          75% {
            border-radius: 70% 30% 50% 50% / 30% 50% 50% 70%;
            transform: rotate(270deg) scale(1.05);
          }
        }

        .blob {
          animation: morphBlob 20s ease-in-out infinite;
        }

        /* Diagonal section divider */
        .diagonal-top {
          clip-path: polygon(0 0, 100% 0, 100% calc(100% - 80px), 0 100%);
        }

        .diagonal-bottom {
          clip-path: polygon(0 80px, 100% 0, 100% 100%, 0 100%);
        }

        /* Floating animation */
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-20px) rotate(2deg);
          }
          66% {
            transform: translateY(-10px) rotate(-2deg);
          }
        }

        .float {
          animation: float 6s ease-in-out infinite;
        }

        /* Staggered fade in */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .delay-100 { animation-delay: 0.1s; opacity: 0; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; }
        .delay-400 { animation-delay: 0.4s; opacity: 0; }

        /* Magnetic hover effect */
        .magnetic-button {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .magnetic-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 60px rgba(46, 98, 255, 0.4);
        }

        .magnetic-button::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(135deg, #2E62FF, #06B6D4);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .magnetic-button:hover::before {
          opacity: 1;
        }

        /* Card tilt effect */
        .card-3d {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-3d:hover {
          transform: translateY(-12px) rotateX(2deg);
          box-shadow:
            0 30px 80px rgba(46, 98, 255, 0.15),
            0 10px 30px rgba(6, 182, 212, 0.1);
        }

        /* Pulsing glow */
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(46, 98, 255, 0.4);
          }
          50% {
            box-shadow: 0 0 40px rgba(46, 98, 255, 0.8);
          }
        }

        .pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        /* Text gradient */
        .text-gradient {
          background: linear-gradient(135deg, #2E62FF 0%, #06B6D4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Shine effect */
        @keyframes shine {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        .shine-effect {
          position: relative;
          overflow: hidden;
        }

        .shine-effect::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shine 3s ease-in-out infinite;
        }
      `}</style>

      {/* NAVIGATION */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-lg border-b border-slate-200'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 gradient-animate rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold clash text-slate-900">Finixar</span>
            </div>

            {/* Center Links - Desktop */}
            <div className="hidden lg:flex items-center gap-8">
              {['Fonctionnalités', 'Sécurité', 'Modules', 'Tarifs'].map((item, i) => (
                <a
                  key={i}
                  href={`#${item
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')}`}
                  className="text-slate-700 hover:text-[var(--finixar-blue)] font-medium transition-all relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[var(--finixar-blue)] to-[var(--cyan)] transition-all group-hover:w-full"></span>
                </a>
              ))}
            </div>

            {/* Right Buttons - Desktop */}
            <div className="hidden lg:flex items-center gap-4">
              <a
                href="https://app.finixar.com"
                className="px-5 py-2 text-slate-700 hover:text-slate-900 font-semibold transition-colors"
              >
                Connexion
              </a>
              <a
                href="mailto:contact@finixar.com?subject=Demande de démonstration"
                className="magnetic-button px-6 py-3 gradient-animate text-white font-semibold rounded-xl"
              >
                Demander une démo
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-6 border-t border-slate-200">
              <div className="flex flex-col gap-5">
                {['Fonctionnalités', 'Sécurité', 'Modules', 'Tarifs'].map((item, i) => (
                  <a
                    key={i}
                    href={`#${item
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')}`}
                    className="text-slate-700 font-medium"
                  >
                    {item}
                  </a>
                ))}
                <a href="https://app.finixar.com" className="text-slate-900 font-semibold">
                  Connexion
                </a>
                <a
                  href="mailto:contact@finixar.com?subject=Demande de démonstration"
                  className="px-6 py-3 gradient-animate text-white font-semibold rounded-xl text-center"
                >
                  Demander une démo
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center pt-20 pb-32 px-6 lg:px-8 overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="blob absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[var(--finixar-blue)]/20 to-[var(--cyan)]/10 blur-3xl"></div>
          <div
            className="blob absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[var(--electric-blue)]/15 to-transparent blur-3xl"
            style={{ animationDelay: '-10s' }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text */}
            <div>
              {/* Trust badge */}
              <div className="fade-in-up inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-8">
                <Shield className="w-4 h-4 text-[var(--finixar-blue)]" />
                <span className="text-sm font-semibold text-[var(--finixar-blue)]">
                  Conforme RGPD • Hébergé en France
                </span>
              </div>

              <h1 className="fade-in-up delay-100 text-6xl lg:text-8xl font-bold clash text-slate-900 mb-8 leading-[0.95]">
                Récupérez <span className="text-gradient shine-effect inline-block">15 heures</span>
                <br />
                par semaine
              </h1>

              <p className="fade-in-up delay-200 text-xl text-slate-600 mb-12 leading-relaxed max-w-xl font-medium">
                Finixar élimine les tâches manuelles de gestion d'actifs. Automatisez vos échéances,
                centralisez vos données et restez conforme.
              </p>

              {/* CTA Buttons */}
              <div className="fade-in-up delay-300 flex flex-col sm:flex-row gap-4 mb-16">
                <a
                  href="mailto:contact@finixar.com?subject=Demande de démonstration"
                  className="magnetic-button inline-flex items-center justify-center gap-3 px-8 py-5 gradient-animate text-white font-bold rounded-2xl text-lg group"
                >
                  Voir une démo
                  <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="#fonctionnalites"
                  className="inline-flex items-center justify-center gap-3 px-8 py-5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-2xl text-lg transition-all"
                >
                  En savoir plus
                </a>
              </div>

              {/* Stats with visual emphasis */}
              <div className="fade-in-up delay-400 grid grid-cols-3 gap-6">
                {[
                  { value: '98%', label: "moins d'erreurs" },
                  { value: '100%', label: 'conforme' },
                  { value: '15h', label: 'gagnées/sem.' },
                ].map((stat, i) => (
                  <div key={i} className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--finixar-blue)]/10 to-transparent rounded-2xl blur-xl"></div>
                    <div className="relative bg-white border-2 border-slate-100 rounded-2xl p-4 hover:border-[var(--finixar-blue)] transition-all">
                      <div className="text-3xl font-bold clash text-gradient">{stat.value}</div>
                      <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Product Visual */}
            <div className="relative">
              {/* Glowing ring */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--finixar-blue)] to-[var(--cyan)] rounded-3xl blur-3xl opacity-20 animate-pulse"></div>

              <div className="relative float rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                <div className="aspect-[16/10]">
                  <img
                    src="/images/dashboard.png"
                    alt="Tableau de bord Finixar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Floating decorative elements */}
              <div
                className="absolute -top-8 -right-8 w-32 h-32 gradient-animate rounded-3xl blur-2xl opacity-60 float"
                style={{ animationDelay: '-2s' }}
              ></div>
              <div
                className="absolute -bottom-8 -left-8 w-40 h-40 bg-gradient-to-br from-[var(--cyan)] to-transparent rounded-full blur-2xl opacity-40 float"
                style={{ animationDelay: '-4s' }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMS SECTION - Diagonal split */}
      <section className="relative py-32 px-6 lg:px-8 bg-slate-50 diagonal-top diagonal-bottom">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-full text-sm font-bold mb-6">
              <AlertCircle className="w-4 h-4" />
              Le problème Excel
            </div>
            <h2 className="text-5xl lg:text-6xl font-bold clash text-slate-900 mb-6">
              Excel vous expose à des <span className="text-gradient">risques majeurs</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto font-medium">
              Les fichiers Excel créent des vulnérabilités opérationnelles et réglementaires
              critiques.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Left - Problems */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-white rounded-3xl p-10 border-2 border-red-100 shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center">
                    <X className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold clash text-slate-900">Avec Excel uniquement</h3>
                </div>
                <ul className="space-y-5">
                  {[
                    'Aucune traçabilité : conformité impossible à prouver',
                    'Erreurs de calcul fréquentes et saisies manuelles',
                    "Risques RGPD : jusqu'à 4% du CA en sanctions",
                    'Données dispersées, versions multiples',
                    'Échéances oubliées, rappels manuels',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <X className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-slate-700 font-medium leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right - Solution */}
            <div className="relative group">
              <div className="absolute inset-0 gradient-animate rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-white rounded-3xl p-10 border-2 border-blue-100 shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 gradient-animate rounded-2xl flex items-center justify-center pulse-glow">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold clash text-slate-900">Avec Finixar</h3>
                </div>
                <ul className="space-y-5">
                  {[
                    'Traçabilité complète et audit automatique',
                    'Zéro erreur : automatisation intelligente',
                    'Conformité RGPD garantie par design',
                    'Source de vérité unique et centralisée',
                    'Alertes automatiques (J-30, J-7) par email',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className="w-6 h-6 gradient-animate rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-slate-700 font-medium leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS SECTION - Bold dark section */}
      <section className="relative py-32 px-6 lg:px-8 bg-gradient-to-br from-[var(--dark-navy)] via-slate-900 to-[var(--dark-navy)] text-white overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-10">
          <div className="blob absolute top-0 left-1/4 w-96 h-96 bg-[var(--finixar-blue)] blur-3xl"></div>
          <div
            className="blob absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--cyan)] blur-3xl"
            style={{ animationDelay: '-10s' }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl font-bold clash mb-6">
              Résultats <span className="text-gradient">mesurables</span>
            </h2>
            <p className="text-xl text-slate-300 font-medium">
              Impact quantifiable sur votre productivité
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Clock,
                metric: '15h/sem',
                label: 'Gain de temps',
                desc: 'Automatisation totale',
              },
              {
                icon: CheckCircle,
                metric: '98%',
                label: "Moins d'erreurs",
                desc: 'Zéro saisie manuelle',
              },
              {
                icon: Shield,
                metric: '100%',
                label: 'Conformité',
                desc: 'Audit-ready garanti',
              },
              {
                icon: Zap,
                metric: 'J1',
                label: 'ROI immédiat',
                desc: 'Rentable dès le départ',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="card-3d bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-[var(--finixar-blue)] transition-all"
              >
                <div className="w-16 h-16 gradient-animate rounded-2xl flex items-center justify-center mb-6">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-bold clash mb-2">{item.metric}</div>
                <div className="text-sm font-bold text-[var(--cyan)] mb-3 uppercase tracking-wider">
                  {item.label}
                </div>
                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES - Asymmetric layout */}
      <section id="fonctionnalites" className="py-32 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-[var(--finixar-blue)] rounded-full text-sm font-bold mb-6">
              <Sparkles className="w-4 h-4" />
              Fonctionnalités
            </div>
            <h2 className="text-5xl lg:text-6xl font-bold clash text-slate-900 mb-6">
              Plateforme <span className="text-gradient">tout-en-un</span>
            </h2>
          </div>

          {/* Feature blocks with alternating layouts */}
          <div className="space-y-32">
            {/* Feature 1 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-[var(--finixar-blue)] rounded-full text-sm font-bold mb-6">
                  <TrendingUp className="w-4 h-4" />
                  Gestion de projets
                </div>
                <h3 className="text-4xl font-bold clash text-slate-900 mb-6">
                  Pilotez vos levées de fonds
                </h3>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed font-medium">
                  Vision complète sur vos tranches d'investissement. Montants, dates, états
                  d'avancement en temps réel.
                </p>
                <ul className="space-y-4">
                  {[
                    'Suivi temps réel des tranches',
                    'Alertes automatiques critiques',
                    'Historique complet',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 gradient-animate rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-slate-700 font-semibold">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 gradient-animate rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                  <img
                    src="/images/project-detail.png"
                    alt="Gestion de projets"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Feature 2 - Reversed */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--cyan)] to-[var(--finixar-blue)] rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                  <img
                    src="/images/investors-table.png"
                    alt="CRM Investisseurs"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-600 rounded-full text-sm font-bold mb-6">
                  <Users className="w-4 h-4" />
                  Relations investisseurs
                </div>
                <h3 className="text-4xl font-bold clash text-slate-900 mb-6">
                  CRM sécurisé et conforme
                </h3>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed font-medium">
                  Centralisez vos données investisseurs. RIB et documents chiffrés, conformité RGPD
                  garantie.
                </p>
                <ul className="space-y-4">
                  {['Base centralisée sécurisée', 'Chiffrement des RIB', 'RGPD by design'].map(
                    (item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 gradient-animate rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-slate-700 font-semibold">{item}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-full text-sm font-bold mb-6">
                  <Zap className="w-4 h-4" />
                  Automatisation
                </div>
                <h3 className="text-4xl font-bold clash text-slate-900 mb-6">
                  Zéro oubli, zéro stress
                </h3>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed font-medium">
                  Calcul automatique des échéances. Rappels intelligents garantissent vos paiements.
                </p>
                <ul className="space-y-4">
                  {[
                    'Rappels automatiques (J-30, J-7)',
                    'Import/Export Excel instantané',
                    'Statuts temps réel',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 gradient-animate rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-slate-700 font-semibold">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-[var(--finixar-blue)] rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                  <img
                    src="/images/echeancier.png"
                    alt="Automatisation"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES GRID - Bold cards */}
      <section id="modules" className="py-32 px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl font-bold clash text-slate-900 mb-6">
              Solution <span className="text-gradient">complète</span>
            </h2>
            <p className="text-xl text-slate-600 font-medium">
              Tous vos besoins en gestion d'actifs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: TrendingUp, title: 'Gestion de projets', color: 'blue' },
              { icon: Users, title: 'Relations investisseurs', color: 'cyan' },
              { icon: FileText, title: 'Échéancier & coupons', color: 'purple' },
              { icon: BarChart3, title: 'Reporting & export', color: 'indigo' },
              { icon: Shield, title: 'Conformité & audit', color: 'green' },
              { icon: Database, title: "Gestion d'équipe", color: 'orange' },
            ].map((module, i) => (
              <div
                key={i}
                className="card-3d group bg-white rounded-3xl p-8 border-2 border-slate-200 hover:border-[var(--finixar-blue)] transition-all cursor-pointer"
              >
                <div className="w-16 h-16 gradient-animate rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <module.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold clash text-slate-900 mb-3 group-hover:text-[var(--finixar-blue)] transition-colors">
                  {module.title}
                </h3>
                <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-[var(--finixar-blue)] group-hover:translate-x-2 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY - Dramatic dark section */}
      <section
        id="securite"
        className="relative py-32 px-6 lg:px-8 bg-gradient-to-br from-[var(--dark-navy)] via-slate-900 to-[var(--dark-navy)] text-white overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="blob absolute top-20 left-20 w-96 h-96 bg-[var(--finixar-blue)] blur-3xl"></div>
          <div
            className="blob absolute bottom-20 right-20 w-96 h-96 bg-[var(--cyan)] blur-3xl"
            style={{ animationDelay: '-10s' }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-bold mb-6 backdrop-blur-xl">
              <Lock className="w-4 h-4" />
              Sécurité & Conformité
            </div>
            <h2 className="text-5xl lg:text-6xl font-bold clash mb-6">
              Technologie de <span className="text-gradient">confiance</span>
            </h2>
            <p className="text-xl text-slate-300 font-medium">Standards bancaires européens</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Hébergement FR', desc: 'Paris - Souveraineté totale' },
              { icon: Lock, title: 'Chiffrement', desc: 'SSL/TLS + RLS database' },
              { icon: CheckCircle, title: 'Audit-ready', desc: 'Traçabilité complète' },
              { icon: Database, title: 'Disponibilité', desc: 'Infrastructure redondante' },
              { icon: Users, title: 'Auth. Microsoft', desc: 'Comptes professionnels' },
              { icon: Zap, title: 'MAJ continues', desc: 'Patches automatiques' },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-white/30 transition-all"
              >
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold clash mb-3">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING - Clean CTA */}
      <section id="tarifs" className="py-32 px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl lg:text-6xl font-bold clash text-slate-900 mb-6">
            Tarifs <span className="text-gradient">sur mesure</span>
          </h2>
          <p className="text-xl text-slate-600 mb-12 font-medium">
            Adaptés à votre structure. Contactez-nous pour un devis personnalisé.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:contact@finixar.com?subject=Demande de démonstration"
              className="magnetic-button inline-flex items-center gap-3 px-10 py-5 gradient-animate text-white font-bold rounded-2xl text-lg group"
            >
              Demander une démo
              <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="mailto:contact@finixar.com?subject=Demande de tarifs"
              className="inline-flex items-center gap-3 px-10 py-5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-2xl text-lg transition-all"
            >
              Demander un devis
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[var(--dark-navy)] text-white py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 gradient-animate rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold clash">Finixar</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Plateforme de référence pour gestionnaires d'actifs
              </p>
            </div>

            <div>
              <h4 className="font-bold clash text-white mb-6">Produit</h4>
              <ul className="space-y-3">
                {['Fonctionnalités', 'Sécurité', 'Modules'].map((item, i) => (
                  <li key={i}>
                    <a
                      href={`#${item
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')}`}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold clash text-white mb-6">Légal</h4>
              <ul className="space-y-3">
                {['Mentions légales', 'Politique RGPD', 'CGU'].map((item, i) => (
                  <li key={i}>
                    <a
                      href={`mailto:contact@finixar.com?subject=${item}`}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold clash text-white mb-6">Contact</h4>
              <ul className="space-y-3">
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
                <li className="text-slate-400">Paris, France</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">© 2026 Finixar. Tous droits réservés.</p>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--cyan)]" />
              <span className="text-slate-400 text-sm">Conforme RGPD • Hébergé en France</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

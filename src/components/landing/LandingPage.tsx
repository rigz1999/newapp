import { Lock, Globe, Zap, Shield, FileText, Sparkles, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export function LandingPage() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle email submission
    console.log('Email submitted:', email);
  };

  return (
    <div className="min-h-screen bg-[#050505] overflow-x-hidden">
      {/* Custom Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-feature-settings: 'ss01', 'ss03';
        }

        /* Smooth scroll */
        html {
          scroll-behavior: smooth;
        }

        /* Border beam animation */
        @keyframes border-beam {
          0%, 100% { opacity: 0; transform: translateX(-100%); }
          50% { opacity: 1; }
        }

        .border-beam {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(90deg, transparent, #2E62FF, transparent);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          animation: border-beam 3s infinite;
        }

        /* Ambient glow */
        .ambient-glow {
          filter: blur(120px);
          opacity: 0.15;
        }

        /* Hover states */
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-hover:hover {
          transform: translateY(-4px);
        }

        .btn-primary {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-primary:active {
          transform: scale(0.98);
        }

        /* Glassmorphism */
        .glass {
          background: rgba(17, 17, 19, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid #1F1F22;
        }

        /* Text styles */
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 12px;
          font-weight: 600;
        }

        h1, h2, h3 {
          letter-spacing: -0.02em;
        }
      `}</style>

      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2E62FF] rounded-full ambient-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full ambient-glow"></div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text */}
            <div>
              <div className="eyebrow text-[#94A3B8] mb-8">
                INFRASTRUCTURE D'INVESTISSEMENT DE NOUVELLE GÉNÉRATION
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-8 leading-tight">
                Le Système d'Exploitation de votre Patrimoine.
              </h1>

              <p className="text-xl text-[#94A3B8] mb-12 leading-relaxed max-w-xl">
                Centralisez, analysez et optimisez l'ensemble de vos actifs mondiaux sur une interface unique. La puissance institutionnelle, enfin accessible aux particuliers.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg">
                  Demander un accès prioritaire
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="inline-flex items-center justify-center px-8 py-4 text-white font-semibold rounded-lg border border-[#1F1F22] hover:border-[#2E62FF] transition-all">
                  Voir la démo interactive
                </button>
              </div>
            </div>

            {/* Right - Dashboard Mockup */}
            <div className="relative hidden lg:block">
              <div className="glass rounded-2xl p-6 relative overflow-hidden">
                <div className="border-beam"></div>

                {/* Dashboard UI Mockup */}
                <div className="bg-[#0A0A0B] rounded-xl p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[#52525B] text-sm mb-1">Valeur totale du portefeuille</div>
                      <div className="text-white text-3xl font-bold">€2,847,392</div>
                    </div>
                    <div className="text-[#10B981] text-sm font-semibold">+12.4%</div>
                  </div>

                  {/* Chart Placeholder */}
                  <div className="h-48 bg-gradient-to-br from-[#2E62FF]/10 to-transparent rounded-lg border border-[#1F1F22] flex items-end justify-around p-4">
                    <div className="w-12 bg-[#2E62FF] rounded-t" style={{ height: '60%' }}></div>
                    <div className="w-12 bg-[#2E62FF] rounded-t" style={{ height: '80%' }}></div>
                    <div className="w-12 bg-[#2E62FF] rounded-t" style={{ height: '70%' }}></div>
                    <div className="w-12 bg-[#2E62FF] rounded-t" style={{ height: '95%' }}></div>
                    <div className="w-12 bg-[#2E62FF] rounded-t" style={{ height: '85%' }}></div>
                  </div>

                  {/* Asset Allocation */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#111113] rounded-lg p-3 border border-[#1F1F22]">
                      <div className="text-[#52525B] text-xs mb-1">Crypto</div>
                      <div className="text-white font-semibold">42%</div>
                    </div>
                    <div className="bg-[#111113] rounded-lg p-3 border border-[#1F1F22]">
                      <div className="text-[#52525B] text-xs mb-1">Actions</div>
                      <div className="text-white font-semibold">38%</div>
                    </div>
                    <div className="bg-[#111113] rounded-lg p-3 border border-[#1F1F22]">
                      <div className="text-[#52525B] text-xs mb-1">Immobilier</div>
                      <div className="text-white font-semibold">20%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative glow */}
              <div className="absolute -top-8 -right-8 w-64 h-64 bg-[#2E62FF] rounded-full ambient-glow"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRUST BAR */}
      <section className="border-y border-[#1F1F22] py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-30">
            <div className="flex items-center gap-3 text-white">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">Chiffrement AES-256</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Architecture "Zero-Knowledge"</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-medium">Données Temps Réel</span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium">Régulation Européenne</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM/SOLUTION - Block A */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#050505] to-[#0A0A0B]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
            {/* Left - Text */}
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Adieu aux feuilles de calculs obsolètes.
              </h2>
              <p className="text-lg text-[#94A3B8] leading-relaxed">
                La dispersion de vos données coûte cher. Finixar synchronise automatiquement vos comptes bancaires, portefeuilles crypto et investissements privés. Plus de saisie manuelle, plus d'erreurs.
              </p>
            </div>

            {/* Right - UI Mockup */}
            <div className="glass rounded-2xl p-6 relative">
              <div className="bg-[#0A0A0B] rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-white font-semibold">Synchronisation...</div>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-[#2E62FF] rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-[#2E62FF] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-[#2E62FF] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
                <div className="space-y-3">
                  {['BNP Paribas', 'Coinbase Wallet', 'Interactive Brokers'].map((name, i) => (
                    <div key={i} className="bg-[#111113] rounded-lg p-4 border border-[#1F1F22] flex items-center justify-between">
                      <span className="text-white text-sm">{name}</span>
                      <span className="text-[#10B981] text-xs">✓ Connecté</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Block B - Reversed */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - UI Mockup */}
            <div className="glass rounded-2xl p-6 relative order-2 lg:order-1">
              <div className="bg-[#0A0A0B] rounded-xl p-6">
                <div className="text-white font-semibold mb-4">Performance nette</div>
                <div className="text-5xl font-bold text-white mb-2">+18.7%</div>
                <div className="text-[#52525B] text-sm mb-6">Rendement ajusté au risque (Sharpe: 1.42)</div>

                {/* Risk meter */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#94A3B8]">Niveau de risque</span>
                    <span className="text-[#2E62FF]">Modéré</span>
                  </div>
                  <div className="h-2 bg-[#111113] rounded-full overflow-hidden">
                    <div className="h-full w-3/5 bg-gradient-to-r from-[#10B981] to-[#2E62FF] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Text */}
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Une clarté radicale sur votre performance.
              </h2>
              <p className="text-lg text-[#94A3B8] leading-relaxed">
                Ne confondez plus mouvement et performance. Nos algorithmes calculent votre rendement réel, net de frais et ajusté au risque, pour vous donner la vérité sur vos investissements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BENTO GRID - Features */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-[#0A0A0B]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 - Privacy */}
            <div className="glass rounded-2xl p-8 card-hover relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2E62FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-[#2E62FF]/10 rounded-xl flex items-center justify-center mb-6">
                  <EyeOff className="w-6 h-6 text-[#2E62FF]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Confidentialité Absolue
                </h3>
                <p className="text-[#94A3B8] leading-relaxed">
                  Vos données sont chiffrées localement. Nous ne voyons jamais vos chiffres.
                </p>
              </div>
            </div>

            {/* Card 2 - Tax */}
            <div className="glass rounded-2xl p-8 card-hover relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2E62FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-[#2E62FF]/10 rounded-xl flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-[#2E62FF]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Reporting Fiscal Automatisé
                </h3>
                <p className="text-[#94A3B8] leading-relaxed">
                  Générez vos IFU et rapports de plus-values en un clic.
                </p>
              </div>
            </div>

            {/* Card 3 - AI */}
            <div className="glass rounded-2xl p-8 card-hover relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2E62FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-[#2E62FF]/10 rounded-xl flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6 text-[#2E62FF]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Intelligence Artificielle
                </h3>
                <p className="text-[#94A3B8] leading-relaxed">
                  Détection automatique des opportunités de rééquilibrage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. THE MANIFESTO */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0A0A0B] to-[#050505]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-8" style={{ fontFamily: 'Georgia, serif' }}>
            Notre Engagement.
          </h2>
          <p className="text-xl text-[#94A3B8] leading-relaxed mb-8">
            Nous construisons Finixar car les outils actuels ne suffisent plus. Nous n'avons pas de "clients cachés" ni de frais dissimulés. Nous construisons l'outil que nous voulions utiliser nous-mêmes : transparent, rapide et impénétrable.
          </p>
          <p className="text-[#52525B] italic">
            — L'Équipe Technique Finixar.
          </p>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E62FF]/10 via-transparent to-purple-600/10"></div>

        <div className="max-w-2xl mx-auto relative z-10">
          <div className="glass rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2E62FF]/5 to-transparent"></div>

            <div className="relative z-10">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Rejoignez le cercle des initiés.
              </h2>
              <p className="text-[#94A3B8] mb-8">
                Les places pour la Beta privée sont limitées.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="flex-1 px-6 py-4 bg-[#111113] border border-[#1F1F22] rounded-lg text-white placeholder-[#52525B] focus:outline-none focus:border-[#2E62FF]"
                  required
                />
                <button
                  type="submit"
                  className="btn-primary px-8 py-4 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg whitespace-nowrap"
                >
                  S'inscrire sur liste d'attente
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1F1F22] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-[#52525B] text-sm">
            <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Mentions Légales</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Sécurité</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Status</a>
          </div>
          <div className="text-center mt-8 text-[#52525B] text-sm">
            © {new Date().getFullYear()} Finixar. Infrastructure d'investissement de nouvelle génération.
          </div>
        </div>
      </footer>
    </div>
  );
}

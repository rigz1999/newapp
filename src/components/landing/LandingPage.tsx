import { TrendingUp, ArrowRight, Shield, FileText, Users, Euro, BarChart3, Lock, CheckCircle, Clock, Headphones, Building2, Award, Check, Bell, AlertCircle, Zap, ShieldCheck, MousePointer2 } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.95); }
        }
        .animate-blob {
          animation: blob 10s infinite alternate ease-in-out;
        }
        .animation-delay-2000 { animation-delay: 3s; }
        .animation-delay-4000 { animation-delay: 6s; }
      `}</style>

      {/* Navigation - Ultra Clean */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-blue-200 shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Finixar</span>
            </div>

            <div className="hidden md:flex items-center gap-10">
              <a href="#fonctionnalites" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Produit</a>
              <a href="#securite" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Sécurité & Souveraineté</a>
              <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Contact</a>
            </div>

            <div className="flex items-center gap-4">
              <a href="http://app.finixar.com" className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">Connexion</a>
              <a href="mailto:contact@finixar.com" className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-md">
                Demander une démo
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Plus clair, plus Premium */}
      <section className="relative pt-40 pb-24 overflow-hidden bg-[#f8fafc]">
        {/* Soft Mesh Gradients instead of hard blobs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-100/30 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full mb-8 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Infrastructure Financière Souveraine 🇫🇷</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.1]">
              Pilotez vos actifs avec une <span className="text-blue-600">précision bancaire.</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              La plateforme française de référence pour la gestion de tranches, le suivi des investisseurs et l'automatisation des coupons. Sans erreur, sans Excel.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group">
                Commencer maintenant
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                Découvrir la plateforme
              </button>
            </div>
          </div>

          {/* Dashboard Preview with Browser Frame */}
          <div className="mt-20 relative max-w-6xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)]">
              <div className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden aspect-[16/9] relative">
                 <img 
                  src="/images/dashboard-mockup.png" 
                  alt="Interface Finixar" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points - Style "Qonto" (Plus sobre) */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">L'ère du "tout-Excel" est terminée.</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Les processus manuels ne sont pas seulement lents, ils sont un risque majeur pour votre conformité et votre réputation.
              </p>
              <ul className="space-y-6">
                {[
                  { title: "Zéro risque d'audit", desc: "Historique complet de chaque mouvement de fonds." },
                  { title: "Gain de temps massif", desc: "15h économisées par semaine sur la gestion administrative." },
                  { title: "Sécurité souveraine", desc: "Données protégées par le droit français, pas le Cloud Act." }
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="bg-blue-50 p-1 rounded-full h-6 w-6 flex items-center justify-center mt-1">
                      <Check className="text-blue-600 w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <p className="text-slate-500 text-sm">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
               {[
                { icon: AlertCircle, color: "text-red-500", label: "Risque d'erreur Excel" },
                { icon: Clock, color: "text-orange-500", label: "Processus lents" },
                { icon: Lock, color: "text-purple-500", label: "Données exposées" },
                { icon: FileText, color: "text-blue-500", label: "Reporting manuel" }
               ].map((item, idx) => (
                 <div key={idx} className="p-8 border border-slate-100 rounded-2xl bg-[#fcfdfe] shadow-sm">
                    <item.icon className={`w-8 h-8 ${item.color} mb-4`} />
                    <p className="font-semibold text-slate-900 leading-tight">{item.label}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - White Cards with Hover States */}
      <section id="fonctionnalites" className="py-24 bg-[#f8fafc] border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-4">Une infrastructure complète.</h2>
            <p className="text-slate-600">Conçu pour les Asset Managers, Family Offices et Sociétés de Gestion.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
             {/* Feature Card */}
             {[
               { icon: Building2, title: "Gestion du Passif", desc: "Centralisez vos investisseurs et leurs RIB dans un référentiel unique et chiffré." },
               { icon: Zap, title: "Coupons Automatisés", desc: "Calculez et distribuez vos revenus en quelques clics via nos imports intelligents." },
               { icon: ShieldCheck, title: "Conformité Native", desc: "Générez vos preuves de paiement et assurez votre traçabilité RGPD sans effort." }
             ].map((feature, idx) => (
               <div key={idx} className="bg-white p-10 rounded-3xl border border-slate-200/60 hover:border-blue-300 transition-all group">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-8 group-hover:bg-blue-600 transition-colors">
                    <feature.icon className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">{feature.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Footer Minimalist */}
      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1 rounded">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">Finixar</span>
            <span className="text-slate-400 ml-4 text-sm">© 2025 France</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500 font-medium">
             <a href="#" className="hover:text-slate-900">Confidentialité</a>
             <a href="#" className="hover:text-slate-900">Mentions Légales</a>
             <a href="#" className="hover:text-slate-900">CGV</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

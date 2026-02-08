import { TrendingUp, ArrowRight } from 'lucide-react';

export function UnderConstruction() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-finixar-deep-blue via-finixar-deep-blue to-finixar-brand-blue flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-finixar-brand-blue p-3 rounded-xl shadow-lg">
            <TrendingUp className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white">Finixar</h1>
        </div>

        {/* Main Message */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 shadow-2xl border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-4">Notre site est en construction</h2>
          <p className="text-xl text-slate-200 mb-8">
            Nous préparons quelque chose d'extraordinaire pour vous.
          </p>

          {/* CTA to App */}
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">Vous êtes déjà client ?</p>
            <a
              href="http://app.finixar.com"
              className="inline-flex items-center gap-2 px-8 py-4 bg-finixar-brand-blue hover:bg-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span>Accéder à la plateforme</span>
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-400 text-sm mt-8">
          © {new Date().getFullYear()} Finixar. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}

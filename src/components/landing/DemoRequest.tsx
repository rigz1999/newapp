import { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, AlertTriangle, Shield } from 'lucide-react';
import { logger } from '../../utils/logger';

export function DemoRequest() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Pre-fill email from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-demo-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(formData),
      });

      // Handle 401/404 - function not deployed yet
      if (response.status === 401 || response.status === 404) {
        logger.error('Edge function not deployed. Please deploy send-demo-request function.');
        setSubmitStatus('error');
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', company: '', role: '' });
      } else {
        logger.error('Demo request failed:', data);
        setSubmitStatus('error');
      }
    } catch (error) {
      logger.error('Demo request error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <a href="/" className="flex items-center">
              <img src="/branding/logo/logo-full-blue.png" alt="Finixar" className="h-10" />
            </a>
            <a
              href="https://app.finixar.com"
              className="px-5 py-2.5 text-slate-700 hover:text-slate-900 font-semibold transition-colors"
            >
              Connexion
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {submitStatus === 'success' ? (
          /* Success State */
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Demande envoyée avec succès !
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Merci {formData.name || 'pour votre intérêt'}. Nous avons bien reçu votre demande de
              démonstration.
            </p>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">📅 Prochaines étapes</h2>
              <ul className="space-y-4 text-left">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Notre équipe vous contactera sous 24 heures
                    </p>
                    <p className="text-slate-600 text-sm">
                      Vérifiez votre boîte mail (et vos spams)
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Nous préparerons une démonstration personnalisée
                    </p>
                    <p className="text-slate-600 text-sm">Adaptée à vos besoins et votre secteur</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Vous recevrez un lien de visioconférence
                    </p>
                    <p className="text-slate-600 text-sm">Pour une session interactive en direct</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg transition-all"
              >
                Retour à l'accueil
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="mailto:support@finixar.com"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-lg border-2 border-slate-200 transition-all"
              >
                Nous contacter
              </a>
            </div>
          </div>
        ) : (
          /* Form State */
          <>
            <div className="text-center mb-12">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                Demandez une démo
              </h1>
              <p className="text-lg sm:text-xl text-slate-600">
                Découvrez comment Finixar peut transformer votre gestion d'actifs
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-lg border border-slate-200">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-900 mb-2">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jean Dupont"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2E62FF] transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-slate-900 mb-2"
                  >
                    E-mail professionnel *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jean.dupont@entreprise.com"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2E62FF] transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Company Field */}
                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-semibold text-slate-900 mb-2"
                  >
                    Entreprise *
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Nom de votre entreprise"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2E62FF] transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Role Field */}
                <div>
                  <label htmlFor="role" className="block text-sm font-semibold text-slate-900 mb-2">
                    Poste / Fonction *
                  </label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    placeholder="Ex: Directeur Financier, Gérant de fonds..."
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2E62FF] transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#2E62FF] hover:bg-[#2558DD] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Envoyer ma demande
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Error Message */}
                {submitStatus === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-800 font-semibold">Une erreur est survenue</p>
                      <p className="text-red-700 text-sm mt-1">
                        Veuillez réessayer dans quelques instants ou nous contacter directement à{' '}
                        <a href="mailto:support@finixar.com" className="underline font-semibold">
                          support@finixar.com
                        </a>
                      </p>
                    </div>
                  </div>
                )}

                {/* Trust Badge */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
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
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

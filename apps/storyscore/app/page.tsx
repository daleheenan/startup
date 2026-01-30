import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 gradient-bg opacity-50" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-centre">
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                Know Your Story's
                <span className="gradient-text"> Potential</span>
              </h1>
              <p className="text-xl md:text-2xl text-text-secondary mb-8 max-w-3xl mx-auto">
                Get professional-grade manuscript analysis powered by AI.
                Receive detailed scoring, actionable recommendations, and insights
                to take your writing to the next level.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-centre">
                <Link href="/register" className="btn-primary text-lg px-8 py-3">
                  Start Free Analysis
                </Link>
                <Link href="#features" className="btn-secondary text-lg px-8 py-3">
                  See How It Works
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-background-surface/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-centre mb-16">
              <h2 className="text-4xl font-bold mb-4">Comprehensive Analysis</h2>
              <p className="text-xl text-text-secondary">
                Every aspect of your story, evaluated by advanced AI
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="card-hover">
                <div className="text-4xl mb-4">📖</div>
                <h3 className="text-2xl font-bold mb-3">Plot Analysis</h3>
                <p className="text-text-secondary">
                  Evaluate story structure, pacing, tension arcs, and commercial beats.
                  Get insights on plot holes and narrative flow.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="card-hover">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-2xl font-bold mb-3">Character Development</h3>
                <p className="text-text-secondary">
                  Assess character depth, arcs, motivations, and relationships.
                  Identify opportunities for stronger character work.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="card-hover">
                <div className="text-4xl mb-4">✍️</div>
                <h3 className="text-2xl font-bold mb-3">Prose Quality</h3>
                <p className="text-text-secondary">
                  Analyse writing style, voice, clarity, and readability.
                  Get specific feedback on sentence variety and word choice.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="card-hover">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-2xl font-bold mb-3">Pacing Evaluation</h3>
                <p className="text-text-secondary">
                  Measure tension, flow, and scene dynamics.
                  Identify sections that drag or rush.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="card-hover">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-2xl font-bold mb-3">Market Fit</h3>
                <p className="text-text-secondary">
                  Understand how your story compares to genre expectations.
                  Receive marketability insights and positioning guidance.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="card-hover">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold mb-3">Actionable Recommendations</h3>
                <p className="text-text-secondary">
                  Get prioritised suggestions with estimated impact.
                  Know exactly what to improve for maximum effect.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-centre mb-16">
              <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-text-secondary">
                Start for free, upgrade as you need
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Tier */}
              <div className="card">
                <h3 className="text-2xl font-bold mb-2">Free Trial</h3>
                <div className="text-4xl font-bold mb-4 gradient-text">£0</div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>1 full manuscript analysis</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Complete scoring breakdown</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Priority recommendations</span>
                  </li>
                </ul>
                <Link href="/register" className="btn-secondary w-full block text-centre">
                  Start Free Trial
                </Link>
              </div>

              {/* Pro Tier */}
              <div className="card bg-gradient-to-br from-primary-600/20 to-secondary-600/20 border-primary-500/50 shadow-glow">
                <div className="inline-block px-3 py-1 rounded-full bg-primary-500 text-white text-sm font-semibold mb-4">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="text-4xl font-bold mb-4 gradient-text">£9.99</div>
                <p className="text-sm text-text-secondary mb-4">per analysis</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Unlimited manuscript analyses</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Chapter-by-chapter breakdown</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Genre-specific insights</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Export detailed reports</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>Priority support</span>
                  </li>
                </ul>
                <Link href="/register" className="btn-primary w-full block text-centre">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary-600/10 to-secondary-600/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-centre">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Improve Your Story?
            </h2>
            <p className="text-xl text-text-secondary mb-8">
              Join writers who are using AI to elevate their craft
            </p>
            <Link href="/register" className="btn-primary text-lg px-8 py-3 inline-block">
              Start Your Free Analysis
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

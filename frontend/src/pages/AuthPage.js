import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        if (!name.trim()) {
          toast.error('Name is required');
          setLoading(false);
          return;
        }
        await signup(name, email, password);
        toast.success('Account created!');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="auth-page">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm font-mono">TF</span>
              </div>
              <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'Manrope' }}>
                TaskFlow Pro
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-muted-foreground text-base">
              {isLogin
                ? 'Sign in to your account to continue'
                : 'Get started with TaskFlow Pro'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2 animate-fade-slide-up">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="name"
                  data-testid="auth-name-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 bg-background border-border"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                data-testid="auth-email-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-background border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                data-testid="auth-password-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-background border-border"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={loading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md active:scale-[0.98] transition-transform duration-75"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              data-testid="auth-toggle-btn"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-indigo-500 font-medium">{isLogin ? 'Sign up' : 'Sign in'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right: Image */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1721995432582-b0a486848fca?crop=entropy&cs=srgb&fm=jpg&q=85"
          alt="Modern minimal architecture"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-white/90 text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Manrope' }}>
            Manage projects with clarity.
          </p>
          <p className="text-white/60 text-base mt-2">
            Real-time collaboration for teams that ship.
          </p>
        </div>
      </div>
    </div>
  );
}

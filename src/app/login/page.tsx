"use client";

import { useState } from "react";
import { Lock, User, Key, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login for demo
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 1000);
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel animate-fade-in">
        <div className="brand-section">
          <div className="logo-icon">
            <Key size={32} color="var(--accent-primary)" />
          </div>
          <h1>Sai Auto Key Works</h1>
          <p className="text-muted">Digital Registry & E-KYC System</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="label">Username</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input 
                type="text" 
                className="input-field with-icon" 
                placeholder="Enter username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input 
                type="password" 
                className="input-field with-icon" 
                placeholder="Enter password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="primary-btn w-full" disabled={isLoading}>
            {isLoading ? "Authenticating..." : (
              <>
                Login to Portal <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 E-KYC Registry. Secure & Compliant.</p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1.5rem;
        }
        .login-card {
          width: 100%;
          max-width: 450px;
          padding: 3rem 2.5rem;
          text-align: center;
        }
        .brand-section {
          margin-bottom: 2.5rem;
        }
        .logo-icon {
          width: 64px;
          height: 64px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          border: 1px solid var(--glass-border);
        }
        .brand-section h1 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(to right, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .login-form {
          text-align: left;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .input-wrapper {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .with-icon {
          padding-left: 2.75rem !important;
        }
        .w-full {
          width: 100%;
          margin-top: 1rem;
        }
        .login-footer {
          margin-top: 2.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

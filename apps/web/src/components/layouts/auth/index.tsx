const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "url('/images/bg-particle.png') repeat",
      }}
    >
      {children}
    </div>
  );
};

export default AuthLayout;

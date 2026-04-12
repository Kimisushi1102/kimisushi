import './globals.css';

export const metadata = {
  title: 'Sakura Restaurant | Japanische Kueche',
  description: 'Bestellen Sie frisches Sushi online oder reservieren Sie einen Tisch bei Sakura Restaurant.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <nav className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <a href="/" className="flex items-center gap-2">
                <span className="text-2xl">🍣</span>
                <span className="font-serif font-bold text-xl text-brand-dark">Sakura Restaurant</span>
              </a>
              <div className="hidden md:flex items-center gap-6">
                <a href="/" className="text-gray-600 hover:text-brand-red transition">Speisekarte</a>
                <a href="/bestellen" className="text-brand-red font-semibold hover:underline">Online Bestellen</a>
                <a href="/reservieren" className="text-gray-600 hover:text-brand-red transition">Tisch Reservieren</a>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="bg-brand-dark text-white py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-400 text-sm">Sakura Restaurant - Authentische japanische Kueche</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

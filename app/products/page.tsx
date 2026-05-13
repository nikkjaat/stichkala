import AllProducts from '@/components/AllProducts';
import Footer from '@/components/Footer';
import { Suspense } from 'react';

export default function ProductsPage() {
  return (
    <main className="min-h-screen pt-20">
      <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-text-light">Loading…</div>}>
        <AllProducts />
      </Suspense>
      <Footer />
    </main>
  );
}

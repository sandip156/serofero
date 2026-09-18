// frontend/src/app/packages/page.tsx
'use client';

import React from 'react';
import NavBar from '../components/NavBar';

const Packages: React.FC = () => {
  return (
    <div className="min-h-screen bg-green-50 text-green-900 font-sans pt-16 md:pt-20">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold mb-6">
          Our Trekking Packages
        </h1>
        <p className="text-green-700 mb-12">
          Choose the perfect adventure for you.
        </p>
      </main>
    </div>
  );
};

export default Packages;

// 'use client';

// import React from 'react';
// import NavBar from '../components/NavBar';

// const Packages: React.FC = () => {
//   return (
//     <div className="min-h-screen bg-green-50 text-green-900 font-sans">
//       <NavBar />
//       <main className="max-w-6xl mx-auto px-6 py-16 text-center">
//         <h1 className="text-4xl font-extrabold mb-6">Our Trekking Packages</h1>
//         <p className="text-green-700 mb-12">Choose the perfect adventure for you.</p>
//       </main>
//     </div>
//   );
// };

// export default Packages;

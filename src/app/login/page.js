"use client";

import { useRouter } from 'next/navigation';

const profiles = [
  {
    name: 'Kylian',
    role: 'admin',
    avatar: '/avatar-kylian.png', // À ajouter dans public/
  },
  {
    name: 'Mylan',
    role: 'user',
    avatar: '/avatar-mylan.png', // À ajouter dans public/
  },
];

export default function Login() {
  const router = useRouter();

  async function handleSelect(profile) {
    if (typeof window !== 'undefined') {
      // Créer l'utilisateur dans la base si besoin et attendre la réponse
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name, role: profile.role })
      });
      // Nettoyer toute ancienne progression locale pour éviter les conflits
      localStorage.removeItem('currentEpisode_Kylian');
      localStorage.removeItem('currentEpisode_Mylan');
      localStorage.removeItem('episodeHistory_Kylian');
      localStorage.removeItem('episodeHistory_Mylan');
      localStorage.removeItem('totalEpisodes');
      localStorage.setItem('onepiece_profile', JSON.stringify(profile));
      // Forcer un reload pour garantir la synchro front/back
      router.push('/');
      setTimeout(() => window.location.reload(), 100);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
      <h1 style={{ color: 'white', marginBottom: 40, fontSize: 32 }}>Qui regarde ?</h1>
      <div style={{ display: 'flex', gap: 40 }}>
        {profiles.map(profile => (
          <div key={profile.name} style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSelect(profile)}>
            <img src={profile.avatar} alt={profile.name} style={{ width: 120, height: 120, borderRadius: '50%', border: '4px solid #fff', marginBottom: 16, objectFit: 'cover', background: '#eee' }} />
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>{profile.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

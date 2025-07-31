"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const TOTAL_EPISODES = 1100;
const END_DATE = new Date('2025-11-30');

function getToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });
}

export default function OnePieceTracker() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [currentEpisode, setCurrentEpisode] = useState(undefined);
  const [inputValue, setInputValue] = useState(1);
  const [episodesPerDay, setEpisodesPerDay] = useState(0);
  const [plan, setPlan] = useState([]);
  const [history, setHistory] = useState([]);
  const [showPlan, setShowPlan] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [totalEpisodes, setTotalEpisodes] = useState(TOTAL_EPISODES);

  // Charger les données côté client
  useEffect(() => {
    async function fetchData() {
      if (typeof window === 'undefined') return;
      const prof = localStorage.getItem('onepiece_profile');
      if (!prof) {
        router.replace('/login');
        return;
      }
      const parsed = JSON.parse(prof);
      setProfile(parsed);
      // Récupérer le nombre total d'épisodes
      const settingsRes = await fetch('/api/settings');
      const settings = await settingsRes.json();
      setTotalEpisodes(settings.totalEpisodes);
      // Charger la progression depuis MongoDB
      let userName = parsed.role === 'admin' ? 'Mylan' : parsed.name;
      const userRes = await fetch(`/api/user?name=${userName}`);
      const users = await userRes.json();
      const user = Array.isArray(users) ? users[0] : users;
      if (user) {
        setCurrentEpisode(user.currentEpisode || 1);
        setInputValue(user.currentEpisode || 1);
        setHistory(user.history || []);
      } else {
        setCurrentEpisode(1);
        setInputValue(1);
        setHistory([]);
      }
    }
    fetchData();
  }, [router]);

  // Mettre à jour le plan
  const calculatePlan = useCallback((ep) => {
    const today = getToday();
    const daysLeft = Math.ceil((END_DATE - today) / (1000 * 60 * 60 * 24));
    const episodesLeft = totalEpisodes - ep;
    const perDay = daysLeft > 0 ? episodesLeft / daysLeft : episodesLeft;
    setEpisodesPerDay(perDay > 0 ? perDay : 0);

    const planArr = [];
    for (let i = 1; i <= Math.min(daysLeft, 30); i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const episode = Math.min(Math.ceil(ep + perDay * i), totalEpisodes);
      planArr.push({ 
        date: date.toISOString().slice(0, 10), 
        episode,
        episodesToWatch: Math.ceil(perDay)
      });
    }
    setPlan(planArr);
  }, [totalEpisodes]);

  useEffect(() => {
    if (currentEpisode !== undefined) {
      calculatePlan(currentEpisode);
    }
  }, [currentEpisode, calculatePlan]);

  async function handleSubmit() {
    if (!profile || profile.role !== 'user') return;
    const newEp = Number(inputValue);
    if (newEp < 1 || newEp > totalEpisodes) return;
    const todayStr = getToday().toISOString().slice(0, 10);
    let hist = [...history];
    const idx = hist.findIndex(h => h.date === todayStr);
    if (idx >= 0) {
      hist[idx].episode = newEp;
    } else {
      hist.push({ date: todayStr, episode: newEp });
    }
    setCurrentEpisode(newEp);
    setHistory(hist);
    // Sauvegarder dans MongoDB
    await fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profile.name, currentEpisode: newEp, history: hist })
    });
  }

  async function handleTotalEpisodesChange(e) {
    const val = Number(e.target.value);
    if (val < 1) return;
    setTotalEpisodes(val);
    // Sauvegarder dans MongoDB
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalEpisodes: val })
    });
  }



  // Calcul du progrès quotidien
  const dailyProgress = history.length > 0 ? (() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((current, i) => {
      const prev = i === 0 ? 0 : sorted[i - 1].episode;
      return {
        date: current.date,
        watched: current.episode - prev,
        total: current.episode
      };
    }).reverse();
  })() : [];

  if (!profile || currentEpisode === undefined) {
    return <div className="loading">Chargement...</div>;
  }

  const daysLeft = Math.ceil((END_DATE - getToday()) / (1000 * 60 * 60 * 24));
  const episodesLeft = totalEpisodes - currentEpisode;
  const progressPercentage = (currentEpisode / totalEpisodes) * 100;

  return (
    <div className="tracker-container">
      <div className="header">
        <h1>🏴‍☠️ Suivi One Piece</h1>
        <div className="subtitle">Connecté en tant que <b>{profile.name}</b> {profile.role === 'admin' ? '(admin)' : ''}</div>
        <button style={{marginTop:8, fontSize:12, background:'#fff2', color:'#fff', border:'none', borderRadius:8, padding:'4px 12px', cursor:'pointer'}} onClick={() => { localStorage.removeItem('onepiece_profile'); router.replace('/login'); }}>Changer de profil</button>
      </div>

      <div className="progress-section">
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {currentEpisode} / {totalEpisodes} épisodes ({progressPercentage.toFixed(1)}%)
          </div>
        </div>
      </div>

      {profile.role === 'user' && (
        <div className="update-section">
          <div className="input-group">
            <label htmlFor="episode">Dernier épisode vu :</label>
            <input
              id="episode"
              type="number"
              min="1"
              max={totalEpisodes}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="episode-input"
            />
            <button onClick={handleSubmit} className="update-btn">
              Mettre à jour
            </button>
          </div>
        </div>
      )}

      {profile.role === 'admin' && (
        <div className="update-section">
          <div style={{marginTop:16}}>
            <label htmlFor="total-episodes">Nombre total d&apos;&eacute;pisodes :</label>
            <input
              id="total-episodes"
              type="number"
              min="1"
              value={totalEpisodes}
              onChange={handleTotalEpisodesChange}
              style={{marginLeft:8, width:80, background:'#fff', color:'#333'}}
            />
            <span style={{marginLeft:8, fontSize:12, color:'#fff'}}>Modifiable uniquement par l&apos;admin</span>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{episodesLeft}</div>
          <div className="stat-label">Épisodes restants</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{daysLeft}</div>
          <div className="stat-label">Jours restants</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{episodesPerDay.toFixed(1)}</div>
          <div className="stat-label">Épisodes/jour</div>
          <div className="stat-note">
            {episodesPerDay > 10 ? '😰 Très difficile' :
             episodesPerDay > 5 ? '😅 Difficile' :
             episodesPerDay > 3 ? '😐 Modéré' : '😊 Facile'}
          </div>
        </div>
      </div>

      <div className="sections">
        <div className="section">
          <button 
            className="section-toggle"
            onClick={() => setShowHistory(!showHistory)}
          >
            <span>📊 Historique r&eacute;cent {showHistory ? '▲' : '▼'}</span>
            {dailyProgress.length > 0 && (
              <span className="badge">{dailyProgress.length} jours</span>
            )}
          </button>
          
          {showHistory && (
            <div className="section-content">
              {dailyProgress.length === 0 ? (
                <div className="empty-state">Aucun historique pour l&apos;instant</div>
              ) : (
                <div className="history-list">
                  {dailyProgress.slice(0, 10).map((day, idx) => (
                    <div key={day.date} className="history-item">
                      <div className="history-date">
                        {formatDate(day.date)}
                      </div>
                      <div className="history-episodes">
                        +{day.watched} épisodes
                      </div>
                      <div className="history-total">
                        (total: {day.total})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="section">
          <button 
            className="section-toggle"
            onClick={() => setShowPlan(!showPlan)}
          >
            <span>📅 Plan des 30 prochains jours {showPlan ? '▲' : '▼'}</span>
          </button>
          {showPlan && (
            <div className="section-content">
              <div className="plan-list">
                {(() => {
                  // Si au moins 1 épisode a été regardé aujourd'hui, on retire le jour courant du plan
                  const todayStr = getToday().toISOString().slice(0, 10);
                  const hasWatchedToday = history.some(h => h.date === todayStr && h.episode > (history.find((h, i, arr) => arr[i-1]?.date === todayStr)?.episode || 0));
                  let filteredPlan = plan;
                  if (hasWatchedToday && plan.length > 0 && plan[0].date === todayStr) {
                    filteredPlan = plan.slice(1);
                  }
                  return filteredPlan.map((day, idx) => (
                    <div key={day.date} className="plan-item">
                      <div className="plan-date">
                        {formatDate(day.date)}
                      </div>
                      <div className="plan-target">
                        Épisode {day.episode}
                      </div>
                      <div className="plan-episodes">
                        (~{day.episodesToWatch} à regarder)
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
       /* One Piece Tracker Styles */

        * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Geist Sans', sans-serif;
        }

        body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        min-height: 100vh;
        padding: 20px;
        }

        .tracker-container {
        max-width: 600px;
        margin: 2rem auto;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        color: white;
        position: relative;
        overflow: hidden;
        }

        .tracker-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
        pointer-events: none;
        }

        .tracker-container > * {
        position: relative;
        z-index: 1;
        }

        /* Header */
        .header {
        text-align: center;
        margin-bottom: 2rem;
        }

        .header h1 {
        margin: 0;
        font-size: 2.5rem;
        font-weight: 800;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        background: linear-gradient(45deg, #FFD700, #FFA500);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        }

        .subtitle {
        font-size: 1.1rem;
        opacity: 0.9;
        margin-top: 0.5rem;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
        }

        /* Progress Section */
        .progress-section {
        margin-bottom: 2rem;
        }

        .progress-bar-container {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 10px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .progress-bar {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 15px;
        height: 30px;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .progress-fill {
        background: linear-gradient(90deg, #4CAF50, #8BC34A, #CDDC39);
        height: 100%;
        border-radius: 15px;
        transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 10px rgba(76, 175, 80, 0.4);
        position: relative;
        }

        .progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
        }

        .progress-text {
        text-align: center;
        margin-top: 10px;
        font-weight: 600;
        font-size: 1.1rem;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
        }

        /* Update Section */
        .update-section {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 15px;
        padding: 20px;
        margin-bottom: 2rem;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .input-group {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
        }

        .input-group label {
        font-weight: 600;
        white-space: nowrap;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
        }

        .episode-input {
        padding: 12px 16px;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        width: 100px;
        text-align: center;
        background: white;
        color: #333;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        }

        .episode-input:focus {
        outline: none;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        transform: translateY(-1px);
        }

        .update-btn {
        padding: 12px 24px;
        background: linear-gradient(135deg, #FF6B6B, #FF8E53);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        }

        .update-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
        background: linear-gradient(135deg, #FF8E53, #FF6B6B);
        }

        .update-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 10px rgba(255, 107, 107, 0.4);
        }

        /* Stats Grid */
        .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin-bottom: 2rem;
        }

        .stat-card {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 15px;
        padding: 20px;
        text-align: center;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        }

        .stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: left 0.5s ease;
        }

        .stat-card:hover::before {
        left: 100%;
        }

        .stat-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .stat-number {
        font-size: 2rem;
        font-weight: 800;
        margin-bottom: 5px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .stat-label {
        font-size: 0.9rem;
        opacity: 0.9;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        }

        .stat-note {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-top: 5px;
        }

        /* Sections */
        .sections {
        display: flex;
        flex-direction: column;
        gap: 15px;
        }

        .section {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        overflow: hidden;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
        }

        .section:hover {
        background: rgba(255, 255, 255, 0.15);
        }

        .section-toggle {
        width: 100%;
        padding: 20px;
        background: none;
        border: none;
        color: white;
        text-align: left;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.3s ease;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
        }

        .section-toggle:hover {
        background: rgba(255, 255, 255, 0.1);
        padding-left: 25px;
        }

        .badge {
        background: rgba(255, 255, 255, 0.3);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .section-content {
        padding: 0 20px 20px;
        animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
        }

        .empty-state {
        text-align: center;
        padding: 20px;
        opacity: 0.7;
        font-style: italic;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        border: 1px dashed rgba(255, 255, 255, 0.3);
        }

        .history-list, .plan-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        }

        .history-item, .plan-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        font-size: 0.95rem;
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .history-item:hover, .plan-item:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateX(5px);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .history-date, .plan-date {
        font-weight: 600;
        min-width: 80px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
        }

        .history-episodes {
        color: #4CAF50;
        font-weight: 600;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        }

        .history-total, .plan-episodes {
        opacity: 0.8;
        font-size: 0.85rem;
        }

        .plan-target {
        font-weight: 600;
        color: #FFD54F;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        }

        .loading {
        text-align: center;
        padding: 50px;
        font-size: 1.2rem;
        color: white;
        }

        /* Responsive Design */
        @media (max-width: 600px) {
        body {
            padding: 10px;
        }

        .tracker-container {
            margin: 1rem auto;
            padding: 15px;
        }

        .header h1 {
            font-size: 2rem;
        }

        .subtitle {
            font-size: 1rem;
        }

        .input-group {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
        }

        .episode-input {
            width: 100%;
        }

        .update-btn {
            width: 100%;
            padding: 15px;
        }

        .stats-grid {
            grid-template-columns: 1fr;
            gap: 10px;
        }

        .stat-card {
            padding: 15px;
        }

        .stat-number {
            font-size: 1.5rem;
        }

        .section-toggle {
            padding: 15px;
            font-size: 1rem;
        }

        .history-item, .plan-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
            padding: 15px;
        }

        .history-date, .plan-date {
            min-width: auto;
            font-size: 0.9rem;
        }
        }

        @media (max-width: 400px) {
        .tracker-container {
            margin: 0.5rem auto;
            padding: 10px;
        }

        .header h1 {
            font-size: 1.8rem;
        }

        .progress-bar {
            height: 25px;
        }

        .stat-card {
            padding: 12px;
        }

        .section-toggle {
            padding: 12px;
        }
        }

        /* Animation pour les nouvelles entrées */
        .history-item:first-child {
        animation: slideInRight 0.5s ease;
        }

        @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(50px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
        }`}
        </style>
    </div>
    );
}
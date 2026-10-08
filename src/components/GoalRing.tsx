export default function GoalRing({ done, goal, streak }: { done: number; goal: number; streak: number }) {
  const R = 20, C = 2 * Math.PI * R, pct = Math.min(done / goal, 1), met = done >= goal
  return (
    <div className="goal" role="img" aria-label={`${done} of ${goal} walks this week${streak > 0 ? `, ${streak} day streak` : ''}`}>
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={R} fill="none" stroke="#2c2c2c" strokeWidth="5" />
        <circle cx="26" cy="26" r={R} fill="none" stroke="var(--g)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 26 26)" />
        <text x="26" y="30" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">{met ? '✓' : `${done}/${goal}`}</text>
      </svg>
      <small>{streak > 0 ? `🔥 ${streak} day${streak > 1 ? 's' : ''}` : 'walks / wk'}</small>
    </div>)
}

interface StrengthsWeaknessesProps {
  strengths: string[];
  weaknesses: string[];
}

export default function StrengthsWeaknesses({ strengths, weaknesses }: StrengthsWeaknessesProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Strengths */}
      <div className="card">
        <div className="flex items-centre space-x-2 mb-4">
          <svg
            className="w-6 h-6 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-xl font-bold">Strengths</h3>
        </div>
        {strengths.length > 0 ? (
          <ul className="space-y-3">
            {strengths.map((strength, index) => (
              <li key={index} className="flex items-start space-x-3">
                <span className="text-green-400 mt-0.5">✓</span>
                <span className="text-text-secondary">{strength}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted italic">No strengths identified yet</p>
        )}
      </div>

      {/* Weaknesses */}
      <div className="card">
        <div className="flex items-centre space-x-2 mb-4">
          <svg
            className="w-6 h-6 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-xl font-bold">Areas for Improvement</h3>
        </div>
        {weaknesses.length > 0 ? (
          <ul className="space-y-3">
            {weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start space-x-3">
                <span className="text-amber-400 mt-0.5">!</span>
                <span className="text-text-secondary">{weakness}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted italic">No weaknesses identified yet</p>
        )}
      </div>
    </div>
  );
}

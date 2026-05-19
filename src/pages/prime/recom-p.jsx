import '../../css/prime/recom-p.css';
import Spinner from '../../components/Spinner';
import { useRecommendations } from '../../hooks/useRecommendations';
import { updateRecommendation } from '../../firebase/collections/recommendations';

export default function RecomP() {
  const { recommendations, loading } = useRecommendations();

  const recommendedAgencies = recommendations
    .filter(r => r.oaRecommended && r.agencyName)
    .sort((a, b) => (a.agencyName || '').localeCompare(b.agencyName || ''));

  const handleUndoRecommend = async (recId) => {
    try {
      await updateRecommendation(recId, {
        oaRecommended: false,
        oaRecommendedAt: null
      });
    } catch (err) {
      console.error('Error undoing recommendation:', err);
      alert('Failed to undo recommendation: ' + err.message);
    }
  };

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Recommendations</h1>
      </div>

      <div className="recom-page">
        {loading && (
          <div className="recom-loading">
            <Spinner size="lg" color="primary" />
            <span>Loading recommendations...</span>
          </div>
        )}

        {!loading && recommendedAgencies.length === 0 && (
          <p className="recom-empty">No OA-recommended agencies yet.</p>
        )}

        {!loading && recommendedAgencies.length > 0 && (
          <div className="recom-list">
            <h2 className="recom-section-title">OA Recommended Agencies</h2>
            <ul className="recom-agency-list">
              {recommendedAgencies.map(rec => (
                <li key={rec.id} className="recom-agency-item">
                  <div className="recom-agency-header">
                    <span className="recom-agency-name">{rec.agencyName}</span>
                    <button
                      className="recom-undo-btn"
                      onClick={() => handleUndoRecommend(rec.id)}
                      title="Debug: Undo this recommendation and unlock the card"
                    >
                      Undo Recommendation
                    </button>
                  </div>
                  {rec.fieldDirector && (
                    <span className="recom-agency-director">Field Director: {rec.fieldDirector}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

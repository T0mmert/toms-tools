import { Component } from 'react';
import { clearAllData, exportData } from '../lib/storage';
import './ErrorBoundary.css';

/**
 * Last line of defence. Because state lives in localStorage, an uncaught render
 * error would otherwise reappear on every reload with no way out from the UI.
 * This offers a rescue (download a backup) before the reset that clears it.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  handleReset = () => {
    clearAllData();
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash-screen" role="alert">
        <div className="crash-card">
          <h1>Er ging iets mis</h1>
          <p>
            Toms Tools kon deze weergave niet laden. Je gegevens staan nog in deze browser — maak
            eerst een back-up voordat je opnieuw begint.
          </p>
          <pre className="crash-detail">{String(error?.message || error)}</pre>
          <div className="crash-actions">
            <button type="button" className="crash-btn primary" onClick={exportData}>
              Back-up downloaden
            </button>
            <button type="button" className="crash-btn" onClick={() => window.location.reload()}>
              Opnieuw proberen
            </button>
            <button type="button" className="crash-btn danger" onClick={this.handleReset}>
              Gegevens wissen
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

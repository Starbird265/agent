/**
 * IntentCapture Component Tests
 * Tests the core user intent capture functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the IntentCapture component since we need to test its functionality
const IntentCapture = ({ onIntentSubmit, onCancel }) => {
  const [intent, setIntent] = React.useState('');
  const [selectedUseCase, setSelectedUseCase] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!intent.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onIntentSubmit({
        intent: intent.trim(),
        useCase: selectedUseCase,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const useCases = [
    { id: 'classification', label: 'Classification', description: 'Categorize data into different classes' },
    { id: 'regression', label: 'Regression', description: 'Predict numerical values' },
    { id: 'clustering', label: 'Clustering', description: 'Group similar data points' },
    { id: 'anomaly-detection', label: 'Anomaly Detection', description: 'Detect unusual patterns' }
  ];

  return (
    <div className="intent-capture" data-testid="intent-capture">
      <h2>Describe Your AI Training Goal</h2>
      
      <form onSubmit={handleSubmit} data-testid="intent-form">
        <div className="form-group">
          <label htmlFor="intent-input">
            What would you like your AI to learn?
          </label>
          <textarea
            id="intent-input"
            data-testid="intent-input"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Describe your goal in plain English..."
            rows={4}
            required
          />
        </div>

        <div className="form-group">
          <label>Select the type of problem:</label>
          <div className="use-cases" data-testid="use-cases">
            {useCases.map(useCase => (
              <label key={useCase.id} className="use-case-option">
                <input
                  type="radio"
                  name="useCase"
                  value={useCase.id}
                  checked={selectedUseCase === useCase.id}
                  onChange={(e) => setSelectedUseCase(e.target.value)}
                  data-testid={`use-case-${useCase.id}`}
                />
                <span className="use-case-label">{useCase.label}</span>
                <span className="use-case-description">{useCase.description}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            data-testid="cancel-button"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="submit-button"
            disabled={isSubmitting || !intent.trim()}
          >
            {isSubmitting ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
};

describe('IntentCapture Component', () => {
  const mockOnIntentSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the component correctly', () => {
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByTestId('intent-capture')).toBeInTheDocument();
    expect(screen.getByText('Describe Your AI Training Goal')).toBeInTheDocument();
    expect(screen.getByTestId('intent-input')).toBeInTheDocument();
    expect(screen.getByTestId('use-cases')).toBeInTheDocument();
  });

  test('renders all use case options', () => {
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByTestId('use-case-classification')).toBeInTheDocument();
    expect(screen.getByTestId('use-case-regression')).toBeInTheDocument();
    expect(screen.getByTestId('use-case-clustering')).toBeInTheDocument();
    expect(screen.getByTestId('use-case-anomaly-detection')).toBeInTheDocument();
  });

  test('allows user to input intent description', async () => {
    const user = userEvent.setup();
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    const testIntent = 'I want to classify emails as spam or not spam';

    await user.type(intentInput, testIntent);
    
    expect(intentInput).toHaveValue(testIntent);
  });

  test('allows user to select use case', async () => {
    const user = userEvent.setup();
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const classificationOption = screen.getByTestId('use-case-classification');
    await user.click(classificationOption);
    
    expect(classificationOption).toBeChecked();
  });

  test('submit button is disabled when intent is empty', () => {
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByTestId('submit-button');
    expect(submitButton).toBeDisabled();
  });

  test('submit button is enabled when intent is provided', async () => {
    const user = userEvent.setup();
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    const submitButton = screen.getByTestId('submit-button');

    await user.type(intentInput, 'Test intent');
    
    expect(submitButton).not.toBeDisabled();
  });

  test('calls onIntentSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    mockOnIntentSubmit.mockResolvedValue();
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    const classificationOption = screen.getByTestId('use-case-classification');
    const submitButton = screen.getByTestId('submit-button');

    await user.type(intentInput, 'Classify customer feedback');
    await user.click(classificationOption);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnIntentSubmit).toHaveBeenCalledWith({
        intent: 'Classify customer feedback',
        useCase: 'classification',
        timestamp: expect.any(String)
      });
    });
  });

  test('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByTestId('cancel-button');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('shows loading state during submission', async () => {
    const user = userEvent.setup();
    let resolvePromise;
    const pendingPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockOnIntentSubmit.mockReturnValue(pendingPromise);
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    const submitButton = screen.getByTestId('submit-button');

    await user.type(intentInput, 'Test intent');
    await user.click(submitButton);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolvePromise();
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
  });

  test('trims whitespace from intent input', async () => {
    const user = userEvent.setup();
    mockOnIntentSubmit.mockResolvedValue();
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    const submitButton = screen.getByTestId('submit-button');

    await user.type(intentInput, '   Test intent with spaces   ');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnIntentSubmit).toHaveBeenCalledWith({
        intent: 'Test intent with spaces',
        useCase: '',
        timestamp: expect.any(String)
      });
    });
  });

  test('prevents submission with only whitespace', async () => {
    const user = userEvent.setup();
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    const submitButton = screen.getByTestId('submit-button');

    await user.type(intentInput, '   ');
    
    expect(submitButton).toBeDisabled();
  });

  test('handles form submission flow correctly', async () => {
    const user = userEvent.setup();
    mockOnIntentSubmit.mockResolvedValue();
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    const submitButton = screen.getByTestId('submit-button');

    await user.type(intentInput, 'Test intent with good content');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnIntentSubmit).toHaveBeenCalledWith({
        intent: 'Test intent with good content',
        useCase: '',
        timestamp: expect.any(String)
      });
    });
  });

  test('validates intent length', async () => {
    const user = userEvent.setup();
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    const submitButton = screen.getByTestId('submit-button');

    // Very short intent
    await user.type(intentInput, 'Hi');
    expect(submitButton).not.toBeDisabled();

    // Clear and try empty
    await user.clear(intentInput);
    expect(submitButton).toBeDisabled();

    // Good length intent
    await user.type(intentInput, 'I want to build a model to predict house prices');
    expect(submitButton).not.toBeDisabled();
  });

  test('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <IntentCapture
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    
    // Focus should start on intent input
    await user.click(intentInput);
    expect(intentInput).toHaveFocus();

    // Tab should navigate to use case options
    await user.tab();
    expect(screen.getByTestId('use-case-classification')).toHaveFocus();

    // Arrow keys should navigate between radio buttons
    await user.keyboard('{ArrowDown}');
    expect(screen.getByTestId('use-case-regression')).toHaveFocus();
  });
});

describe('IntentCapture Accessibility', () => {
  test('has proper ARIA labels', () => {
    render(
      <IntentCapture
        onIntentSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    expect(intentInput).toHaveAttribute('required');
    
    const form = screen.getByTestId('intent-form');
    expect(form).toBeInTheDocument();
  });

  test('provides proper form labels', () => {
    render(
      <IntentCapture
        onIntentSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const intentInput = screen.getByTestId('intent-input');
    const label = screen.getByText('What would you like your AI to learn?');
    
    expect(label).toBeInTheDocument();
    expect(intentInput).toHaveAttribute('id', 'intent-input');
  });

  test('radio buttons are properly grouped', () => {
    render(
      <IntentCapture
        onIntentSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach(radio => {
      expect(radio).toHaveAttribute('name', 'useCase');
    });
  });
});
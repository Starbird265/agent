/**
 * Comprehensive Tests for IntentCapture Component
 * Testing the core natural language AI training interface
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntentCapture from '../../components/Nitrix/IntentCapture';

describe('IntentCapture Component', () => {
  const mockOnIntentSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderIntentCapture = () => {
    return render(
      <IntentCapture 
        onIntentSubmit={mockOnIntentSubmit}
        onCancel={mockOnCancel}
      />
    );
  };

  describe('Initial Render', () => {
    test('renders step 1 with correct elements', () => {
      renderIntentCapture();
      
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('What do you want your AI to do?')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/For example: I want to create a chatbot/)).toBeInTheDocument();
      expect(screen.getByText('Next: Choose Use Case')).toBeInTheDocument();
    });

    test('next button is disabled with empty input', () => {
      renderIntentCapture();
      
      const nextButton = screen.getByText('Next: Choose Use Case');
      expect(nextButton).toBeDisabled();
    });

    test('progress bar shows correct width', () => {
      renderIntentCapture();
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle('width: 33.333333%');
    });
  });

  describe('User Input Validation', () => {
    test('enables next button when sufficient text is entered', async () => {
      const user = userEvent.setup();
      renderIntentCapture();
      
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      await user.type(textarea, 'I want to create a sentiment analysis model');
      
      const nextButton = screen.getByText('Next: Choose Use Case');
      expect(nextButton).not.toBeDisabled();
    });

    test('shows intent analysis when text is long enough', async () => {
      const user = userEvent.setup();
      renderIntentCapture();
      
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      await user.type(textarea, 'I want to create a customer support chatbot that can classify user messages and provide appropriate responses');
      
      await waitFor(() => {
        expect(screen.getByText('Intent Analysis')).toBeInTheDocument();
      });
    });

    test('intent analysis detects customer support keywords', async () => {
      const user = userEvent.setup();
      renderIntentCapture();
      
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      await user.type(textarea, 'I need a customer support system to help users with their questions');
      
      await waitFor(() => {
        expect(screen.getByText('Customer Support Enhancement')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Step Navigation', () => {
    test('navigates to step 2 when next is clicked', async () => {
      const user = userEvent.setup();
      renderIntentCapture();
      
      // Fill in step 1
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      await user.type(textarea, 'I want to create a text classification model');
      
      // Click next
      const nextButton = screen.getByText('Next: Choose Use Case');
      await user.click(nextButton);
      
      // Verify step 2
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('Select the best match for your use case')).toBeInTheDocument();
    });

    test('can navigate back from step 2 to step 1', async () => {
      const user = userEvent.setup();
      renderIntentCapture();
      
      // Go to step 2
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      await user.type(textarea, 'I want to create a text classification model');
      await user.click(screen.getByText('Next: Choose Use Case'));
      
      // Go back to step 1
      await user.click(screen.getByText('Back'));
      
      // Verify step 1
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('What do you want your AI to do?')).toBeInTheDocument();
    });
  });

  describe('Use Case Selection', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderIntentCapture();
      
      // Navigate to step 2
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      await user.type(textarea, 'I want to create a text classification model');
      await user.click(screen.getByText('Next: Choose Use Case'));
    });

    test('displays all use case options', () => {
      expect(screen.getByText('Text Generation')).toBeInTheDocument();
      expect(screen.getByText('Speech to Text')).toBeInTheDocument();
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
      expect(screen.getByText('Classification')).toBeInTheDocument();
      expect(screen.getByText('Recommendation')).toBeInTheDocument();
      expect(screen.getByText('Forecasting')).toBeInTheDocument();
    });

    test('selects use case when clicked', async () => {
      const user = userEvent.setup();
      
      const classificationCard = screen.getByText('Classification').closest('div');
      await user.click(classificationCard);
      
      expect(classificationCard).toHaveClass('border-purple-500', 'bg-purple-50');
    });

    test('enables next button when use case is selected', async () => {
      const user = userEvent.setup();
      
      const classificationCard = screen.getByText('Classification').closest('div');
      await user.click(classificationCard);
      
      const nextButton = screen.getByText('Next: Configure Training');
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('Final Configuration', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderIntentCapture();
      
      // Navigate to step 3
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      await user.type(textarea, 'I want to create a text classification model');
      await user.click(screen.getByText('Next: Choose Use Case'));
      
      const classificationCard = screen.getByText('Classification').closest('div');
      await user.click(classificationCard);
      await user.click(screen.getByText('Next: Configure Training'));
    });

    test('displays configuration options', () => {
      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
      expect(screen.getByText('Configure Your Training')).toBeInTheDocument();
      expect(screen.getByText('Data Source (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Target Accuracy (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Cost Preference')).toBeInTheDocument();
    });

    test('submits intent when start training is clicked', async () => {
      const user = userEvent.setup();
      
      const startButton = screen.getByText('Start Training');
      await user.click(startButton);
      
      expect(mockOnIntentSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnIntentSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'I want to create a text classification model',
          useCase: 'classification',
          targetMetrics: expect.objectContaining({
            cost: 'low'
          })
        })
      );
    });

    test('shows loading state during submission', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response
      mockOnIntentSubmit.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const startButton = screen.getByText('Start Training');
      await user.click(startButton);
      
      expect(screen.getByText('Creating Your AI Model...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('shows error when submission fails', async () => {
      const user = userEvent.setup();
      renderIntentCapture();
      
      // Navigate to step 3
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      await user.type(textarea, 'I want to create a text classification model');
      await user.click(screen.getByText('Next: Choose Use Case'));
      
      const classificationCard = screen.getByText('Classification').closest('div');
      await user.click(classificationCard);
      await user.click(screen.getByText('Next: Configure Training'));
      
      // Mock submission failure
      mockOnIntentSubmit.mockRejectedValueOnce(new Error('Training failed'));
      
      // Mock window.alert
      window.alert = jest.fn();
      
      const startButton = screen.getByText('Start Training');
      await user.click(startButton);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to start training. Please try again.');
      });
    });

    test('validates required fields before submission', async () => {
      const user = userEvent.setup();
      renderIntentCapture();
      
      // Try to submit without filling step 1
      window.alert = jest.fn();
      
      const startButton = screen.getByText('Next: Choose Use Case');
      await user.click(startButton);
      
      // Should not advance to step 2
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      renderIntentCapture();
      
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      expect(textarea).toHaveAttribute('aria-label', 'Describe your use case');
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '33.33');
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderIntentCapture();
      
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      await user.type(textarea, 'I want to create a text classification model');
      
      // Tab to next button
      await user.tab();
      const nextButton = screen.getByText('Next: Choose Use Case');
      expect(nextButton).toHaveFocus();
      
      // Enter should work
      await user.keyboard('{Enter}');
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('debounces intent analysis updates', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();
      renderIntentCapture();
      
      const textarea = screen.getByPlaceholderText(/For example: I want to create a chatbot/);
      
      // Type quickly
      await user.type(textarea, 'I want to create customer support');
      
      // Intent analysis should not appear immediately
      expect(screen.queryByText('Intent Analysis')).not.toBeInTheDocument();
      
      // Fast forward time
      jest.runAllTimers();
      
      // Now it should appear
      await waitFor(() => {
        expect(screen.getByText('Intent Analysis')).toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });
  });
});
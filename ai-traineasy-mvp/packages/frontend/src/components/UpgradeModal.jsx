import React, { useState, useEffect } from 'react';
import { upgradePlan } from '../api';

export default function UpgradeModal({ isOpen, onClose, user, onUserUpdate }) {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal is opened/closed or user changes
  useEffect(() => {
    if (isOpen) {
      setSelectedPlan('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleUpgrade = async () => {
    if (!selectedPlan) {
      setError('Please select a plan to upgrade to.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const updatedUser = await upgradePlan(user.email, selectedPlan);
      if (updatedUser && updatedUser.id) {
        onUserUpdate(updatedUser); // Update user state in App.jsx
        onClose(); // Close the modal
      } else {
        // This case might occur if API returns success but not the user object as expected
        setError(updatedUser.detail || updatedUser.error || 'Upgrade request processed, but user data was not returned as expected.');
      }
    } catch (e) {
      console.error("Upgrade failed:", e);
      setError(e.message || 'An unexpected error occurred during upgrade.');
    } finally {
      setIsLoading(false);
    }
  };

  const plans = [
    { value: 'first_export', label: 'First Export — $49', description: 'Export 1 trained model.' },
    { value: 'pro_bundle', label: 'Pro Bundle (3 Exports) — $69', description: 'Better value for small projects.' },
    { value: 'unlimited_pro_annual', label: 'Unlimited Pro — $399/year', description: 'Unlimited exports & priority support.' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Upgrade Your Plan</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl" disabled={isLoading}>&times;</button>
        </div>

        {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm" role="alert">{error}</p>}

        {user.beta_credit_available && user.subscription_type === 'beta_only' && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                🎁 Your $10 Beta Access credit will be automatically applied to your first plan purchase!
            </div>
        )}

        <div className="space-y-3">
          {plans.map(planInfo => (
            <label key={planInfo.value} className="block p-3 border rounded-md hover:bg-gray-50 cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
              <input
                type="radio"
                name="plan"
                value={planInfo.value}
                checked={selectedPlan === planInfo.value}
                onChange={() => setSelectedPlan(planInfo.value)}
                className="mr-2"
                disabled={isLoading}
              />
              <span className="font-semibold">{planInfo.label}</span>
              <p className="text-xs text-gray-600 ml-5">{planInfo.description}</p>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading || !selectedPlan}
          >
            {isLoading ? 'Processing...' : 'Upgrade Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

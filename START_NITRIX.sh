#!/bin/bash

# 🚀 NITRIX AI TRAINING PLATFORM - QUICK START SCRIPT
# Start the enhanced Nitrix platform with beautiful UI and real AI training

echo "🎯 Starting Nitrix AI Training Platform..."
echo "✨ Enhanced UI with modern design and real AI functionality"
echo ""

# Navigate to frontend directory
if [ ! -d "packages/frontend" ]; then
  echo "❌ Error: packages/frontend directory not found"
  echo "Please run this script from the project root directory"
  exit 1
fi

cd packages/frontend || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    if ! npm install; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Start the development server
echo "🚀 Starting development server..."
echo "🌐 Open http://localhost:5173/agent/ in your browser"
echo ""
echo "✅ Features Available:"
echo "   • Beautiful modern UI with glassmorphism design"
echo "   • Real AI training with TensorFlow.js and GPU support"
echo "   • Drag & drop data upload interface"
echo "   • Live training metrics and progress tracking"
echo "   • Real-time model predictions with confidence scores"
echo "   • Professional dashboard with model management"
echo ""
echo "🎯 Sample Data: Upload 'sample_iris_dataset.csv' to test immediately"
echo "📊 Expected Results: 90-95% accuracy in 1-2 minutes"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================"

# Start the server
if ! npm run dev; then
  echo "❌ Failed to start development server"
  echo "Please check the error messages above and try again"
  exit 1
fi
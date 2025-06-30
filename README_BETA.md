# 🤖 AI TrainEasy MVP - Beta Version

**Automated Machine Learning Made Simple**

[![Beta Version](https://img.shields.io/badge/version-1.0.0--beta-orange.svg)](https://github.com/your-repo/ai-traineasy)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/react-19.1.0-blue.svg)](https://reactjs.org)

---

## 🚀 **Quick Start for Beta Testers**

### **Prerequisites**
- Python 3.8+
- Node.js 16+
- 4GB+ RAM recommended
- 2GB+ free disk space

### **1-Minute Setup**

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-traineasy-mvp

# Run automated setup
python setup.py

# Start backend (Terminal 1)
cd packages/backend && python main_simple.py

# Start frontend (Terminal 2)
cd packages/frontend && npm run dev

# Open http://localhost:5173
```

---

## 📋 **Beta Testing Checklist**

### **Core Features to Test**

- [ ] **Project Creation** - Create new ML projects
- [ ] **File Upload** - Upload CSV/JSON datasets (max 100MB)
- [ ] **Data Labeling** - Configure input/output schema
- [ ] **Model Training** - Start automated training
- [ ] **Training Monitoring** - View real-time logs
- [ ] **Predictions** - Test trained models
- [ ] **System Info** - Check hardware utilization
- [ ] **Hugging Face** - Search & download models

### **Security Features**

- [ ] **File Validation** - Only CSV/JSON accepted
- [ ] **Size Limits** - Large files rejected
- [ ] **CORS Protection** - Only localhost origins allowed
- [ ] **Input Sanitization** - Malicious inputs handled
- [ ] **Error Handling** - Graceful error responses

---

## 🛠️ **Configuration**

### **Environment Variables** (`packages/backend/.env`)

```bash
# Security
SECRET_KEY=your-secret-key-here

# File Limits
MAX_FILE_SIZE_MB=100
MAX_PROJECTS_PER_USER=10

# External APIs
HUGGINGFACE_HUB_TOKEN=your-hf-token-here

# Environment
ENVIRONMENT=development
```

### **System Requirements**

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 2 GB | 10+ GB |
| GPU | Optional | NVIDIA GPU |

---

## 🧪 **Testing Scenarios**

### **Happy Path Testing**

1. **Basic ML Workflow**
   ```
   Create Project → Upload CSV → Configure Schema → Train → Predict
   ```

2. **Sample Datasets**
   - Iris classification: [iris.csv](https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv)
   - House prices: [housing.csv](https://raw.githubusercontent.com/selva86/datasets/master/BostonHousing.csv)

### **Edge Case Testing**

1. **Large Files**
   - Try uploading 150MB+ files (should be rejected)
   - Test with 1M+ row datasets

2. **Invalid Data**
   - Upload empty files
   - Upload corrupted CSVs
   - Try non-CSV/JSON files

3. **System Stress**
   - Multiple concurrent training jobs
   - High CPU/memory usage
   - Network interruptions

### **Security Testing**

1. **File Upload Security**
   - Try uploading .exe, .py, .html files
   - Test with malicious CSV content
   - Check file path traversal attempts

2. **API Security**
   - Test with invalid project IDs
   - Send malformed JSON requests
   - Test CORS restrictions

---

## 📊 **Performance Benchmarks**

### **Training Speed** (on 4-core CPU)

| Dataset Size | Training Time | Memory Usage |
|--------------|---------------|--------------|
| 1K rows | 30 seconds | 500MB |
| 10K rows | 2 minutes | 1GB |
| 100K rows | 15 minutes | 3GB |
| 1M rows | 2+ hours | 8GB+ |

### **Supported ML Tasks**

- **Classification** - Binary & multi-class
- **Regression** - Numeric prediction
- **Auto-detection** - Based on target variable
- **Models** - Random Forest, LightGBM

---

## 🐛 **Known Issues & Limitations**

### **Current Limitations**

- [ ] **No Authentication** - Single-user mode only
- [ ] **File Storage** - Local filesystem (not scalable)
- [ ] **Training Queue** - One training job at a time
- [ ] **Model Versioning** - No model history
- [ ] **Data Preprocessing** - Basic pipeline only

### **Reported Issues**

- Training may fail on very large datasets (>1M rows)
- GPU training not fully tested on all platforms
- Hugging Face downloads require token configuration

---

## 📝 **Beta Feedback Form**

**Please test and report:**

### **What Worked Well?**
- Describe successful workflows
- Performance on your system
- User experience highlights

### **Issues Found**
- Error messages and logs
- Steps to reproduce
- System specifications

### **Feature Requests**
- Missing functionality
- Improvement suggestions
- Integration needs

### **Security Concerns**
- Potential vulnerabilities
- Data handling issues
- Privacy considerations

---

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Backend Won't Start**
   ```bash
   # Check Python version
   python --version
   
   # Install dependencies
   pip install -r packages/backend/requirements.txt
   
   # Check port availability
   lsof -i :8000
   ```

2. **Frontend Build Errors**
   ```bash
   # Clear cache and reinstall
   cd packages/frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Training Fails**
   ```bash
   # Check logs
   tail -f packages/backend/app.log
   
   # Verify dataset format
   head packages/backend/projects/{project-id}/data/*.csv
   ```

4. **Out of Memory**
   ```bash
   # Monitor system resources
   htop
   
   # Reduce CPU percentage in training settings
   # Try smaller datasets first
   ```

### **Log Locations**

- **Backend Logs**: `packages/backend/app.log`
- **Training Logs**: `packages/backend/projects/{project-id}/train.log`
- **Browser Console**: F12 → Console tab

---

## 🚀 **Next Steps After Beta**

### **Planned Features**

- [ ] **User Authentication** - Multi-user support
- [ ] **Database Integration** - PostgreSQL/MySQL
- [ ] **Model Deployment** - API endpoints
- [ ] **More ML Algorithms** - Deep Learning, XGBoost
- [ ] **Advanced Preprocessing** - Feature engineering
- [ ] **Experiment Tracking** - MLflow integration
- [ ] **Cloud Deployment** - Docker, Kubernetes
- [ ] **Team Collaboration** - Project sharing

### **Production Roadmap**

1. **Phase 1** - Security & Authentication
2. **Phase 2** - Scalability & Performance
3. **Phase 3** - Advanced ML Features
4. **Phase 4** - Enterprise Features

---

## 📞 **Support**

### **Getting Help**

- **GitHub Issues**: Report bugs and feature requests
- **Email**: [your-email@domain.com]
- **Discord**: [Your Discord Server]
- **Documentation**: Check logs first

### **Beta Testing Timeline**

- **Beta Start**: [Start Date]
- **Feedback Deadline**: [End Date]
- **Expected Updates**: Weekly
- **Production Release**: [Target Date]

---

## 🙏 **Thank You**

Thank you for beta testing AI TrainEasy MVP! Your feedback is crucial for making this the best AutoML platform possible.

**Happy Testing!** 🚀

---

*Last Updated: [Current Date]*
*Version: 1.0.0-beta*
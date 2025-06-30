import sys, os, json
import importlib
import subprocess

def ensure_packages(packages):
    """Check and install missing packages at runtime."""
    for pkg in packages:
        try:
            importlib.import_module(pkg)
        except ImportError:
            print(f"[AutoInstall] Installing missing package: {pkg}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])

# At the top of your script, before other imports:
ensure_packages([
    "pandas", "sklearn", "lightgbm", "joblib", "torch", "psutil", "GPUtil"
])

import pandas as pd
from joblib import dump
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
import torch

# 1) Setup paths
project_id = sys.argv[1]
base_dir = os.path.join("projects", project_id)
data_dir = os.path.join(base_dir, "data")
schema_path = os.path.join(base_dir, "schema.json")

# 2) Load schema & data
with open(schema_path) as f:
    schema = json.load(f)
features, target = schema["inputs"], schema["output"]

# Assume first file in data_dir
files = [f for f in os.listdir(data_dir) if f.endswith((".csv", ".json"))]
file_path = os.path.join(data_dir, files[0])
df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_json(file_path)

# 3) Separate X/y and drop fully empty rows
df = df.dropna(subset=features + [target], how="all")
X, y = df[features], df[target].copy()

# 4) Encode target if categorical
if y.dtype == "object" or y.dtype.name == "category":
    le = LabelEncoder()
    y = le.fit_transform(y)
    dump(le, os.path.join(base_dir, "label_encoder.pkl"))

# 5) Identify numeric vs categorical features
num_cols = X.select_dtypes(include=["number"]).columns.tolist()
cat_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()

# 6) Build preprocessing pipeline
numeric_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="mean")),
    ("scaler", StandardScaler())
])
categorical_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("onehot", OneHotEncoder(handle_unknown="ignore"))
])

preprocessor = ColumnTransformer([
    ("num", numeric_transformer, num_cols),
    ("cat", categorical_transformer, cat_cols),
])

# 7) Choose model candidates based on problem type
is_classification = len(set(y)) <= 20  # heuristic

# Detect device: use GPU if available, else CPU
if torch.cuda.is_available():
    device = 'cuda'
    print('GPU detected. Training will use CUDA.')
else:
    device = 'cpu'
    print('No GPU detected. Training will use CPU.')

candidates = {
    "RandomForest": RandomForestClassifier(n_estimators=100) if is_classification else RandomForestRegressor(n_estimators=100),
    "LightGBM": (LGBMClassifier(n_estimators=100, device=device) if is_classification else LGBMRegressor(n_estimators=100, device=device)),
}

# 8) Evaluate each in a pipeline
best_name, best_score, best_pipeline = None, -float("inf"), None
for name, model in candidates.items():
    pipe = Pipeline([("pre", preprocessor), ("model", model)])
    scores = cross_val_score(pipe, X, y, cv=3, n_jobs=-1)
    avg = scores.mean()
    print(f"{name}: CV score={avg:.4f}")
    if avg > best_score:
        best_score, best_name, best_pipeline = avg, name, pipe

# 9) Train final pipeline on full data
print(f"Training final {best_name} on full dataset…")
best_pipeline.fit(X, y)

# 10) Persist the pipeline and log metadata
dump(best_pipeline, os.path.join(base_dir, "model.pkl"))
log = {
    "problem_type": "classification" if is_classification else "regression",
    "scores": {name: float(f"{cross_val_score(Pipeline([('pre', preprocessor),('model', m)]), X, y, cv=3).mean():.4f}")
               for name, m in candidates.items()},
    "selected_model": best_name,
    "cv_score": float(f"{best_score:.4f}"),
    "features": features,
    "num_features": len(num_cols),
    "cat_features": len(cat_cols),
}
with open(os.path.join(base_dir, "training_log.json"), "w") as f:
    json.dump(log, f, indent=2)

print("✅ AutoML training complete. Log saved.")

if __name__ == "__main__":
    train(sys.argv[1])
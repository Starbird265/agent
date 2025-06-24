import sys
import os
import json
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

def train(project_id):
    base_dir = os.path.join("projects", project_id)
    schema_path = os.path.join(base_dir, "schema.json")
    data_dir = os.path.join(base_dir, "data")

    # Load schema
    with open(schema_path) as f:
        schema = json.load(f)

    inputs = schema["inputs"]
    output = schema["output"]

    # Use first file in /data
    filename = os.listdir(data_dir)[0]
    file_path = os.path.join(data_dir, filename)

    if filename.endswith(".csv"):
        df = pd.read_csv(file_path)
    elif filename.endswith(".json"):
        df = pd.read_json(file_path)
    else:
        raise ValueError("Unsupported file format")

    # Drop NA rows and subset
    df = df.dropna(subset=inputs + [output])
    X = df[inputs]
    y = df[output]

    # Train model
    model = RandomForestClassifier()
    model.fit(X, y)

    # Save
    model_path = os.path.join(base_dir, "model.pkl")
    joblib.dump(model, model_path)

    print(f"[\u2713] Model saved to {model_path}")

if __name__ == "__main__":
    train(sys.argv[1])
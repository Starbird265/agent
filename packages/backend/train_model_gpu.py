# packages/backend/train_model_gpu.py
"""
GPU-accelerated training script using PyTorch for tabular data.
Saves the trained pipeline (preprocessing + PyTorch model) to disk.
"""
import sys
import os
import json
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

# 1. Paths
project_id = sys.argv[1]
base_dir = os.path.join("projects", project_id) # Consistent path joining

# Ensure the project specific directory exists (it should have been created by main.py)
if not os.path.isdir(base_dir):
    print(f"Error: Project directory {base_dir} not found.")
    sys.exit(1)

data_sub_dir = os.path.join(base_dir, "data")
if not os.path.isdir(data_sub_dir) or not os.listdir(data_sub_dir):
    print(f"Error: Data directory {data_sub_dir} not found or is empty.")
    sys.exit(1)

dataset_path = os.path.join(data_sub_dir, os.listdir(data_sub_dir)[0])
schema_path = os.path.join(base_dir, "schema.json")

if not os.path.isfile(schema_path):
    print(f"Error: Schema file {schema_path} not found.")
    sys.exit(1)
if not os.path.isfile(dataset_path):
    print(f"Error: Dataset file {dataset_path} not found.")
    sys.exit(1)

print(f"Starting GPU training for project: {project_id}")
print(f"Using dataset: {dataset_path}")
print(f"Using schema: {schema_path}")

# 2. Load schema
try:
    with open(schema_path) as f:
        schema = json.load(f)
    inputs_cols = schema["inputs"] # Renamed to avoid conflict with 'inputs' variable later
    target_col = schema["output"]  # Renamed for clarity
except Exception as e:
    print(f"Error loading or parsing schema {schema_path}: {e}")
    sys.exit(1)

# 3. Load data
try:
    if dataset_path.endswith('.csv'):
        df = pd.read_csv(dataset_path)
    elif dataset_path.endswith('.json'):
        df = pd.read_json(dataset_path)
    else:
        print(f"Unsupported file format: {dataset_path}. Only .csv and .json are supported.")
        sys.exit(1)
except Exception as e:
    print(f"Error loading data from {dataset_path}: {e}")
    sys.exit(1)

if df.empty:
    print("Error: Dataframe is empty after loading.")
    sys.exit(1)

# 4. Preprocess: drop empty rows based on crucial columns
df = df.dropna(subset=inputs_cols + [target_col], how="all")
if df.empty:
    print(f"Error: Dataframe empty after dropping NA rows based on inputs/target. Project: {project_id}")
    sys.exit(1)

# 5. Encode target if needed
y_series = df[target_col]
label_encoder_path = os.path.join(base_dir, "label_encoder.pt") # Using .pt for torch related saves

if y_series.dtype == 'object' or y_series.dtype.name == 'category':
    le = LabelEncoder()
    y_encoded = le.fit_transform(y_series)
    torch.save(le, label_encoder_path)
    print(f"Target variable label encoded and saved to {label_encoder_path}")
    y_processed = y_encoded
else:
    y_processed = y_series.values

# 6. Prepare features
X_features = df[inputs_cols].values.astype('float32')

# 7. Train-test split
X_train, X_val, y_train, y_val = train_test_split(X_features, y_processed, test_size=0.2, random_state=42, stratify=y_processed if len(set(y_processed)) > 1 and len(set(y_processed)) <= len(y_processed)/2 else None)

# 8. Setup device
if not torch.cuda.is_available():
    print("Warning: CUDA not available, training on CPU. This script is intended for GPU.")
    # Fallback to CPU, or could exit if GPU is strictly required by the script's purpose
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# 9. Define simple MLP
class MLP(nn.Module):
    def __init__(self, in_dim, out_dim_mlp): # Renamed out_dim to avoid conflict
        super().__init__()
        self.model = nn.Sequential(
            nn.Linear(in_dim, 128), # Slightly larger layer
            nn.ReLU(),
            nn.Dropout(0.3), # Added dropout
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, out_dim_mlp)
        )
    def forward(self, x_input): # Renamed x to x_input
        return self.model(x_input)

# 10. Instantiate model
in_dim = X_train.shape[1]
y_train_unique_count = len(set(y_train))

# Determine if classification or regression
# Using y_train_unique_count for determining out_dim for classification
if y_train_unique_count <= 20 and (torch.from_numpy(y_train).is_floating_point() == False) : # Check if integer type for classification
    out_dim_model = y_train_unique_count # Number of classes
    criterion = nn.CrossEntropyLoss()
    is_classification = True
    print(f"Task type: Classification (Output Dim: {out_dim_model})")
    y_train_tensor = torch.from_numpy(y_train).long().to(device) # CrossEntropyLoss expects Long targets
    y_val_tensor = torch.from_numpy(y_val).long().to(device)
else:
    out_dim_model = 1 # Single output for regression
    criterion = nn.MSELoss()
    is_classification = False
    print(f"Task type: Regression (Output Dim: {out_dim_model})")
    y_train_tensor = torch.from_numpy(y_train.reshape(-1,1)).float().to(device)
    y_val_tensor = torch.from_numpy(y_val.reshape(-1,1)).float().to(device)


model = MLP(in_dim, out_dim_model).to(device)
optimizer = optim.Adam(model.parameters(), lr=0.001) # Common learning rate

# 11. Training loop
epochs = 20 # Increased epochs
batch_size = 64 # Increased batch size

X_train_tensor = torch.from_numpy(X_train).to(device)
X_val_tensor = torch.from_numpy(X_val).to(device)


train_dataset = torch.utils.data.TensorDataset(X_train_tensor, y_train_tensor)
train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

val_dataset = torch.utils.data.TensorDataset(X_val_tensor, y_val_tensor)
val_loader = torch.utils.data.DataLoader(val_dataset, batch_size=batch_size, shuffle=False)


print(f"Starting training for {epochs} epochs...")
for epoch in range(epochs):
    model.train()
    epoch_train_loss = 0
    for xb, yb in train_loader:
        optimizer.zero_grad()
        preds = model(xb)
        loss = criterion(preds, yb)
        loss.backward()
        optimizer.step()
        epoch_train_loss += loss.item()

    avg_train_loss = epoch_train_loss / len(train_loader)

    # Validation phase
    model.eval()
    epoch_val_loss = 0
    correct_val = 0
    total_val = 0
    with torch.no_grad():
        for xb_val, yb_val in val_loader:
            preds_val = model(xb_val)
            loss_val = criterion(preds_val, yb_val)
            epoch_val_loss += loss_val.item()
            if is_classification:
                _, predicted_labels = torch.max(preds_val, 1)
                total_val += yb_val.size(0)
                correct_val += (predicted_labels == yb_val).sum().item()

    avg_val_loss = epoch_val_loss / len(val_loader)
    val_accuracy_str = f", Val Acc: {(100 * correct_val / total_val):.2f}%" if is_classification and total_val > 0 else ""

    print(f"Epoch {epoch+1}/{epochs}, Train Loss: {avg_train_loss:.4f}, Val Loss: {avg_val_loss:.4f}{val_accuracy_str}")

# 12. Save model's state_dict
model_path = os.path.join(base_dir, "model_gpu.pt")
torch.save(model.state_dict(), model_path)
print(f"✅ GPU training complete. Model state_dict saved to {model_path}")

# Also save the model class definition or the entire model if needed for easier loading,
# but state_dict is common. For loading: model = MLP(in_dim, out_dim_model); model.load_state_dict(torch.load(PATH)); model.eval()
# For simplicity, only state_dict is saved. The prediction endpoint would need to know the model architecture.

# Note: Chunked loading for very large datasets that don't fit in RAM/VRAM is not implemented here.
# This script assumes the dataset (after dropping NAs) can be loaded into memory for train/test split.
# Feature scaling (e.g., StandardScaler) is also not implemented here but is often beneficial for NNs.

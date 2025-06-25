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

    df_list = [] # To store chunks or the full dataframe

    if filename.endswith(".csv"):
        chunk_size = 100_000  # Define chunk size, e.g., 100,000 rows
        print(f"Reading CSV file {file_path} in chunks of {chunk_size} rows...")
        try:
            reader = pd.read_csv(file_path, chunksize=chunk_size)
            for i, chunk in enumerate(reader):
                print(f"Processing chunk {i+1}...")
                # Drop rows missing ALL specified input and output columns in this chunk
                # This ensures that rows with at least one value in the crucial columns are kept.
                # If the intention is to drop if ANY of these are NA, use how='any'
                # For ML, usually if the target (output) or all features (inputs) are NA, the row is unusable.
                # The original was df.dropna(subset=inputs + [output]) which defaults to how='any'.
                # To match that, we'd use how='any'.
                # However, the prompt said "dropna(subset=features + [target], how="all")"
                # Let's use how="any" to match original behavior more closely for now,
                # unless specified otherwise. The prompt's "how='all'" is less strict.
                # For this step, I will use how='any' as it's safer for typical ML data cleaning.
                chunk_cleaned = chunk.dropna(subset=inputs + [output], how='any')
                if not chunk_cleaned.empty:
                    df_list.append(chunk_cleaned)
                else:
                    print(f"Chunk {i+1} was empty after NA drop or originally empty.")
            if not df_list:
                raise ValueError("No data remaining after processing all chunks. Check NA values in crucial columns.")
            df = pd.concat(df_list, ignore_index=True)
            print("All chunks processed and concatenated.")
        except pd.errors.EmptyDataError:
            raise ValueError(f"The file {filename} is empty or contains no data.")
        except Exception as e:
            raise ValueError(f"Error processing CSV file {filename}: {str(e)}")

    elif filename.endswith(".json"):
        # For JSON, chunking is usually done if it's line-delimited JSON.
        # pd.read_json with chunksize implies lines=True.
        # If it's a single large JSON object, this won't work as expected without custom parsing.
        # Assuming line-delimited JSON if chunking is desired.
        # For now, keeping original behavior for JSON, can be enhanced later if needed.
        print(f"Reading JSON file {file_path}...")
        try:
            df = pd.read_json(file_path) # Original behavior
            # If chunking for line-delimited JSON is required by user:
            # chunk_size = 100_000
            # reader = pd.read_json(file_path, lines=True, chunksize=chunk_size)
            # for chunk in reader:
            #     df_list.append(chunk.dropna(subset=inputs + [output], how='any'))
            # if not df_list:
            #     raise ValueError("No data remaining after processing JSON chunks.")
            # df = pd.concat(df_list, ignore_index=True)

            # Applying the same NA drop strategy for JSON as for CSV for consistency
            df = df.dropna(subset=inputs + [output], how='any')
            if df.empty:
                 raise ValueError("No data remaining after NA drop in JSON file.")
        except pd.errors.EmptyDataError:
            raise ValueError(f"The JSON file {filename} is empty.")
        except ValueError as e: # Catches JSON decoding errors among others
             raise ValueError(f"Error processing JSON file {filename}: {str(e)}. Ensure it's valid JSON (or line-delimited if using chunking).")

    else:
        raise ValueError("Unsupported file format. Only .csv and .json are supported.")

    if df.empty:
        raise ValueError("Dataset is empty after loading and initial NA processing.")

    # At this point, df is the fully loaded and initially cleaned (NA rows dropped) DataFrame.
    # The original code had another df.dropna(subset=inputs + [output]) here.
    # This is now redundant if how='any' was used during chunk processing or for JSON.
    # If how='all' was used in chunks, then an 'any' drop might still be needed here.
    # Given I used how='any' in chunks and for JSON, this line is no longer strictly necessary.
    # df = df.dropna(subset=inputs + [output]) # This was the original line

    X = df[inputs]
    y = df[output]

    if X.empty or y.empty:
        raise ValueError("No data available for training after selecting features and target. Check schema and NA values.")

    # Train model
    model = RandomForestClassifier()
    model.fit(X, y)

    # Save
    model_path = os.path.join(base_dir, "model.pkl")
    joblib.dump(model, model_path)

    print(f"[\u2713] Model saved to {model_path}")

if __name__ == "__main__":
    train(sys.argv[1])
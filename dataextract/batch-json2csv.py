import json
import csv
import argparse

def json_to_csv(json_data, output_file='output.csv'):
    # Parse JSON if it's a string
    if isinstance(json_data, str):
        json_data = json.loads(json_data)
    
    # Flatten nested JSON for multiple entries
    def flatten_json(data, prefix=''):
        flat_dict = {}
        for key, value in data.items():
            new_key = f"{prefix}{key}" if prefix else key
            
            if isinstance(value, dict):
                flat_dict.update(flatten_json(value, f"{new_key}_"))
            elif isinstance(value, list):
                # Handle lists by converting to comma-separated strings
                flat_dict[new_key] = ', '.join(map(str, value))
            else:
                flat_dict[new_key] = value
        return flat_dict
    
    # Flatten each entry in the list
    flat_data = []
    for entry in json_data:
        flat_entry = flatten_json(entry)
        flat_data.append(flat_entry)
    
    # Get all possible keys across all entries
    all_keys = set()
    for entry in flat_data:
        all_keys.update(entry.keys())
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=sorted(all_keys), extrasaction='ignore')
        writer.writeheader()
        writer.writerows(flat_data)
    
    print(f"CSV file '{output_file}' has been created.")

def main():
    parser = argparse.ArgumentParser(description='Convert JSON to CSV')
    parser.add_argument('input_file', help='Input JSON file')
    parser.add_argument('-o', '--output', default='output.csv', 
                        help='Output CSV file name (default: output.csv)')
    
    args = parser.parse_args()
    
    # Read JSON file
    try:
        with open(args.input_file, 'r') as f:
            json_data = json.load(f)
        
        # Convert to CSV
        json_to_csv(json_data, args.output)
    
    except FileNotFoundError:
        print(f"Error: File {args.input_file} not found.")
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in {args.input_file}")

if __name__ == "__main__":
    main()
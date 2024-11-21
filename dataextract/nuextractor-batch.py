import ollama
import argparse
import os
import json

def read_file(file):
    """Read and return file contents, with error handling."""
    try:
        with open(file, 'r') as f:
            return f.read()
    except FileNotFoundError:
        print(f"The file {file} could not be found.")
        return None

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Batch extract information using Ollama')
    parser.add_argument('template', help='Path to template JSON file')
    parser.add_argument('input_folder', help='Path to folder containing input text files')
    parser.add_argument('-o', '--output', default='output.json', 
                        help='Output JSON file name (default: output.json)')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Read template file
    template_content = read_file(args.template)
    if not template_content:
        return
    
    # Collect extraction results
    extraction_results = []
    
    # Iterate through text files in the input folder
    for filename in os.listdir(args.input_folder):
        if filename.endswith('.txt'):
            file_path = os.path.join(args.input_folder, filename)
            text_content = read_file(file_path)
            
            if not text_content:
                continue
            
            # Construct prompt
            prompt = f"""<|input|>
###Template:
{template_content}
###Text:
{text_content}
<|output|>"""
            
            # Use Ollama to process the extraction
            ollama_response = ollama.chat(
                #model='sroecker/nuextract-tiny-v1.5', 
                model='iodose/nuextract-v1.5',
                messages=[
                    {
                        'role': 'system',
                        'content': 'Extract.',
                    },
                    {
                        'role': 'user',
                        'content': prompt,
                    },
                ],
                options={
                    'temperature': 0
                }
            )
            
            # Parse and store the response
            try:
                extracted_data = json.loads(ollama_response['message']['content'])
                extraction_results.append(extracted_data)
                print(f"Extracted data from {filename}")
            except json.JSONDecodeError:
                print(f"Failed to parse JSON from {filename}")
    
    # Write results to output JSON file
    with open(args.output, 'w') as outfile:
        json.dump(extraction_results, outfile, indent=2)
    
    print(f"Extraction complete. Results saved to {args.output}")

if __name__ == "__main__":
    main()
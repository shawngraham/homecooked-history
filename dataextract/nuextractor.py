import ollama
import argparse

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
    parser = argparse.ArgumentParser(description='Extract information using Ollama')
    parser.add_argument('template', help='Path to template JSON file')
    parser.add_argument('text', help='Path to input text file')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Read template and text files
    template_content = read_file(args.template)
    text_content = read_file(args.text)
    
    if not template_content or not text_content:
        print("Failed to read input files.")
        return
    
    # Construct prompt
    prompt = f"""<|input|>
###Template:
{template_content}
###Text:
{text_content}
<|output|>"""
    
    # Use Ollama to process the extraction
    ollama_response = ollama.chat(
        model='sroecker/nuextract-tiny-v1.5',
        model='sroecker/nuextract-tiny-v1.5', 

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
    
    # Print the extraction result
    print(ollama_response['message']['content'])

if __name__ == "__main__":
    main()
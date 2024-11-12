import os
from flask import Flask, request, render_template, send_file, flash, redirect, url_for, jsonify
from werkzeug.utils import secure_filename
import tempfile
from pathlib import Path
import base64

# Import our sonification code
import numpy as np
from PIL import Image
import midiutil
import math

class Scale:
    MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]  # Major scale intervals
    MIXOLYDIAN_SCALE = [0, 2, 4, 5, 7, 9, 10]  # Mixolydian scale intervals

def map_to_scale(value, min_in, max_in, min_pitch, max_pitch, scale):
    """Map a value to a musical scale."""
    # Normalize the input value to 0-1 range
    normalized = (value - min_in) / (max_in - min_in)
    
    # Calculate the number of octaves in our range
    min_oct = min_pitch // 12
    max_oct = max_pitch // 12
    total_notes = (max_oct - min_oct + 1) * len(scale)
    
    # Map the normalized value to a scale index
    scale_position = int(normalized * total_notes)
    octave = scale_position // len(scale)
    scale_index = scale_position % len(scale)
    
    # Calculate the final MIDI pitch
    pitch = (min_oct + octave) * 12 + scale[scale_index]
    return min(max(pitch, min_pitch), max_pitch)

def map_value(value, min_in, max_in, min_out, max_out):
    """Linear mapping of input value to output range."""
    return min_out + (value - min_in) * (max_out - min_out) / (max_in - min_in)

def get_pixel_values(img, x, y):
    """
    Safely extract RGB values from a pixel regardless of image mode.
    Returns tuple of (r, g, b) values.
    """
    pixel = img.getpixel((x, y))
    
    # Handle different image modes
    if img.mode == 'RGB':
        return pixel
    elif img.mode == 'RGBA':
        r, g, b, _ = pixel
        return (r, g, b)
    elif img.mode == 'L':  # Grayscale
        return (pixel, pixel, pixel)
    elif img.mode == '1':  # Binary
        value = pixel * 255  # Convert to 8-bit scale
        return (value, value, value)
    elif img.mode == 'P':  # Palette
        rgb = img.convert('RGB')
        return rgb.getpixel((x, y))
    else:
        # Convert unknown modes to RGB
        rgb = img.convert('RGB')
        return rgb.getpixel((x, y))

def sonify_image(image_path, output_path, tempo=116):
    """
    Convert an image to MIDI by sampling three horizontal slices.
    
    Parameters:
    - image_path: str, path to the image file
    - output_path: str, path for the output MIDI file
    - tempo: int, tempo in BPM
    """
    # Musical parameters
    SCALE = Scale.MAJOR_SCALE
    MIN_PITCH = 30
    MAX_PITCH = 90
    MIN_DURATION = 0.8  # In quarter notes
    MAX_DURATION = 6.0
    MIN_VOLUME = 20
    MAX_VOLUME = 127
    
    # Load image
    img = Image.open(image_path)
    width, height = img.size
    
    # Calculate slice positions (25%, 50%, 75% of height)
    slice_positions = [
        int(round(height * 0.25)),
        int(round(height * 0.50)),
        int(round(height * 0.75))
    ]
    
    # Create MIDI file
    midi = midiutil.MIDIFile(1)  # One track
    midi.addTempo(0, 0, tempo)
    
    # Process each slice
    for row in slice_positions:
        current_time = 0
        
        for col in range(width):
            # Get pixel RGB values using the safe getter
            r, g, b = get_pixel_values(img, col, row)
            
            # Calculate luminosity
            luminosity = (r + g + b) / 3
            
            # Map values to musical parameters
            pitch = map_to_scale(luminosity, 0, 255, MIN_PITCH, MAX_PITCH, SCALE)
            duration = map_value(r, 0, 255, MIN_DURATION, MAX_DURATION)
            volume = int(map_value(b, 0, 255, MIN_VOLUME, MAX_VOLUME))
            
            # Add note to MIDI file
            # Convert duration from quarter notes to beats
            duration_beats = duration
            midi.addNote(0, 0, pitch, current_time, duration_beats, volume)
            
            # Add small random time displacement (similar to original)
            time_displacement = np.random.choice([0.125, 0.25, 0.5, 0.75]) # Similar to DEN, EN, SN, TN
            current_time += duration_beats + time_displacement
    
    # Write MIDI file
    with open(output_path, 'wb') as output_file:
        midi.writeFile(output_file)

def batch_process_images(image_directory, output_directory):
    """
    Process multiple images in a directory.
    
    Parameters:
    - image_directory: str, path to directory containing images
    - output_directory: str, path to directory for output MIDI files
    """
    import os
    
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)
    
    for filename in os.listdir(image_directory):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            input_path = os.path.join(image_directory, filename)
            output_path = os.path.join(output_directory, f"sonified_{filename}.mid")
            sonify_image(input_path, output_path)

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# Configure upload settings
UPLOAD_FOLDER = Path(tempfile.gettempdir()) / 'image_sonifier'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Create upload folder if it doesn't exist
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file part')
            return redirect(request.url)
        
        file = request.files['file']
        
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            image_path = Path(app.config['UPLOAD_FOLDER']) / filename
            file.save(str(image_path))
            
            midi_filename = f"sonified_{filename}.mid"
            midi_path = Path(app.config['UPLOAD_FOLDER']) / midi_filename
            
            try:
                # Sonify the image
                sonify_image(str(image_path), str(midi_path))
                
                # Read the MIDI file and convert to base64
                with open(midi_path, 'rb') as midi_file:
                    midi_data = midi_file.read()
                    midi_base64 = base64.b64encode(midi_data).decode('utf-8')
                
                return render_template('preview.html', 
                                     midi_data=midi_base64,
                                     midi_filename=midi_filename)
            
            except Exception as e:
                flash(f'Error processing image: {str(e)}')
                return redirect(request.url)
            
            finally:
                # Clean up image file
                try:
                    image_path.unlink()
                except:
                    pass
        
        else:
            flash('Allowed file types are png, jpg, jpeg, gif')
            return redirect(request.url)
    
    return render_template('upload.html')

@app.route('/download/<filename>')
def download_file(filename):
    try:
        return send_file(
            str(Path(app.config['UPLOAD_FOLDER']) / filename),
            attachment_filename=filename,  # older Flask versions use this instead of download_name
            as_attachment=True,
            mimetype='audio/midi'
        )
    finally:
        # Clean up MIDI file after download
        try:
            (Path(app.config['UPLOAD_FOLDER']) / filename).unlink()
        except:
            pass

if __name__ == '__main__':
    app.run(debug=True)
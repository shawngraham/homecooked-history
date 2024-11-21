## Extracting Structured Text

The Nuextract family of models are finetuned smallish models that have been explicitly crafted to use templates as a kind of 'sieve' against unstructured text.

Give it a text, define a template with what you are after, and the larger models perform well (not perfectly, mind you). You can try out the largest model via the [Huggingface Playground](https://huggingface.co/spaces/numind/NuExtract-1.5). It is possible to use the tiniest model within eg google colab [example faffing about](https://colab.research.google.com/drive/15SL9vCumXvAkoqn2va5b5vhmRVYu9arO#scrollTo=e8SU1yEb0yI6).

## How to use
Get [ollama](ollama.com)

Install it; at a terminal prompt, get one of the nuextract models with:

+ `$ ollama run iodose/nuextract-v1.5`  (takes 2.4 gb memory)
+ $ ollama run sroecker/nuextract-tiny-v1.5` (takes 994 mb memory)
+ no doubt there are other versions available, in other sizes.

To check which models you have handy on your machine, `ollama list`.

I'm working in a python 3.11 environment. Make sure ollama's python package is installed:

`pip install ollama`

(other packages necessary, but which are probably already installed: `json`, `os`, `argparse`)

To change up the model my code uses, look for the line that says

```model='iodose/nuextract-v1.5',``` 

and slot in your alternative as appropriate.

```model='iodose/nuextract-v1.5',```

```model='sroecker/nuextract-tiny-v1.5',```

etc.


## usage

**nuextractor.py** is for running on one input text at a time. The format looks like this:

```$ python nuextractor.py template.json test.txt > output.json```

**nuextractor-batch.py** is for running against a folder of input text files.

```$ python nuextractor-batch.py template.json input_texts```

which writes the results to output.json. If you want to specify the file name, add ``` -o newoutput.json```.

**json2csv.py**

```$ python json2csv.py newoutput.json -o evennewer.csv```

which should flatten things into a csv. 

original experiments: https://gist.github.com/shawngraham/01553d7e30d9306817072ca8fc741eaa


https://developers-blog.org/ollama-python-library-tutorial-with-examples/

## templates

The construction of the template matters _a lot_. I haven't found a good logic for that yet. You'll want to experiment. Best results seem to be where there's a literal string in your source text you're after. Consider this official example from Nuextract:

```template
{
    "Model": {
        "Name": "",
        "Number of parameters": "",
        "Number of token": "",
    },
    "Usage": {
        "Use case": []
    }
}
```
```text
We introduce NuExtract-v1.5 -- a fine-tuning of Phi-3.5-mini-instruct, which is a 3.8B parameter language model. It is trained on a private high-quality dataset for structured information extraction. It supports long documents (up to 128k token context) and several languages (English, French, Spanish, German, Portuguese, and Italian). To use the model, provide an input text and a JSON template describing the information you need to extract.
```

Other example templates from nuextract:
```template
{
  "Doctor_Patient_Discussion": {
    "Initial_Observation": {
      "Symptoms": [],
      "Initial_Assessment": ""
    },
    "Medical_Examination": {
      "Temperature": "",
      "Blood_Pressure": "",
      "Doctor_Assessment": "",
      "Diagnosis": ""
    },
    "Treatment_Plan": {
      "Prescription": []
    }
  }
}
```

```template
{
  "Name": "",
  "Age": "",
  "Educations": [
    {
      "School": "",
      "Date": ""
    }
  ],
  "Experiences": [
    {
      "Company": "",
      "Date": ""
    }
  ]
}```

```template
{
  "Name_act": "",
  "Director": "",
  "Location": [
    {
      "City": "",
      "Venue": "",
      "Date": "",
      "Actor": [
        {
          "Name": "",
          "Character_played": ""
        }
      ]
    }
  ]
}
```

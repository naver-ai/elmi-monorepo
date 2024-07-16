# This file is for langchain 

from backend.config import ElmiConfig
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel
from backend.utils.env_helper import get_env_variable, EnvironmentVariables
from os import path
import json

# Retrieve API key from environment variable
api_key = get_env_variable(EnvironmentVariables.OPENAI_API_KEY)


# Initialize the OpenAI client
client = ChatOpenAI(api_key=api_key, 
                    model_name="gpt-4o", 
                    temperature=1, 
                    max_tokens=2000, 
                    top_p=1, 
                    frequency_penalty=0, 
                    presence_penalty=0
                    )

lyrics_input = [
    {
      "line_number": 1,
      "lyric": "'Cause I, I, I'm in the stars tonight"
    },
    {
      "line_number": 2,
      "lyric": "So watch me bring the fire and set the night alight"
    },
    {
      "line_number": 3,
      "lyric": "Shoes on, get up in the morn', cup of milk, let's rock and roll"
    },
    {
      "line_number": 4,
      "lyric": "King Kong, kick the drum, rolling on like a Rolling Stone"
    },
    {
      "line_number": 5,
      "lyric": "Sing-song when I'm walkin' home"
    },
    {
      "line_number": 6,
      "lyric": "Jump up to the top, LeBron"
    },
    {
      "line_number": 7,
      "lyric": "Ding-dong, call me on my phone"
    },
    {
      "line_number": 8,
      "lyric": "Ice tea and a game of ping pong"
    }
]

settings_input = [
    {
  "MainAudience": "Deaf",
  "AgeGroup": "Adult",
  "MainLanguage": "ASL",
  "LanguageLevel": "Moderate",
  "SpeedOfSigning": "Moderate",
  "EmotionalLevel": "Moderate",
  "UseOfBodyLanguage": "None",
  "UseOfClassifiers": "Many"
    }
]

genius_input = [
   {
      ''' 
      “Dynamite” is an upbeat disco-pop song that sings of joy and confidence, bringing a new surge of ‘energy’ to reinvigorate the community during these difficult times. The song finds global superstars searching for happiness by doing again what they are best at—spreading joy to the world through music and performances.
      It marks BTS‘ first song to be released completely in English as a lead artist. It is featured in the ad for Samsung’s Galaxy S20 FE series.
      '''
   }
]


def run_first_inference():
  system_template_feature1 = '''
  You are a helpful assistant that helps user to translate ENG lyrics into sign language.
  Your goal is to figure out noteworthy part where the user might need to think how to interpret the lines.
  Given the lyrics, mark lines that seems to be challenging to translate.

  You will refer to the Genius Annotation below:

  [Genius Annotation]
  {genius_description}

  You will consider the challenges listed below:

  [List of Challenge Labels]
  - 'poetic': The phrase is too poetic that the text cannot be directly translated into sign language.
  - 'cultural': The phrase contains some keywords that only a specific group of people may understand the meaning.
  - 'broken': The phrase is in broken English without concrete meanings. For example, the phrase is repeating meaningless words. 
  - 'mismatch': The phrase doesn't exist in ASL, so the user need to finger spell.

  You will get input:

  [Input format]
  Input is consist of 2 parts: {user_settings} and the {lyrics}


  You will provide output, if the challenge exists:
  DONT print the output it if there's no challenge

  [Output format]
  DO NOT PRINT OTHER things. Follow the below:
  JSON array with:
  "line_id": string // specific id of the line.
  "challenges": Array<string> // Challenge labels for the line of lyrics. Refer to 'List of Challenge Labels' above.
  "description": string // description on you rationale of why you chose this line of lyrics and put that challenge labels.

  '''
  # Define the prompt template
  prompt_template = PromptTemplate(
      template = system_template_feature1
  )
  # Initialize the chain
  llm_chain = prompt_template | client | StrOutputParser()

  # Execute the chain with the lyrics input
  response_feature1 = llm_chain.invoke({"genius_description": genius_input, "lyrics": lyrics_input, "user_settings": settings_input})

  # Process and write the response to a JSON file
  with open(path.join(ElmiConfig.DIR_DATA, "output_feature1.json"), 'w') as f:
      json.dump(json.loads(response_feature1.strip('```json\n').strip('\n```')), f, indent=2)

def run_second_inference():
  # Read the output from the previous inference
  with open(path.join(ElmiConfig.DIR_DATA, "output_feature1.json"), 'r') as f:
      feature1_output = json.load(f)


  system_template_feature2 = '''
  You are a helpful assistant that helps user to translate ENG lyrics into sign language.
  Given the lyrics, provide the gloss of each lines.

  You will follow the glossing rules: https://lifeprint.com/asl101/topics/gloss.htm

  You will refer to the Genius Annotation below:

  [Genius Annotation]
  {genius_description}

  You will consider the challenges of some the lyrics and provide gloss for ALL the lines:
  {previous_output}
  
  You will also consider the user preference (below is the category):

  [User preference]
   1. Main Audience
  Options: Hearing / Deaf
  - Hearing: Emphasize clarity and explicitness in gloss to facilitate understanding for those who might rely on written descriptions.
  - Deaf: Focus on naturalness and fluency in ASL, considering the nuances and fluidity of native sign language usage.
   2. Age Group
  Options: Children / Adult
  - Children: Use simpler language and concepts, provide more repetition and visual aids.
  - Adults: Use more complex language and concepts, tailored to the adult's comprehension level.
   3. Main Language
  Options: ASL / PSE / SEE
  - ASL (American Sign Language): Generate gloss that follows ASL grammar and structure, focusing on signs.
  - PSE (Pidgin Signed English): Create a blend of ASL signs in English word order, suitable for users who are transitioning between English and ASL.
   4. Language Level
  Options: Professional / Moderate / Novice
  - Professional: Use advanced terminology and detailed descriptions, assuming high proficiency in the language.
  - Moderate: Include common terms and moderately complex structures, providing some explanations for less common signs.
  - Novice: Use basic vocabulary and simple sentence structures, providing detailed explanations and context for each sign.
   5. Speed of Signing
  Options: Slow / Moderate / Fast
  - Slow: Generate gloss with clear, spaced-out instructions, suitable for learners who need more time to process each sign.
  - Moderate: Create gloss that balances clarity with fluidity, appropriate for users with some experience.
  - Fast: Focus on natural speed and flow, suitable for advanced users who can keep up with rapid signing.
   6. Emotional Level
  Options: Simple / Moderate / Complex
  - Simple: Keep emotional expressions straightforward, using basic facial expressions and body language.
  - Moderate: Include a range of emotional expressions with more nuanced NMS.
  - Complex: Integrate intricate emotional expressions and detailed body language to convey complex emotions.
   7. Use of Body Language (NMS)
  Options: None / Moderate / Many
  *NMS should be described in parenthesis "()" 
  - None: Do not use NMS, only provide the signs.
  - Moderate: Use a balanced amount of NMS to enhance meaning without overwhelming the user.
  - Many: Incorporate extensive NMS to convey richer meaning and context.
   8. Use of Classifiers
  Options: None / Moderate / Many
  *Classifiers should be described in "(CL: )"
  - None: Do not incorporate classifiers, focusing on standard signs.
  - Moderate: Use classifiers where necessary to enhance understanding.
  - Many: Integrate classifiers frequently to convey detailed and complex concepts efficiently.

  You will get input:

  [Input format]
  Input is consist of 2 parts: {user_settings} and the {lyrics}


  You will provide output, for ALL of the lines:

  [Output format]
  DO NOT PRINT OTHER things. Follow the below:
  JSON array with:
  "line_id": string // specific id of the line.
  "gloss": string // gloss labels for the line of lyrics. Refer to preference above.
  "description": string // description on you rationale of why you created this line of gloss. Show that you considered {user_settings}
  '''
  # Define the prompt template
  prompt_template = PromptTemplate(
      template = system_template_feature2
  )

  # Initialize the chain
  llm_chain = prompt_template | client | StrOutputParser()

  # Execute the chain with the lyrics input
  response_feature2 = llm_chain.invoke({"genius_description": genius_input, "previous_output": feature1_output, "lyrics": lyrics_input, "user_settings": settings_input})


  # Process and write the response to a JSON file
  with open(path.join(ElmiConfig.DIR_DATA, "output_feature2.json"), 'w') as f:
      json.dump(json.loads(response_feature2.strip('```json\n').strip('\n```')), f, indent=2)


def run_third_forth_inference():
  # Read the output from the previous inference
  with open(path.join(ElmiConfig.DIR_DATA, "output_feature2.json"), 'r') as f:
      feature2_output = json.load(f)

  system_template_feature3 = '''
  You are a helpful assistant that helps user to translate ENG lyrics into sign language.
  Your goal is to figure out how to express each line considering the mood of the song.
  Given the lyrics, mark lines with emotion and how to interpret with facial expression and body language.

  You will refer to the Genius Annotation below:

  [Genius Annotation]
  {genius_description}

  You will consider the gloss that the user will perform:
  {previous_output}

  You will get input:

  [Input format]
  Input is consist of 2 parts: {user_settings} and the {lyrics}


  You will provide output, for ALL of the lines:

  [Output format]
  DO NOT PRINT OTHER things. Follow the below:
  JSON array with:
  "line_id": string // specific id of the line.
  "mood": string // main mood or emotion of the line
  "facial expression": string // how to express the mood of the lines using facial expressions 
  "body gesture": string // how to express the mood of the lines using bodily gestures
  "description": string // description on you rationale of why you chose these expressions. This will be given to the users to support the results. 
  '''

  system_template_feature4 = '''
  You are a helpful assistant that helps user to translate ENG lyrics into sign language.
  Your goal is to figure out how to sign the line in multiple ways considering the user preference.
  Given the lyrics, provide 2 options how to sign it differently from the given gloss  (shorter gloss, longer gloss).

  You will refer to the Genius Annotation below:

  [Genius Annotation]
  {genius_description}

  You will consider the gloss that the user will perform:
  given gloss
  {previous_output}
  
  
  You will get input:

  [Input format]
  Input is consist of 2 parts: {user_settings} and the {lyrics}


  You will provide output, for ALL of the lines:

  [Output format]
  DO NOT PRINT OTHER things. Follow the below:
  JSON array with:
  "line_id": string // specific id of the line.
  "gloss_options_with description": Array<string>  
  // with the field of "gloss" and "description". 2 more ways of gloss for the line of lyrics: long ver, short ver. also add 2 descriptions why you created each line of gloss explaining the gloss. 
  //do not mention it is just shorter or longer version. If the suggested gloss is same with {previous_output}, say that this is the best option.
  '''

  # Define the prompt template
  prompt_template_feature3 = PromptTemplate(
      template = system_template_feature3
  )

    # Define the prompt template
  prompt_template_feature4 = PromptTemplate(
      template = system_template_feature4
  )

  # Initialize the chain
  llm_chain_feature3 = prompt_template_feature3 | client | StrOutputParser()

  # Initialize the chain
  llm_chain_feature4 = prompt_template_feature4 | client | StrOutputParser()


  # Execute the chain with the lyrics input
  combined = RunnableParallel(feature3 = llm_chain_feature3, feature4 = llm_chain_feature4)
 
  response = combined.invoke({"genius_description": genius_input, "previous_output": feature2_output, "lyrics": lyrics_input, "user_settings": settings_input})


  # Process and write the response for feature 3 to a JSON file
  with open(path.join(ElmiConfig.DIR_DATA, "output_feature3.json"), 'w') as f:
      json.dump(json.loads(response['feature3'].strip('```json\n').strip('\n```')), f, indent=2)

  # Process and write the response for feature 4 to a JSON file
  with open(path.join(ElmiConfig.DIR_DATA, "output_feature4.json"), 'w') as f:
      json.dump(json.loads(response['feature4'].strip('```json\n').strip('\n```')), f, indent=2)



# Run the first inference
run_first_inference()

# Run the second inference
run_second_inference()

# Run the third and forth inference in paralell
run_third_forth_inference()

